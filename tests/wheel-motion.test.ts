import { describe, expect, test } from 'vitest';
import {
  releaseVelocity,
  rollStyle,
  rubberBand,
  settleAt,
  settleTarget,
} from '../src/lib/browser/wheel-motion.ts';

describe('picker wheel physics', () => {
  test('a slow release settles on the nearest value', () => {
    expect(settleTarget(120, 0.05, 52, 20)).toBe(104);
    expect(settleTarget(140, 0, 52, 20)).toBe(156);
  });

  test('a flick coasts on in its direction and still lands on a value, within the ends', () => {
    const target = settleTarget(104, 2, 52, 100);
    expect(target).toBeGreaterThan(104 + 52 * 5);
    expect(target % 52).toBe(0);
    expect(settleTarget(104, 20, 52, 10)).toBe(52 * 9);
    expect(settleTarget(104, -20, 52, 10)).toBe(0);
  });

  test('the release speed comes from the last moments of the drag', () => {
    const samples = [
      { at: 0, y: 0 },
      { at: 500, y: 10 },
      { at: 550, y: 60 },
      { at: 600, y: 110 },
    ];
    expect(releaseVelocity(samples, 600)).toBeCloseTo(1);
    expect(releaseVelocity(samples, 900)).toBe(0);
  });

  test('settling eases out and ends exactly on the target', () => {
    expect(settleAt(0, 520, 0)).toBe(0);
    const first = settleAt(0, 520, 100);
    const later = settleAt(0, 520, 300) - settleAt(0, 520, 200);
    expect(first).toBeGreaterThan(0);
    expect(later).toBeLessThan(first);
    expect(settleAt(0, 520, 5000)).toBe(520);
  });

  test('past the ends the wheel resists, and values recede from the band', () => {
    expect(rubberBand(-100, 500)).toBe(-35);
    expect(rubberBand(600, 500)).toBe(535);
    expect(rubberBand(200, 500)).toBe(200);
    expect(rollStyle(0)).toEqual({ scale: 1, opacity: 1 });
    expect(rollStyle(1).scale).toBeCloseTo(0.7);
    expect(rollStyle(-3)).toEqual(rollStyle(5));
  });
});
