import { ROUTINE, NAMES } from '../routine-data.js';
import { getState } from '../state.js';
import { save } from '../storage.js';
import { dayNow, buzz } from '../dom.js';
import { flatten } from './task-factory.js';
import { beginLifting, continueRest as advanceRest, startRest } from './timers.js';

export function start(day = dayNow()) { const S = getState(); if (!ROUTINE[day]) return false; if (S.active && !confirm('A workout is already in progress.\n\nStart a new workout and discard it?')) return false; S.active = {id: Date.now(), date: new Date().toISOString(), day, name: NAMES[day], tasks: flatten(ROUTINE[day]), pos: 0, phase: 'warmup', deferredGroups: [], draft: {}, restEndsAt: null, timerEndsAt: null}; save(); return true; }
export const activeTask = () => { const a = getState().active; return a?.tasks[a.pos]; };
export const totalSets = () => getState().active?.tasks.length || 0;
export const completedSets = () => getState().active?.tasks.filter(t => t.completed).length || 0;
const taskGroup = t => t?.groupId || t?.exerciseId || t?.id;
export const groupDeferred = t => t && getState().active.deferredGroups.includes(taskGroup(t));
export function findNext(from = getState().active.pos, includeDeferred = false) { const a = getState().active; if (!a?.tasks.length) return -1; const start = from < 0 ? 0 : (from + 1) % a.tasks.length; for (let offset = 0; offset < a.tasks.length; offset++) { const i = (start + offset) % a.tasks.length; if (!a.tasks[i].completed && (includeDeferred || !groupDeferred(a.tasks[i]))) return i; } return -1; }
const nextPosition = () => { const normal = findNext(); return normal >= 0 ? normal : findNext(-1, true); };
export function skipPlank() { buzz([25, 45, 25]); beginLifting(); }
export { beginLifting, startRest };
export function continueRest() { const pos = advanceRest(nextPosition); if (pos < 0 || groupDeferred(getState().active.tasks[pos])) return resolveDeferred(); getState().active.phase = 'lifting'; save(); return {render: true}; }
export function finishLifts() { const a = getState().active; a.phase = 'stretch'; a.timerEndsAt = null; a.restEndsAt = null; save(); }
export function resolveDeferred() { const pos = findNext(-1, true); if (pos < 0) return finishLifts(); const a = getState().active; a.phase = 'lifting'; a.pos = pos; a.draft = {}; save(); return {render: true}; }
export function completeSet() { const S = getState(), a = S.active, t = activeTask(), d = a.draft || {}, weight = Number(d.weight), reps = Number(d.reps), rir = d.rir ?? '1'; if (!t || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) return {error: 'Enter a weight and whole-number reps before completing the set.'}; t.completed = {weight, reps, rir, completedAt: new Date().toISOString(), actualName: t.performedName, originalName: t.originalName}; a.draft = {}; buzz([25, 45, 25]); const next = a.pos + 1 < a.tasks.length ? a.pos + 1 : -1, nextTask = next >= 0 ? a.tasks[next] : null, partner = t.groupType === 'superset' && nextTask?.groupId === t.groupId && nextTask?.set === t.set; save(); if (partner) { a.pos = next; save(); return {render: true}; } const following = nextPosition(); if (following < 0) finishLifts(); else startRest(following); return {render: true}; }
export function deferCurrent() { const a = getState().active, t = activeTask(); if (!a || !t) return; const group = taskGroup(t), moved = a.tasks.filter(x => taskGroup(x) === group && !x.completed), remaining = a.tasks.filter(x => !moved.includes(x)); a.tasks = [...remaining, ...moved]; a.deferredGroups = a.deferredGroups.filter(id => id !== group); a.pos = remaining.length && a.pos < remaining.length ? a.pos : 0; a.draft = {}; save(); }
export function clearDeferred() { const a = getState().active; a.deferredGroups = a.deferredGroups.filter(id => id !== taskGroup(activeTask())); a.phase = 'lifting'; a.draft = {}; save(); }
export function skipDeferred() { const a = getState().active, group = taskGroup(activeTask()); a.tasks.filter(x => taskGroup(x) === group && !x.completed).forEach(x => { x.skipped = true; }); a.deferredGroups = a.deferredGroups.filter(id => id !== group); const next = findNext(a.pos, true); if (next >= 0) { a.pos = next; save(); } else finishLifts(); }
export function completeStretch() { const a = getState().active; a.phase = 'complete'; a.completedAt = new Date().toISOString(); save(); }
export function finishWorkout() { const S = getState(), snapshot = {...S.active, tasks: S.active.tasks.map(t => ({...t, completed: t.completed ? {...t.completed} : null}))}; delete snapshot.draft; delete snapshot.nextPos; delete snapshot.restEndsAt; delete snapshot.timerEndsAt; S.history.unshift(snapshot); S.active = null; save(); }
export function cancelWorkout() { const S = getState(); if (!confirm('Cancel workout?\n\nYour current workout will be discarded.\nPrevious workout history won\'t be affected.')) return false; S.active = null; save(); return true; }
