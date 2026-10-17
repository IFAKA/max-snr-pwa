import type { ActiveWorkout, Performance, Task } from '../types.ts';
import { REST_MS } from '../constants.ts';
import { nextSupersetRoundIndex, supersetPartnerIndex, taskGroup } from './superset.ts';

/** The step an action leads to, worked out without changing the workout. */
export type StepPreview =
  | { phase: 'lifting'; task: Task }
  | { phase: 'rest'; next: Task; restMs: number }
  | { phase: 'stretch' };

const open = (task: Task) => !task.completed && !task.skipped;

/** The first open set after `from` (wrapping), skipping deferred groups unless included. */
export function openTaskAfter(active: ActiveWorkout, from: number, includeDeferred = false) {
  const { tasks } = active;
  if (!tasks.length) return -1;
  const startAt = from < 0 ? 0 : (from + 1) % tasks.length;
  for (let offset = 0; offset < tasks.length; offset++) {
    const index = (startAt + offset) % tasks.length;
    const task = tasks[index];
    const deferred = active.deferredGroups?.includes(taskGroup(task) as string);
    if (open(task) && (includeDeferred || !deferred)) return index;
  }
  return -1;
}

const following = (active: ActiveWorkout) => {
  const normal = openTaskAfter(active, active.pos);
  return normal >= 0 ? normal : openTaskAfter(active, -1, true);
};

/** Where logging the current set leads, following the same rules as `completeSet`. */
export function previewLog(active: ActiveWorkout): StepPreview {
  const task = active.tasks[active.pos];
  if (!task) return { phase: 'stretch' };
  const done = { ...task, completed: { reps: 0, completedAt: '' } as Performance };
  const after = { ...active, tasks: active.tasks.map((item) => (item === task ? done : item)) };
  const rest = (index: number): StepPreview => ({
    phase: 'rest',
    next: active.tasks[index],
    restMs: task.restMs || REST_MS,
  });
  if (task.groupType === 'superset') {
    const partner = supersetPartnerIndex(after, done);
    if (partner >= 0) return { phase: 'lifting', task: active.tasks[partner] };
    const round = nextSupersetRoundIndex(after, done);
    if (round >= 0) return rest(round);
  }
  const index = following(after);
  return index < 0 ? { phase: 'stretch' } : rest(index);
}

/** Where ending the rest leads, following `continueRest` and `resolveDeferred`. */
export function previewSkipRest(active: ActiveWorkout): StepPreview {
  let index = Number.isInteger(active.nextPos) ? (active.nextPos as number) : following(active);
  const task = active.tasks[index];
  if (task && active.deferredGroups?.includes(taskGroup(task) as string))
    index = openTaskAfter(active, -1, true);
  return index < 0 || !active.tasks[index]
    ? { phase: 'stretch' }
    : { phase: 'lifting', task: active.tasks[index] };
}

/** The set "Undo Last Set" reopens: the most recently completed one. */
export function previewUndo(active: ActiveWorkout): StepPreview | null {
  const completedAt = (task: Task) =>
    Date.parse((task.completed as Performance).completedAt || '0');
  const latest = active.tasks
    .filter((task) => task.completed)
    .sort((a, b) => completedAt(b) - completedAt(a))[0];
  return latest ? { phase: 'lifting', task: latest } : null;
}
