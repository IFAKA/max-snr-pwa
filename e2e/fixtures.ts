import type { Page } from '@playwright/test';

export const STORAGE_KEY = 'maxsnr';

type Json = Record<string, unknown>;

const task = (exerciseId: string, name: string, set: number, sets: number, extra: Json = {}) => ({
  id: `${exerciseId}-${set}`,
  exerciseId,
  originalName: name,
  performedName: name,
  sets,
  set,
  reps: '8–12',
  rir: '1–2',
  targetRepRange: '8–12',
  targetRir: '1–2',
  restMs: 60000,
  groupId: null,
  groupType: 'exercise',
  primary: { upperBack: 1 },
  secondary: {},
  completed: null,
  ...extra,
});

const done = (reps: number, weight: number) => ({
  reps,
  weight,
  unit: 'kg',
  rir: '1',
  completedAt: new Date(Date.now() - 60000).toISOString(),
});

export function savedWorkout(id = 1000) {
  return {
    id,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    startedAt: Date.now() - 2 * 86400000,
    completedAt: new Date(Date.now() - 2 * 86400000 + 3000000).toISOString(),
    durationMs: 3000000,
    day: 'Monday',
    name: 'Full body A',
    phase: 'complete',
    pos: 0,
    deferredGroups: [],
    supersetLeads: {},
    sessionTargetMs: 3300000,
    sessionCapMs: 3600000,
    tasks: [
      task('chest-supported-row', 'Chest-Supported Row', 1, 2, { completed: done(10, 40) }),
      task('chest-supported-row', 'Chest-Supported Row', 2, 2, { completed: done(9, 40) }),
    ],
  };
}

/** An active workout with every set logged except the given number left open. */
export function activeWorkout({ phase = 'lifting', open = 1 }: { phase?: string; open?: number }) {
  const tasks = [1, 2, 3].map((set) =>
    task('chest-supported-row', 'Chest-Supported Row', set, 3, {
      completed: set <= 3 - open ? done(11, 42.5) : null,
    }),
  );
  return {
    id: 2000,
    date: new Date().toISOString(),
    startedAt: Date.now() - 1800000,
    day: 'Monday',
    name: 'Full body A',
    phase,
    pos: Math.min(2, 3 - open),
    deferredGroups: [],
    supersetLeads: {},
    draft: {},
    restEndsAt: phase === 'rest' ? Date.now() + 45000 : null,
    timerEndsAt: phase === 'stretch' ? Date.now() + 20000 : null,
    nextPos: phase === 'rest' ? Math.min(2, 3 - open) : null,
    sessionTargetMs: 3300000,
    sessionCapMs: 3600000,
    tasks,
  };
}

export function appState({ history = [savedWorkout()], active = null as Json | null } = {}) {
  return {
    version: 2,
    history,
    active,
    prescription: null,
    settings: { unit: 'kg', weeklyGoal: 4, recommendation: null },
    health: { activities: [], movementMinutes: [], cardioMinutes: [], measurements: [] },
    updatedAt: Date.now() + 60000,
  };
}

/** Seeds the localStorage fallback before the app boots (IndexedDB starts empty per context). */
export async function seed(page: Page, state: unknown) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('e2e-seeded')) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('e2e-seeded', '1');
      }
    },
    [STORAGE_KEY, JSON.stringify(state)] as const,
  );
}

export const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
