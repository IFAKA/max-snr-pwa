import type { AppState } from '../types.ts';
import { emptyState, normalizeWeeklyGoal } from '../state.ts';

type UnknownRecord = Record<string, unknown>;

const PHASES = new Set(['warmup', 'plank', 'lifting', 'rest', 'stretch', 'complete']);
const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const validText = (value: unknown, max = 160) => typeof value === 'string' && value.length <= max;

function validPerformance(value: unknown) {
  return (
    isRecord(value) &&
    (value.weight === undefined ||
      (Number.isFinite(value.weight) &&
        (value.weight as number) >= 0 &&
        (value.weight as number) <= 10000)) &&
    Number.isInteger(value.reps) &&
    (value.reps as number) > 0 &&
    (value.reps as number) <= 1000 &&
    (value.rir === undefined || ['0', '1', '2', '+3', '3+'].includes(String(value.rir)))
  );
}

const validCount = (value: unknown) =>
  value === undefined ||
  (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 1000);

function validTask(task: unknown) {
  if (!isRecord(task)) return false;
  const names = ['name', 'performedName', 'originalName'].filter((key) => task[key] !== undefined);
  if (!names.length || names.some((key) => !validText(task[key]))) return false;
  if (!validCount(task.set) || !validCount(task.sets)) return false;
  if (task.reps !== undefined && !validText(String(task.reps), 24)) return false;
  if (task.rir !== undefined && !validText(String(task.rir), 24)) return false;
  if (task.groupLabel !== undefined && !validText(task.groupLabel)) return false;
  if (
    task.alternatives !== undefined &&
    (!Array.isArray(task.alternatives) || !task.alternatives.every((name) => validText(name)))
  )
    return false;
  if (task.completed !== null && task.completed !== undefined) {
    if (Array.isArray(task.completed)) {
      if (!task.completed.every(validPerformance)) return false;
    } else if (!validPerformance(task.completed)) return false;
  }
  if (task.done !== undefined && (!Array.isArray(task.done) || !task.done.every(validPerformance)))
    return false;
  return true;
}

function validActivePosition(workout: UnknownRecord, tasks: unknown[]) {
  const pos = (workout.pos as number) || 0;
  if (!Number.isInteger(pos) || pos < 0 || (tasks.length && pos >= tasks.length)) return false;
  const nextPos = workout.nextPos;
  if (
    nextPos !== undefined &&
    nextPos !== null &&
    (!Number.isInteger(nextPos) || (nextPos as number) < 0 || (nextPos as number) >= tasks.length)
  )
    return false;
  return true;
}

function validWorkout(workout: unknown, active = false) {
  if (!isRecord(workout) || !validText(workout.name || 'Workout')) return false;
  if (workout.date !== undefined && Number.isNaN(Date.parse(String(workout.date)))) return false;
  const tasks = workout.tasks || workout.queue;
  if (active && !Array.isArray(tasks)) return false;
  if (
    tasks !== undefined &&
    (!Array.isArray(tasks) || tasks.length > 1000 || !tasks.every(validTask))
  )
    return false;
  if (!active) return true;
  if (workout.phase !== undefined && !PHASES.has(String(workout.phase))) return false;
  if (!validActivePosition(workout, tasks as unknown[])) return false;
  if (workout.deferredGroups !== undefined && !Array.isArray(workout.deferredGroups)) return false;
  return true;
}

const arrayOr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export function validateBackup(raw: unknown): AppState {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.history) ||
    raw.history.length > 5000 ||
    !raw.history.every((workout) => validWorkout(workout))
  )
    throw new Error('Invalid backup file.');
  if (raw.active !== null && raw.active !== undefined && !validWorkout(raw.active, true))
    throw new Error('Invalid backup file.');
  const next = JSON.parse(JSON.stringify({ ...emptyState(), ...raw, version: 2 })) as AppState;
  next.history.forEach((workout) => {
    delete (workout as unknown as UnknownRecord).note;
  });
  if (next.active) delete (next.active as unknown as UnknownRecord).note;
  const settings = isRecord(raw.settings) ? raw.settings : {};
  next.settings = {
    unit: settings.unit === 'lb' ? 'lb' : 'kg',
    weeklyGoal: normalizeWeeklyGoal(settings.weeklyGoal),
    recommendation: isRecord(settings.recommendation)
      ? (settings.recommendation as unknown as AppState['settings']['recommendation'])
      : null,
    profile: isRecord(settings.profile)
      ? (settings.profile as unknown as AppState['settings']['profile'])
      : emptyState().settings.profile,
  };
  const health = (next.health || {}) as Partial<AppState['health']>;
  const sedentary = (health.sedentary || {}) as Partial<AppState['health']['sedentary']>;
  const defaults = emptyState().health.sedentary;
  next.health = {
    activities: arrayOr(health.activities),
    movementMinutes: arrayOr(health.movementMinutes),
    cardioMinutes: arrayOr(health.cardioMinutes),
    measurements: arrayOr(health.measurements),
    sedentary: {
      ...defaults,
      ...sedentary,
      logs: arrayOr(sedentary.logs),
      reminders: { ...defaults.reminders, ...(sedentary.reminders || {}) },
    },
  };
  next.updatedAt = Number.isFinite(raw.updatedAt) ? (raw.updatedAt as number) : 0;
  return next;
}
