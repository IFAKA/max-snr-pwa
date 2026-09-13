import { DB_NAME, DB_VERSION, STORAGE_KEY, REST_MS } from './constants.js';
import { emptyState, getState, normalizeWeeklyGoal, setState } from './state.js';
import { validateBackup } from './backup.js';

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
  next.history.forEach((workout) => {
    delete workout.note;
  });
  if (next.active) delete next.active.note;
  next.settings = {
    unit: next.settings.unit === 'lb' ? 'lb' : 'kg',
    weeklyGoal: normalizeWeeklyGoal(next.settings.weeklyGoal),
  };
  next.health = {
    movementMinutes: Array.isArray(next.health.movementMinutes) ? next.health.movementMinutes : [],
    cardioMinutes: Array.isArray(next.health.cardioMinutes) ? next.health.cardioMinutes : [],
    measurements: Array.isArray(next.health.measurements) ? next.health.measurements : [],
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
    };
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
  if (!candidates.length) return setState(emptyState());
  const latest = candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  return setState(migrate(latest));
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
