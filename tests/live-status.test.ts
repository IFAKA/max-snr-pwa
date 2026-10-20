import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { continueRest, start } from '../src/lib/workout/session.ts';
import { completeSet } from '../src/lib/workout/sets.ts';
import { adjustRest, setTimer } from '../src/lib/workout/timers.ts';
import { cancelWorkout } from '../src/lib/workout/finish.ts';
import { remainingWork } from '../src/lib/workout/budget.ts';
import { liveStatus, runNativeAction } from '../src/lib/workout-screens/live-status.ts';
import type { ActiveWorkout } from '../src/lib/types.ts';

const active = () => getState().active as ActiveWorkout;
const completed = () => active().tasks.filter((task) => task.completed).length;

async function logSet() {
  active().draft = { reps: 10, weight: '20', rir: '1' };
  await completeSet();
}

beforeEach(() => setState(emptyState()));

describe('lock-screen workout status', () => {
  test('nothing shows before a workout or after cancelling it', async () => {
    expect(liveStatus(getState())).toBeNull();
    await start('Monday');
    await cancelWorkout();
    expect(liveStatus(getState())).toBeNull();
  });

  test('lifting names the set, its planned values and the finish line', async () => {
    await start('Monday');
    const task = active().tasks[active().pos];
    const status = liveStatus(getState());
    expect(status).toMatchObject({
      endsAt: null,
      title: `${task.performedName} · set ${task.set} of ${task.sets}`,
      chip: `${task.set}/${task.sets}`,
      actions: ['log'],
    });
    expect(status?.progress).toMatch(/^(Exercise 1 of \d+|Last exercise) · ~\d+ min left$/);
  });

  test('rest counts down to the next set with Skip and Undo, then shows that set with Log set', async () => {
    await start('Monday');
    await logSet();
    const next = active().tasks[active().nextPos as number];
    const status = liveStatus(getState());
    expect(status).toMatchObject({
      endsAt: active().restEndsAt,
      title: 'Rest',
      actions: ['skip', 'undo'],
    });
    expect(status?.text).toContain(`Next: ${next.performedName}`);
    expect(status?.doneText).toContain(`set ${next.set} of ${next.sets}`);

    await adjustRest(15000);
    expect(liveStatus(getState())?.endsAt).toBe(active().restEndsAt);

    expect(status?.after).toMatchObject({
      title: `${next.performedName} · set ${next.set} of ${next.sets}`,
      actions: ['log'],
    });
    const over = liveStatus(getState(), (active().restEndsAt as number) + 1);
    expect(over).toMatchObject({ endsAt: null, title: status?.after?.title, actions: ['log'] });
  });

  test('stretch counts down with its own copy', async () => {
    await start('Monday');
    await setTimer(60000);
    expect(liveStatus(getState())).toMatchObject({
      title: 'Stretch',
      endsAt: active().timerEndsAt,
    });
  });
});

describe('notification buttons', () => {
  test('Log set saves the planned values and starts rest', async () => {
    await start('Monday');
    expect(await runNativeAction('log')).toBe(true);
    expect(active().phase).toBe('rest');
    expect(completed()).toBe(1);
  });

  test('Undo set and Skip rest act like their on-screen buttons', async () => {
    await start('Monday');
    await logSet();
    expect(await runNativeAction('undo')).toBe(true);
    expect(completed()).toBe(0);
    expect(active().phase).toBe('lifting');

    await logSet();
    expect(await runNativeAction('skip')).toBe(true);
    expect(active().phase).not.toBe('rest');
  });

  test('Log set after a rest the page slept through moves on and logs the next set', async () => {
    await start('Monday');
    await logSet();
    active().restEndsAt = Date.now() - 1;
    expect(await runNativeAction('log')).toBe(true);
    expect(completed()).toBe(2);
    expect(active().phase).toBe('rest');
  });

  test('a stale button does nothing', async () => {
    await start('Monday');
    expect(await runNativeAction('skip')).toBe(false);
    expect(await runNativeAction('undo')).toBe(false);
    expect(completed()).toBe(0);
  });
});

describe('remaining work', () => {
  test('counts down as sets are done', async () => {
    await start('Monday');
    const before = remainingWork(active());
    expect(before.exercise).toBe(1);
    expect(before.exercises).toBeGreaterThan(0);
    await logSet();
    await continueRest();
    expect(remainingWork(active()).minutesLeft).toBeLessThan(before.minutesLeft);
  });
});
