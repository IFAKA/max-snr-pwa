import type { AppState } from '../types.ts';
import {
  adaptiveRecommendations,
  allocationDecisionReport,
  compareFrequencies,
  EXERCISES,
  exerciseKeyForId,
  healthCoverage,
  marginalCandidateReport,
  marginalSetReport,
  rollingMuscleTrends,
  sedentaryStatus,
  selectedFrequency,
  sensitivityAnalysis,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from '../workout/index.ts';
import { measurementFields } from '../health/health-data.ts';

export type ValueRow = { label: string; value: string };
export type NoteRow = { label: string; note: string };

const NBSP = '\u00a0';

export const formatNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? String(Number(value.toFixed(1)))
    : String(value);

const contribution = (values: Record<string, number>) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(values || {}).map(([key, value]) => [key, Number(Number(value).toFixed(1))]),
    ),
  );

const valueRows = (values: Record<string, number>): ValueRow[] =>
  Object.entries(values || {}).map(([label, value]) => ({ label, value: formatNumber(value) }));

function measurementTrend(measurements: AppState['health']['measurements']): ValueRow[] | null {
  const recent = measurements?.slice(-2) || [];
  if (recent.length < 2) return null;
  return measurementFields.map((key) => {
    const previous = recent[0][key];
    const latest = recent[1][key];
    if (previous === undefined || latest === undefined) return { label: key, value: '—' };
    const delta = Number(latest) - Number(previous);
    return {
      label: key,
      value: `${formatNumber(Number(latest))} (${delta >= 0 ? '+' : ''}${formatNumber(delta)})`,
    };
  });
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

export function analyticsModel(state: AppState) {
  const metrics = weeklyGymAnalytics(state);
  const health = healthCoverage(state);
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
    summary: [
      { label: 'Strength', value: `${health.resistanceDays}/2 days` },
      {
        label: 'Aerobic MVPA',
        value: `${formatNumber(metrics.cardioEquivalent + metrics.activityCardioEquivalent)}/150 moderate-equivalent${NBSP}min`,
      },
      {
        label: 'Sedentary exposure',
        value: `${formatNumber(sedentary.profileHoursPerDay)}${NBSP}h/day · ${sedentary.exposureClass}`,
      },
      { label: 'Sitting interruptions', value: String(sedentary.interruptions) },
      {
        label: 'Longest sitting logged',
        value: `${formatNumber(sedentary.longestUninterruptedMinutes)}${NBSP}min`,
      },
      {
        label: 'Daily movement',
        value: `${formatNumber(metrics.movementMinutes + metrics.activityMinutes)}${NBSP}min${NBSP}logged`,
      },
      {
        label: 'Gym timing',
        value: timing.observedCount
          ? `${formatNumber(timing.mean)}${NBSP}min observed vs ${formatNumber(timing.estimate)}${NBSP}min model`
          : 'Awaiting session timestamps',
      },
    ] satisfies ValueRow[],
    sedentaryNote: `${sedentary.recommendation} Reminders replace sitting with brief movement; their interval is configurable and is not presented as a safety cutoff.`,
    measurementTrend: measurementTrend(state.health.measurements),
    directSets: valueRows(metrics.directSets),
    fractionalSets: valueRows(metrics.fractionalSets),
    effectiveSets: valueRows(metrics.effectiveSets),
    recommendations: recommendations.map((item) => ({
      label: item.muscle || 'System',
      note: item.action,
    })) satisfies NoteRow[],
    marginal: marginalSetReport().map((set) => ({
      label: `${set.exercise} · set ${set.set}`,
      note: `u/min ${formatNumber(set.utilityPerMinute)} · direct ${contribution(set.direct)} · fractional ${contribution(set.fractional)}`,
    })) satisfies NoteRow[],
    decisions: [
      { label: 'Calves', note: decisions.calfFourth.reason },
      { label: 'Wrist extensions', note: decisions.wristExtension.reason },
      { label: 'Side delts', note: decisions.sideDelts.reason },
      { label: 'Lats', note: decisions.lats.reason },
    ] satisfies NoteRow[],
    candidates: marginalCandidateReport().map((set) => ({
      label: `Next: ${set.exercise} set ${set.nextSet}`,
      note: `u/min ${formatNumber(set.utilityPerMinute)}`,
    })) satisfies NoteRow[],
    frequencyNote: `The current model winner is ${selected.days} days. Three days wins ${threeWins} of ${sensitivity.twoVsThree.length} configured 2-vs-3 scenarios. At default time and visit costs, three days needs relief greater than ${formatNumber(sensitivity.threeDayReliefThreshold(0.08, 2))} model units to beat two days.`,
    frequencies: compareFrequencies({ state, allocation: entries }).map((candidate) => ({
      label: `${candidate.days} days · ${candidate.minutes}${NBSP}min/week`,
      value: formatNumber(candidate.utility),
    })) satisfies ValueRow[],
  };
}
