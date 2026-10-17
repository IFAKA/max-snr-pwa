import type { Performance, Task, Unit, Workout } from '../types.ts';
import { getState } from '../state.ts';

export function parseRepRange(range: unknown) {
  const values =
    String(range || '')
      .match(/\d+/g)
      ?.map(Number) || [];
  return { lower: values[0] || 1, upper: values[1] || values[0] || 1 };
}

export function parseRirRange(range: unknown) {
  const values =
    String(range || '')
      .match(/\d+/g)
      ?.map(Number) || [];
  return {
    lower: values.length ? Math.min(...values) : null,
    upper: values.length ? Math.max(...values) : null,
  };
}

function rirMatchesTarget(rir: unknown, targetRir: unknown) {
  if (rir === undefined || rir === null || rir === '') return true;
  const actual = Number.parseInt(String(rir), 10);
  const target = parseRirRange(targetRir);
  return (
    Number.isFinite(actual) &&
    (target.lower === null || actual >= target.lower) &&
    (target.upper === null || actual <= target.upper)
  );
}

export function nextDoubleProgression({
  load = 0,
  reps,
  targetRepRange,
  rir,
  increment = 2.5,
}: {
  load?: number;
  reps: number;
  targetRepRange: string;
  rir?: string | number;
  increment?: number;
}) {
  const { lower, upper } = parseRepRange(targetRepRange);
  const currentRir = Number.parseInt(String(rir), 10);
  if (Number.isFinite(reps) && reps >= upper && (!Number.isFinite(currentRir) || currentRir <= 2))
    return {
      action: 'increase-load',
      load: Number((Number(load || 0) + increment).toFixed(2)),
      reps: lower,
    };
  return {
    action: 'repeat-load',
    load: Number(load || 0),
    reps: Math.max(lower, Number(reps) || lower),
  };
}

/**
 * Double progression: load only goes up after every prescribed set of the last exposure reached
 * the top of the rep range at the target effort. A skipped, missing, or short set means repeat.
 */
export function recommendDoubleProgression({
  load = 0,
  performances = [],
  prescribedSets,
  targetRepRange,
  targetRir,
  increment = 2.5,
}: {
  load?: number;
  performances?: Array<Partial<Performance> | null | undefined>;
  prescribedSets?: number;
  targetRepRange?: string;
  targetRir?: string;
  increment?: number;
}) {
  const { lower, upper } = parseRepRange(targetRepRange);
  const setCount = prescribedSets || performances.length;
  const complete = performances.length >= setCount;
  const reachedUpper =
    complete &&
    performances.slice(0, setCount).every((performance) => {
      const reps = Number(performance?.reps);
      return (
        Number.isFinite(reps) && reps >= upper && rirMatchesTarget(performance?.rir, targetRir)
      );
    });
  return reachedUpper
    ? {
        action: 'increase-load',
        load: Number((Number(load || 0) + increment).toFixed(2)),
        reps: lower,
      }
    : { action: 'repeat-load', load: Number(load || 0), reps: lower };
}

const singlePerformance = (task: Task) =>
  task.completed && !Array.isArray(task.completed) ? task.completed : null;

export function lastActivePerformance(exerciseId: string, unit: Unit) {
  const tasks = getState().active?.tasks || [];
  return (
    tasks
      .filter((task) => task.exerciseId === exerciseId && singlePerformance(task)?.unit === unit)
      .sort(
        (a, b) =>
          Date.parse(singlePerformance(b)?.completedAt || '0') -
          Date.parse(singlePerformance(a)?.completedAt || '0'),
      )
      .map(singlePerformance)[0] || null
  );
}

/** Performances of the most recent saved workout that trained the exercise, by set order. */
export function lastExercisePerformances(
  exerciseId: string,
  unit?: Unit,
  { excludeWorkoutId }: { excludeWorkoutId?: number } = {},
): Performance[] {
  const S = getState();
  for (const workout of S.history || []) {
    if (excludeWorkoutId !== undefined && workout.id === excludeWorkoutId) continue;
    const performances = (workout.tasks || workout.queue || [])
      .filter((task) => task.exerciseId === exerciseId)
      .map(singlePerformance)
      .filter(
        (performance): performance is Performance =>
          Boolean(performance) && (!unit || (performance?.unit || 'kg') === unit),
      )
      .sort((a, b) => Number(a.set || 0) - Number(b.set || 0));
    if (performances.length) return performances;
  }
  return [];
}

const taskPerformances = (task: Task): Performance[] =>
  task.completed && !Array.isArray(task.completed)
    ? [task.completed]
    : Array.isArray(task.completed) && task.completed.length
      ? task.completed
      : task.done?.length
        ? task.done
        : [];

export function lastPerformance(name: string, unit?: Unit, exerciseId?: string) {
  const S = getState();
  for (const workout of S.history as Workout[])
    for (const t of [...(workout.tasks || workout.queue || [])].reverse()) {
      const actual = t.performedName || t.name;
      if (actual !== name && (!exerciseId || t.exerciseId !== exerciseId)) continue;
      const match = taskPerformances(t).find(
        (performance) => !unit || (performance.unit || 'kg') === unit,
      );
      if (match) return match;
    }
  return null;
}
