import type { Activity, AppState } from '../types.ts';
import { activityDefinition } from './activity-data.ts';

// Ordered by what the plan acts on first; every field is optional in a check-in.
export const measurementFields = [
  'waist',
  'arms',
  'shoulders',
  'chest',
  'weight',
  'forearms',
  'thighs',
  'calves',
];

export const measurementUnit = (key: string) => (key === 'weight' ? 'kg' : 'cm');

export function recordMeasurement(state: AppState, values: Record<string, unknown>) {
  const filled = Object.fromEntries(
    measurementFields
      .map((key) => [key, values[key]] as const)
      .filter(
        ([, value]) =>
          value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)),
      )
      .map(([key, value]) => [key, Number(value)]),
  );
  if (!Object.keys(filled).length) return false;
  state.health.measurements.push({ date: new Date().toISOString(), ...filled });
  return true;
}

/** Builds and records a finished planned activity. Returns false for the non-activity "rest". */
export function recordActivity(
  state: AppState,
  type: string,
  startedAtMs: number,
  { waist, now = Date.now() }: { waist?: number; now?: number } = {},
) {
  const definition = activityDefinition(type);
  if (type === 'rest' || !definition) return false;
  const durationMs = Math.max(0, now - startedAtMs);
  const activity: Activity = {
    id: `activity-${now}`,
    type,
    startedAt: new Date(startedAtMs).toISOString(),
    completedAt: new Date(now).toISOString(),
    estimatedMinutes: definition.minutes,
    durationMinutes: definition.minutes ? Math.max(1, Math.round(durationMs / 60000)) : 0,
    durationMs,
    intensity: definition.intensity || 'light',
    dimensions: definition.dimensions,
    planned: true,
    contextual: type !== 'measurement',
    completed: true,
  };
  if (type === 'measurement' && Number.isFinite(waist) && (waist as number) > 0)
    activity.measurements = { waist: waist as number };
  state.health.activities.push(activity);
  if (activity.measurements) recordMeasurement(state, activity.measurements);
  return true;
}
