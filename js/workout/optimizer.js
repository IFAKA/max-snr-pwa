const PRIORITIES = {
  sideDelts: 1.35,
  arms: 1.3,
  upperChest: 1.25,
  lats: 1.2,
  abs: 1.15,
  forearms: 1.05,
  upperBack: 1,
  lowerBody: 0.8,
  calves: 0.7,
};

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
    primary: { lowerBody: 1 },
    secondary: { lowerBody: 0.35 },
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
    primary: { lowerBody: 0.8 },
    secondary: { lowerBody: 0.2 },
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
  ['pulldown', 3],
  ['row', 3],
  ['legPress', 4],
  ['legCurl', 4],
  ['lateralRaise', 4],
  ['curl', 4],
  ['pushdown', 4],
  ['calfRaise', 4],
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

export function diminishingReturn(value, scale = 6) {
  return Math.sqrt(Math.max(0, value) / scale);
}

export function marginalSetValue(setNumber) {
  const current = Math.sqrt(Math.max(0, setNumber));
  const previous = Math.sqrt(Math.max(0, setNumber - 1));
  return current - previous;
}

export function weeklyAllocation() {
  const totals = {};
  ALLOCATION.forEach(([key, sets]) =>
    Object.entries(fractionalSets(EXERCISES[key], sets)).forEach(([muscle, value]) => {
      totals[muscle] = (totals[muscle] || 0) + value;
    }),
  );
  return totals;
}

function totalSets() {
  return ALLOCATION.reduce((sum, [, sets]) => sum + sets, 0);
}

export function compareFrequencies() {
  const aesthetic = Object.entries(weeklyAllocation()).reduce(
    (sum, [muscle, sets]) => sum + diminishingReturn(sets) * (PRIORITIES[muscle] || 1),
    0,
  );
  return [2, 3, 4].map((days) => {
    const workMinutes = Math.round(totalSets() * 1.5);
    const transitionAndRest = { 2: 40, 3: 49, 4: 64 }[days];
    const minutes = workMinutes + transitionAndRest;
    const utility = Number(
      (aesthetic * 10 + 12 - minutes * 0.08 - days * 2 - (days - 2) * 1.5).toFixed(2),
    );
    return {
      days,
      minutes,
      sessions: days,
      totalSets: totalSets(),
      aestheticScore: Number((aesthetic * 10).toFixed(2)),
      utility,
    };
  });
}

export const selectedFrequency = () =>
  compareFrequencies().sort((a, b) => b.utility - a.utility)[0];

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
