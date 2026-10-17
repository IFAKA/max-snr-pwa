import type { Performance, Unit, Workout } from '../types.ts';
import { lastExercisePerformances } from './progression.ts';
import { formatDuration } from './timers.ts';

const single = (value: Workout['tasks'][number]['completed']) =>
  value && !Array.isArray(value) ? value : null;

/** Per-exercise gains versus the previous saved session of the same exercise. */
export function improvementCallouts(workout: Workout, unit: Unit) {
  const seen = new Set<string>();
  const callouts: string[] = [];
  workout.tasks.forEach((task) => {
    const completed = single(task.completed);
    if (!completed || seen.has(task.exerciseId)) return;
    const previousSets = lastExercisePerformances(task.exerciseId, unit, {
      excludeWorkoutId: workout.id,
    });
    const previous: Performance | undefined = previousSets[task.set - 1];
    if (!previous) return;
    const loadGain =
      completed.weight !== undefined &&
      previous.weight !== undefined &&
      completed.weight > previous.weight
        ? Number((completed.weight - previous.weight).toFixed(2))
        : 0;
    const repGain =
      Number(completed.reps) > Number(previous.reps) ? completed.reps - previous.reps : 0;
    if (!loadGain && !repGain) return;
    seen.add(task.exerciseId);
    const gain = loadGain ? `+${loadGain} ${unit}` : `+${repGain} rep${repGain === 1 ? '' : 's'}`;
    callouts.push(`${task.performedName}: ${gain}`);
  });
  return callouts;
}

export function workoutSummary(workout: Workout) {
  const completed = workout.tasks.filter((task) => task.completed).length;
  const skipped = workout.tasks.filter((task) => task.skipped).length;
  const duration = formatDuration(
    workout.durationMs ?? Math.max(0, Date.now() - (workout.startedAt || Date.now())),
  );
  return `${duration} · ${completed} sets completed${skipped ? ` · ${skipped} skipped` : ''}`;
}
