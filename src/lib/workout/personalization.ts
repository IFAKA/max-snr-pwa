// Personalizes the fixed program from the user's own tape measurements.
//
// The rule is explicit and deliberately simple:
//   deficit = (target - measured) / target
//   every 0.1 of deficit adds one weekly set (max +3) to the muscle(s) that drive that measurement;
//   priority exercises (the visible-size muscles) only ever GAIN sets: being at or above a target
//   never cuts them; a measurement within ADEQUATE_DEFICIT of its target trims TRIM_SETS sets only
//   from non-priority exercises (calves), when they have volume to spare.
//   Arms split 2:1 toward triceps (overhead triceps gets the full delta, curl half, rounded down).
//   Forearms (optional) drive the hammer curl.
//
// TARGETS ARE ASSUMPTIONS, not findings. Shoulders aim at 1.6 x the measured waist (so losing
// waist raises the shoulder target); without a waist reading they fall back to height x 0.43 x 1.6.
// The other targets are simple fractions of height. They set the direction of the adjustment;
// a single tape reading is noisy (about +/-1-2 cm).
import type {
  ExerciseDefinition,
  PersonalizationPlan,
  Profile,
  RoutineDay,
  RoutineItem,
} from '../types.ts';

export const PROPORTION_TARGETS = {
  waist: 0.43, // of height; only the fallback for the shoulder target when waist is not measured
  shouldersOverWaist: 1.6,
  chest: 0.58,
  arm: 0.215,
  forearm: 0.17,
  calves: 0.215,
};
export const ADEQUATE_DEFICIT = 0.02;
export const SETS_PER_DEFICIT = 10;
export const MAX_ADJUSTMENT = 3;
export const TRIM_SETS = 2;
export const MIN_SETS_AFTER_TRIM = 6;
export const SESSION_SET_CAP = 24;

type Measure = 'shoulders' | 'chest' | 'arm' | 'forearm' | 'calves';

interface Driven {
  exerciseId: string;
  // Fraction of the measure's delta this exercise receives (rounded down).
  share: number;
  // Priority exercises never lose sets.
  priority: boolean;
}

const RULES: Array<{ measure: Measure; field: string; optional?: boolean; driven: Driven[] }> = [
  {
    measure: 'shoulders',
    field: 'shouldersCm',
    driven: [{ exerciseId: 'cable-lateral-raise', share: 1, priority: true }],
  },
  {
    measure: 'chest',
    field: 'chestCm',
    driven: [{ exerciseId: 'incline-machine-press', share: 1, priority: true }],
  },
  {
    measure: 'arm',
    field: 'bicepsCm',
    driven: [
      { exerciseId: 'cable-curl', share: 0.5, priority: true },
      { exerciseId: 'overhead-cable-triceps-extension', share: 1, priority: true },
    ],
  },
  {
    measure: 'calves',
    field: 'calvesCm',
    driven: [{ exerciseId: 'standing-calf-raise', share: 1, priority: false }],
  },
  {
    measure: 'forearm',
    field: 'forearmsCm',
    optional: true,
    driven: [{ exerciseId: 'cable-rope-hammer-curl', share: 1, priority: true }],
  },
];

const positive = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;

export function measurementTargets(heightCm: number, waistCm?: number): Record<Measure, number> {
  const { waist, shouldersOverWaist, chest, arm, forearm, calves } = PROPORTION_TARGETS;
  const waistBasis = positive(waistCm) ? Number(waistCm) : heightCm * waist;
  return {
    shoulders: waistBasis * shouldersOverWaist,
    chest: heightCm * chest,
    arm: heightCm * arm,
    forearm: heightCm * forearm,
    calves: heightCm * calves,
  };
}

export function personalizationKey(profile: Partial<Profile> | null | undefined): string | null {
  const m = profile?.measurements;
  if (!positive(profile?.heightCm) || !m) return null;
  const required = RULES.filter(({ optional }) => !optional).map(({ field }) => Number(m[field]));
  if (!required.every(positive)) return null;
  const extras = [m.waistCm, m.forearmsCm].map((value) => (positive(value) ? Number(value) : ''));
  return [Number(profile?.heightCm), ...required, ...extras].join('|');
}

const membersOf = (day: RoutineDay): ExerciseDefinition[] =>
  day.flatMap((item: RoutineItem) =>
    item.type === 'superset' ? item.members : item.type === 'equipmentBlock' ? item.items : [item],
  );

const weeklySets = (routine: RoutineDay[], exerciseId: string) =>
  routine
    .flatMap(membersOf)
    .filter((item) => item.id === exerciseId)
    .reduce((sum, item) => sum + item.sets, 0);

function setDelta(deficit: number, baseWeekly: number, priority: boolean) {
  if (deficit <= ADEQUATE_DEFICIT) {
    if (priority) return 0;
    return baseWeekly - TRIM_SETS >= MIN_SETS_AFTER_TRIM ? -TRIM_SETS : 0;
  }
  return Math.min(MAX_ADJUSTMENT, Math.round(deficit * SETS_PER_DEFICIT));
}

export function personalizationPlan(
  profile: Partial<Profile> | null | undefined,
  routine: RoutineDay[],
): PersonalizationPlan {
  const key = personalizationKey(profile);
  if (!key || !profile?.measurements) return { key: null, adjustments: [] };
  const measurements = profile.measurements;
  const targets = measurementTargets(Number(profile.heightCm), measurements.waistCm);
  const adjustments = RULES.filter(
    ({ field, optional }) => !optional || positive(measurements[field]),
  ).flatMap(({ measure, field, driven }) => {
    const actual = Number(measurements[field]);
    const target = targets[measure];
    const deficit = (target - actual) / target;
    return driven.map(({ exerciseId, share, priority }) => {
      const delta = setDelta(deficit, weeklySets(routine, exerciseId), priority);
      return {
        measure,
        exerciseId,
        actual,
        target: Math.round(target * 10) / 10,
        deficit: Math.round(deficit * 1000) / 1000,
        delta: delta > 0 ? Math.floor(delta * share) : delta,
      };
    });
  });
  return { key, adjustments };
}

const sessionSets = (day: RoutineDay) => membersOf(day).reduce((sum, item) => sum + item.sets, 0);

function addSet(routine: RoutineDay[], exerciseId: string) {
  const days = routine
    .map((day, index) => ({ day, index, item: membersOf(day).find((m) => m.id === exerciseId) }))
    .filter(({ item, day }) => item && sessionSets(day) < SESSION_SET_CAP)
    .sort((a, b) => sessionSets(a.day) - sessionSets(b.day) || a.index - b.index);
  const target = days[0]?.item;
  if (target) target.sets += 1;
}

function removeSet(routine: RoutineDay[], exerciseId: string) {
  const days = routine
    .map((day, index) => ({ index, item: membersOf(day).find((m) => m.id === exerciseId) }))
    .filter(
      (entry): entry is { index: number; item: ExerciseDefinition } =>
        Boolean(entry.item) && (entry.item as ExerciseDefinition).sets > 1,
    )
    .sort((a, b) => b.item.sets - a.item.sets || a.index - b.index);
  if (days.length) days[0].item.sets -= 1;
}

export function personalizeRoutine(routine: RoutineDay[], plan: PersonalizationPlan): RoutineDay[] {
  const next = structuredClone(routine);
  plan.adjustments.forEach(({ exerciseId, delta }) => {
    for (let step = 0; step < Math.abs(delta); step++)
      (delta > 0 ? addSet : removeSet)(next, exerciseId);
  });
  return next;
}
