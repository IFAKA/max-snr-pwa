import { getState } from '../state.js';
import { save } from '../storage.js';
import { clearTimer } from './timers.js';
import { evaluateAndPersist } from './coordinator.js';
import { timeBudgetCutOrder } from './budget.js';
import { findNext, finishLifts } from './session.js';

export async function completeStretch() {
  const active = getState().active;
  if (!active) return false;
  return clearTimer();
}

export async function finishEarly() {
  const active = getState().active;
  if (!active) return false;
  active.tasks.forEach((task) => {
    if (!task.completed && !task.skipped) {
      task.skipped = true;
      task.skipReason = 'user';
    }
  });
  active.draft = {};
  active.restEndsAt = null;
  active.timerEndsAt = null;
  active.completedAt = new Date().toISOString();
  await finishWorkout();
  return true;
}

export async function finishAtBudget() {
  const active = getState().active;
  if (!active) return false;
  const cutIds = timeBudgetCutOrder(active);
  active.tasks.forEach((task) => {
    if (!task.completed && !task.skipped && cutIds.includes(task.exerciseId)) {
      task.skipped = true;
      task.skipReason = 'time-budget';
    }
  });
  active.draft = {};
  active.restEndsAt = null;
  active.timerEndsAt = null;
  const next = findNext(active.pos, true);
  if (next >= 0) active.pos = next;
  else await finishLifts();
  await save();
  return true;
}

export async function completeWorkout() {
  const active = getState().active;
  if (!active) return false;
  active.phase = 'complete';
  active.timerEndsAt = null;
  active.restEndsAt = null;
  active.completedAt ||= new Date().toISOString();
  await save();
  return true;
}

export async function finishWorkout() {
  const state = getState();
  if (!state.active) return false;
  delete state.active.note;
  state.active.completedAt ||= new Date().toISOString();
  const snapshot = {
    ...state.active,
    tasks: state.active.tasks.map((task) => ({
      ...task,
      completed: task.completed ? { ...task.completed } : null,
    })),
  };
  snapshot.durationMs = Math.max(0, Date.now() - (state.active.startedAt || Date.now()));
  delete snapshot.draft;
  delete snapshot.nextPos;
  delete snapshot.restEndsAt;
  delete snapshot.timerEndsAt;
  state.history.unshift(snapshot);
  state.active = null;
  await save();
  await evaluateAndPersist(state);
}

export async function cancelWorkout() {
  const state = getState();
  if (!state.active) return false;
  state.active = null;
  await save();
  return true;
}
