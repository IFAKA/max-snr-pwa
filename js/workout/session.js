import { dayItems, isWorkoutDay, workoutName } from '../routine-data.js';
import { getState } from '../state.js';
import { save } from '../storage.js';
import { dayNow, buzz } from '../dom.js';
import { flatten } from './task-factory.js';
import { beginLifting, clearTimer, continueRest as advanceRest, startRest } from './timers.js';
import { evaluateAndPersist } from './coordinator.js';

const taskGroup = (task) => task?.groupId || task?.exerciseId || task?.id;
const supersetLead = (active, groupId) =>
  Number.isInteger(active?.supersetLeads?.[groupId]) ? active.supersetLeads[groupId] : 0;
const setSupersetLead = (active, task) => {
  if (task?.groupType !== 'superset' || !task.groupId) return;
  active.supersetLeads ||= {};
  active.supersetLeads[task.groupId] = task.memberIndex;
};
const sameSupersetRound = (candidate, task) =>
  candidate?.groupType === 'superset' &&
  task?.groupType === 'superset' &&
  candidate.groupId === task.groupId &&
  candidate.set === task.set;
const supersetPartnerIndex = (active, task) =>
  active?.tasks.findIndex(
    (candidate) =>
      sameSupersetRound(candidate, task) &&
      candidate.memberIndex !== task.memberIndex &&
      !candidate.completed &&
      !candidate.skipped,
  ) ?? -1;
const nextSupersetRoundIndex = (active, task) => {
  if (task?.groupType !== 'superset') return -1;
  const lead = supersetLead(active, task.groupId);
  const candidates = active.tasks
    .map((candidate, index) => ({ candidate, index }))
    .filter(
      ({ candidate }) =>
        candidate.groupId === task.groupId &&
        candidate.set > task.set &&
        !candidate.completed &&
        !candidate.skipped,
    )
    .sort(
      (a, b) =>
        a.candidate.set - b.candidate.set || a.candidate.memberIndex - b.candidate.memberIndex,
    );
  return (
    candidates.find((item) => item.candidate.memberIndex === lead)?.index ??
    candidates[0]?.index ??
    -1
  );
};

export async function start(day = dayNow()) {
  const state = getState();
  if (!isWorkoutDay(day)) return false;
  if (
    state.active &&
    !confirm('A workout is already in progress.\n\nStart a new workout and discard it?')
  )
    return false;
  const tasks = flatten(dayItems(day));
  if (!tasks.length) return false;
  state.active = {
    id: Date.now(),
    date: new Date().toISOString(),
    startedAt: Date.now(),
    day,
    name: workoutName(day),
    tasks,
    pos: 0,
    phase: 'lifting',
    deferredGroups: [],
    supersetLeads: {},
    draft: {},
    restEndsAt: null,
    timerEndsAt: null,
  };
  await save();
  return true;
}

export const activeTask = () => {
  const active = getState().active;
  return active?.tasks[active.pos];
};
export const totalSets = () => getState().active?.tasks.length || 0;
export const completedSets = () =>
  getState().active?.tasks.filter((task) => task.completed).length || 0;
export const skippedSets = () =>
  getState().active?.tasks.filter((task) => task.skipped).length || 0;
export const groupDeferred = (task) =>
  Boolean(task && getState().active.deferredGroups.includes(taskGroup(task)));

export function findNext(from = getState().active.pos, includeDeferred = false) {
  const active = getState().active;
  if (!active?.tasks.length) return -1;
  const startAt = from < 0 ? 0 : (from + 1) % active.tasks.length;
  for (let offset = 0; offset < active.tasks.length; offset++) {
    const index = (startAt + offset) % active.tasks.length;
    const task = active.tasks[index];
    if (!task.completed && !task.skipped && (includeDeferred || !groupDeferred(task))) return index;
  }
  return -1;
}

const nextPosition = () => {
  const normal = findNext();
  return normal >= 0 ? normal : findNext(-1, true);
};

export async function skipPlank() {
  await beginLifting();
}
export { beginLifting, startRest };

export async function continueRest() {
  const pos = await advanceRest(nextPosition);
  if (pos < 0) return finishLifts();
  if (groupDeferred(getState().active.tasks[pos])) return resolveDeferred();
  getState().active.phase = 'lifting';
  await save();
  return { render: true };
}

export async function finishLifts() {
  const active = getState().active;
  active.phase = 'stretch';
  active.timerEndsAt = null;
  active.restEndsAt = null;
  await save();
}

export async function resolveDeferred() {
  const pos = findNext(-1, true);
  if (pos < 0) return finishLifts();
  const active = getState().active;
  active.phase = 'lifting';
  active.pos = pos;
  active.deferredGroups = active.deferredGroups.filter((id) => id !== taskGroup(active.tasks[pos]));
  active.draft = {};
  await save();
  return { render: true };
}

export const exerciseSelectionLocked = (active) => {
  if (!active) return true;
  if (active.phase === 'warmup') return false;
  if (!['lifting', 'rest'].includes(active.phase)) return true;
  const current = active.tasks[active.pos];
  const currentStarted = Boolean(
    current &&
    active.tasks.some((task) => task.exerciseId === current.exerciseId && task.completed),
  );
  const currentSupersetRoundStarted = Boolean(
    current?.groupType === 'superset' &&
    active.tasks.some(
      (task) => task.groupId === current.groupId && task.set === current.set && task.completed,
    ),
  );
  return (
    (currentStarted && active.phase === 'lifting') ||
    (currentSupersetRoundStarted && active.phase === 'lifting')
  );
};

export const exerciseChangeAvailable = (active) => {
  if (!active || exerciseSelectionLocked(active)) return false;
  const current = active.tasks[active.pos];
  return active.tasks.some(
    (task) => task.exerciseId !== current?.exerciseId && !task.completed && !task.skipped,
  );
};

export async function selectExercise(exerciseId) {
  const active = getState().active;
  if (exerciseSelectionLocked(active)) return false;
  const current = active.tasks[active.pos];
  const pos = active.tasks.findIndex(
    (task) => task.exerciseId === exerciseId && !task.completed && !task.skipped,
  );
  if (pos < 0) return false;
  const selected = active.tasks[pos];
  if (
    active.phase === 'lifting' &&
    current &&
    current.groupType !== 'superset' &&
    active.tasks.some((task) => task.exerciseId === current.exerciseId && task.completed)
  )
    return false;
  if (selected.groupType === 'superset') setSupersetLead(active, selected);
  if (active.phase === 'rest') active.nextPos = pos;
  else active.pos = pos;
  active.deferredGroups = active.deferredGroups.filter((id) => id !== taskGroup(active.tasks[pos]));
  active.draft = {};
  await save();
  return true;
}

export async function completeSet() {
  const state = getState(),
    active = state.active,
    task = activeTask(),
    draft = active.draft || {};
  const repsText = String(draft.reps ?? '').trim();
  const weightText = String(draft.weight ?? '').trim();
  const reps = Number(repsText);
  const hasWeight = draft.weight !== undefined && draft.weight !== '';
  const weight = hasWeight ? Number(weightText) : null;
  const validWeight =
    !hasWeight ||
    (/^\d+(?:\.\d{1,2})?$/.test(weightText) && Number.isFinite(weight) && weight >= 0);
  if (
    !task ||
    !/^\d+$/.test(repsText) ||
    !Number.isInteger(reps) ||
    reps < 1 ||
    (hasWeight && !validWeight)
  )
    return {
      error:
        hasWeight && !validWeight
          ? 'Enter a valid load with up to 2 decimals.'
          : 'Enter whole-number reps.',
    };
  task.completed = {
    reps,
    completedAt: new Date().toISOString(),
    actualName: task.performedName,
    originalName: task.originalName,
    targetRepRange: task.targetRepRange || task.reps,
  };
  if (hasWeight) {
    task.completed.weight = weight;
    task.completed.unit = state.settings?.unit || 'kg';
  }
  if (draft.rir !== undefined) task.completed.rir = draft.rir;
  active.draft = {};
  buzz([25, 45, 25]);
  if (task.groupType === 'superset') {
    const partner = supersetPartnerIndex(active, task);
    if (partner >= 0) {
      setSupersetLead(active, task);
      active.pos = partner;
      await save();
      return { render: true };
    }
    const nextRound = nextSupersetRoundIndex(active, task);
    if (nextRound >= 0) {
      await startRest(nextRound);
      return { render: true };
    }
  }
  const following = nextPosition();
  if (following < 0) await finishLifts();
  else await startRest(following);
  return { render: true };
}

export async function deferCurrent() {
  const active = getState().active,
    task = activeTask();
  if (!active || !task) return;
  const group = taskGroup(task);
  const moved = active.tasks.filter(
    (item) => taskGroup(item) === group && !item.completed && !item.skipped,
  );
  const remaining = active.tasks.filter((item) => !moved.includes(item));
  active.tasks = [...remaining, ...moved];
  if (!active.deferredGroups.includes(group)) active.deferredGroups.push(group);
  active.pos = active.tasks.findIndex(
    (item) => !item.completed && !item.skipped && taskGroup(item) !== group,
  );
  if (active.pos < 0) {
    active.pos = active.tasks.findIndex((item) => !item.completed && !item.skipped);
    active.deferredGroups = active.deferredGroups.filter((id) => id !== group);
  }
  active.draft = {};
  await save();
}

export async function substituteCurrent(name) {
  const active = getState().active,
    current = activeTask();
  const choices = [current?.originalName, ...(current?.alternatives || [])];
  if (!active || !current || !choices.includes(name)) return false;
  active.tasks
    .filter((task) => task.exerciseId === current.exerciseId && !task.completed && !task.skipped)
    .forEach((task) => {
      task.performedName = name;
    });
  active.draft = {};
  await save();
  return true;
}

export async function undoLastSet() {
  const active = getState().active;
  if (!active) return false;
  const completed = active.tasks
    .map((task, index) => ({ task, index }))
    .filter((item) => item.task.completed)
    .sort(
      (a, b) =>
        Date.parse(b.task.completed.completedAt || 0) -
        Date.parse(a.task.completed.completedAt || 0),
    )[0];
  if (!completed) return false;
  const previous = completed.task.completed;
  completed.task.completed = null;
  active.pos = completed.index;
  active.phase = 'lifting';
  active.restEndsAt = null;
  active.timerEndsAt = null;
  active.nextPos = null;
  active.draft = { weight: previous.weight ?? '', reps: previous.reps, rir: previous.rir };
  await save();
  return true;
}

export async function completeStretch() {
  const active = getState().active;
  if (!active) return false;
  return clearTimer();
}

export async function finishEarly() {
  const active = getState().active;
  if (!active) return false;
  active.tasks.forEach((task) => {
    if (!task.completed && !task.skipped) task.skipped = true;
  });
  active.draft = {};
  active.restEndsAt = null;
  active.timerEndsAt = null;
  active.completedAt = new Date().toISOString();
  await finishWorkout();
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
