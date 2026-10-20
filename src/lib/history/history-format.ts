import type { Activity, Performance, Task, Workout } from '../types.ts';
import { ACTIVITY_DEFINITIONS } from '../health/activity-data.ts';

export function performanceFor(task: Task): Performance | null {
  if (task.completed && !Array.isArray(task.completed)) return task.completed;
  if (Array.isArray(task.completed) && task.completed.length)
    return task.completed[task.completed.length - 1];
  if (Array.isArray(task.done) && task.done.length) return task.done[task.done.length - 1];
  return null;
}

export function setLine(task: Task, index: number) {
  if (task.skipped) return 'Skipped';
  const performance = performanceFor(task);
  if (!performance) return 'Not completed';
  const load =
    performance.weight === undefined
      ? ''
      : ` · ${performance.weight}\u00a0${performance.unit || 'kg'}`;
  return `Set ${task.set || index + 1} · ${performance.reps} reps${load}`;
}

/** Sets grouped by the exercise name actually performed, in workout order. */
export function exerciseGroups(workout: Workout) {
  const groups = new Map<string, string[]>();
  const ids = new Map<string, string>();
  (workout.tasks || workout.queue || []).forEach((task, index) => {
    const name = task.performedName || task.name || 'Exercise';
    if (!groups.has(name)) groups.set(name, []);
    if (!ids.has(name)) ids.set(name, task.exerciseId);
    groups.get(name)?.push(setLine(task, index));
  });
  return [...groups].map(([name, lines]) => ({ name, lines, exerciseId: ids.get(name) || '' }));
}

/** A short list date ("Oct 18"), with the year only when it is not this year, so the name fits. */
export function listDate(value: string | number, now = new Date()) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

export const workoutDate = (workout: Workout) =>
  workout.date ? listDate(workout.date) : 'Saved workout';

export function activityLine(activity: Activity) {
  const date = activity.completedAt || activity.startedAt || activity.date;
  const waist = activity.measurements?.waist;
  return {
    date: date ? listDate(date) : 'Saved activity',
    label: ACTIVITY_DEFINITIONS[activity.type]?.title || activity.type,
    metric: activity.durationMinutes
      ? `${activity.durationMinutes}\u00a0min`
      : waist
        ? `Waist ${waist}`
        : '',
  };
}

/** A camelCase data key as words: `upperChest` → "Upper chest". */
export function readableKey(key: string) {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
