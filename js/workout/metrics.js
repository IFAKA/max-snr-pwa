import { DEFAULT_WEEKLY_GOAL, normalizeWeeklyGoal } from '../state.js';
import { legacyCardioEquivalentMinutes, moderateEquivalentMinutes } from './health-metrics.js';
import { routineDurationEstimate } from './duration-estimator.js';

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

export function observedSessionDurations(history) {
  return (history || [])
    .map((workout) => {
      if (Number.isFinite(workout.durationMs) && workout.durationMs > 0)
        return workout.durationMs / 60000;
      const start = Number.isFinite(workout.startedAt)
        ? workout.startedAt
        : Date.parse(workout.date || '');
      const end = Date.parse(workout.completedAt || '');
      return Number.isFinite(start) && Number.isFinite(end) && end >= start
        ? (end - start) / 60000
        : null;
    })
    .filter((minutes) => minutes !== null);
}

export function sessionTimingComparison(history, estimatedMinutes) {
  const observed = observedSessionDurations(history);
  const sorted = [...observed].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const mean = observed.length
    ? observed.reduce((sum, value) => sum + value, 0) / observed.length
    : null;
  return {
    estimate: estimatedMinutes,
    observedCount: observed.length,
    mean,
    median,
    difference: mean === null ? null : mean - estimatedMinutes,
  };
}

export function weeklyGymAnalytics(state, now = new Date()) {
  const workouts = (state?.history || []).filter((workout) =>
    inCurrentWeek(workout.completedAt || workout.date, now),
  );
  const directSets = {};
  const fractionalSets = {};
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
      Object.entries(secondary).forEach(([muscle, value]) => {
        fractionalSets[muscle] = (fractionalSets[muscle] || 0) + value;
      });
      Object.entries({ ...primary, ...secondary }).forEach(([muscle, value]) => {
        effectiveSets[muscle] = (effectiveSets[muscle] || 0) + value;
      });
    }),
  );
  const activities = (state?.health?.activities || []).filter((activity) =>
    inCurrentWeek(activity.completedAt || activity.startedAt || activity.date, now),
  );
  const activityMinutes = (dimension) =>
    activities
      .filter(
        (activity) => activity.completed !== false && activity.dimensions?.includes(dimension),
      )
      .reduce(
        (sum, activity) => sum + Number(activity.durationMinutes || activity.minutes || 0),
        0,
      );
  const activityCardioEquivalent = activities
    .filter((activity) => activity.completed !== false && activity.dimensions?.includes('aerobic'))
    .reduce(
      (sum, activity) =>
        sum +
        moderateEquivalentMinutes(activity.durationMinutes || activity.minutes, activity.intensity),
      0,
    );
  return {
    sessions: workouts.length,
    minutes: Math.round(
      observedSessionDurations(workouts).reduce((sum, minutes) => sum + minutes, 0),
    ),
    directSets,
    fractionalSets,
    exerciseSets,
    effectiveSets,
    movementMinutes: (state?.health?.movementMinutes || [])
      .filter((entry) => inCurrentWeek(entry.date, now))
      .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0),
    cardioMinutes: (state?.health?.cardioMinutes || [])
      .filter((entry) => inCurrentWeek(entry.date, now))
      .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0),
    cardioEquivalent: legacyCardioEquivalentMinutes(state?.health?.cardioMinutes, (date) =>
      inCurrentWeek(date, now),
    ),
    estimatedRoutineMinutes: routineDurationEstimate(state),
    activityMinutes: activityMinutes('movement'),
    activityCardioEquivalent,
  };
}

export function healthCoverage(state, now = new Date()) {
  const metrics = weeklyGymAnalytics(state, now);
  return {
    resistanceDays: metrics.sessions,
    resistanceMet: metrics.sessions >= 2,
    aerobicEquivalentMinutes: metrics.cardioEquivalent + metrics.activityCardioEquivalent,
    aerobicMinimumMet: metrics.cardioEquivalent + metrics.activityCardioEquivalent >= 150,
    movementLogged: metrics.movementMinutes + metrics.activityMinutes > 0,
    sedentaryIndependent: sedentaryStatus(state).exposureClass === 'high',
  };
}

export function sedentaryStatus(state) {
  const sedentary = state?.health?.sedentary || {};
  const profileHours = Number(sedentary.profileHoursPerDay);
  const latest = sedentary.logs?.at(-1) || null;
  const highExposure = sedentary.exposureClass === 'high';
  return {
    profileHoursPerDay: Number.isFinite(profileHours) ? profileHours : null,
    exposureClass: highExposure ? 'high' : 'unclassified',
    latest,
    interruptions: Number(latest?.interruptions || 0),
    longestUninterruptedMinutes: Number(latest?.longestUninterruptedMinutes || 0),
    recommendation: highExposure
      ? 'Replace sitting with movement where practical: walk during calls or errands, stand or walk during natural work breaks, and use brief workday interruptions. Because exposure is high, aim for more than the minimum MVPA; no exact sitting or break threshold is prescribed.'
      : 'Limit sedentary time by replacing sitting with movement where practical.',
  };
}
