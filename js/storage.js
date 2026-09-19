import {
  DB_NAME,
  DB_VERSION,
  STORAGE_KEY,
  REST_MS,
  SESSION_TARGET_MS,
  SESSION_CAP_MS,
} from './constants.js';
import { emptyState, getState, normalizeWeeklyGoal, setState } from './state.js';
import { validateBackup } from './backup.js';
import { createPrescription } from './workout/optimizer.js';

let dbPromise;
function openDb() {
  dbPromise ||= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => r.result.createObjectStore('state');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbPromise;
}
function legacyTask(item, set) {
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
export function migrate(raw) {
  if (!raw?.history) return emptyState();
  const next = {
    ...emptyState(),
    ...raw,
    settings: { ...emptyState().settings, ...(raw.settings || {}) },
    health: { ...emptyState().health, ...(raw.health || {}) },
    version: 2,
  };
  next.history = Array.isArray(next.history) ? next.history : [];
  if (!next.prescription || next.prescription.programId !== 'fixed-hypertrophy-2-day-v1') {
    next.prescription = createPrescription(2, {
      createdAt: Date.now(),
      lastEvaluatedAt: Date.now(),
      lastChangeReason: next.prescription
        ? 'Migrated to the fixed Monday/Thursday program'
        : 'Migrated existing two-day routine',
      evidence: { migrated: true, historicalSessionsIgnored: next.history.length },
    });
  }
  next.history.forEach((workout) => {
    delete workout.note;
  });
  if (next.active) delete next.active.note;
  next.settings = {
    unit: next.settings.unit === 'lb' ? 'lb' : 'kg',
    weeklyGoal: normalizeWeeklyGoal(next.settings.weeklyGoal),
    recommendation:
      next.settings.recommendation && typeof next.settings.recommendation === 'object'
        ? next.settings.recommendation
        : null,
    profile:
      next.settings.profile && typeof next.settings.profile === 'object'
        ? next.settings.profile
        : emptyState().settings.profile,
  };
  next.health = {
    activities: Array.isArray(next.health.activities) ? next.health.activities : [],
    movementMinutes: Array.isArray(next.health.movementMinutes) ? next.health.movementMinutes : [],
    cardioMinutes: Array.isArray(next.health.cardioMinutes) ? next.health.cardioMinutes : [],
    measurements: Array.isArray(next.health.measurements) ? next.health.measurements : [],
    sedentary: {
      ...emptyState().health.sedentary,
      ...(next.health.sedentary || {}),
      logs: Array.isArray(next.health.sedentary?.logs) ? next.health.sedentary.logs : [],
      reminders: {
        ...emptyState().health.sedentary.reminders,
        ...(next.health.sedentary?.reminders || {}),
      },
    },
  };
  if (next.active?.queue && !next.active.tasks) {
    const old = next.active;
    next.active = {
      ...old,
      tasks: [],
      pos: old.pos || 0,
      restEndsAt: old.restEnd || null,
      timerEndsAt: old.timerEnd || null,
      deferredGroups: [],
      supersetLeads: {},
      draft: old.setDraft || {},
    };
    old.queue.forEach((item) => {
      for (let set = 1; set <= item.sets; set++) {
        const t = legacyTask(item, set);
        const done = item.done?.[set - 1];
        if (done) t.completed = { ...done, completedAt: old.date };
        next.active.tasks.push(t);
      }
    });
    delete next.active.queue;
    delete next.active.restEnd;
    delete next.active.timerEnd;
    delete next.active.setDraft;
  }
  if (next.active)
    next.active = {
      ...next.active,
      tasks: next.active.tasks || [],
      pos: next.active.pos || 0,
      phase: next.active.phase || 'warmup',
      deferredGroups: next.active.deferredGroups || [],
      supersetLeads: next.active.supersetLeads || {},
      draft: next.active.draft || {},
      sessionTargetMs: next.active.sessionTargetMs || SESSION_TARGET_MS,
      sessionCapMs: next.active.sessionCapMs || SESSION_CAP_MS,
    };
  if (next.active?.phase === 'plank') {
    next.active.phase = 'lifting';
    next.active.timerEndsAt = null;
  }
  return next;
}
async function readDb() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction('state').objectStore('state').get('app');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function writeDb(value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(value, 'app');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
function readLocal() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}
function writeLocal(value) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(value));
}
export async function loadState() {
  let dbValue = null;
  try {
    dbValue = await readDb();
  } catch {
    // IndexedDB may be unavailable; localStorage is the supported fallback.
  }
  const localValue = readLocal();
  const candidates = [dbValue, localValue].flatMap((value) => {
    try {
      return value?.history ? [validateBackup(value)] : [];
    } catch {
      return [];
    }
  });
  if (!candidates.length) {
    const next = emptyState();
    next.prescription = createPrescription(2);
    return setState(next);
  }
  const latest = candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  const migrated = migrate(latest);
  setState(migrated);
  if (!latest.prescription) await persist();
  return migrated;
}
export async function persist() {
  const current = getState();
  current.updatedAt = Date.now();
  let dbSaved = false,
    localSaved = false;
  try {
    await writeDb(current);
    dbSaved = true;
  } catch {
    // Try the localStorage fallback below.
  }
  try {
    writeLocal(current);
    localSaved = true;
  } catch {
    // The error below reports when neither persistence mechanism worked.
  }
  if (!dbSaved && !localSaved)
    throw new Error('Your changes could not be saved. Export a backup before closing the app.');
  return current;
}
export const save = () => persist();
