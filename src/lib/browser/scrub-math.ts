export const SCRUB_STEP_PX = 28;
const FAST_AFTER_STEPS = 3;

/** Steps to move for a vertical drag: 1:1 near the start, twice as fast further out. */
export function scrubSteps(deltaY: number) {
  const distance = Math.abs(deltaY) / SCRUB_STEP_PX;
  const steps =
    distance <= FAST_AFTER_STEPS ? distance : FAST_AFTER_STEPS + (distance - FAST_AFTER_STEPS) * 2;
  // Dragging up raises the value, like pushing a wheel away.
  return Math.sign(-deltaY) * Math.floor(steps) + 0;
}

export const scrubIndex = (start: number, deltaY: number, length: number) =>
  Math.max(0, Math.min(length - 1, start + scrubSteps(deltaY)));
