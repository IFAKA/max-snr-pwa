import type { ActiveWorkout, Task } from '../types.ts';
import { dayItems, isWorkoutDay, workoutName } from '../routine/routine-data.ts';
import { getState } from '../state.ts';
import { persist } from '../storage/persistence.ts';
import { SESSION_CAP_MS, SESSION_TARGET_MS } from '../constants.ts';
import { flatten } from './task-factory.ts';
import { beginLifting, continueRest as advanceRest, startRest } from './timers.ts';
import { setSupersetLead, taskGroup } from './superset.ts';
import { dayNow } from './calendar.ts';
import { openTaskAfter } from './next-step.ts';
import { restartPlanForDay } from './rotation.ts';

export { sessionBudgetState, sessionElapsedMs, timeBudgetCutOrder } from './budget.ts';
export { supersetProgress } from './superset.ts';
export { beginLifting, startRest };

const current = () => getState().active as ActiveWorkout;

/**
 * Starts a workout for the day, replacing any active one. Callers confirm replacement first.
 * A restart day ("Restart", "Restart at home") starts its fixed routine instead of a program day.
 */
export async function start(day = dayNow()) {
  const state = getState();
  const restart = restartPlanForDay(day);
  if (!restart && !isWorkoutDay(day)) return false;
  const tasks = flatten(restart ? restart.routine : dayItems(day));
  if (!tasks.length) return false;
  // Ids identify saved workouts (summary, reopen), so they must never repeat.
  const lastId = Math.max(0, ...state.history.map((workout) => Number(workout.id) || 0));
  state.active = {
    id: Math.max(Date.now(), lastId + 1),
    date: new Date().toISOString(),
    startedAt: Date.now(),
    day,
    name: restart ? restart.name : workoutName(day),
    tasks,
    pos: 0,
    phase: 'lifting',
    deferredGroups: [],
    supersetLeads: {},
    draft: {},
    restEndsAt: null,
    timerEndsAt: null,
    sessionTargetMs: SESSION_TARGET_MS,
    sessionCapMs: SESSION_CAP_MS,
  };
  await persist();
  return true;
}

export const activeTask = (): Task | undefined => {
  const active = getState().active;
  return active?.tasks[active.pos];
};
export const totalSets = () => getState().active?.tasks.length || 0;
export const completedSets = () =>
  getState().active?.tasks.filter((task) => task.completed).length || 0;
export const skippedSets = () =>
  getState().active?.tasks.filter((task) => task.skipped).length || 0;
export const groupDeferred = (task: Task | undefined) =>
  Boolean(task && current().deferredGroups.includes(taskGroup(task) as string));

const open = (task: Task) => !task.completed && !task.skipped;

export function findNext(from = current().pos, includeDeferred = false) {
  const active = getState().active;
  return active ? openTaskAfter(active, from, includeDeferred) : -1;
}

export const nextPosition = () => {
  const normal = findNext();
  return normal >= 0 ? normal : findNext(-1, true);
};

export async function skipPlank() {
  await beginLifting();
}

export async function finishLifts() {
  const active = current();
  active.phase = 'stretch';
  active.timerEndsAt = null;
  active.restEndsAt = null;
  await persist();
}

export async function resolveDeferred() {
  const pos = findNext(-1, true);
  if (pos < 0) return finishLifts();
  const active = current();
  active.phase = 'lifting';
  active.pos = pos;
  active.deferredGroups = active.deferredGroups.filter((id) => id !== taskGroup(active.tasks[pos]));
  active.draft = {};
  await persist();
  return { render: true };
}

export async function continueRest() {
  const pos = await advanceRest(nextPosition);
  if (pos < 0) return finishLifts();
  if (groupDeferred(current().tasks[pos])) return resolveDeferred();
  current().phase = 'lifting';
  await persist();
  return { render: true };
}

export const exerciseSelectionLocked = (active: ActiveWorkout | null | undefined) => {
  if (!active) return true;
  if (active.phase === 'warmup') return false;
  if (!['lifting', 'rest'].includes(active.phase)) return true;
  if (active.phase !== 'lifting') return false;
  const task = active.tasks[active.pos];
  if (!task) return false;
  const currentStarted = active.tasks.some(
    (candidate) => candidate.exerciseId === task.exerciseId && candidate.completed,
  );
  const currentSupersetRoundStarted =
    task.groupType === 'superset' &&
    active.tasks.some(
      (candidate) =>
        candidate.groupId === task.groupId && candidate.set === task.set && candidate.completed,
    );
  return currentStarted || currentSupersetRoundStarted;
};

export const exerciseChangeAvailable = (active: ActiveWorkout | null | undefined) => {
  if (!active || exerciseSelectionLocked(active)) return false;
  const task = active.tasks[active.pos];
  return active.tasks.some(
    (candidate) => candidate.exerciseId !== task?.exerciseId && open(candidate),
  );
};

export async function selectExercise(exerciseId: string) {
  const active = current();
  if (exerciseSelectionLocked(active)) return false;
  const task = active.tasks[active.pos];
  const pos = active.tasks.findIndex(
    (candidate) => candidate.exerciseId === exerciseId && open(candidate),
  );
  if (pos < 0) return false;
  const selected = active.tasks[pos];
  if (
    active.phase === 'lifting' &&
    task &&
    task.groupType !== 'superset' &&
    active.tasks.some(
      (candidate) => candidate.exerciseId === task.exerciseId && candidate.completed,
    )
  )
    return false;
  if (selected.groupType === 'superset') setSupersetLead(active, selected);
  if (active.phase === 'rest') active.nextPos = pos;
  else active.pos = pos;
  active.deferredGroups = active.deferredGroups.filter((id) => id !== taskGroup(active.tasks[pos]));
  active.draft = {};
  await persist();
  return true;
}
