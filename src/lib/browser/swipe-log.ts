const LOCK_PX = 10;
const EDGE_PX = 24;
const ARM_RATIO = 0.4;
const FLICK_MIN_PX = 48;
const FLICK_PX_PER_MS = 0.6;
const LEARNED_KEY = 'maxsnr-swipe-learned';

/** How far along a rightward drag is, from 0 to 1 of the screen's width. */
export function swipeProgress(dx: number, width: number) {
  return width > 0 ? Math.max(0, Math.min(1, dx / width)) : 0;
}

/** A drag is armed once it covers 40% of the screen; a quick flick also counts on release. */
export function swipeArmed(dx: number, width: number, elapsedMs = Infinity) {
  if (swipeProgress(dx, width) >= ARM_RATIO) return true;
  return dx >= FLICK_MIN_PX && dx / Math.max(elapsedMs, 1) >= FLICK_PX_PER_MS;
}

/** Whether a touch starts too close to the screen edge, where Android's back gesture lives. */
export function startsAtEdge(x: number, viewportWidth: number) {
  return x < EDGE_PX || x > viewportWidth - EDGE_PX;
}

export const swipeLearned = () => {
  try {
    return globalThis.localStorage?.getItem(LEARNED_KEY) === 'yes';
  } catch {
    return false;
  }
};

export function markSwipeLearned() {
  try {
    globalThis.localStorage?.setItem(LEARNED_KEY, 'yes');
  } catch {
    // Private mode: the nudge simply shows again next visit.
  }
}

export type SwipeOptions = {
  disabled: () => boolean;
  /** Whether a drag to the left is allowed too (right always is). */
  allowLeft: () => boolean;
  /** Called on every move with the signed progress (right positive), and with 0 when it ends. */
  onProgress: (progress: number, armed: boolean, dragging: boolean) => void;
  /** Called once when the drag first reaches the commit threshold. */
  onArm: () => void;
  /** Called on release past the threshold with 1 for a right swipe and -1 for a left swipe. */
  onCommit: (direction: 1 | -1) => void;
};

/**
 * Svelte action: drag a whole screen like a card: right confirms its primary action, left (when allowed) its undo.
 * Vertical drags stay native scrolling (`touch-action: pan-y` in CSS); taps, the keyboard and
 * assistive tech still use the primary button's own click.
 */
export function swipeToConfirm(node: HTMLElement, options: SwipeOptions) {
  let opts = options;
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let swiping = false;
  let direction: 1 | -1 = 1;
  let armed = false;
  let swallowClick = false;

  const reset = () => {
    if (swiping) opts.onProgress(0, false, false);
    pointerId = -1;
    swiping = false;
    armed = false;
  };

  const down = (event: PointerEvent) => {
    if (pointerId !== -1 || opts.disabled()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (startsAtEdge(event.clientX, globalThis.innerWidth)) return;
    // Controls with their own drag (the value wheel) keep their gesture.
    if ((event.target as Element | null)?.closest?.('[data-no-swipe]')) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = event.timeStamp;
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!swiping) {
      if (Math.abs(dy) > LOCK_PX && Math.abs(dy) >= Math.abs(dx)) {
        pointerId = -1;
        return;
      }
      if (Math.abs(dx) < LOCK_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0 && !opts.allowLeft()) return;
      direction = dx < 0 ? -1 : 1;
      swiping = true;
      node.setPointerCapture?.(pointerId);
    }
    const width = node.getBoundingClientRect().width;
    const distance = Math.max(0, dx * direction);
    const nowArmed = swipeArmed(distance, width);
    if (nowArmed && !armed) opts.onArm();
    armed = nowArmed;
    opts.onProgress(direction * swipeProgress(distance, width), armed, true);
  };

  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const distance = Math.max(0, (event.clientX - startX) * direction);
    const commit =
      swiping &&
      swipeArmed(distance, node.getBoundingClientRect().width, event.timeStamp - startTime);
    const committed = direction;
    if (swiping) {
      // The click that follows a drag would log the set a second time.
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 0);
    }
    reset();
    if (commit) opts.onCommit(committed);
  };

  const cancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) reset();
  };

  const click = (event: MouseEvent) => {
    if (!swallowClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('click', click, true);
  return {
    update(next: SwipeOptions) {
      opts = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('click', click, true);
    },
  };
}
