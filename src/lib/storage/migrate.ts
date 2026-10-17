import type { ActiveWorkout, AppState, Prescription, Task } from '../types.ts';
import { REST_MS, SESSION_CAP_MS, SESSION_TARGET_MS } from '../constants.ts';
import { emptyState, normalizeWeeklyGoal } from '../state.ts';
import { createDefaultPrescription, FIXED_PROGRAM_IDS } from '../workout/program.ts';
import { personalizationKey } from '../workout/personalization.ts';

interface LegacyQueueItem {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  rir?: string;
  station?: string;
  done?: Array<Task['completed']>;
}

interface LegacyActive {
  queue?: LegacyQueueItem[];
  tasks?: Task[];
  pos?: number;
  date?: string;
  restEnd?: number | null;
  timerEnd?: number | null;
  setDraft?: ActiveWorkout['draft'];
  [key: string]: unknown;
}

function legacyTask(item: LegacyQueueItem, set: number): Task {
  return {
    id: `${item.name}-${set}`,
    exerciseId: item.id || item.name,
    originalName: item.name,
    performedName: item.name,
    sets: item.sets,
    set,
    reps: item.reps,
    rir: item.rir || '1–2',
    station: item.station,
    alternatives: [],
    restMs: REST_MS,
    groupId: null,
    groupType: 'exercise',
    memberIndex: undefined,
    groupLabel: undefined,
    completed: null,
  };
}

function currentPrescription(state: AppState): Prescription {
  const { prescription, history, settings } = state;
  const profile = settings.profile;
  const isCurrent = prescription?.programId === FIXED_PROGRAM_IDS[3];
  if (
    prescription &&
    isCurrent &&
    (prescription.personalization?.key ?? null) === personalizationKey(profile)
  )
    return prescription;
  const now = Date.now();
  return createDefaultPrescription({
    profile,
    createdAt: isCurrent ? prescription?.createdAt : now,
    lastEvaluatedAt: isCurrent ? prescription?.lastEvaluatedAt : now,
    lastChangeReason: isCurrent
      ? 'Re-personalized from updated body measurements'
      : prescription
        ? 'Migrated to the fixed Monday/Wednesday/Friday program'
        : 'Created the fixed Monday/Wednesday/Friday program',
    evidence: { migrated: true, historicalSessionsIgnored: history.length },
  });
}

function migrateQueue(old: LegacyActive): ActiveWorkout {
  const { queue = [], restEnd, timerEnd, setDraft, ...rest } = old;
  const tasks: Task[] = [];
  queue.forEach((item) => {
    for (let set = 1; set <= item.sets; set++) {
      const task = legacyTask(item, set);
      const done = item.done?.[set - 1];
      if (done && !Array.isArray(done)) task.completed = { ...done, completedAt: old.date };
      tasks.push(task);
    }
  });
  return {
    ...(rest as unknown as ActiveWorkout),
    tasks,
    pos: old.pos || 0,
    restEndsAt: restEnd || null,
    timerEndsAt: timerEnd || null,
    deferredGroups: [],
    supersetLeads: {},
    draft: setDraft || {},
  };
}

function normalizeActive(active: ActiveWorkout): ActiveWorkout {
  const next: ActiveWorkout = {
    ...active,
    tasks: active.tasks || [],
    pos: active.pos || 0,
    phase: active.phase || 'warmup',
    deferredGroups: active.deferredGroups || [],
    supersetLeads: active.supersetLeads || {},
    draft: active.draft || {},
    sessionTargetMs: active.sessionTargetMs || SESSION_TARGET_MS,
    sessionCapMs: active.sessionCapMs || SESSION_CAP_MS,
  };
  if (next.phase === 'plank') {
    next.phase = 'lifting';
    next.timerEndsAt = null;
  }
  return next;
}

const arrayOr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const recordOr = <T>(value: unknown, fallback: T): T =>
  value && typeof value === 'object' ? (value as T) : fallback;

export function migrate(raw: unknown): AppState {
  const source = raw as Partial<AppState> | null | undefined;
  if (!source?.history) return emptyState();
  const defaults = emptyState();
  const next: AppState = {
    ...defaults,
    ...source,
    settings: { ...defaults.settings, ...(source.settings || {}) },
    health: { ...defaults.health, ...(source.health || {}) },
    version: 2,
  };
  next.history = arrayOr(next.history);
  next.history.forEach((workout) => {
    delete (workout as { note?: unknown }).note;
  });
  if (next.active) delete (next.active as { note?: unknown }).note;
  next.settings = {
    unit: next.settings.unit === 'lb' ? 'lb' : 'kg',
    weeklyGoal: normalizeWeeklyGoal(next.settings.weeklyGoal),
    recommendation: recordOr(next.settings.recommendation, null),
    profile: recordOr(next.settings.profile, defaults.settings.profile),
  };
  next.prescription = currentPrescription(next);
  const sedentary: Partial<AppState['health']['sedentary']> = next.health.sedentary || {};
  next.health = {
    activities: arrayOr(next.health.activities),
    movementMinutes: arrayOr(next.health.movementMinutes),
    cardioMinutes: arrayOr(next.health.cardioMinutes),
    measurements: arrayOr(next.health.measurements),
    sedentary: {
      ...defaults.health.sedentary,
      ...sedentary,
      logs: arrayOr(sedentary.logs),
      reminders: { ...defaults.health.sedentary.reminders, ...(sedentary.reminders || {}) },
    },
  };
  const legacy = next.active as unknown as LegacyActive | null;
  if (legacy?.queue && !legacy.tasks) next.active = migrateQueue(legacy);
  if (next.active) next.active = normalizeActive(next.active);
  return next;
}
