// Personalizes the fixed program from the user's own tape measurements.
//
// The rule is explicit and deliberately simple:
//   deficit = (target - measured) / target
//   every 0.1 of deficit adds one weekly set to the muscle(s) that drive that measurement;
//   a measurement within ADEQUATE_DEFICIT of its target gives up TRIM_SETS sets (when the
//   exercise has volume to spare), so the freed work goes to the lagging areas.
//
// TARGETS ARE ASSUMPTIONS, not findings: simple fractions of height for a lean, muscular, natural
// look. They set the direction of the adjustment; a single tape reading is noisy (about +/-1-2 cm).

export const PROPORTION_TARGETS = {
  waist: 0.43, // of height; only used to derive the shoulder target
  shouldersOverWaist: 1.5,
  chest: 0.58,
  arm: 0.215,
  calves: 0.215,
};
export const ADEQUATE_DEFICIT = 0.02;
export const SETS_PER_DEFICIT = 10;
export const MAX_ADJUSTMENT = 3;
export const TRIM_SETS = 2;
export const MIN_SETS_AFTER_TRIM = 6;
export const SESSION_SET_CAP = 24;

const RULES = [
  { measure: 'shoulders', field: 'shouldersCm', exerciseIds: ['cable-lateral-raise'] },
  { measure: 'chest', field: 'chestCm', exerciseIds: ['incline-machine-press'] },
  {
    measure: 'arm',
    field: 'bicepsCm',
    exerciseIds: ['cable-curl', 'overhead-cable-triceps-extension'],
  },
  { measure: 'calves', field: 'calvesCm', exerciseIds: ['standing-calf-raise'] },
];

const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export function measurementTargets(heightCm) {
  const { waist, shouldersOverWaist, chest, arm, calves } = PROPORTION_TARGETS;
  return {
    shoulders: heightCm * waist * shouldersOverWaist,
    chest: heightCm * chest,
    arm: heightCm * arm,
    calves: heightCm * calves,
  };
}

export function personalizationKey(profile) {
  const m = profile?.measurements;
  if (!positive(profile?.heightCm) || !m) return null;
  const values = RULES.map(({ field }) => Number(m[field]));
  return values.every(positive) ? [Number(profile.heightCm), ...values].join('|') : null;
}

const weeklySets = (routine, exerciseId) =>
  routine
    .flat()
    .flatMap((item) => (item.type === 'superset' ? item.members : [item]))
    .filter((item) => item.id === exerciseId)
    .reduce((sum, item) => sum + item.sets, 0);

function setDelta(deficit, baseWeekly) {
  if (deficit <= ADEQUATE_DEFICIT)
    return baseWeekly - TRIM_SETS >= MIN_SETS_AFTER_TRIM ? -TRIM_SETS : 0;
  return Math.min(MAX_ADJUSTMENT, Math.round(deficit * SETS_PER_DEFICIT));
}

export function personalizationPlan(profile, routine) {
  const key = personalizationKey(profile);
  if (!key) return { key: null, adjustments: [] };
  const targets = measurementTargets(Number(profile.heightCm));
  const adjustments = RULES.flatMap(({ measure, field, exerciseIds }) => {
    const actual = Number(profile.measurements[field]);
    const target = targets[measure];
    const deficit = (target - actual) / target;
    return exerciseIds.map((exerciseId) => ({
      measure,
      exerciseId,
      actual,
      target: Math.round(target * 10) / 10,
      deficit: Math.round(deficit * 1000) / 1000,
      delta: setDelta(deficit, weeklySets(routine, exerciseId)),
    }));
  });
  return { key, adjustments };
}

const membersOf = (day) =>
  day.flatMap((item) => (item.type === 'superset' ? item.members : [item]));
const sessionSets = (day) => membersOf(day).reduce((sum, item) => sum + item.sets, 0);

function addSet(routine, exerciseId) {
  const days = routine
    .map((day, index) => ({ day, index, item: membersOf(day).find((m) => m.id === exerciseId) }))
    .filter(({ item, day }) => item && sessionSets(day) < SESSION_SET_CAP)
    .sort((a, b) => sessionSets(a.day) - sessionSets(b.day) || a.index - b.index);
  if (days.length) days[0].item.sets += 1;
}

function removeSet(routine, exerciseId) {
  const days = routine
    .map((day, index) => ({ index, item: membersOf(day).find((m) => m.id === exerciseId) }))
    .filter(({ item }) => item && item.sets > 1)
    .sort((a, b) => b.item.sets - a.item.sets || a.index - b.index);
  if (days.length) days[0].item.sets -= 1;
}

export function personalizeRoutine(routine, plan) {
  const next = structuredClone(routine);
  plan.adjustments.forEach(({ exerciseId, delta }) => {
    for (let step = 0; step < Math.abs(delta); step++)
      (delta > 0 ? addSet : removeSet)(next, exerciseId);
  });
  return next;
}
