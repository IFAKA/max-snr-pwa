import type { AppState } from '../types.ts';
import { DB_NAME, DB_VERSION, STORAGE_KEY } from '../constants.ts';
import { emptyState, getState, setState } from '../state.ts';
import { validateBackup } from './backup.ts';
import { migrate } from './migrate.ts';
import { createDefaultPrescription } from '../workout/program.ts';

let dbPromise: Promise<IDBDatabase> | undefined;
function openDb() {
  dbPromise ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function readDb(): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('state').objectStore('state').get('app');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeDb(value: AppState) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(value, 'app');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function readLocal(): unknown {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeLocal(value: AppState) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(value));
}

export async function loadState(): Promise<AppState> {
  let dbValue: unknown = null;
  try {
    dbValue = await readDb();
  } catch {
    // IndexedDB may be unavailable; localStorage is the supported fallback.
  }
  const localValue = readLocal();
  const candidates = [dbValue, localValue].flatMap((value) => {
    try {
      return (value as { history?: unknown } | null)?.history ? [validateBackup(value)] : [];
    } catch {
      return [];
    }
  });
  if (!candidates.length) {
    const next = emptyState();
    next.prescription = createDefaultPrescription({ profile: next.settings.profile });
    return setState(next);
  }
  const latest = candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  const migrated = migrate(latest);
  setState(migrated);
  if (latest.prescription !== migrated.prescription) await persist();
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
