import type { ActiveWorkout, Task, Workout } from '../types.ts';
import { getState } from '../state.ts';
import { persist } from '../storage/persistence.ts';
import { clearTimer } from './timers.ts';
import { evaluateAndPersist } from './coordinator.ts';
import { timeBudgetCutOrder } from './budget.ts';
import { findNext, finishLifts } from './session.ts';

const clearTimers = (active: ActiveWorkout) => {
  active.draft = {};
  active.restEndsAt = null;
  active.timerEndsAt = null;
};

export async function completeStretch() {
  if (!getState().active) return false;
  return clearTimer();
}

/** Moves the active workout into history and returns the saved record. */
export async function finishWorkout(): Promise<Workout | null> {
  const state = getState();
  const active = state.active;
  if (!active) return null;
  delete (active as { note?: unknown }).note;
  active.completedAt ||= new Date().toISOString();
  const {
    draft: _draft,
    nextPos: _nextPos,
    restEndsAt: _rest,
    timerEndsAt: _timer,
    ...rest
  } = active;
  const snapshot: Workout = {
    ...rest,
    phase: 'complete',
    tasks: active.tasks.map((task) => ({
      ...task,
      completed:
        task.completed && !Array.isArray(task.completed) ? { ...task.completed } : task.completed,
    })),
    durationMs: Math.max(0, Date.now() - (active.startedAt || Date.now())),
  };
  state.history.unshift(snapshot);
  state.active = null;
  await persist();
  await evaluateAndPersist(state);
  return snapshot;
}

/** Ends lifting after the cooldown and saves immediately; there is no unsaved review step. */
export async function completeWorkout() {
  const active = getState().active;
  if (!active) return null;
  clearTimers(active);
  active.completedAt ||= new Date().toISOString();
  return finishWorkout();
}

const skipOpen = (active: ActiveWorkout) => {
  active.tasks.forEach((task) => {
    if (!task.completed && !task.skipped) {
      task.skipped = true;
      task.skipReason = 'user';
    }
  });
};

/**
 * "Finish Early" during the lifts: the sets not done are skipped and the workout goes on to the
 * cooldown stretch, as after the last set; finishing the stretch saves it.
 */
export async function stretchEarly() {
  const active = getState().active;
  if (!active) return false;
  skipOpen(active);
  clearTimers(active);
  await finishLifts();
  return true;
}

export async function finishEarly() {
  const active = getState().active;
  if (!active) return null;
  skipOpen(active);
  clearTimers(active);
  active.completedAt = new Date().toISOString();
  return finishWorkout();
}

/**
 * Removes one saved workout (a test run, a mistake). Ids are never reused, so everything else in
 * History keeps its id; plans and progression are re-evaluated from what is left.
 */
export async function deleteWorkout(id: number) {
  const state = getState();
  const at = state.history.findIndex((workout) => workout.id === id);
  if (at < 0) return false;
  state.history.splice(at, 1);
  await persist();
  await evaluateAndPersist(state);
  return true;
}

/**
 * Undo for the completion screen: moves the latest saved workout back to active. Sets that
 * "Finish early" skipped become open again, so the workout resumes where it stopped.
 */
export async function reopenWorkout(id: number) {
  const state = getState();
  const latest = state.history[0];
  if (state.active || !latest || latest.id !== id) return false;
  const { durationMs: _duration, completedAt: _completedAt, ...rest } = latest;
  const tasks: Task[] = latest.tasks.map((task) => {
    if (task.skipReason !== 'user') return task;
    const { skipped: _skipped, skipReason: _reason, ...open } = task;
    return open;
  });
  const pos = tasks.findIndex((task) => !task.completed && !task.skipped);
  state.history.shift();
  state.active = {
    ...rest,
    tasks,
    pos: pos >= 0 ? pos : latest.pos,
    phase: pos >= 0 ? 'lifting' : 'stretch',
    draft: {},
    restEndsAt: null,
    timerEndsAt: null,
    nextPos: null,
  };
  await persist();
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
  clearTimers(active);
  const next = findNext(active.pos, true);
  if (next >= 0) active.pos = next;
  else await finishLifts();
  await persist();
  return true;
}

export async function cancelWorkout() {
  const state = getState();
  if (!state.active) return false;
  state.active = null;
  await persist();
  return true;
}
