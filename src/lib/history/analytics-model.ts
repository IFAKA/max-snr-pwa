import type { AppState } from '../types.ts';
import {
  adaptiveRecommendations,
  allocationDecisionReport,
  compareFrequencies,
  completedWorkoutsThisWeek,
  EXERCISES,
  exerciseKeyForId,
  marginalCandidateReport,
  marginalSetReport,
  rollingMuscleTrends,
  sedentaryStatus,
  selectedFrequency,
  sensitivityAnalysis,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from '../workout/index.ts';
import { measurementFields, measurementUnit } from '../health/health-data.ts';
import { weeklyPlan } from '../routine/routine-summary.ts';
import { listDate, readableKey } from './history-format.ts';
import { weeklyProgressLabel } from './weekly-progress.ts';

export type ValueRow = { label: string; value: string };
export type NoteRow = { label: string; note: string };
export type MeasurementRow = { label: string; value: string; note: string };

const NBSP = '\u00a0';

export const formatNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? String(Number(value.toFixed(1)))
    : String(value);

const contribution = (values: Record<string, number>) =>
  Object.entries(values || {})
    .map(([key, value]) => `${readableKey(key)} ${formatNumber(Number(value))}`)
    .join(', ') || 'none';

/** Muscle rows in plain words, most sets first, so the list reads as a ranking. */
const valueRows = (values: Record<string, number>): ValueRow[] =>
  Object.entries(values || {})
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({ label: readableKey(key), value: formatNumber(value) }));

const ACTION_COPY: Record<string, string> = {
  'ADD 1 SET/WEEK': 'Add 1 set a week',
  'REMOVE 1 SET/WEEK': 'Drop 1 set a week',
  'REALLOCATE 1 SET/WEEK': 'Move 1 set a week',
};

/** Only changes get a row; when nothing changes the plan reads as one calm "keep" line. */
function planChanges(recommendations: ReturnType<typeof adaptiveRecommendations>): NoteRow[] {
  const changes = recommendations.filter((item) => item.muscle && item.action !== 'KEEP');
  if (!changes.length)
    return [
      {
        label: 'Keep the current plan',
        note: recommendations.some((item) => !item.muscle)
          ? 'Set changes wait until a full planned week is logged.'
          : 'Nothing needs to change yet.',
      },
    ];
  return changes.map((item) => ({
    label: readableKey(item.muscle as string),
    note: `${ACTION_COPY[item.action] || item.action}${item.to ? ` to ${readableKey(item.to)}` : ''}. ${item.reason}`,
  }));
}

const signed = (delta: number) =>
  `${delta > 0 ? '+' : delta < 0 ? '\u2212' : '\u00b1'}${formatNumber(Math.abs(delta))}`;

/** Latest value per measurement with the change since the previous and the first check-in. */
function measurementTrend(
  measurements: AppState['health']['measurements'],
): MeasurementRow[] | null {
  const rows = measurementFields.flatMap((key): MeasurementRow[] => {
    const points = (measurements || [])
      .filter((entry) => Number.isFinite(Number(entry[key])) && entry[key] !== undefined)
      .map((entry) => ({ date: String(entry.date), value: Number(entry[key]) }));
    const latest = points.at(-1);
    if (!latest) return [];
    const unit = measurementUnit(key);
    const [first, previous] = [points[0], points.at(-2)];
    const since = (point: typeof first) =>
      `${signed(latest.value - point.value)} since ${listDate(point.date)}`;
    const notes = previous ? [since(previous), ...(first !== previous ? [since(first)] : [])] : [];
    return [
      {
        label: readableKey(key),
        value: `${formatNumber(latest.value)}${NBSP}${unit}`,
        note: notes.join(' · ') || `First check-in ${listDate(latest.date)}`,
      },
    ];
  });
  return rows.length ? rows : null;
}

function prescriptionMuscles(state: AppState) {
  const entries = Object.entries(state.prescription?.weeklySetAllocation || {})
    .map(([id, sets]) => [exerciseKeyForId(id), sets] as const)
    .filter((entry): entry is readonly [keyof typeof EXERCISES, number] => Boolean(entry[0]))
    .map(([key, sets]): [keyof typeof EXERCISES, number] => [key, sets]);
  const allocation: Record<string, number> = {};
  entries.forEach(([key, sets]) =>
    Object.keys(EXERCISES[key].primary || {}).forEach((muscle) => {
      allocation[muscle] = (allocation[muscle] || 0) + sets;
    }),
  );
  return { entries, allocation };
}

/** What was done this week, counted neutrally; sitting details appear only once logged. */
function weekRows(
  state: AppState,
  metrics: ReturnType<typeof weeklyGymAnalytics>,
  sedentary: ReturnType<typeof sedentaryStatus>,
): ValueRow[] {
  const goal = state.prescription?.daysPerWeek || selectedFrequency({ state }).days;
  const cardio = metrics.cardioEquivalent + metrics.activityCardioEquivalent;
  const rows: ValueRow[] = [
    {
      label: 'Workouts',
      value: weeklyProgressLabel(completedWorkoutsThisWeek(state.history), goal),
    },
    { label: 'Cardio', value: `${formatNumber(cardio)} of 150${NBSP}min` },
    {
      label: 'Movement',
      value: `${formatNumber(metrics.movementMinutes + metrics.activityMinutes)}${NBSP}min`,
    },
  ];
  if (sedentary.profileHoursPerDay !== null)
    rows.push({
      label: 'Sitting',
      value: `${formatNumber(sedentary.profileHoursPerDay)}${NBSP}h/day`,
    });
  if (sedentary.latest)
    rows.push(
      { label: 'Sitting breaks', value: String(sedentary.interruptions) },
      {
        label: 'Longest sit',
        value: `${formatNumber(sedentary.longestUninterruptedMinutes)}${NBSP}min`,
      },
    );
  return rows;
}

export function analyticsModel(state: AppState) {
  const metrics = weeklyGymAnalytics(state);
  const sedentary = sedentaryStatus(state);
  const { entries, allocation } = prescriptionMuscles(state);
  const selected = selectedFrequency({ state, allocation: entries });
  const timing = sessionTimingComparison(state.history, selected.sessionMinutes);
  const sensitivity = sensitivityAnalysis();
  const decisions = allocationDecisionReport();
  const totalEffective = Object.values(metrics.effectiveSets).reduce(
    (sum, value) => sum + value,
    0,
  );
  const recommendations = adaptiveRecommendations({
    allocation,
    adherence: metrics.sessions / (state.prescription?.daysPerWeek || 2),
    trends: rollingMuscleTrends(state.history),
    actualTimeCost: Object.fromEntries(
      Object.entries(metrics.effectiveSets).map(([muscle, sets]) => [
        muscle,
        metrics.minutes ? (metrics.minutes * sets) / totalEffective : 0,
      ]),
    ),
  });
  const threeWins = sensitivity.twoVsThree.filter((item) => item.winner === 3).length;
  return {
    summary: weekRows(state, metrics, sedentary),
    sittingTip: sedentary.exposureClass === 'high',
    plan: weeklyPlan(state),
    planChanges: planChanges(recommendations),
    timing: timing.observedCount
      ? `${formatNumber(timing.mean)}${NBSP}min observed vs ${formatNumber(timing.estimate)}${NBSP}min modeled`
      : 'Awaiting session timestamps',
    measurementTrend: measurementTrend(state.health.measurements),
    directSets: valueRows(metrics.directSets),
    fractionalSets: valueRows(metrics.fractionalSets),
    effectiveSets: valueRows(metrics.effectiveSets),
    marginal: marginalSetReport().map((set) => ({
      label: `${set.exercise} · set ${set.set}`,
      note: `${formatNumber(set.utilityPerMinute)} units/min · direct: ${contribution(set.direct)} · indirect: ${contribution(set.fractional)}`,
    })) satisfies NoteRow[],
    decisions: [
      { label: 'Calves', note: decisions.calfFourth.reason },
      { label: 'Wrist extensions', note: decisions.wristExtension.reason },
      { label: 'Side delts', note: decisions.sideDelts.reason },
      { label: 'Lats', note: decisions.lats.reason },
    ] satisfies NoteRow[],
    candidates: marginalCandidateReport().map((set) => ({
      label: `Next: ${set.exercise} set ${set.nextSet}`,
      note: `${formatNumber(set.utilityPerMinute)} units/min`,
    })) satisfies NoteRow[],
    frequencyNote: `The current model winner is ${selected.days} days. Three days wins ${threeWins} of ${sensitivity.twoVsThree.length} configured 2-vs-3 scenarios. At default time and visit costs, three days needs relief greater than ${formatNumber(sensitivity.threeDayReliefThreshold(0.08, 2))} model units to beat two days.`,
    frequencies: compareFrequencies({ state, allocation: entries }).map((candidate) => ({
      label: `${candidate.days} days · ${candidate.minutes}${NBSP}min/week`,
      value: formatNumber(candidate.utility),
    })) satisfies ValueRow[],
  };
}
