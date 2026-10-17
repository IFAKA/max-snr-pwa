import { describe, expect, it } from 'vitest';
import {
  FINE_STEPS,
  scrubIndex,
  scrubRate,
  scrubSteps,
  SCRUB_STEP_PX,
} from '../src/lib/browser/scrub-math.ts';

describe('value scrub', () => {
  it('a positive delta (dragging up) raises and a negative one lowers, one step per stride', () => {
    expect(scrubSteps(0)).toBe(0);
    expect(scrubSteps(SCRUB_STEP_PX)).toBe(1);
    expect(scrubSteps(-SCRUB_STEP_PX * 2)).toBe(-2);
  });

  it('keeps the fine zone to a few steps, then turns by itself', () => {
    expect(scrubSteps(SCRUB_STEP_PX * 10)).toBe(FINE_STEPS);
    expect(scrubRate(SCRUB_STEP_PX * FINE_STEPS)).toBe(0);
    expect(scrubRate(200)).toBeGreaterThan(0);
    expect(scrubRate(-200)).toBeLessThan(0);
    expect(Math.abs(scrubRate(220))).toBeGreaterThan(Math.abs(scrubRate(120)));
  });

  it('reaches the far end of a long list within a thumb sweep', () => {
    const seconds = 3;
    const rate = Math.abs(scrubRate(170));
    expect(rate * seconds).toBeGreaterThan(40);
  });

  it('stays inside the list', () => {
    expect(scrubIndex(1, -SCRUB_STEP_PX * 9, -50, 4)).toBe(0);
    expect(scrubIndex(2, SCRUB_STEP_PX * 9, 50, 4)).toBe(3);
  });
});
