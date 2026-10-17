import type { Activity, Performance, Task, Workout } from '../types.ts';

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
  (workout.tasks || workout.queue || []).forEach((task, index) => {
    const name = task.performedName || task.name || 'Exercise';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)?.push(setLine(task, index));
  });
  return [...groups].map(([name, lines]) => ({ name, lines }));
}

export const workoutDate = (workout: Workout) =>
  workout.date ? new Date(workout.date).toLocaleDateString() : 'Saved workout';

export function activityLine(activity: Activity) {
  const date = activity.completedAt || activity.startedAt || activity.date;
  return {
    date: date ? new Date(date).toLocaleDateString() : 'Saved activity',
    label: activity.type === 'measurement' ? 'Check-in' : activity.type,
    metric: activity.durationMinutes ? ` · ${activity.durationMinutes} min` : '',
  };
}
