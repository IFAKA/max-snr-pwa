import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { continueRest, start } from '../src/lib/workout/session.ts';
import { completeSet, undoLastSet } from '../src/lib/workout/sets.ts';
import { adjustRest, setTimer } from '../src/lib/workout/timers.ts';
import { cancelWorkout } from '../src/lib/workout/finish.ts';
import { nativeTimerFor } from '../src/lib/browser/native-app.ts';
import type { ActiveWorkout } from '../src/lib/types.ts';

const active = () => getState().active as ActiveWorkout;

async function logSet() {
  active().draft = { reps: 10, weight: '20', rir: '1' };
  await completeSet();
}

beforeEach(() => setState(emptyState()));

describe('native lock-screen timer', () => {
  test('nothing counts before a workout or while lifting', async () => {
    expect(nativeTimerFor(getState())).toBeNull();
    await start('Monday');
    expect(active().phase).toBe('lifting');
    expect(nativeTimerFor(getState())).toBeNull();
  });

  test('rest names the next set and rings at the persisted end time', async () => {
    await start('Monday');
    await logSet();
    const next = active().tasks[active().nextPos as number];
    const timer = nativeTimerFor(getState());
    expect(timer?.endsAt).toBe(active().restEndsAt);
    expect(timer?.title).toBe(`Rest · ${next.performedName}`);
    expect(timer?.text).toBe(`Next: set ${next.set} of ${next.sets}`);
    expect(timer?.doneTitle).toBe('Rest over');
  });

  test('±time moves it; skip, undo and cancel clear it', async () => {
    await start('Monday');
    await logSet();
    const before = active().restEndsAt as number;
    await adjustRest(15000);
    expect(nativeTimerFor(getState())?.endsAt).toBe(before + 15000);

    await continueRest();
    expect(nativeTimerFor(getState())).toBeNull();

    await logSet();
    await undoLastSet();
    expect(nativeTimerFor(getState())).toBeNull();

    await logSet();
    await cancelWorkout();
    expect(nativeTimerFor(getState())).toBeNull();
  });

  test('a finished rest no longer counts', async () => {
    await start('Monday');
    await logSet();
    expect(nativeTimerFor(getState(), (active().restEndsAt as number) + 1)).toBeNull();
  });

  test('stretch counts down with its own copy', async () => {
    await start('Monday');
    await setTimer(60000);
    expect(nativeTimerFor(getState())).toMatchObject({
      title: 'Stretch',
      doneTitle: 'Stretch done',
      endsAt: active().timerEndsAt,
    });
  });
});
