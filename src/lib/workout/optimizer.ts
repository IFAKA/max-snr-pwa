import type { AppState, ExerciseDefinition, MuscleMap, SupersetDefinition } from '../types.ts';
import { routineDurationEstimate } from './duration-estimator.ts';
import {
  ALLOCATION,
  EXERCISES,
  HEURISTICS,
  PRIORITY_WEIGHTS,
  type AllocationEntry,
  type CatalogExercise,
} from './exercises.ts';

export {
  ALLOCATION,
  EXERCISES,
  HEURISTIC_RANGES,
  HEURISTICS,
  PRIORITY_WEIGHTS,
} from './exercises.ts';

type PlannedItem = CatalogExercise | (SupersetDefinition & { members: CatalogExercise[] });

export interface FrequencyOverrides {
  healthCoverageValue?: number;
  minuteCost?: number;
  visitCost?: number;
  extraDayCost?: number;
  frequencyRelief?: Record<number, number>;
  priorities?: Record<string, number>;
  allocation?: AllocationEntry[];
  state?: AppState;
}

export interface FrequencyCandidate {
  days: number;
  minutes: number;
  sessionMinutes: number;
  sessions: number;
  totalSets: number;
  aestheticScore: number;
  components: Record<string, number>;
  utility: number;
}

export function fractionalSets(definition: ExerciseDefinition, sets = definition.sets): MuscleMap {
  const result: MuscleMap = {};
  Object.entries(definition.primary || {}).forEach(([muscle, value]) => {
    result[muscle] = (result[muscle] || 0) + sets * value;
  });
  Object.entries(definition.secondary || {}).forEach(([muscle, value]) => {
    result[muscle] = (result[muscle] || 0) + sets * value;
  });
  return result;
}

export function setBreakdown(definition: ExerciseDefinition, sets = definition.sets) {
  const direct: MuscleMap = {};
  const fractional: MuscleMap = {};
  Object.entries(definition.primary || {}).forEach(([muscle, value]) => {
    direct[muscle] = sets * value;
  });
  Object.entries(definition.secondary || {}).forEach(([muscle, value]) => {
    fractional[muscle] = sets * value;
  });
  return { direct, fractional, effective: fractionalSets(definition, sets) };
}

export function diminishingReturn(value: number, scale = 6) {
  return Math.sqrt(Math.max(0, value) / scale);
}

export function marginalSetValue(setNumber: number) {
  const current = Math.sqrt(Math.max(0, setNumber));
  const previous = Math.sqrt(Math.max(0, setNumber - 1));
  return current - previous;
}

type MuscleTotals = Record<string, { direct: number; fractional: number; effective: number }>;

export function weeklyMuscleSets(): MuscleTotals {
  const totals: MuscleTotals = {};
  ALLOCATION.forEach(([key, sets]) => {
    const breakdown = setBreakdown(EXERCISES[key], sets);
    Object.entries(breakdown.direct).forEach(([muscle, value]) => {
      totals[muscle] ||= { direct: 0, fractional: 0, effective: 0 };
      totals[muscle].direct += value;
    });
    Object.entries(breakdown.fractional).forEach(([muscle, value]) => {
      totals[muscle] ||= { direct: 0, fractional: 0, effective: 0 };
      totals[muscle].fractional += value;
    });
  });
  Object.values(totals).forEach((value) => {
    value.effective = value.direct + value.fractional;
  });
  return totals;
}

export function weeklyAllocation(): MuscleMap {
  return Object.fromEntries(
    Object.entries(weeklyMuscleSets()).map(([muscle, value]) => [muscle, value.effective]),
  );
}

export const allocationEntries = () =>
  ALLOCATION.map(([key, sets]) => ({ key, definition: EXERCISES[key], sets }));

export function prescriptionAllocation() {
  return Object.fromEntries(ALLOCATION.map(([key, sets]) => [EXERCISES[key].id, sets]));
}

const totalSets = (allocation: AllocationEntry[] = ALLOCATION) =>
  allocation.reduce((sum, [, sets]) => sum + sets, 0);

export const TRAINING_DAYS: Record<number, string[]> = {
  2: ['Monday', 'Thursday'],
  3: ['Monday', 'Wednesday', 'Friday'],
  4: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
};

function splitAllocation(daysPerWeek: number, allocation: AllocationEntry[] = ALLOCATION) {
  return allocation.map(([key, weeklySets]) => {
    const shares: number[] = Array(daysPerWeek).fill(0);
    for (let set = 0; set < weeklySets; set++) shares[set % daysPerWeek]++;
    return [key, shares] as const;
  });
}

export function copyExercise(definition: CatalogExercise, sets: number): CatalogExercise {
  return {
    ...definition,
    sets,
    primary: { ...definition.primary },
    secondary: { ...definition.secondary },
  };
}

function pair(id: string, label: string, members: CatalogExercise[]): PlannedItem {
  return {
    type: 'superset',
    id,
    label,
    station: members.map((member) => member.station).join(' + '),
    members,
  };
}

const TEMPLATE_ORDER = [
  'inclinePress',
  'pulldown',
  'legPress',
  'legCurl',
  'lateralRaise',
  'curl',
  'pushdown',
  'crunch',
  'row',
  'calfRaise',
  'wristExtension',
] as const;

const PAIR_LABELS: Record<string, [string, string]> = {
  lateralRaise: ['priority-pair', 'Low-interference priority pair'],
  pushdown: ['arm-core-pair', 'Arms + trunk pair'],
};
const PAIR_PARTNERS: Record<string, keyof typeof EXERCISES> = {
  lateralRaise: 'curl',
  pushdown: 'crunch',
};

function dayTemplate(byDay: CatalogExercise[][]): PlannedItem[][] {
  return byDay.map((items, day) => {
    const get = (key: keyof typeof EXERCISES) =>
      items.find((item) => item.id === EXERCISES[key].id);
    const result: PlannedItem[] = [];
    TEMPLATE_ORDER.forEach((key) => {
      if (key === 'curl' || key === 'crunch') return;
      const partner = PAIR_PARTNERS[key];
      if (partner) {
        const members = [get(key), get(partner)].filter((item): item is CatalogExercise =>
          Boolean(item),
        );
        const [prefix, label] = PAIR_LABELS[key];
        if (members.length) result.push(pair(`${prefix}-${day}`, label, members));
      } else {
        const item = get(key);
        if (item) result.push(item);
      }
    });
    return result;
  });
}

export function buildRoutine(daysPerWeek: number, allocation: AllocationEntry[] = ALLOCATION) {
  const byDay: CatalogExercise[][] = Array.from({ length: daysPerWeek }, () => []);
  splitAllocation(daysPerWeek, allocation).forEach(([key, shares]) => {
    shares.forEach((sets, day) => {
      if (sets) byDay[day].push(copyExercise(EXERCISES[key], sets));
    });
  });
  return { days: TRAINING_DAYS[daysPerWeek], routine: dayTemplate(byDay) };
}

const membersOf = (item: PlannedItem): CatalogExercise[] =>
  item.type === 'superset' ? item.members : [item];

function candidateSessionMinutes(routine: PlannedItem[][]) {
  return routine.map((items) => {
    let minutes = 0;
    items.forEach((item) => {
      const members = membersOf(item);
      const rounds = item.type === 'superset' ? Math.max(...members.map((m) => m.sets)) : item.sets;
      minutes += members.reduce(
        (sum, member) => sum + member.setupSeconds + member.executionSeconds * member.sets,
        0,
      );
      minutes +=
        (Math.max(0, rounds - 1) * Math.max(...members.map((member) => member.restMs))) / 1000;
    });
    return Math.max(1, minutes / 60);
  });
}

function overloadPenaltyRate(state?: AppState) {
  const observations = (state?.history || [])
    .map((workout) => {
      const sets = (workout.tasks || []).filter((task) => task.completed && !task.skipped).length;
      const duration = Number(workout.durationMs) / 60000;
      const overload = Math.max(0, sets - 14);
      return overload && Number.isFinite(duration)
        ? Math.max(0, duration - sets * 1.5 - 10) / overload ** 2
        : null;
    })
    .filter((value): value is number => value !== null);
  return observations.length ? Math.min(2, Math.max(...observations)) : 0;
}

export function compareFrequencies(overrides: FrequencyOverrides = {}): FrequencyCandidate[] {
  const config = { ...HEURISTICS, ...overrides };
  const priorities = { ...PRIORITY_WEIGHTS, ...(overrides.priorities || {}) };
  const aesthetic = Object.entries(weeklyAllocation()).reduce(
    (sum, [muscle, sets]) => sum + diminishingReturn(sets) * (priorities[muscle] || 1),
    0,
  );
  const observed = routineDurationEstimate(overrides.state);
  return [2, 3, 4].map((days) => {
    const allocation = overrides.allocation || ALLOCATION;
    const candidate = buildRoutine(days, allocation);
    const baselineSessions = candidateSessionMinutes(candidate.routine);
    const defaultTwoDay = candidateSessionMinutes(buildRoutine(2, allocation).routine);
    const calibration =
      observed / Math.max(1, defaultTwoDay.reduce((sum, value) => sum + value, 0) / 2);
    const sessionSets = candidate.routine.map((items) =>
      items.flatMap(membersOf).reduce((sum, item) => sum + item.sets, 0),
    );
    const congestion =
      overloadPenaltyRate(overrides.state) *
      sessionSets.reduce((sum, sets) => sum + Math.max(0, sets - 14) ** 2, 0);
    const transition = ({ 2: 0, 3: 20, 4: 80 } as Record<number, number>)[days];
    const minutes = Math.round(
      baselineSessions.reduce((sum, value) => sum + value * calibration, 0) +
        congestion +
        transition,
    );
    const components = {
      aesthetic,
      health: config.healthCoverageValue,
      frequencyRelief: config.frequencyRelief?.[days] || 0,
      timeCost: minutes * config.minuteCost,
      visitCost: days * config.visitCost,
      extraDayCost: (days - 2) * config.extraDayCost,
    };
    const utility =
      components.aesthetic +
      components.health +
      components.frequencyRelief -
      components.timeCost -
      components.visitCost -
      components.extraDayCost;
    return {
      days,
      minutes,
      sessionMinutes: observed,
      sessions: days,
      totalSets: totalSets(allocation),
      aestheticScore: aesthetic,
      components,
      utility,
    };
  });
}

export const selectedFrequency = (overrides: FrequencyOverrides = {}) =>
  compareFrequencies(overrides).sort((a, b) => b.utility - a.utility)[0];

export function optimizeRoutine({
  daysPerWeek = selectedFrequency().days,
  allocation = ALLOCATION,
}: { daysPerWeek?: number; allocation?: AllocationEntry[] } = {}) {
  if (!TRAINING_DAYS[daysPerWeek]) throw new Error('Frequency must be 2, 3, or 4 days.');
  const generated = buildRoutine(daysPerWeek, allocation);
  return {
    days: generated.days,
    names: generated.days.map((_, index) => `WORKOUT ${String.fromCharCode(65 + index)}`),
    routine: generated.routine,
    comparison: compareFrequencies(),
    allocation: weeklyAllocation(),
  };
}
