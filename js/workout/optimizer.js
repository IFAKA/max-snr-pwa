/* eslint-disable max-lines */
const PRIORITIES = {
  chest: 1,
  sideDelts: 1.35,
  rearDelts: 1.15,
  biceps: 1.3,
  triceps: 1.3,
  upperChest: 1.25,
  lats: 1.2,
  abs: 1.15,
  forearms: 1.05,
  upperBack: 1,
  quads: 0.8,
  hamstrings: 0.8,
  glutes: 0.7,
  calves: 0.7,
};
import { routineDurationEstimate } from './duration-estimator.js';

export const HEURISTICS = {
  healthCoverageValue: 12,
  minuteCost: 0.08,
  visitCost: 2,
  extraDayCost: 1.5,
  frequencyRelief: { 2: 0, 3: 0, 4: 0 },
};

export const HEURISTIC_RANGES = {
  healthCoverageValue: [0, 6, 12, 24],
  minuteCost: [0, 0.04, 0.08, 0.12, 0.2],
  visitCost: [0, 1, 2, 3, 5],
  extraDayCost: [0, 0.75, 1.5, 3],
  frequencyRelief: [0, 1, 3, 5, 10],
  priorityMultiplier: [0.5, 0.75, 1, 1.25, 1.5],
};

const exercise = (definition) => ({ type: 'exercise', ...definition });

export const EXERCISES = {
  inclinePress: exercise({
    id: 'incline-machine-press',
    name: 'Incline Machine Press',
    sets: 3,
    reps: '6–10',
    rir: '2 → 1',
    station: 'press-machine',
    restMs: 150000,
    primary: { upperChest: 1 },
    secondary: { chest: 0.25, sideDelts: 0.25, triceps: 0.2 },
    setupSeconds: 90,
    executionSeconds: 35,
    fatigue: 3,
    supersetSafe: false,
    health: ['push'],
  }),
  pulldown: exercise({
    id: 'neutral-grip-pulldown',
    name: 'Neutral-Grip Pulldown',
    sets: 3,
    reps: '6–10',
    rir: '1–2',
    station: 'pulldown',
    restMs: 120000,
    primary: { lats: 1 },
    secondary: { upperBack: 0.35, biceps: 0.3 },
    setupSeconds: 60,
    executionSeconds: 35,
    fatigue: 3,
    supersetSafe: false,
    health: ['pull'],
  }),
  row: exercise({
    id: 'chest-supported-row',
    name: 'Chest-Supported Row',
    sets: 3,
    reps: '8–12',
    rir: '1–2',
    station: 'row-machine',
    restMs: 120000,
    primary: { upperBack: 1 },
    secondary: { lats: 0.45, biceps: 0.3, rearDelts: 0.15 },
    setupSeconds: 60,
    executionSeconds: 35,
    fatigue: 2,
    supersetSafe: true,
    health: ['pull'],
  }),
  legPress: exercise({
    id: 'leg-press',
    name: 'Leg Press',
    sets: 2,
    reps: '8–12',
    rir: '1–2',
    station: 'leg-press',
    restMs: 120000,
    primary: { quads: 1 },
    secondary: { glutes: 0.5 },
    setupSeconds: 90,
    executionSeconds: 40,
    fatigue: 3,
    supersetSafe: false,
    health: ['squat'],
  }),
  legCurl: exercise({
    id: 'seated-leg-curl',
    name: 'Seated Leg Curl',
    sets: 2,
    reps: '8–12',
    rir: '1–2',
    station: 'leg-curl',
    restMs: 90000,
    primary: { hamstrings: 1 },
    secondary: { glutes: 0.3 },
    setupSeconds: 45,
    executionSeconds: 35,
    fatigue: 2,
    supersetSafe: true,
    health: ['hinge'],
  }),
  lateralRaise: exercise({
    id: 'cable-lateral-raise',
    name: 'Cable Lateral Raise',
    sets: 3,
    reps: '10–20',
    rir: '1 → 0',
    station: 'cable',
    restMs: 60000,
    primary: { sideDelts: 1 },
    secondary: {},
    setupSeconds: 30,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['shoulder'],
  }),
  curl: exercise({
    id: 'cable-curl',
    name: 'Cable Curl',
    sets: 2,
    reps: '8–15',
    rir: '1 → 0',
    station: 'cable',
    restMs: 60000,
    primary: { biceps: 1 },
    secondary: { forearms: 0.25 },
    setupSeconds: 20,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['arms'],
  }),
  pushdown: exercise({
    id: 'overhead-cable-triceps-extension',
    name: 'Overhead Cable Triceps Extension',
    sets: 2,
    reps: '8–15',
    rir: '1 → 0',
    station: 'cable',
    restMs: 60000,
    primary: { triceps: 1 },
    secondary: { upperChest: 0.15 },
    setupSeconds: 20,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['arms'],
  }),
  calfRaise: exercise({
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    sets: 1,
    reps: '8–15',
    rir: '0–1',
    station: 'calf-raise',
    restMs: 60000,
    primary: { calves: 1 },
    secondary: {},
    setupSeconds: 30,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['lower-leg'],
  }),
  crunch: exercise({
    id: 'cable-crunch',
    name: 'Cable Crunch',
    sets: 1,
    reps: '8–15',
    rir: '0–1',
    station: 'cable',
    restMs: 60000,
    primary: { abs: 1 },
    secondary: {},
    setupSeconds: 20,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['trunk'],
  }),
  wristExtension: exercise({
    id: 'wrist-extension',
    name: 'Wrist Extension',
    sets: 1,
    reps: '12–20',
    rir: '0–1',
    station: 'dumbbells',
    restMs: 60000,
    primary: { forearms: 1 },
    secondary: {},
    setupSeconds: 20,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['arms'],
  }),
  shrug: exercise({
    id: 'chest-supported-shrug',
    name: 'Chest-Supported Shrug',
    sets: 1,
    reps: '10–15',
    rir: '0–1',
    station: 'row-machine',
    restMs: 75000,
    primary: { upperBack: 1 },
    secondary: {},
    setupSeconds: 30,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['pull'],
  }),
  neckFlexion: exercise({
    id: 'neck-flexion',
    name: 'Neck Flexion',
    sets: 1,
    reps: '12–20',
    rir: '1',
    station: 'neck',
    restMs: 60000,
    primary: { neck: 1 },
    secondary: {},
    setupSeconds: 15,
    executionSeconds: 25,
    fatigue: 1,
    supersetSafe: true,
    health: ['trunk'],
  }),
  neckExtension: exercise({
    id: 'neck-extension',
    name: 'Neck Extension',
    sets: 1,
    reps: '12–20',
    rir: '1',
    station: 'neck',
    restMs: 60000,
    primary: { neck: 1 },
    secondary: {},
    setupSeconds: 15,
    executionSeconds: 25,
    fatigue: 1,
    supersetSafe: true,
    health: ['trunk'],
  }),
};

const ALLOCATION = [
  ['inclinePress', 5],
  ['pulldown', 4],
  ['row', 3],
  ['legPress', 4],
  ['legCurl', 4],
  ['lateralRaise', 4],
  ['curl', 4],
  ['pushdown', 4],
  ['calfRaise', 3],
  ['crunch', 4],
  ['wristExtension', 2],
];

export function fractionalSets(definition, sets = definition.sets) {
  const result = {};
  Object.entries(definition.primary || {}).forEach(([muscle, value]) => {
    result[muscle] = (result[muscle] || 0) + sets * value;
  });
  Object.entries(definition.secondary || {}).forEach(([muscle, value]) => {
    result[muscle] = (result[muscle] || 0) + sets * value;
  });
  return result;
}

export function setBreakdown(definition, sets = definition.sets) {
  const direct = {};
  const fractional = {};
  Object.entries(definition.primary || {}).forEach(([muscle, value]) => {
    direct[muscle] = sets * value;
  });
  Object.entries(definition.secondary || {}).forEach(([muscle, value]) => {
    fractional[muscle] = sets * value;
  });
  return { direct, fractional, effective: fractionalSets(definition, sets) };
}

export function diminishingReturn(value, scale = 6) {
  return Math.sqrt(Math.max(0, value) / scale);
}

export function marginalSetValue(setNumber) {
  const current = Math.sqrt(Math.max(0, setNumber));
  const previous = Math.sqrt(Math.max(0, setNumber - 1));
  return current - previous;
}

export function weeklyMuscleSets() {
  const totals = {};
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

export function weeklyAllocation() {
  return Object.fromEntries(
    Object.entries(weeklyMuscleSets()).map(([muscle, value]) => [muscle, value.effective]),
  );
}

export const PRIORITY_WEIGHTS = PRIORITIES;
export const allocationEntries = () =>
  ALLOCATION.map(([key, sets]) => ({ key, definition: EXERCISES[key], sets }));

export function prescriptionAllocation() {
  return Object.fromEntries(ALLOCATION.map(([key, sets]) => [EXERCISES[key].id, sets]));
}

function totalSets(allocation = ALLOCATION) {
  return allocation.reduce((sum, [, sets]) => sum + sets, 0);
}

const TRAINING_DAYS = {
  2: ['Monday', 'Thursday'],
  3: ['Monday', 'Wednesday', 'Friday'],
  4: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
};

function splitAllocation(daysPerWeek, allocation = ALLOCATION) {
  return allocation.map(([key, weeklySets]) => {
    const shares = Array(daysPerWeek).fill(0);
    for (let set = 0; set < weeklySets; set++) shares[set % daysPerWeek]++;
    return [key, shares];
  });
}

function dayTemplate(byDay) {
  const order = [
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
  ];
  return byDay.map((items, day) => {
    const get = (id) => items.find((item) => item.id === EXERCISES[id].id);
    const pairs = new Set(['lateralRaise:curl', 'pushdown:crunch']);
    const result = [];
    order.forEach((id) => {
      if (['curl', 'crunch'].includes(id)) return;
      const pairKey =
        id === 'lateralRaise' ? 'lateralRaise:curl' : id === 'pushdown' ? 'pushdown:crunch' : null;
      if (pairKey && pairs.has(pairKey)) {
        const members = pairKey.split(':').map(get).filter(Boolean);
        if (members.length)
          result.push(
            pair(
              `${pairKey === 'lateralRaise:curl' ? 'priority-pair' : 'arm-core-pair'}-${day}`,
              pairKey === 'lateralRaise:curl'
                ? 'Low-interference priority pair'
                : 'Arms + trunk pair',
              members,
            ),
          );
      } else {
        const item = get(id);
        if (item) result.push(item);
      }
    });
    return result;
  });
}

export function buildRoutine(daysPerWeek, allocation = ALLOCATION) {
  const byDay = Array.from({ length: daysPerWeek }, () => []);
  splitAllocation(daysPerWeek, allocation).forEach(([key, shares]) => {
    shares.forEach((sets, day) => {
      if (sets) byDay[day].push(copy(EXERCISES[key], sets));
    });
  });
  return { days: TRAINING_DAYS[daysPerWeek], routine: dayTemplate(byDay) };
}

function candidateSessionMinutes(routine) {
  return routine.map((items) => {
    let minutes = 0;
    items.forEach((item) => {
      const members = item.type === 'superset' ? item.members : [item];
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

function overloadPenaltyRate(state) {
  const observations = (state?.history || [])
    .map((workout) => {
      const sets = (workout.tasks || []).filter((task) => task.completed && !task.skipped).length;
      const duration = Number(workout.durationMs) / 60000;
      const overload = Math.max(0, sets - 14);
      return overload && Number.isFinite(duration)
        ? Math.max(0, duration - sets * 1.5 - 10) / overload ** 2
        : null;
    })
    .filter((value) => value !== null);
  return observations.length ? Math.min(2, Math.max(...observations)) : 0;
}

export function compareFrequencies(overrides = {}) {
  const config = { ...HEURISTICS, ...overrides };
  const priorities = { ...PRIORITIES, ...(overrides.priorities || {}) };
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
      items
        .flatMap((item) => (item.type === 'superset' ? item.members : [item]))
        .reduce((sum, item) => sum + item.sets, 0),
    );
    const congestion =
      overloadPenaltyRate(overrides.state) *
      sessionSets.reduce((sum, sets) => sum + Math.max(0, sets - 14) ** 2, 0);
    const transition = { 2: 0, 3: 20, 4: 80 }[days];
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

export const selectedFrequency = (overrides = {}) =>
  compareFrequencies(overrides).sort((a, b) => b.utility - a.utility)[0];

function copy(definition, sets) {
  return {
    ...definition,
    sets,
    primary: { ...definition.primary },
    secondary: { ...definition.secondary },
  };
}

function pair(id, label, members) {
  return {
    type: 'superset',
    id,
    label,
    station: members.map((member) => member.station).join(' + '),
    members,
  };
}

export function optimizeRoutine({
  daysPerWeek = selectedFrequency().days,
  allocation = ALLOCATION,
} = {}) {
  if (!TRAINING_DAYS[daysPerWeek]) throw new Error('Frequency must be 2, 3, or 4 days.');
  const generated = buildRoutine(daysPerWeek, allocation);
  return {
    days: generated.days,
    names: generated.days.map((_, index) => `MAX-SNR ${String.fromCharCode(65 + index)}`),
    routine: generated.routine,
    comparison: compareFrequencies(),
    allocation: weeklyAllocation(),
  };
}

const fixed = (key, sets, cutPriority = null, overrides = {}) => ({
  ...copy(EXERCISES[key], sets),
  ...overrides,
  ...(cutPriority ? { cutPriority } : {}),
});

const fixedSuperset = (id, label, members) => ({
  type: 'superset',
  id,
  label,
  members,
});

export const CANONICAL_ROUTINE = {
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

const canonicalOutput = () => ({
  days: ['Monday', 'Thursday'],
  names: ['Upper-chest bias', 'Delt/lat bias'],
  routine: [CANONICAL_ROUTINE.Monday, CANONICAL_ROUTINE.Thursday],
  comparison: [],
  allocation: Object.fromEntries(
    [CANONICAL_ROUTINE.Monday, CANONICAL_ROUTINE.Thursday]
      .flatMap((day) => day.flatMap((item) => (item.type === 'superset' ? item.members : [item])))
      .reduce((entries, item) => {
        entries.set(item.id, (entries.get(item.id) || 0) + item.sets);
        return entries;
      }, new Map()),
  ),
});

export const OPTIMIZER_OUTPUT = canonicalOutput();

export const DEFAULT_PRESCRIPTION_VERSION = 1;
export function createPrescription(daysPerWeek = 2, metadata = {}) {
  const allocationEntriesForPrescription = metadata.allocation || ALLOCATION;
  const output =
    daysPerWeek === 2
      ? canonicalOutput()
      : optimizeRoutine({ daysPerWeek, allocation: allocationEntriesForPrescription });
  const allocation =
    daysPerWeek === 2
      ? output.allocation
      : Object.fromEntries(
          allocationEntriesForPrescription.map(([key, sets]) => [EXERCISES[key].id, sets]),
        );
  return {
    version: DEFAULT_PRESCRIPTION_VERSION,
    programId:
      metadata.programId || (daysPerWeek === 2 ? 'fixed-hypertrophy-2-day-v1' : 'adaptive-routine'),
    daysPerWeek,
    days: output.days,
    exercises: Object.values(EXERCISES).map(({ id, name }) => ({ id, name })),
    exerciseIds: Object.values(EXERCISES).map(({ id }) => id),
    weeklySetAllocation: allocation,
    perSessionSetDistribution: output.routine.map((day) =>
      day
        .flatMap((item) => (item.type === 'superset' ? item.members : [item]))
        .map((item) => ({ exerciseId: item.id, sets: item.sets })),
    ),
    exerciseOrdering: output.routine.map((day) => day.map((item) => item.id)),
    supersets: output.routine.flatMap((day) =>
      day
        .filter((item) => item.type === 'superset')
        .map((item) => ({ id: item.id, members: item.members.map(({ id }) => id) })),
    ),
    routine: output.routine,
    names: output.names,
    createdAt: metadata.createdAt || Date.now(),
    lastEvaluatedAt: metadata.lastEvaluatedAt || 0,
    lastChangeReason: metadata.lastChangeReason || 'Initial prescription',
    evidence: metadata.evidence || [],
  };
}
