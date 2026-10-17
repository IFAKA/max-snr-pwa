export const SCRUB_STEP_PX = 28;
/** Up to this far from the press, the value follows the thumb one step per stride. */
export const FINE_STEPS = 3;
const FINE_PX = FINE_STEPS * SCRUB_STEP_PX;
/** Full speed is reached one thumb-length further out, so any list is a short sweep away. */
const RAMP_PX = 80;
const MAX_STEPS_PER_SECOND = 16;

/** Steps for the fine zone of a vertical drag. Dragging up raises the value. */
export function scrubSteps(deltaY: number) {
  const steps = Math.min(Math.abs(deltaY), FINE_PX) / SCRUB_STEP_PX;
  return Math.sign(-deltaY) * Math.floor(steps) + 0;
}

/** Steps per second past the fine zone: none inside it, then ramping up like a joystick. */
export function scrubRate(deltaY: number) {
  const beyond = Math.abs(deltaY) - FINE_PX;
  if (beyond <= 0) return 0;
  const speed = Math.min(1, beyond / RAMP_PX) ** 2 * MAX_STEPS_PER_SECOND;
  return Math.sign(-deltaY) * speed;
}

export const scrubIndex = (start: number, deltaY: number, drift: number, length: number) =>
  Math.max(0, Math.min(length - 1, start + scrubSteps(deltaY) + Math.round(drift)));
