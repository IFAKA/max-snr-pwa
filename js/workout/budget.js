import { SESSION_CAP_MS, SESSION_TARGET_MS } from '../constants.js';
import { getState } from '../state.js';

export const sessionElapsedMs = (active = getState().active, now = Date.now()) =>
  active?.startedAt ? Math.max(0, now - active.startedAt) : 0;

export const sessionBudgetState = (active = getState().active, now = Date.now()) => {
  const elapsedMs = sessionElapsedMs(active, now);
  const capMs = active?.sessionCapMs || SESSION_CAP_MS;
  return {
    elapsedMs,
    targetReached: elapsedMs >= (active?.sessionTargetMs || SESSION_TARGET_MS),
    capReached: elapsedMs >= capMs,
  };
};

export const timeBudgetCutOrder = (active = getState().active) =>
  [
    ...new Set(
      (active?.tasks || []).filter((task) => task.cutPriority).map((task) => task.exerciseId),
    ),
  ].sort((a, b) => {
    const first = active.tasks.find((task) => task.exerciseId === a)?.cutPriority || 99;
    const second = active.tasks.find((task) => task.exerciseId === b)?.cutPriority || 99;
    return first - second;
  });
