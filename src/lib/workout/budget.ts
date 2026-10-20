import type { ActiveWorkout } from '../types.ts';
import { REST_MS, SESSION_CAP_MS, SESSION_TARGET_MS, STRETCH_MS } from '../constants.ts';
import { getState } from '../state.ts';

type Session = Pick<ActiveWorkout, 'startedAt' | 'sessionCapMs' | 'sessionTargetMs' | 'tasks'>;

export const sessionElapsedMs = (
  active: Partial<Session> | null | undefined = getState().active,
  now = Date.now(),
) => (active?.startedAt ? Math.max(0, now - active.startedAt) : 0);

export const sessionBudgetState = (
  active: Partial<Session> | null | undefined = getState().active,
  now = Date.now(),
) => {
  const elapsedMs = sessionElapsedMs(active, now);
  const capMs = active?.sessionCapMs || SESSION_CAP_MS;
  return {
    elapsedMs,
    targetReached: elapsedMs >= (active?.sessionTargetMs || SESSION_TARGET_MS),
    capReached: elapsedMs >= capMs,
  };
};

export const timeBudgetCutOrder = (
  active: Partial<Session> | null | undefined = getState().active,
) => {
  const tasks = active?.tasks || [];
  const priority = (exerciseId: string) =>
    tasks.find((task) => task.exerciseId === exerciseId)?.cutPriority || 99;
  return [...new Set(tasks.filter((task) => task.cutPriority).map((task) => task.exerciseId))].sort(
    (a, b) => priority(a) - priority(b),
  );
};

// A working set, from picking up the weight to putting it down, takes about this long.
const SET_WORK_MS = 45000;

/**
 * How far the workout is from done, honestly estimated so the finish line stays visible: which
 * exercise this is out of how many, and the minutes the sets left, their rests and the cooldown
 * stretch take. Skipped exercises do not count.
 */
export const remainingWork = (active: ActiveWorkout, now = Date.now()) => {
  const counted = active.tasks.filter((task) => task.completed || !task.skipped);
  const exercises = [...new Set(counted.map((task) => task.exerciseId))];
  const done = exercises.filter((id) =>
    counted.every((task) => task.exerciseId !== id || task.completed),
  ).length;
  const open = counted.filter((task) => !task.completed);
  const setsMs = open.reduce((sum, task) => sum + SET_WORK_MS + (task.restMs || REST_MS), 0);
  const lastRest = open.length ? open.at(-1)?.restMs || REST_MS : 0;
  const restLeft = active.phase === 'rest' ? Math.max(0, (active.restEndsAt || now) - now) : 0;
  const stretchLeft =
    active.phase === 'stretch' ? Math.max(0, (active.timerEndsAt || now) - now) : STRETCH_MS;
  return {
    exercise: Math.min(done + 1, exercises.length),
    exercises: exercises.length,
    lastExercise: exercises.length - done <= 1,
    minutesLeft: Math.max(1, Math.ceil((setsMs - lastRest + restLeft + stretchLeft) / 60000)),
  };
};
