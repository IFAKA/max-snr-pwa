import type { CatalogExercise } from './exercises.ts';

// Equipment-free (or dumbbell/band) exercises for the home restart workout. They join EXERCISES
// so ids resolve everywhere, but the optimizer's allocation never selects them.
const home = (
  definition: Omit<CatalogExercise, 'type' | 'station' | 'restMs' | 'setupSeconds' | 'fatigue'>,
): CatalogExercise => ({
  type: 'exercise',
  station: 'home',
  restMs: 45000,
  setupSeconds: 10,
  fatigue: 1,
  ...definition,
});

export const HOME_EXERCISES = {
  dumbbellLateralRaise: home({
    id: 'dumbbell-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    sets: 2,
    reps: '10–20',
    rir: '1–2',
    primary: { sideDelts: 1 },
    secondary: {},
    executionSeconds: 30,
    supersetSafe: true,
    health: ['shoulder'],
  }),
  pushUp: home({
    id: 'push-up',
    name: 'Push-Up',
    sets: 2,
    reps: '8–20',
    rir: '1–2',
    primary: { chest: 1, upperChest: 0.5 },
    secondary: { triceps: 0.5, sideDelts: 0.3 },
    executionSeconds: 35,
    supersetSafe: true,
    health: ['push'],
  }),
  oneArmRow: home({
    id: 'one-arm-dumbbell-row',
    name: 'One-Arm Row',
    sets: 2,
    reps: '8–15',
    rir: '1–2',
    primary: { lats: 1 },
    secondary: { upperBack: 0.5, biceps: 0.3 },
    executionSeconds: 40,
    supersetSafe: true,
    health: ['pull'],
  }),
  dumbbellCurl: home({
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    sets: 2,
    reps: '8–15',
    rir: '1–2',
    primary: { biceps: 1 },
    secondary: { forearms: 0.3 },
    executionSeconds: 30,
    supersetSafe: true,
    health: ['pull'],
  }),
  floorCrunch: home({
    id: 'floor-crunch',
    name: 'Crunch',
    sets: 2,
    reps: '10–20',
    rir: '1–2',
    primary: { abs: 1 },
    secondary: {},
    executionSeconds: 30,
    supersetSafe: true,
    health: ['trunk'],
  }),
} satisfies Record<string, CatalogExercise>;
