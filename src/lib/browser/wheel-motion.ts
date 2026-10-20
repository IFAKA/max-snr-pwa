// The physics of a picker wheel, as the platform's own pickers do it: the wheel follows the
// finger, keeps the release speed and slows down exponentially, and the end point is chosen at
// release (the nearest value to where it would coast to) so it settles on a value without a jump.
// Pure functions; the component runs the frames.

/** How long the coasting takes to fade (ms), as in iOS-style kinetic scrolling. */
export const COAST_MS = 325;
/** Past either end the wheel moves at this fraction of the finger, then springs back. */
const RUBBER = 0.35;
/** Release speeds below this (px/ms) settle on the nearest value without coasting. */
const MIN_FLING = 0.15;
/** Only the last moments of a drag decide the release speed. */
const SAMPLE_MS = 100;

export interface Sample {
  at: number;
  y: number;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** A dragged offset, resisting past the ends. */
export function rubberBand(offset: number, max: number) {
  if (offset < 0) return offset * RUBBER;
  if (offset > max) return max + (offset - max) * RUBBER;
  return offset;
}

/** The finger's speed at release in px/ms (positive when moving down the screen). */
export function releaseVelocity(samples: readonly Sample[], now: number) {
  const recent = samples.filter((sample) => now - sample.at <= SAMPLE_MS);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const time = last.at - first.at;
  return time > 0 ? (last.y - first.y) / time : 0;
}

/** Where a release at this offset and wheel speed (px/ms) comes to rest: always on a value. */
export function settleTarget(offset: number, velocity: number, row: number, count: number) {
  const coast = Math.abs(velocity) < MIN_FLING ? 0 : velocity * COAST_MS;
  return clamp(Math.round((offset + coast) / row), 0, count - 1) * row;
}

/** The offset t ms into a settle from `from` to `to`, easing out exponentially. */
export function settleAt(from: number, to: number, elapsed: number) {
  const left = (to - from) * Math.exp(-elapsed / COAST_MS);
  return Math.abs(left) < 0.5 ? to : to - left;
}

/** A value's look at a distance from the band, in rows: full size in the band, then receding. */
export function rollStyle(distance: number) {
  const d = Math.min(Math.abs(distance), 3);
  if (d <= 1) return { scale: 1 - 0.3 * d, opacity: 1 - 0.45 * d };
  return { scale: 0.7 - 0.075 * (d - 1), opacity: 0.55 - 0.15 * (d - 1) };
}
