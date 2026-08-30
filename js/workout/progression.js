import { getState } from '../state.js';

export function lastPerformance(name) {
  const S = getState();
  for (const workout of S.history) for (const t of workout.tasks || workout.queue || []) {
    const actual = t.performedName || t.name;
    if (actual !== name) continue;
    if (t.completed && !Array.isArray(t.completed)) return t.completed;
    if (t.completed?.length) return t.completed[t.completed.length - 1];
    if (t.done?.length) return t.done[t.done.length - 1];
  }
  return null;
}

export function progressionSuggestion(name) {
  const S = getState();
  for (const workout of S.history) {
    const sets = (workout.tasks || []).filter(t => (t.performedName || t.name) === name && t.completed);
    if (!sets.length) continue;
    const upper = Number((sets[0].reps || '').split('–')[1] || 0);
    if (upper && sets.length >= sets[0].sets && sets.every(t => t.completed.reps >= upper && Number(t.completed.rir) <= 2)) return Number((Math.max(...sets.map(t => t.completed.weight)) + 2.5).toFixed(2));
  }
  return null;
}
