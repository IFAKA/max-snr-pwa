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
  return ` Sets adjusted to your measurements (per week): ${text}.`;
}

export function weeklySummary(state: AppState) {
  const prescription = state.prescription;
  if (!prescription) {
    const frontier = selectedFrequency({ state });
    return `${frontier.days} gym days · about ${frontier.minutes} min/week. The optimizer favors the lowest-visit option that still trains all major muscle groups twice weekly.`;
  }
  const weeklySets = Object.values(prescription.weeklySetAllocation || {}).reduce(
    (sum, sets) => sum + sets,
    0,
  );
  const minutes = Math.round(weeklySets * minutesPerSetEstimate(state));
  return `${prescription.daysPerWeek} gym days · about ${minutes} min/week. Each major muscle group is trained at least twice a week.${measurementNote(prescription)}`;
}

/** Spreadsheet-style member letters: A, B, … Z, AA, AB. */
export const memberLabel = (index: number) => {
  let label = '';
  let value = index;
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return label;
};
