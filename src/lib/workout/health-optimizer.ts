import type { AppState, Workout } from '../types.ts';
import { legacyCardioEquivalentMinutes, moderateEquivalentMinutes } from './health-metrics.ts';
import { activityDurationEstimate } from './duration-estimator.ts';
import { mondayStart } from './metrics.ts';

const WEEKLY_AEROBIC_MINUTES = 150;
const HIGH_SEDENTARY_HOURS = 8;
const STABILITY_DELTA = 10;
const MEASUREMENT_INTERVAL_DAYS = 14;
const MOVEMENT_TARGET_MINUTES = 20;

export interface HealthRecommendation {
  type: string;
  title: string;
  metric: string;
  durationMinutes: number | null;
  score: number;
  reason: string;
  dimensions?: string[];
  stable?: boolean;
}

const dateKey = (value: Date | string | number | undefined) => {
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const inWeek = (value: string | undefined, now: Date) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) && timestamp >= mondayStart(now).getTime();
};

const completedToday = (history: Workout[] | undefined, day: string, now: Date) =>
  (history || []).some(
    (item) =>
      item.completed !== false &&
      (item.completedAt || item.date) &&
      item.day === day &&
      dateKey(item.completedAt || item.date) === dateKey(now),
  );

const legacyMinutes = (
  state: AppState | undefined,
  key: 'movementMinutes' | 'cardioMinutes',
  now: Date,
) =>
  (state?.health?.[key] || [])
    .filter((entry) => inWeek(entry.date, now))
    .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0);

export function bodyHealthSummary(state: AppState | undefined, now = new Date()) {
  const activities = (state?.health?.activities || []).filter(
    (item) => item.completed !== false && inWeek(item.startedAt || item.date, now),
  );
  const cardioEquivalent =
    legacyCardioEquivalentMinutes(state?.health?.cardioMinutes, (date) => inWeek(date, now)) +
    activities
      .filter((item) => item.dimensions?.includes('aerobic'))
      .reduce(
        (sum, activity) =>
          sum +
          moderateEquivalentMinutes(
            activity.durationMinutes || activity.minutes,
            activity.intensity,
          ),
        0,
      );
  const movementMinutes =
    legacyMinutes(state, 'movementMinutes', now) +
    activities
      .filter((item) => item.dimensions?.includes('movement'))
      .reduce(
        (sum, activity) => sum + Number(activity.durationMinutes || activity.minutes || 0),
        0,
      );
  const sedentary: Partial<AppState['health']['sedentary']> = state?.health?.sedentary || {};
  const profileHours = Number(sedentary.profileHoursPerDay);
  const latest = sedentary.logs?.at(-1) || null;
  const sedentaryHours = Number.isFinite(Number(latest?.hours))
    ? Number(latest?.hours)
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

type Summary = ReturnType<typeof bodyHealthSummary>;
interface ActivityOption {
  type: string;
  title: string;
  durationMinutes: number;
  metric: string;
  dimensions: string[];
}

function describeDeficits(
  activity: ActivityOption,
  aerobicDeficit: number,
  movementDeficit: number,
  sedentaryHigh: boolean,
) {
  const reasons: string[] = [];
  if (activity.dimensions.includes('aerobic') && aerobicDeficit > 0) reasons.push('cardio');
  if (activity.dimensions.includes('movement') && movementDeficit > 0)
    reasons.push('daily movement');
  if (activity.dimensions.includes('sedentary') && sedentaryHigh) reasons.push('sitting time');
  if (!reasons.length) return `${activity.title} keeps you moving today.`;
  const list =
    reasons.length > 1 ? `${reasons.slice(0, -1).join(', ')} and ${reasons.at(-1)}` : reasons[0];
  return `Your ${list} need${reasons.length > 1 ? '' : 's'} attention this week.`;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
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

function activityCandidates(summary: Summary, state: AppState | undefined) {
  const aerobicDeficit = Math.max(0, WEEKLY_AEROBIC_MINUTES - summary.aerobicEquivalent);
  const movementDeficit = Math.max(0, MOVEMENT_TARGET_MINUTES - summary.movementMinutes);
  return ACTIVITY_OPTIONS.flatMap((activity): HealthRecommendation[] => {
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
    if (score <= 0) return [];
    return [
      {
        ...activity,
        score,
        reason: describeDeficits(activity, aerobicDeficit, movementDeficit, summary.sedentaryHigh),
      },
    ];
  });
}

function candidates(
  summary: Summary,
  {
    resistanceDue = false,
    measurementDue = false,
    state,
  }: { resistanceDue?: boolean; measurementDue?: boolean; state?: AppState } = {},
) {
  const result: HealthRecommendation[] = [];
  if (resistanceDue)
    result.push({
      type: 'resistance',
      title: 'Resistance',
      metric: 'Full body',
      durationMinutes: null,
      score: 100,
      reason: 'Your resistance session is scheduled for today.',
    });
  result.push(...activityCandidates(summary, state));
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

function dueMeasurement(measurements: Summary['measurements'], now: Date) {
  const latest = measurements
    .map((item) => Date.parse(String(item.date || '')))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return !latest || now.getTime() - latest >= MEASUREMENT_INTERVAL_DAYS * 86400000;
}

export function selectRecommendation(
  state: AppState | undefined,
  { day = '', now = new Date() }: { day?: string; now?: Date } = {},
): HealthRecommendation {
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
