import type { AppState } from '../types.ts';

interface TimedRecord {
  durationMs?: number;
  startedAt?: number | string;
  date?: string;
  completedAt?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

export function robustDurationEstimate(priorMinutes: number, observations: unknown[] = []) {
  const valid = observations.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return priorMinutes;
  const observed = median(valid.slice(-6)) as number;
  const weight = Math.min(0.75, 0.25 + valid.length * 0.1);
  return clamp(
    priorMinutes * (1 - weight) + observed * weight,
    priorMinutes * 0.5,
    priorMinutes * 1.75,
  );
}

export const durationFromRecord = (record: TimedRecord | null | undefined): number | null => {
  if (Number.isFinite(record?.durationMs) && (record?.durationMs as number) > 0)
    return (record?.durationMs as number) / 60000;
  const start = Number.isFinite(record?.startedAt)
    ? (record?.startedAt as number)
    : Date.parse(String(record?.startedAt || record?.date || ''));
  const end = Date.parse(record?.completedAt || '');
  return Number.isFinite(start) && Number.isFinite(end) && end >= start
    ? (end - start) / 60000
    : null;
};

export function activityDurationEstimate(
  state: AppState | undefined,
  type: string,
  priorMinutes: number,
) {
  const observations = (state?.health?.activities || [])
    .filter((activity) => activity.type === type && activity.completed !== false)
    .map(durationFromRecord)
    .filter((value) => value !== null);
  return robustDurationEstimate(priorMinutes, observations);
}

export function routineDurationEstimate(state?: AppState, priorMinutes = 51) {
  const observations = (state?.history || [])
    .filter((workout) => workout.completed !== false)
    .map(durationFromRecord)
    .filter((value) => value !== null);
  return robustDurationEstimate(priorMinutes, observations);
}

export function minutesPerSetEstimate(state?: AppState, priorMinutesPerSet = 51 / 24) {
  const observations = (state?.history || [])
    .filter((workout) => workout.completed !== false)
    .map((workout) => {
      const minutes = durationFromRecord(workout);
      const sets = (workout.tasks || []).filter((task) => task.completed && !task.skipped).length;
      return minutes !== null && sets ? minutes / sets : null;
    })
    .filter((value) => value !== null);
  return robustDurationEstimate(priorMinutesPerSet, observations);
}
