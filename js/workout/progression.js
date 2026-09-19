import { getState } from '../state.js';

export function parseRepRange(range) {
  const values =
    String(range || '')
      .match(/\d+/g)
      ?.map(Number) || [];
  return { lower: values[0] || 1, upper: values[1] || values[0] || 1 };
}

export function parseRirRange(range) {
  const values =
    String(range || '')
      .match(/\d+/g)
      ?.map(Number) || [];
  return {
    lower: values.length ? Math.min(...values) : null,
    upper: values.length ? Math.max(...values) : null,
  };
}

function rirMatchesTarget(rir, targetRir) {
  if (rir === undefined || rir === null || rir === '') return true;
  const actual = Number.parseInt(rir, 10);
  const target = parseRirRange(targetRir);
  return (
    Number.isFinite(actual) &&
    (target.lower === null || actual >= target.lower) &&
    (target.upper === null || actual <= target.upper)
  );
}

export function nextDoubleProgression({ load = 0, reps, targetRepRange, rir, increment = 2.5 }) {
  const { lower, upper } = parseRepRange(targetRepRange);
  const currentRir = Number.parseInt(rir, 10);
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

export function recommendDoubleProgression({
  load = 0,
  performances = [],
  prescribedSets,
  targetRepRange,
  targetRir,
  increment = 2.5,
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

export function lastActivePerformance(exerciseId, unit) {
  const tasks = getState().active?.tasks || [];
  return (
    tasks
      .filter((task) => task.exerciseId === exerciseId && task.completed?.unit === unit)
      .sort(
        (a, b) =>
          Date.parse(b.completed.completedAt || 0) - Date.parse(a.completed.completedAt || 0),
      )[0]?.completed || null
  );
}

export function lastExercisePerformances(exerciseId, unit) {
  const S = getState();
  for (const workout of S.history || []) {
    const performances = (workout.tasks || workout.queue || [])
      .filter((task) => task.exerciseId === exerciseId)
      .map((task) => task.completed)
      .filter((performance) => performance && (!unit || (performance.unit || 'kg') === unit))
      .sort((a, b) => Number(a.set || 0) - Number(b.set || 0));
    if (performances.length) return performances;
  }
  return [];
}

export function lastPerformance(name, unit, exerciseId) {
  const S = getState();
  for (const workout of S.history)
    for (const t of [...(workout.tasks || workout.queue || [])].reverse()) {
      const actual = t.performedName || t.name;
      if (actual !== name && (!exerciseId || t.exerciseId !== exerciseId)) continue;
      const performances =
        t.completed && !Array.isArray(t.completed)
          ? [t.completed]
          : t.completed?.length
            ? t.completed
            : t.done?.length
              ? t.done
              : [];
      const match = performances.find(
        (performance) => !unit || (performance.unit || 'kg') === unit,
      );
      if (match) return match;
    }
  return null;
}
