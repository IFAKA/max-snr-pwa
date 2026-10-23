import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  measurementTargets,
  personalizationKey,
  personalizationPlan,
  personalizeRoutine,
} from '../src/lib/workout/personalization.ts';
import { CANONICAL_ROUTINE_3_DAY, createDefaultPrescription } from '../src/lib/workout/program.ts';
import { emptyState } from '../src/lib/state.ts';

const base = [
  CANONICAL_ROUTINE_3_DAY.Monday,
  CANONICAL_ROUTINE_3_DAY.Wednesday,
  CANONICAL_ROUTINE_3_DAY.Friday,
];
type Item = { id: string; sets: number; type?: string; members?: Item[] };
type Day = Item[];
const members = (day: Day): Item[] =>
  day.flatMap((item) => (item.type === 'superset' ? (item.members ?? []) : [item]));
const weekly = (routine: Day[], id: string) =>
  routine.flatMap(members).reduce((sum, item) => sum + (item.id === id ? item.sets : 0), 0);
const profile = (overrides: Record<string, number> = {}, extra: Record<string, unknown> = {}) => ({
  heightCm: 172,
  measurements: {
    waistCm: 79,
    shouldersCm: 111,
    chestCm: 92,
    bicepsCm: 28.5,
    forearmsCm: 26,
    calvesCm: 36,
    ...overrides,
  },
  ...extra,
});
const deltas = (p: ReturnType<typeof profile>) =>
  Object.fromEntries(
    personalizationPlan(p as never, base as never).adjustments.map((a) => [a.exerciseId, a.delta]),
  );
const PRIORITY = [
  'cable-lateral-raise',
  'incline-machine-press',
  'neutral-grip-pulldown',
  'cable-curl',
  'overhead-cable-triceps-extension',
  'cable-rope-hammer-curl',
];

test('the shoulder target is 1.6 x waist, falling back to height x 0.43 x 1.6', () => {
  assert.ok(Math.abs(measurementTargets(172, 79).shoulders - 126.4) < 0.01);
  assert.ok(Math.abs(measurementTargets(172).shoulders - 172 * 0.43 * 1.6) < 0.01);
  assert.ok(Math.abs(measurementTargets(172).arm - 36.98) < 0.01);
  assert.ok(Math.abs(measurementTargets(172).forearm - 29.24) < 0.01);
});

test('the default profile adds sets only, 2:1 toward triceps, and fills three 24-set days', () => {
  assert.deepEqual(deltas(profile()), {
    'cable-lateral-raise': 1,
    'incline-machine-press': 1,
    'cable-curl': 1,
    'overhead-cable-triceps-extension': 2,
    'standing-calf-raise': 0,
    'cable-rope-hammer-curl': 1,
  });
  const routine = personalizeRoutine(
    base as never,
    personalizationPlan(profile() as never, base as never),
  ) as unknown as Day[];
  assert.deepEqual(
    routine.map((day) => members(day).reduce((s, i) => s + i.sets, 0)),
    [24, 24, 24],
  );
  assert.equal(weekly(routine, 'cable-lateral-raise'), 12);
  assert.equal(weekly(routine, 'overhead-cable-triceps-extension'), 10);
  assert.equal(weekly(routine, 'cable-curl'), 6);
  assert.equal(weekly(routine, 'cable-rope-hammer-curl'), 5);
});

test('without a waist reading the shoulder target falls back to height', () => {
  const noWaist = profile({}, {});
  delete (noWaist.measurements as Record<string, number>).waistCm;
  assert.ok(personalizationKey(noWaist as never));
  // 172 x 0.43 x 1.6 = 118.3, so 111 cm is a 6% deficit: +1 lateral raise.
  assert.equal(deltas(noWaist)['cable-lateral-raise'], 1);
});

test('priority exercises never lose sets, even far above every target', () => {
  const big = deltas(
    profile({
      waistCm: 60,
      shouldersCm: 150,
      chestCm: 130,
      bicepsCm: 45,
      forearmsCm: 40,
      calvesCm: 50,
    }),
  );
  for (const id of PRIORITY) if (id in big) assert.ok(big[id] >= 0, `${id} is ${big[id]}`);
  assert.equal(big['standing-calf-raise'], 0); // base 2 sets: nothing to trim
});

test('the forearm rule is skipped when forearms are not measured', () => {
  const none = profile();
  delete (none.measurements as Record<string, number>).forearmsCm;
  assert.ok(personalizationKey(none as never));
  assert.equal('cable-rope-hammer-curl' in deltas(none), false);
});

test('the key changes with waist and forearms so the program recomputes', () => {
  assert.notEqual(
    personalizationKey(profile() as never),
    personalizationKey(profile({ waistCm: 76 }) as never),
  );
  assert.notEqual(
    personalizationKey(profile() as never),
    personalizationKey(profile({ forearmsCm: 27 }) as never),
  );
});

test('personalization never mutates the base routine', () => {
  const before = JSON.stringify(base);
  personalizeRoutine(base as never, personalizationPlan(profile() as never, base as never));
  assert.equal(JSON.stringify(base), before);
});

test('incomplete measurements leave the base program unchanged', () => {
  assert.equal(personalizationKey({ heightCm: 172, measurements: { chestCm: 92 } }), null);
  const bare = createDefaultPrescription({ profile: { heightCm: 172, measurements: {} } as never });
  assert.equal(bare.weeklySetAllocation['cable-lateral-raise'], 11);
});

test('the default prescription records and applies the stored profile', () => {
  const prescription = createDefaultPrescription({ profile: emptyState().settings.profile });
  assert.equal(prescription.weeklySetAllocation['cable-curl'], 6);
  assert.ok(prescription.personalization.key);
  assert.equal(prescription.perSessionSetDistribution.flat().length > 0, true);
});
