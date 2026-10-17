import type {
  Prescription,
  Profile,
  RoutineDay,
  RoutineItem,
  SupersetDefinition,
} from '../types.ts';
import { personalizationPlan, personalizeRoutine } from './personalization.ts';
import {
  ALLOCATION,
  EXERCISES,
  exerciseKeyForId,
  type AllocationEntry,
  type CatalogExercise,
  type ExerciseKey,
} from './exercises.ts';
import { copyExercise, optimizeRoutine, TRAINING_DAYS } from './optimizer.ts';

const fixed = (
  key: ExerciseKey,
  sets: number,
  cutPriority: number | null = null,
  overrides: Partial<CatalogExercise> = {},
): CatalogExercise => ({
  ...copyExercise(EXERCISES[key], sets),
  ...overrides,
  ...(cutPriority ? { cutPriority } : {}),
});

const fixedSuperset = (
  id: string,
  label: string,
  members: CatalogExercise[],
): SupersetDefinition => ({ type: 'superset', id, label, members });

export const CANONICAL_ROUTINE: Record<'Monday' | 'Thursday', RoutineDay> = {
  Monday: [
    fixed('lateralRaise', 3),
    fixed('inclinePress', 3),
    fixed('pulldown', 2),
    fixed('row', 2),
    fixed('legPress', 2),
    fixed('legCurl', 2, null, { rir: '1' }),
    fixedSuperset('arms-monday', 'Antagonist arms', [fixed('curl', 2), fixed('pushdown', 2)]),
    fixed('shrug', 1),
    fixed('wristExtension', 1, 3),
    fixed('calfRaise', 1, 1),
    fixed('crunch', 1, 2),
    fixedSuperset('neck-monday', 'Neck', [
      fixed('neckFlexion', 1, 4),
      fixed('neckExtension', 1, 4),
    ]),
  ],
  Thursday: [
    fixed('lateralRaise', 4),
    fixed('inclinePress', 2, null, { rir: '1–2' }),
    fixed('pulldown', 3),
    fixed('row', 2),
    fixed('legPress', 2),
    fixed('legCurl', 2, null, { rir: '1' }),
    fixedSuperset('arms-thursday', 'Antagonist arms', [fixed('curl', 2), fixed('pushdown', 2)]),
    fixed('wristExtension', 1, 3),
    fixed('calfRaise', 1, 1),
    fixed('crunch', 1, 2),
    fixedSuperset('neck-thursday', 'Neck', [
      fixed('neckFlexion', 1, 4),
      fixed('neckExtension', 1, 4),
    ]),
  ],
};

const armsPair = (day: string) =>
  fixedSuperset(`arms-${day}`, 'Antagonist arms', [fixed('curl', 2), fixed('pushdown', 2)]);

const neckPair = (day: string) =>
  fixedSuperset(`neck-${day}`, 'Neck', [fixed('neckFlexion', 1, 4), fixed('neckExtension', 1, 4)]);

// Weekly sets: laterals 11, incline 7, pulldown 6, row 4, curl 6, triceps 6, reverse fly 3,
// leg press 4, leg curl 4, calves 2, crunch 2, neck 2 + 2, shrug 1. Legs sit on days 1 and 3,
// which keeps day 2 shorter; every priority muscle is trained at least twice a week.
export const CANONICAL_ROUTINE_3_DAY: Record<'Monday' | 'Wednesday' | 'Friday', RoutineDay> = {
  Monday: [
    fixed('lateralRaise', 4),
    fixed('inclinePress', 3),
    fixed('pulldown', 2),
    fixed('row', 2),
    fixed('legPress', 2),
    fixed('legCurl', 2, null, { rir: '1' }),
    armsPair('monday'),
    fixed('reverseFly', 1),
    fixed('shrug', 1),
    fixed('calfRaise', 1, 1),
  ],
  Wednesday: [
    fixed('lateralRaise', 4),
    fixed('inclinePress', 2, null, { rir: '1–2' }),
    fixed('pulldown', 2),
    fixed('row', 2),
    armsPair('wednesday'),
    fixed('reverseFly', 1),
    fixed('crunch', 1, 2),
    neckPair('wednesday'),
  ],
  Friday: [
    fixed('lateralRaise', 3),
    fixed('inclinePress', 2, null, { rir: '1–2' }),
    fixed('pulldown', 2),
    fixed('legPress', 2),
    fixed('legCurl', 2, null, { rir: '1' }),
    armsPair('friday'),
    fixed('reverseFly', 1),
    fixed('calfRaise', 1, 1),
    fixed('crunch', 1, 2),
    neckPair('friday'),
  ],
};

const flatMembers = (item: RoutineItem) =>
  item.type === 'superset' ? item.members : item.type === 'equipmentBlock' ? item.items : [item];

interface ProgramOutput {
  days: string[];
  names: string[];
  routine: RoutineDay[];
  comparison: unknown[];
  allocation: Record<string, number>;
  personalization?: Prescription['personalization'];
}

const fixedOutput = (days: string[], names: string[], routine: RoutineDay[]): ProgramOutput => ({
  days,
  names,
  routine,
  comparison: [],
  allocation: Object.fromEntries(
    routine
      .flatMap((day) => day.flatMap(flatMembers))
      .reduce((entries, item) => {
        entries.set(item.id, (entries.get(item.id) || 0) + item.sets);
        return entries;
      }, new Map<string, number>()),
  ),
});

const canonicalOutput = () =>
  fixedOutput(
    ['Monday', 'Thursday'],
    ['Upper-chest bias', 'Delt/lat bias'],
    [CANONICAL_ROUTINE.Monday, CANONICAL_ROUTINE.Thursday],
  );

const canonicalThreeDayOutput = (profile?: Profile): ProgramOutput => {
  const base = [
    CANONICAL_ROUTINE_3_DAY.Monday,
    CANONICAL_ROUTINE_3_DAY.Wednesday,
    CANONICAL_ROUTINE_3_DAY.Friday,
  ];
  const plan = personalizationPlan(profile, base);
  return {
    ...fixedOutput(
      TRAINING_DAYS[3],
      ['Full body A', 'Upper body B', 'Full body C'],
      plan.key ? personalizeRoutine(base, plan) : base,
    ),
    personalization: plan,
  };
};

export const OPTIMIZER_OUTPUT = canonicalOutput();

export const FIXED_PROGRAM_IDS: Record<number, string> = {
  2: 'fixed-hypertrophy-2-day-v1',
  3: 'fixed-hypertrophy-3-day-v1',
};
export const isFixedProgram = (programId?: string) =>
  Object.values(FIXED_PROGRAM_IDS).includes(programId || '');

export const prescriptionAllocationEntries = (
  prescription: Prescription | null | undefined,
): AllocationEntry[] =>
  Object.entries(prescription?.weeklySetAllocation || {})
    .map(([id, sets]) => [exerciseKeyForId(id), sets] as const)
    .filter((entry): entry is readonly [ExerciseKey, number] => Boolean(entry[0]))
    .map(([key, sets]) => [key, sets]);

function fixedProgramOutput(daysPerWeek: number, programId?: string, profile?: Profile) {
  if (daysPerWeek === 2) return canonicalOutput();
  if (daysPerWeek === 3 && programId === FIXED_PROGRAM_IDS[3])
    return canonicalThreeDayOutput(profile);
  return null;
}

export interface PrescriptionMetadata {
  allocation?: AllocationEntry[];
  programId?: string;
  profile?: Profile;
  createdAt?: number;
  lastEvaluatedAt?: number;
  lastChangeReason?: string;
  evidence?: unknown;
}

export const DEFAULT_PRESCRIPTION_VERSION = 1;
export function createPrescription(
  daysPerWeek = 2,
  metadata: PrescriptionMetadata = {},
): Prescription {
  const allocationEntriesForPrescription = metadata.allocation || ALLOCATION;
  const fixedProgram = fixedProgramOutput(daysPerWeek, metadata.programId, metadata.profile);
  const output: ProgramOutput =
    fixedProgram || optimizeRoutine({ daysPerWeek, allocation: allocationEntriesForPrescription });
  const allocation = fixedProgram
    ? output.allocation
    : Object.fromEntries(
        allocationEntriesForPrescription.map(([key, sets]) => [EXERCISES[key].id, sets]),
      );
  return {
    version: DEFAULT_PRESCRIPTION_VERSION,
    programId:
      metadata.programId || (daysPerWeek === 2 ? FIXED_PROGRAM_IDS[2] : 'adaptive-routine'),
    daysPerWeek,
    days: output.days,
    exercises: Object.values(EXERCISES).map(({ id, name }) => ({ id, name })),
    exerciseIds: Object.values(EXERCISES).map(({ id }) => id),
    weeklySetAllocation: allocation,
    perSessionSetDistribution: output.routine.map((day) =>
      day.flatMap(flatMembers).map((item) => ({ exerciseId: item.id, sets: item.sets })),
    ),
    exerciseOrdering: output.routine.map((day) => day.map((item) => item.id)),
    supersets: output.routine.flatMap((day) =>
      day
        .filter((item): item is SupersetDefinition => item.type === 'superset')
        .map((item) => ({ id: item.id, members: item.members.map(({ id }) => id) })),
    ),
    routine: output.routine,
    names: output.names,
    personalization: output.personalization || { key: null, adjustments: [] },
    createdAt: metadata.createdAt || Date.now(),
    lastEvaluatedAt: metadata.lastEvaluatedAt || 0,
    lastChangeReason: metadata.lastChangeReason || 'Initial prescription',
    evidence: metadata.evidence || [],
  };
}

export const createDefaultPrescription = (metadata: PrescriptionMetadata = {}) =>
  createPrescription(3, { ...metadata, programId: FIXED_PROGRAM_IDS[3] });
