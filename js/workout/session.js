import { ROUTINE, NAMES } from '../routine-data.js';
import { getState } from '../state.js';
import { save } from '../storage.js';
import { dayNow, buzz } from '../dom.js';
import { flatten } from './task-factory.js';
import { beginLifting, continueRest as advanceRest, startRest } from './timers.js';

const taskGroup = task => task?.groupId || task?.exerciseId || task?.id;

export async function start(day = dayNow()) {
  const state = getState();
  if (!ROUTINE[day]) return false;
  if (state.active && !confirm('A workout is already in progress.\n\nStart a new workout and discard it?')) return false;
  state.active = {id: Date.now(), date: new Date().toISOString(), day, name: NAMES[day], tasks: flatten(ROUTINE[day]), pos: 0, phase: 'warmup', deferredGroups: [], draft: {}, restEndsAt: null, timerEndsAt: null};
  await save();
  return true;
}

export const activeTask = () => { const active = getState().active; return active?.tasks[active.pos]; };
export const totalSets = () => getState().active?.tasks.length || 0;
export const completedSets = () => getState().active?.tasks.filter(task => task.completed).length || 0;
export const skippedSets = () => getState().active?.tasks.filter(task => task.skipped).length || 0;
export const groupDeferred = task => Boolean(task && getState().active.deferredGroups.includes(taskGroup(task)));

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

const nextPosition = () => { const normal = findNext(); return normal >= 0 ? normal : findNext(-1, true); };

export async function skipPlank() { await beginLifting(); }
export { beginLifting, startRest };

export async function continueRest() {
  const pos = await advanceRest(nextPosition);
  if (pos < 0) return finishLifts();
  if (groupDeferred(getState().active.tasks[pos])) return resolveDeferred();
  getState().active.phase = 'lifting';
  await save();
  return {render: true};
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
  active.deferredGroups = active.deferredGroups.filter(id => id !== taskGroup(active.tasks[pos]));
  active.draft = {};
  await save();
  return {render: true};
}

export async function selectExercise(exerciseId) {
  const active = getState().active;
  if (!active || active.phase !== 'lifting') return false;
  const pos = active.tasks.findIndex(task => task.exerciseId === exerciseId && !task.completed && !task.skipped);
  if (pos < 0) return false;
  active.pos = pos;
  active.deferredGroups = active.deferredGroups.filter(id => id !== taskGroup(active.tasks[pos]));
  active.draft = {};
  await save();
  return true;
}

export async function completeSet() {
  const state = getState(), active = state.active, task = activeTask(), draft = active.draft || {};
  const weight = Number(draft.weight), reps = Number(draft.reps), rir = draft.rir ?? '1';
  if (!task || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) return {error: 'Enter a weight and whole-number reps before completing the set.'};
  task.completed = {weight, reps, rir, unit: state.settings?.unit || 'kg', completedAt: new Date().toISOString(), actualName: task.performedName, originalName: task.originalName};
  active.draft = {};
  buzz([25, 45, 25]);
  const next = active.pos + 1 < active.tasks.length ? active.pos + 1 : -1;
  const nextTask = next >= 0 ? active.tasks[next] : null;
  const partner = task.groupType === 'superset' && nextTask?.groupId === task.groupId && nextTask?.set === task.set && !nextTask.completed && !nextTask.skipped;
  if (partner) {
    active.pos = next;
    await save();
    return {render: true};
  }
  const following = nextPosition();
  if (following < 0) await finishLifts();
  else await startRest(following);
  return {render: true};
}

export async function deferCurrent() {
  const active = getState().active, task = activeTask();
  if (!active || !task) return;
  const group = taskGroup(task);
  const moved = active.tasks.filter(item => taskGroup(item) === group && !item.completed && !item.skipped);
  const remaining = active.tasks.filter(item => !moved.includes(item));
  active.tasks = [...remaining, ...moved];
  if (!active.deferredGroups.includes(group)) active.deferredGroups.push(group);
  active.pos = active.tasks.findIndex(item => !item.completed && !item.skipped && taskGroup(item) !== group);
  if (active.pos < 0) {
    active.pos = active.tasks.findIndex(item => !item.completed && !item.skipped);
    active.deferredGroups = active.deferredGroups.filter(id => id !== group);
  }
  active.draft = {};
  await save();
}

export async function substituteCurrent(name) {
  const active = getState().active, current = activeTask();
  const choices = [current?.originalName, ...(current?.alternatives || [])];
  if (!active || !current || !choices.includes(name)) return false;
  active.tasks.filter(task => task.exerciseId === current.exerciseId && !task.completed && !task.skipped).forEach(task => { task.performedName = name; });
  active.draft = {};
  await save();
  return true;
}

export async function skipCurrent() {
  const active = getState().active, current = activeTask();
  if (!active || !current) return;
  const group = taskGroup(current);
  active.tasks.filter(task => taskGroup(task) === group && !task.completed).forEach(task => { task.skipped = true; });
  active.deferredGroups = active.deferredGroups.filter(id => id !== group);
  active.draft = {};
  const next = findNext(active.pos, true);
  if (next < 0) await finishLifts();
  else {
    active.pos = next;
    active.phase = 'lifting';
    await save();
  }
}

export async function undoLastSet() {
  const active = getState().active;
  if (!active) return false;
  const completed = active.tasks.map((task, index) => ({task, index})).filter(item => item.task.completed).sort((a, b) => Date.parse(b.task.completed.completedAt || 0) - Date.parse(a.task.completed.completedAt || 0))[0];
  if (!completed) return false;
  const previous = completed.task.completed;
  completed.task.completed = null;
  active.pos = completed.index;
  active.phase = 'lifting';
  active.restEndsAt = null;
  active.timerEndsAt = null;
  active.nextPos = null;
  active.draft = {weight: previous.weight, reps: previous.reps, rir: previous.rir};
  await save();
  return true;
}

export async function completeStretch() {
  const active = getState().active;
  active.phase = 'complete';
  active.completedAt = new Date().toISOString();
  await save();
}

export async function finishEarly() {
  const active = getState().active;
  if (!active) return false;
  active.tasks.forEach(task => {
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
  state.active.completedAt ||= new Date().toISOString();
  const snapshot = {...state.active, tasks: state.active.tasks.map(task => ({...task, completed: task.completed ? {...task.completed} : null}))};
  delete snapshot.draft;
  delete snapshot.nextPos;
  delete snapshot.restEndsAt;
  delete snapshot.timerEndsAt;
  state.history.unshift(snapshot);
  state.active = null;
  await save();
}

export async function cancelWorkout() {
  const state = getState();
  if (!confirm('Discard workout?\n\nYour current workout and drafts will be removed. Completed workout history won\'t be affected.')) return false;
  state.active = null;
  await save();
  return true;
}
