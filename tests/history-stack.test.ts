import { describe, expect, it } from 'vitest';
import {
  applyMove,
  stepsBackTo,
  stepsBackToToday,
  type HistoryStack,
} from '../src/lib/browser/history-stack.ts';

const walk = (...urls: string[]) =>
  urls.slice(1).reduce<HistoryStack>((stack, url) => applyMove(stack, { kind: 'push', url }), {
    urls: [urls[0]],
    index: 0,
  });

describe('history stack', () => {
  it('pushes, replaces and drops forward entries', () => {
    const stack = walk('/', '/history/', '/history/?view=daily');
    const back = applyMove(stack, { kind: 'pop', delta: -1, url: '/history/' });
    expect(back.index).toBe(1);
    const pushed = applyMove(back, { kind: 'push', url: '/history/?view=analytics' });
    expect(pushed.urls).toEqual(['/', '/history/', '/history/?view=analytics']);
    const replaced = applyMove(pushed, { kind: 'replace', url: '/history/?view=muscles' });
    expect(replaced).toEqual({ urls: ['/', '/history/', '/history/?view=muscles'], index: 2 });
  });

  it('starts over when back goes past what it knows', () => {
    expect(applyMove(walk('/workout/'), { kind: 'pop', delta: -1, url: '/' })).toEqual({
      urls: ['/'],
      index: 0,
    });
  });

  it('goes back to the parent only when it is the previous entry', () => {
    expect(stepsBackTo(walk('/', '/history/', '/history/?view=daily'), '/history/')).toBe(1);
    expect(stepsBackTo(walk('/history/?view=daily'), '/history/')).toBe(0);
  });

  it('unwinds a workout started from the routine back to Today', () => {
    const stack = walk('/', '/routine/', '/routine/?day=A', '/workout/?view=summary&id=3');
    expect(stepsBackToToday(stack)).toBe(3);
    expect(stepsBackToToday(walk('/'))).toBe(0);
    expect(stepsBackToToday(walk('/workout/'))).toBe(0);
  });
});
