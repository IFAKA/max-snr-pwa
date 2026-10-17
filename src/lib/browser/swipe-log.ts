const LOCK_PX = 10;
const EDGE_PX = 24;
/** Share of the card's width (sideways) or height (up) that arms a swipe, by kind. */
export const ARM_RATIO = 0.4;
export const ARM_RATIO_LIGHT = 0.2;
const FLICK_MIN_PX = 48;
const FLICK_PX_PER_MS = 0.6;
/** A touch on a value that is held longer than this belongs to its wheel, not to a swipe. */
const HOLD_GUARD_MS = 300;
const LEARNED_KEY = 'maxsnr-swipe-learned';

/** How far along a rightward drag is, from 0 to 1 of the screen's width. */
export function swipeProgress(dx: number, width: number) {
  return width > 0 ? Math.max(0, Math.min(1, dx / width)) : 0;
}

/** A drag is armed once it covers 40% of the screen; a quick flick also counts on release. */
export function swipeArmed(dx: number, width: number, elapsedMs = Infinity, ratio = ARM_RATIO) {
  if (swipeProgress(dx, width) >= ratio) return true;
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
  /** Whether a drag in this direction (1 right, -1 left) is allowed. */
  allow: (direction: 1 | -1) => boolean;
  /** Whether an upward drag is allowed (it opens the exercise list). */
  allowUp: () => boolean;
  /** Called on every move with the progress (right positive; 0..1 up for 'y'), 0 when it ends. */
  onProgress: (progress: number, armed: boolean, dragging: boolean, axis: 'x' | 'y') => void;
  /** Called once when the drag first reaches the commit threshold. */
  /** How far a drag must go in this direction (a share of the card), see ARM_RATIO. */
  ratio: (direction: 1 | -1 | 'up') => number;
  onArm: (direction: 1 | -1 | 'up') => void;
  /** Called on release past the threshold with 1 for a right swipe and -1 for a left swipe. */
  onCommit: (direction: 1 | -1 | 'up', velocity: number) => void;
};

/**
 * Svelte action: drag a whole screen like a card: each allowed direction commits on its own; up (when allowed) opens the exercise list.
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
  let axis: 'x' | 'y' = 'x';
  let armed = false;
  let swallowClick = false;
  let ownDrag: Element | null = null;

  const reset = () => {
    if (swiping) opts.onProgress(0, false, false, axis);
    pointerId = -1;
    swiping = false;
    armed = false;
  };

  const down = (event: PointerEvent) => {
    if (pointerId !== -1 || opts.disabled()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (startsAtEdge(event.clientX, globalThis.innerWidth)) return;
    // Controls with their own hold-and-drag (the value wheel) win once the touch is held.
    ownDrag = (event.target as Element | null)?.closest?.('[data-no-swipe]') ?? null;
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
      if (ownDrag && event.timeStamp - startTime > HOLD_GUARD_MS) {
        pointerId = -1;
        return;
      }
      if (Math.abs(dy) > LOCK_PX && Math.abs(dy) >= Math.abs(dx)) {
        if (dy > 0 || !opts.allowUp()) {
          pointerId = -1;
          return;
        }
        axis = 'y';
      } else {
        if (Math.abs(dx) < LOCK_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const next = dx < 0 ? -1 : 1;
        if (!opts.allow(next)) return;
        direction = next;
        axis = 'x';
      }
      swiping = true;
      ownDrag?.dispatchEvent(new Event('swipeclaim'));
      node.setPointerCapture?.(pointerId);
    }
    const box = node.getBoundingClientRect();
    const size = axis === 'y' ? box.height : box.width;
    const distance = axis === 'y' ? Math.max(0, -dy) : Math.max(0, dx * direction);
    const kind = axis === 'y' ? 'up' : direction;
    const nowArmed = swipeArmed(distance, size, Infinity, opts.ratio(kind));
    if (nowArmed && !armed) opts.onArm(kind);
    armed = nowArmed;
    opts.onProgress(
      (axis === 'y' ? 1 : direction) * swipeProgress(distance, size),
      armed,
      true,
      axis,
    );
  };

  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const box = node.getBoundingClientRect();
    const distance =
      axis === 'y'
        ? Math.max(0, startY - event.clientY)
        : Math.max(0, (event.clientX - startX) * direction);
    const commit =
      swiping &&
      swipeArmed(
        distance,
        axis === 'y' ? box.height : box.width,
        event.timeStamp - startTime,
        opts.ratio(axis === 'y' ? 'up' : direction),
      );
    const committed = axis === 'y' ? 'up' : direction;
    const velocity = distance / Math.max(1, event.timeStamp - startTime);
    if (swiping) {
      // The click that follows a drag would log the set a second time.
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 0);
    }
    reset();
    if (commit) opts.onCommit(committed, velocity);
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
