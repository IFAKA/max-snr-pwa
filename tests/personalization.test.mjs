import test from 'node:test';
import assert from 'node:assert/strict';
import {
  measurementTargets,
  personalizationKey,
  personalizationPlan,
  personalizeRoutine,
  SESSION_SET_CAP,
} from '../js/workout/personalization.js';
import { CANONICAL_ROUTINE_3_DAY, createDefaultPrescription } from '../js/workout/optimizer.js';
import { emptyState } from '../js/state.js';

const base = [
  CANONICAL_ROUTINE_3_DAY.Monday,
  CANONICAL_ROUTINE_3_DAY.Wednesday,
  CANONICAL_ROUTINE_3_DAY.Friday,
];
const members = (day) => day.flatMap((item) => (item.type === 'superset' ? item.members : [item]));
const weekly = (routine, id) =>
  routine.flatMap(members).reduce((sum, item) => sum + (item.id === id ? item.sets : 0), 0);
const profile = (overrides = {}) => ({
  heightCm: 172,
  measurements: {
    shouldersCm: 111,
    chestCm: 92,
    bicepsCm: 28.5,
    calvesCm: 36,
    ...overrides,
  },
});

test('targets are fixed fractions of height', () => {
  const targets = measurementTargets(172);
  assert.ok(Math.abs(targets.shoulders - 110.9) < 0.1);
  assert.ok(Math.abs(targets.arm - 36.98) < 0.01);
});

test('the user profile shifts sets toward arms and chest and away from side delts', () => {
  const plan = personalizationPlan(profile(), base);
  const delta = Object.fromEntries(plan.adjustments.map((a) => [a.exerciseId, a.delta]));
  assert.deepEqual(delta, {
    'cable-lateral-raise': -2,
    'incline-machine-press': 1,
    'cable-curl': 2,
    'overhead-cable-triceps-extension': 2,
    'standing-calf-raise': 0,
  });
  const routine = personalizeRoutine(base, plan);
  assert.equal(weekly(routine, 'cable-lateral-raise'), 9);
  assert.equal(weekly(routine, 'incline-machine-press'), 8);
  assert.equal(weekly(routine, 'cable-curl'), 8);
  assert.equal(weekly(routine, 'overhead-cable-triceps-extension'), 8);
  routine.forEach((day) =>
    assert.ok(members(day).reduce((s, i) => s + i.sets, 0) <= SESSION_SET_CAP),
  );
});

test('a bigger arm measurement removes the arm bonus', () => {
  const plan = personalizationPlan(profile({ bicepsCm: 37 }), base);
  assert.equal(plan.adjustments.find((a) => a.exerciseId === 'cable-curl').delta, 0);
});

test('personalization never mutates the base routine', () => {
  const before = JSON.stringify(base);
  personalizeRoutine(base, personalizationPlan(profile(), base));
  assert.equal(JSON.stringify(base), before);
});

test('incomplete measurements leave the base program unchanged', () => {
  assert.equal(personalizationKey({ heightCm: 172, measurements: { chestCm: 92 } }), null);
  const bare = createDefaultPrescription({ profile: { heightCm: 172, measurements: {} } });
  assert.equal(bare.weeklySetAllocation['cable-lateral-raise'], 11);
});

test('the default prescription records and applies the stored profile', () => {
  const prescription = createDefaultPrescription({ profile: emptyState().settings.profile });
  assert.equal(prescription.weeklySetAllocation['cable-curl'], 8);
  assert.ok(prescription.personalization.key);
  assert.equal(prescription.perSessionSetDistribution.flat().length > 0, true);
});
