const PRIORITIES = {
  sideDelts: 1.35,
  arms: 1.3,
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

export const PRIORITY_WEIGHT_RANGES = Object.fromEntries(
  Object.entries(PRIORITIES).map(([muscle, weight]) => [
    muscle,
    [weight * 0.5, weight, weight * 1.5],
  ]),
);

const exercise = (definition) => ({ type: 'exercise', ...definition });

export const EXERCISES = {
  inclinePress: exercise({
    id: 'incline-machine-press',
    name: 'Incline Machine Press',
    sets: 3,
    reps: '6–10',
    rir: '1–2',
    station: 'press-machine',
    restMs: 120000,
    primary: { upperChest: 1 },
    secondary: { sideDelts: 0.25, arms: 0.25 },
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
    secondary: { upperBack: 0.35, arms: 0.3 },
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
    restMs: 90000,
    primary: { upperBack: 1 },
    secondary: { lats: 0.45, arms: 0.3 },
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
    rir: '1–2',
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
    rir: '1–2',
    station: 'cable',
    restMs: 60000,
    primary: { arms: 1 },
    secondary: { forearms: 0.25 },
    setupSeconds: 20,
    executionSeconds: 30,
    fatigue: 1,
    supersetSafe: true,
    health: ['arms'],
  }),
  pushdown: exercise({
    id: 'cable-tricep-pushdown',
    name: 'Cable Tricep Pushdown',
    sets: 2,
    reps: '8–15',
    rir: '1–2',
    station: 'cable',
    restMs: 60000,
    primary: { arms: 1 },
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
    sets: 2,
    reps: '8–15',
    rir: '1–2',
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
    sets: 2,
    reps: '10–15',
    rir: '1–2',
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
    rir: '1–2',
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

function totalSets() {
  return ALLOCATION.reduce((sum, [, sets]) => sum + sets, 0);
}

export function compareFrequencies(overrides = {}) {
  const config = { ...HEURISTICS, ...overrides };
  const priorities = { ...PRIORITIES, ...(overrides.priorities || {}) };
  const aesthetic = Object.entries(weeklyAllocation()).reduce(
    (sum, [muscle, sets]) => sum + diminishingReturn(sets) * (priorities[muscle] || 1),
    0,
  );
  return [2, 3, 4].map((days) => {
    const workMinutes = Math.round(totalSets() * 1.5);
    const transitionAndRest = { 2: 40, 3: 49, 4: 64 }[days];
    const minutes = workMinutes + transitionAndRest;
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
      sessions: days,
      totalSets: totalSets(),
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

export function optimizeRoutine({ daysPerWeek = selectedFrequency().days } = {}) {
  if (daysPerWeek !== 2)
    throw new Error('The current optimizer supports the selected two-day frontier only.');
  const byDay = [[], []];
  const allocations = ALLOCATION.map(([key, weeklySets]) => [
    key,
    Math.ceil(weeklySets / 2),
    Math.floor(weeklySets / 2),
  ]);
  allocations.forEach(([key, first, second]) => {
    if (first) byDay[0].push(copy(EXERCISES[key], first));
    if (second) byDay[1].push(copy(EXERCISES[key], second));
  });
  const get = (day, id) => byDay[day].find((item) => item.id === EXERCISES[id].id);
  const makeDay = (day) =>
    [
      get(day, 'inclinePress'),
      get(day, 'pulldown'),
      get(day, 'legPress'),
      get(day, 'legCurl'),
      pair(
        `priority-pair-${day}`,
        'Low-interference priority pair',
        [get(day, 'lateralRaise'), get(day, 'curl')].filter(Boolean),
      ),
      pair(
        `arm-core-pair-${day}`,
        'Arms + trunk pair',
        [get(day, 'pushdown'), get(day, 'crunch')].filter(Boolean),
      ),
      get(day, 'row'),
      get(day, 'calfRaise'),
      get(day, 'wristExtension'),
    ].filter((item) => item?.type === 'exercise' || item.members?.length);
  return {
    days: ['Monday', 'Thursday'],
    names: ['MAX-SNR A', 'MAX-SNR B'],
    routine: byDay.map((_, dayIndex) => makeDay(dayIndex)),
    comparison: compareFrequencies(),
    allocation: weeklyAllocation(),
  };
}

export const OPTIMIZER_OUTPUT = optimizeRoutine();
