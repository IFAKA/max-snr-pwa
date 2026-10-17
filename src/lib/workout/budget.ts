import type { ActiveWorkout } from '../types.ts';
import { SESSION_CAP_MS, SESSION_TARGET_MS } from '../constants.ts';
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
