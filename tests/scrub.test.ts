import { describe, expect, it } from 'vitest';
import { scrubIndex, scrubSteps, SCRUB_STEP_PX } from '../src/lib/browser/scrub-math.ts';

describe('value scrub', () => {
  it('drags up to raise and down to lower, one step per stride', () => {
    expect(scrubSteps(0)).toBe(0);
    expect(scrubSteps(-SCRUB_STEP_PX)).toBe(1);
    expect(scrubSteps(SCRUB_STEP_PX * 2)).toBe(-2);
  });

  it('speeds up further from the start', () => {
    expect(scrubSteps(-SCRUB_STEP_PX * 5)).toBe(7);
  });

  it('stays inside the list', () => {
    expect(scrubIndex(1, SCRUB_STEP_PX * 9, 4)).toBe(0);
    expect(scrubIndex(2, -SCRUB_STEP_PX * 9, 4)).toBe(3);
  });
});
