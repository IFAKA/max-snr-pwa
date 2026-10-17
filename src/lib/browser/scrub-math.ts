import { magneticJoystickSpeed } from '#picker/magnetic-picker.js';

export const SCRUB_STEP_PX = 28;
/** Up to this far from the press, the value follows the thumb one step per stride. */
export const FINE_STEPS = 3;
const FINE_PX = FINE_STEPS * SCRUB_STEP_PX;
/** Past the fine zone the app's list picker curve applies: 4 rows/s rising to 16 over 64px. */
const RAMP_PX = 64;
const MAX_STEPS_PER_SECOND = 16;

/** Steps for the fine zone of a drag; a positive delta (the thumb moving up) raises the value. */
export function scrubSteps(deltaY: number) {
  const steps = Math.min(Math.abs(deltaY), FINE_PX) / SCRUB_STEP_PX;
  return Math.sign(deltaY) * Math.floor(steps) + 0;
}

/** Steps per second past the fine zone: none inside it, then ramping up like a joystick. */
export function scrubRate(deltaY: number) {
  return (
    magneticJoystickSpeed(deltaY, SCRUB_STEP_PX, FINE_PX, MAX_STEPS_PER_SECOND, FINE_PX + RAMP_PX) +
    0
  );
}

export const scrubIndex = (start: number, deltaY: number, drift: number, length: number) =>
  Math.max(0, Math.min(length - 1, start + scrubSteps(deltaY) + Math.round(drift)));
