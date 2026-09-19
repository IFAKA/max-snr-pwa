import { getState } from '../state.js';

export function parseRepRange(range) {
  const values =
    String(range || '')
      .match(/\d+/g)
      ?.map(Number) || [];
  return { lower: values[0] || 1, upper: values[1] || values[0] || 1 };
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
