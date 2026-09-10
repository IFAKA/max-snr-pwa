import { getState } from '../state.js';

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

export function progressionSuggestion(name, unit = 'kg') {
  const S = getState();
  for (const workout of S.history) {
    const sets = (workout.tasks || []).filter(
      (t) =>
        (t.performedName || t.name) === name && t.completed && (t.completed.unit || 'kg') === unit,
    );
    if (!sets.length) continue;
    const upper = Number((sets[0].reps || '').split('–')[1] || 0);
    const increment = unit === 'lb' ? 5 : 2.5;
    if (
      upper &&
      sets.length >= sets[0].sets &&
      sets.every((t) => t.completed.reps >= upper && Number(t.completed.rir) <= 2)
    )
      return Number((Math.max(...sets.map((t) => t.completed.weight)) + increment).toFixed(2));
  }
  return null;
}
