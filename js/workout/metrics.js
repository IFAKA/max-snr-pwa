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
  return (history || []).filter(workout => {
    const timestamp = Date.parse(workout.completedAt || workout.date || '');
    return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end.getTime();
  }).length;
}

export function weeklyGoalSummary(state, now = new Date()) {
  const goal = normalizeWeeklyGoal(state?.settings?.weeklyGoal ?? DEFAULT_WEEKLY_GOAL);
  const completed = completedWorkoutsThisWeek(state?.history, now);
  return {completed, goal, percentage: Math.min(100, Math.round(completed / goal * 100))};
}

export function phaseProgress(phase) {
  if (phase === 'warmup' || phase === 'plank') return {step: 1, total: 3, label: 'Warm-up'};
  if (phase === 'lifting' || phase === 'rest') return {step: 2, total: 3, label: 'Lifting'};
  return {step: 3, total: 3, label: 'Cooldown and review'};
}
