import type { CatalogExercise } from './exercises.ts';

// Equipment-free exercises (a floor and a chair) for the home restart workout. They join EXERCISES
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
  pikePushUp: home({
    id: 'pike-push-up',
    name: 'Pike Push-Up',
    sets: 2,
    reps: '6–15',
    rir: '1–2',
    primary: { sideDelts: 0.5, triceps: 0.5 },
    secondary: { upperChest: 0.3 },
    executionSeconds: 35,
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
  proneRaise: home({
    id: 'prone-y-t-raise',
    name: 'Prone Y-T Raise',
    sets: 2,
    reps: '10–20',
    rir: '1–2',
    primary: { upperBack: 1, rearDelts: 1 },
    secondary: { sideDelts: 0.3 },
    executionSeconds: 35,
    supersetSafe: true,
    health: ['pull'],
  }),
  chairDip: home({
    id: 'chair-dip',
    name: 'Chair Dip',
    sets: 2,
    reps: '8–15',
    rir: '1–2',
    primary: { triceps: 1 },
    secondary: { chest: 0.3 },
    executionSeconds: 30,
    supersetSafe: true,
    health: ['push'],
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
