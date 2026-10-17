import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { start } from '../src/lib/workout/session.ts';
import { completeSet } from '../src/lib/workout/sets.ts';
import {
  cancelWorkout,
  completeWorkout,
  finishEarly,
  finishWorkout,
  reopenWorkout,
} from '../src/lib/workout/finish.ts';
import { improvementCallouts } from '../src/lib/workout/summary.ts';
import { createDefaultPrescription } from '../src/lib/workout/program.ts';
import type { ActiveWorkout } from '../src/lib/types.ts';

const active = () => getState().active as ActiveWorkout;

async function logFirstSet(reps = '10', weight = '20') {
  active().draft = { reps, weight, rir: '1' };
  return completeSet();
}

beforeEach(() => {
  const state = emptyState();
  state.prescription = createDefaultPrescription({ profile: state.settings.profile });
  setState(state);
});

describe('finishing saves immediately (no unsaved review step)', () => {
  test('completing the cooldown moves the workout into history', async () => {
    await start('Monday');
    await logFirstSet();
    const saved = await completeWorkout();
    expect(saved?.name).toBe('Full body A');
    expect(getState().active).toBeNull();
    expect(getState().history[0].id).toBe(saved?.id);
    expect(getState().history[0].completedAt).toBeTruthy();
  });

  test('finish early saves completed sets and marks the rest skipped by the user', async () => {
    await start('Monday');
    await logFirstSet();
    const saved = await finishEarly();
    const tasks = getState().history[0].tasks;
    expect(saved).not.toBeNull();
    expect(tasks.filter((task) => task.completed)).toHaveLength(1);
    expect(tasks.filter((task) => task.skipped).every((task) => task.skipReason === 'user')).toBe(
      true,
    );
  });

  test('a workout left on the legacy review step is saved, not lost', async () => {
    await start('Monday');
    await logFirstSet();
    active().phase = 'complete';
    const saved = await finishWorkout();
    expect(saved?.phase).toBe('complete');
    expect(getState().history).toHaveLength(1);
  });

  test('cancel discards the active workout without touching history', async () => {
    await start('Monday');
    await logFirstSet();
    expect(await cancelWorkout()).toBe(true);
    expect(getState().active).toBeNull();
    expect(getState().history).toHaveLength(0);
  });
});

describe('reopen is the undo for finishing', () => {
  test('reopening after finish early resumes lifting with the auto-skipped sets open again', async () => {
    await start('Monday');
    await logFirstSet();
    const saved = await finishEarly();
    expect(await reopenWorkout(saved?.id as number)).toBe(true);
    expect(getState().history).toHaveLength(0);
    expect(active().phase).toBe('lifting');
    expect(active().tasks.some((task) => task.skipped)).toBe(false);
    expect(active().tasks.filter((task) => task.completed)).toHaveLength(1);
    expect(active().tasks[active().pos].completed).toBeNull();
  });

  test('reopening a fully finished workout returns to the cooldown', async () => {
    await start('Monday');
    active().tasks.forEach((task) => {
      task.completed = { reps: 10, completedAt: new Date().toISOString() };
    });
    const saved = await completeWorkout();
    expect(await reopenWorkout(saved?.id as number)).toBe(true);
    expect(active().phase).toBe('stretch');
  });

  test('only the latest saved workout can be reopened, and never over an active one', async () => {
    await start('Monday');
    const first = await completeWorkout();
    await start('Wednesday');
    const second = await completeWorkout();
    expect(await reopenWorkout(first?.id as number)).toBe(false);
    await start('Friday');
    expect(await reopenWorkout(second?.id as number)).toBe(false);
  });
});

test('improvement callouts compare against the previous session, not the saved one itself', async () => {
  await start('Monday');
  await logFirstSet('10', '20');
  await finishEarly();
  await start('Monday');
  await logFirstSet('12', '20');
  const saved = await finishEarly();
  expect(improvementCallouts(saved!, 'kg')).toEqual(['Cable Lateral Raise: +2 reps']);
});
