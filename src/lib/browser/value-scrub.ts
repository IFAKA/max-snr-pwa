import { scrubIndex } from './scrub-math.ts';

const HOLD_MS = 250;
const SLOP_PX = 10;

export type ScrubOptions = {
  /** The values, low to high. Read when the hold begins. */
  values: () => string[];
  current: () => string;
  /** Called while holding with the highlighted index, and null when the gesture ends. */
  onScrub: (state: { values: string[]; index: number; rect: DOMRect } | null) => void;
  onTick: () => void;
  onCommit: (value: string) => void;
};

/**
 * Svelte action: press and hold a button, then drag up or down to change its value like a
 * wheel. A quick tap, the keyboard and assistive tech still use the button's own click.
 */
export function scrubValue(node: HTMLElement, options: ScrubOptions) {
  let opts = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pointerId = -1;
  let originY = 0;
  let startIndex = 0;
  let index = 0;
  let values: string[] = [];
  let active = false;
  let swallowClick = false;

  const finish = (commit: boolean) => {
    clearTimeout(timer);
    if (active) {
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 0);
      opts.onScrub(null);
      if (commit && values[index] !== values[startIndex]) opts.onCommit(values[index]);
    }
    active = false;
    pointerId = -1;
  };

  const begin = () => {
    values = opts.values();
    const at = values.indexOf(opts.current());
    startIndex = index = at < 0 ? 0 : at;
    active = true;
    node.setPointerCapture?.(pointerId);
    opts.onTick();
    opts.onScrub({ values, index, rect: node.getBoundingClientRect() });
  };

  const down = (event: PointerEvent) => {
    if (event.button > 0 || pointerId !== -1) return;
    pointerId = event.pointerId;
    originY = event.clientY;
    timer = setTimeout(begin, HOLD_MS);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    if (!active) {
      if (Math.abs(event.clientY - originY) > SLOP_PX) finish(false);
      return;
    }
    event.preventDefault();
    const next = scrubIndex(startIndex, event.clientY - originY, values.length);
    if (next === index) return;
    index = next;
    opts.onTick();
    opts.onScrub({ values, index, rect: node.getBoundingClientRect() });
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId === pointerId) finish(true);
  };
  const cancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) finish(false);
  };
  const click = (event: MouseEvent) => {
    if (!swallowClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const menu = (event: Event) => {
    if (pointerId !== -1) event.preventDefault();
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && active) finish(false);
  };

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('click', click, true);
  node.addEventListener('contextmenu', menu);
  node.addEventListener('keydown', key);
  return {
    update(next: ScrubOptions) {
      opts = next;
    },
    destroy() {
      finish(false);
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('click', click, true);
      node.removeEventListener('contextmenu', menu);
      node.removeEventListener('keydown', key);
    },
  };
}
