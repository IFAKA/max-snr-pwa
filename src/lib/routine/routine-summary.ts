import type { AppState, Prescription } from '../types.ts';
import { minutesPerSetEstimate, selectedFrequency } from '../workout/index.ts';

const MEASURE_LABELS: Record<string, string> = {
  shoulders: 'side delts',
  chest: 'chest',
  arm: 'arms',
  calves: 'calves',
};

function measurementNote(prescription: Prescription) {
  const changes = new Map<string, number>();
  (prescription.personalization?.adjustments || [])
    .filter(({ delta }) => delta)
    .forEach(({ measure, delta }) => changes.set(measure, delta));
  if (!changes.size) return '';
  const text = [...changes]
    .map(
      ([measure, delta]) => `${MEASURE_LABELS[measure]} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`,
    )
    .join(', ');
  return `Sets per week adjusted to your measurements: ${text}.`;
}

/** The weekly plan in two parts: the schedule ("3 days · about 90 min/week") and, when the
 * prescription was personalized, which muscles' sets it changed. */
export function weeklyPlan(state: AppState) {
  const prescription = state.prescription;
  if (!prescription) {
    const frontier = selectedFrequency({ state });
    return {
      schedule: `${frontier.days} days · about ${frontier.minutes}\u00a0min/week`,
      note: '',
    };
  }
  const weeklySets = Object.values(prescription.weeklySetAllocation || {}).reduce(
    (sum, sets) => sum + sets,
    0,
  );
  const minutes = Math.round(weeklySets * minutesPerSetEstimate(state));
  return {
    schedule: `${prescription.daysPerWeek} days · about ${minutes}\u00a0min/week`,
    note: measurementNote(prescription),
  };
}
