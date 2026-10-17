import type { AppState, MuscleMap, Workout } from '../types.ts';
import { DEFAULT_WEEKLY_GOAL, normalizeWeeklyGoal } from '../constants.ts';
import { legacyCardioEquivalentMinutes, moderateEquivalentMinutes } from './health-metrics.ts';
import { durationFromRecord, routineDurationEstimate } from './duration-estimator.ts';

export function mondayStart(date: Date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

export function completedWorkoutsThisWeek(history: Workout[] | undefined, now = new Date()) {
  const start = mondayStart(now).getTime();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return (history || []).filter((workout) => {
    const timestamp = Date.parse(workout.completedAt || workout.date || '');
    return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end.getTime();
  }).length;
}

export function weeklyGoalSummary(state: AppState | undefined, now = new Date()) {
  const goal = normalizeWeeklyGoal(state?.settings?.weeklyGoal ?? DEFAULT_WEEKLY_GOAL);
  const completed = completedWorkoutsThisWeek(state?.history, now);
  return { completed, goal, percentage: Math.min(100, Math.round((completed / goal) * 100)) };
}

export function phaseProgress(phase: string) {
  if (phase === 'warmup' || phase === 'plank') return { step: 1, total: 3, label: 'Warm-up' };
  if (phase === 'lifting' || phase === 'rest') return { step: 2, total: 3, label: 'Lifting' };
  return { step: 3, total: 3, label: 'Cooldown and review' };
}

const inCurrentWeek = (date: string | undefined, now: Date) => {
  const time = Date.parse(date || '');
  return Number.isFinite(time) && time >= mondayStart(now).getTime();
};

export function observedSessionDurations(history: Workout[] | undefined) {
  return (history || [])
    .map(durationFromRecord)
    .filter((minutes): minutes is number => minutes !== null);
}

export function sessionTimingComparison(history: Workout[], estimatedMinutes: number) {
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

function muscleSets(workouts: Workout[]) {
  const directSets: MuscleMap = {};
  const fractionalSets: MuscleMap = {};
  const exerciseSets: MuscleMap = {};
  const effectiveSets: MuscleMap = {};
  const add = (target: MuscleMap, muscle: string, value: number) => {
    target[muscle] = (target[muscle] || 0) + value;
  };
  workouts.forEach((workout) =>
    (workout.tasks || []).forEach((task) => {
      if (!task.completed || task.skipped) return;
      add(exerciseSets, task.exerciseId, 1);
      const primary = task.primary || {};
      const secondary = task.secondary || {};
      Object.entries(primary).forEach(([muscle, value]) => add(directSets, muscle, value));
      Object.entries(secondary).forEach(([muscle, value]) => add(fractionalSets, muscle, value));
      Object.entries({ ...primary, ...secondary }).forEach(([muscle, value]) =>
        add(effectiveSets, muscle, value),
      );
    }),
  );
  return { directSets, fractionalSets, exerciseSets, effectiveSets };
}

export function weeklyGymAnalytics(state: AppState | undefined, now = new Date()) {
  const workouts = (state?.history || []).filter((workout) =>
    inCurrentWeek(workout.completedAt || workout.date, now),
  );
  const activities = (state?.health?.activities || []).filter((activity) =>
    inCurrentWeek(activity.completedAt || activity.startedAt || activity.date, now),
  );
  const done = activities.filter((activity) => activity.completed !== false);
  const activityMinutes = (dimension: string) =>
    done
      .filter((activity) => activity.dimensions?.includes(dimension))
      .reduce(
        (sum, activity) => sum + Number(activity.durationMinutes || activity.minutes || 0),
        0,
      );
  const activityCardioEquivalent = done
    .filter((activity) => activity.dimensions?.includes('aerobic'))
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
    ...muscleSets(workouts),
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

export function sedentaryStatus(state: AppState | undefined) {
  const sedentary: Partial<AppState['health']['sedentary']> = state?.health?.sedentary || {};
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

export function healthCoverage(state: AppState | undefined, now = new Date()) {
  const metrics = weeklyGymAnalytics(state, now);
  const aerobic = metrics.cardioEquivalent + metrics.activityCardioEquivalent;
  return {
    resistanceDays: metrics.sessions,
    resistanceMet: metrics.sessions >= 2,
    aerobicEquivalentMinutes: aerobic,
    aerobicMinimumMet: aerobic >= 150,
    movementLogged: metrics.movementMinutes + metrics.activityMinutes > 0,
    sedentaryIndependent: sedentaryStatus(state).exposureClass === 'high',
  };
}
