const WEEKLY_AEROBIC_MINUTES = 150;
const HIGH_SEDENTARY_HOURS = 8;
const STABILITY_DELTA = 10;
const MEASUREMENT_INTERVAL_DAYS = 14;
const MOVEMENT_TARGET_MINUTES = 20;
import { legacyCardioEquivalentMinutes, moderateEquivalentMinutes } from './health-metrics.js';
import { activityDurationEstimate } from './duration-estimator.js';

const dateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const monday = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  return value;
};

const inWeek = (value, now) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) && timestamp >= monday(now).getTime();
};

const completedToday = (history, day, now) =>
  (history || []).some(
    (item) =>
      item.completed !== false &&
      (item.completedAt || item.date) &&
      item.day === day &&
      dateKey(item.completedAt || item.date) === dateKey(now),
  );

const legacyMinutes = (state, key, now) =>
  (state?.health?.[key] || [])
    .filter((entry) => inWeek(entry.date, now))
    .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0);

export function bodyHealthSummary(state, now = new Date()) {
  const activities = state?.health?.activities || [];
  const cardio = activities.filter(
    (item) =>
      item.completed !== false &&
      item.dimensions?.includes('aerobic') &&
      inWeek(item.startedAt || item.date, now),
  );
  const cardioEquivalent =
    legacyCardioEquivalentMinutes(state?.health?.cardioMinutes, (date) => inWeek(date, now)) +
    cardio.reduce(
      (sum, activity) =>
        sum +
        moderateEquivalentMinutes(activity.durationMinutes || activity.minutes, activity.intensity),
      0,
    );
  const movementMinutes =
    legacyMinutes(state, 'movementMinutes', now) +
    activities
      .filter(
        (item) =>
          item.completed !== false &&
          item.dimensions?.includes('movement') &&
          inWeek(item.startedAt || item.date, now),
      )
      .reduce(
        (sum, activity) => sum + Number(activity.durationMinutes || activity.minutes || 0),
        0,
      );
  const sedentary = state?.health?.sedentary || {};
  const profileHours = Number(sedentary.profileHoursPerDay);
  const latest = sedentary.logs?.at(-1) || null;
  const sedentaryHours = Number.isFinite(Number(latest?.hours))
    ? Number(latest.hours)
    : Number.isFinite(profileHours)
      ? profileHours
      : null;
  const resistanceDays = (state?.history || []).filter(
    (item) => item.completed !== false && inWeek(item.completedAt || item.date, now),
  ).length;
  return {
    resistanceDays,
    resistanceMet: resistanceDays >= 2,
    aerobicEquivalent: cardioEquivalent,
    aerobicMet: cardioEquivalent >= WEEKLY_AEROBIC_MINUTES,
    movementMinutes,
    sedentaryHours,
    sedentaryHigh: sedentaryHours !== null && sedentaryHours >= HIGH_SEDENTARY_HOURS,
    measurements: state?.health?.measurements || [],
  };
}

function describeDeficits(activity, aerobicDeficit, movementDeficit, sedentaryHigh) {
  const reasons = [];
  if (activity.dimensions.includes('aerobic') && aerobicDeficit > 0) reasons.push('cardio');
  if (activity.dimensions.includes('movement') && movementDeficit > 0)
    reasons.push('daily movement');
  if (activity.dimensions.includes('sedentary') && sedentaryHigh) reasons.push('sitting time');
  if (!reasons.length) return `${activity.title} keeps you moving today.`;
  const list =
    reasons.length > 1 ? `${reasons.slice(0, -1).join(', ')} and ${reasons.at(-1)}` : reasons[0];
  return `Your ${list} need${reasons.length > 1 ? '' : 's'} attention this week.`;
}

function candidates(summary, { resistanceDue = false, measurementDue = false, state } = {}) {
  const result = [];
  if (resistanceDue)
    result.push({
      type: 'resistance',
      title: 'Resistance',
      metric: 'Full body',
      durationMinutes: null,
      score: 100,
      reason: 'Your resistance session is scheduled for today.',
    });
  const aerobicDeficit = Math.max(0, WEEKLY_AEROBIC_MINUTES - summary.aerobicEquivalent);
  const movementDeficit = Math.max(0, MOVEMENT_TARGET_MINUTES - summary.movementMinutes);
  const activities = [
    {
      type: 'walk',
      title: 'Walk',
      durationMinutes: 30,
      metric: '30m',
      dimensions: ['aerobic', 'movement', 'sedentary'],
    },
    {
      type: 'move',
      title: 'Move',
      durationMinutes: 3,
      metric: '3m',
      dimensions: ['movement', 'sedentary'],
    },
  ];
  activities.forEach((activity) => {
    const duration = activityDurationEstimate(state, activity.type, activity.durationMinutes);
    const aerobicValue = activity.dimensions.includes('aerobic')
      ? Math.min(aerobicDeficit, duration * 1.5) / 3
      : 0;
    const movementValue = activity.dimensions.includes('movement')
      ? Math.min(movementDeficit, duration) * 1.25
      : 0;
    const sedentaryValue =
      activity.dimensions.includes('sedentary') && summary.sedentaryHigh ? 30 : 0;
    const score = aerobicValue + movementValue + sedentaryValue - duration * 0.1;
    if (score > 0)
      result.push({
        ...activity,
        metric: activity.metric,
        score,
        reason: describeDeficits(activity, aerobicDeficit, movementDeficit, summary.sedentaryHigh),
      });
  });
  if (measurementDue)
    result.push({
      type: 'measurement',
      title: 'Check-in',
      metric: 'Waist',
      durationMinutes: null,
      score: 20,
      reason: "It's been a couple of weeks since your last check-in.",
    });
  if (!result.length)
    result.push({
      type: 'rest',
      title: 'On track',
      metric: 'No action needed',
      durationMinutes: null,
      score: 0,
      reason: "You're on track — nothing else needed today.",
    });
  return result.sort((a, b) => b.score - a.score);
}

function dueMeasurement(measurements, now) {
  const latest = measurements
    .map((item) => Date.parse(item.date || ''))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return !latest || now.getTime() - latest >= MEASUREMENT_INTERVAL_DAYS * 86400000;
}

export function selectRecommendation(state, { day = '', now = new Date() } = {}) {
  const summary = bodyHealthSummary(state, now);
  const resistanceDue = Boolean(state?.active) || Boolean(day);
  const options = candidates(summary, {
    resistanceDue: resistanceDue && !completedToday(state?.history, day, now),
    measurementDue: dueMeasurement(summary.measurements, now),
    state,
  });
  const selected = options[0];
  const previous = state?.settings?.recommendation;
  if (previous?.type === selected.type) return { ...selected, stable: true };
  if (
    previous?.type &&
    previous.type !== selected.type &&
    Number(previous.score) >= selected.score - STABILITY_DELTA
  ) {
    const retained = options.find((option) => option.type === previous.type);
    if (retained) return { ...retained, stable: true };
  }
  return { ...selected, stable: false };
}
