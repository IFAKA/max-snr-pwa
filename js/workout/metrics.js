import { DEFAULT_WEEKLY_GOAL, normalizeWeeklyGoal } from '../state.js';

function mondayStart(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

export function completedWorkoutsThisWeek(history, now = new Date()) {
  const start = mondayStart(now).getTime();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return (history || []).filter((workout) => {
    const timestamp = Date.parse(workout.completedAt || workout.date || '');
    return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end.getTime();
  }).length;
}

export function weeklyGoalSummary(state, now = new Date()) {
  const goal = normalizeWeeklyGoal(state?.settings?.weeklyGoal ?? DEFAULT_WEEKLY_GOAL);
  const completed = completedWorkoutsThisWeek(state?.history, now);
  return { completed, goal, percentage: Math.min(100, Math.round((completed / goal) * 100)) };
}

export function phaseProgress(phase) {
  if (phase === 'warmup' || phase === 'plank') return { step: 1, total: 3, label: 'Warm-up' };
  if (phase === 'lifting' || phase === 'rest') return { step: 2, total: 3, label: 'Lifting' };
  return { step: 3, total: 3, label: 'Cooldown and review' };
}

const currentWeek = (value = new Date()) => mondayStart(value).getTime();
const inCurrentWeek = (date, now) => {
  const time = Date.parse(date || '');
  return Number.isFinite(time) && time >= currentWeek(now);
};

export function weeklyGymAnalytics(state, now = new Date()) {
  const workouts = (state?.history || []).filter((workout) =>
    inCurrentWeek(workout.completedAt || workout.date, now),
  );
  const directSets = {};
  const exerciseSets = {};
  const effectiveSets = {};
  workouts.forEach((workout) =>
    (workout.tasks || []).forEach((task) => {
      if (!task.completed || task.skipped) return;
      exerciseSets[task.exerciseId] = (exerciseSets[task.exerciseId] || 0) + 1;
      const primary = task.primary || {};
      const secondary = task.secondary || {};
      Object.entries(primary).forEach(([muscle, value]) => {
        directSets[muscle] = (directSets[muscle] || 0) + value;
      });
      Object.entries({ ...primary, ...secondary }).forEach(([muscle, value]) => {
        effectiveSets[muscle] = (effectiveSets[muscle] || 0) + value;
      });
    }),
  );
  return {
    sessions: workouts.length,
    minutes: Math.round(
      workouts.reduce((sum, workout) => sum + (workout.durationMs || 0), 0) / 60000,
    ),
    directSets,
    exerciseSets,
    effectiveSets,
    movementMinutes: (state?.health?.movementMinutes || [])
      .filter((entry) => inCurrentWeek(entry.date, now))
      .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0),
    cardioMinutes: (state?.health?.cardioMinutes || [])
      .filter((entry) => inCurrentWeek(entry.date, now))
      .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0),
    cardioEquivalent: (state?.health?.cardioMinutes || [])
      .filter((entry) => inCurrentWeek(entry.date, now))
      .reduce(
        (sum, entry) => sum + Number(entry.minutes || 0) * (entry.intensity === 'vigorous' ? 2 : 1),
        0,
      ),
  };
}

export function healthCoverage(state, now = new Date()) {
  const metrics = weeklyGymAnalytics(state, now);
  return {
    resistanceDays: metrics.sessions,
    resistanceMet: metrics.sessions >= 2,
    aerobicEquivalentMinutes: metrics.cardioEquivalent,
    aerobicMinimumMet: metrics.cardioEquivalent >= 150,
    movementLogged: metrics.movementMinutes > 0,
  };
}
