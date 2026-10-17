import { describe, expect, it } from 'vitest';
import { startsAtEdge, swipeArmed, swipeProgress } from '../src/lib/browser/swipe-log.ts';

describe('swipe to log', () => {
  it('measures progress as a share of the button width and ignores leftward drags', () => {
    expect(swipeProgress(50, 200)).toBe(0.25);
    expect(swipeProgress(400, 200)).toBe(1);
    expect(swipeProgress(-30, 200)).toBe(0);
    expect(swipeProgress(10, 0)).toBe(0);
  });

  it('arms only past 40% of the width, or on a deliberate flick at release', () => {
    expect(swipeArmed(70, 200)).toBe(false);
    expect(swipeArmed(80, 200)).toBe(true);
    expect(swipeArmed(60, 200, 80)).toBe(true);
    expect(swipeArmed(60, 200, 400)).toBe(false);
    expect(swipeArmed(30, 200, 10)).toBe(false);
  });

  it('ignores touches that start at the screen edge, where Android back lives', () => {
    expect(startsAtEdge(8, 360)).toBe(true);
    expect(startsAtEdge(352, 360)).toBe(true);
    expect(startsAtEdge(120, 360)).toBe(false);
  });
});
