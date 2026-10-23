import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createDefaultPrescription } from '../src/lib/workout/program.ts';
import { EXERCISES } from '../src/lib/workout/exercises.ts';
import { flatten } from '../src/lib/workout/task-factory.ts';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { configuredDays, isWorkoutDay, workoutName } from '../src/lib/routine/routine-data.ts';

const prescription = createDefaultPrescription({ profile: emptyState().settings.profile });
const members = (day) => day.flatMap((item) => (item.type === 'superset' ? item.members : [item]));
const sessionSets = prescription.routine.map((day) =>
  members(day).reduce((sum, item) => sum + item.sets, 0),
);

test('default program is the fixed Monday/Wednesday/Friday routine', () => {
  assert.equal(prescription.programId, 'fixed-hypertrophy-3-day-v4');
  assert.equal(prescription.daysPerWeek, 3);
  assert.deepEqual(prescription.days, ['Monday', 'Wednesday', 'Friday']);
  assert.deepEqual(prescription.names, ['Full body A', 'Upper body B', 'Full body C']);
  assert.deepEqual(sessionSets, [24, 24, 24]);
});

test('weekly set allocation is exact', () => {
  assert.deepEqual(prescription.weeklySetAllocation, {
    'cable-lateral-raise': 12,
    'incline-machine-press': 7,
    'neutral-grip-pulldown': 7,
    'chest-supported-row': 2,
    'leg-press': 4,
    'seated-leg-curl': 3,
    'overhead-cable-triceps-extension': 10,
    'cable-curl': 6,
    'cable-rope-hammer-curl': 5,
    'standing-calf-raise': 2,
    'reverse-cable-fly': 3,
    'cable-crunch': 4,
    'cable-woodchop': 3,
    'neck-flexion': 2,
    'neck-extension': 2,
  });
});

test('every major muscle is directly trained on at least two days', () => {
  const major = [
    'upperChest',
    'lats',
    'sideDelts',
    'rearDelts',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'calves',
    'abs',
    'obliques',
    'forearms',
  ];
  for (const muscle of major) {
    const days = prescription.routine.filter((day) =>
      members(day).some((item) => item.primary?.[muscle]),
    ).length;
    assert.ok(days >= 2, `${muscle} trained on ${days} day(s)`);
  }
});

test('reverse fly is on both upper days and wrist extension is gone', () => {
  assert.ok(prescription.exerciseIds.includes('reverse-cable-fly'));
  const withFly = prescription.routine.filter((day) =>
    members(day).some((i) => i.id === 'reverse-cable-fly'),
  );
  assert.equal(withFly.length, 2);
  assert.ok(
    prescription.routine.every((day) => members(day).every((i) => i.id !== 'wrist-extension')),
  );
  assert.equal(EXERCISES.reverseFly.reps, '12–20');
});

test('no shrug, and the new exercises have their catalogue entries', () => {
  assert.equal(prescription.weeklySetAllocation['chest-supported-shrug'], undefined);
  assert.deepEqual(EXERCISES.hammerCurl.primary, { forearms: 1, biceps: 0.5 });
  assert.deepEqual(EXERCISES.woodchop.primary, { obliques: 1 });
});

test('superset ids are unique and members are superset-safe', () => {
  const ids = prescription.supersets.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of prescription.routine.flat().filter((entry) => entry.type === 'superset'))
    assert.ok(
      item.members.every(
        (member) => Object.values(EXERCISES).find((e) => e.id === member.id)?.supersetSafe,
      ),
    );
});

test('flattened tasks carry reverse fly metadata and alternate arm supersets', () => {
  const tasks = flatten(prescription.routine[1]);
  assert.equal(tasks.length, sessionSets[1]);
  const fly = tasks.find((t) => t.exerciseId === 'reverse-cable-fly');
  assert.equal(fly.reps, '12–20');
  assert.equal(fly.rir, '1 → 0');
  assert.equal(fly.restMs, 60000);
  const arms = tasks.filter((t) => t.groupId === 'arms-wednesday').map((t) => t.exerciseId);
  assert.deepEqual(arms, [
    'overhead-cable-triceps-extension',
    'cable-curl',
    'overhead-cable-triceps-extension',
    'cable-curl',
    'overhead-cable-triceps-extension',
  ]);
});

test('time-cap cut order trims calves, then neck; crunch, delts and fly are never cut', () => {
  const byId = (id) =>
    prescription.routine.flatMap(members).find((item) => item.id === id)?.cutPriority;
  assert.equal(byId('standing-calf-raise'), 1);
  assert.equal(byId('cable-crunch'), 2);
  assert.equal(byId('cable-woodchop'), 2);
  assert.equal(byId('cable-rope-hammer-curl'), undefined);
  assert.equal(byId('neck-flexion'), 4);
  assert.equal(byId('reverse-cable-fly'), undefined);
  assert.equal(byId('cable-lateral-raise'), undefined);
});

test('routine-data resolves the Monday/Wednesday/Friday schedule', () => {
  const previous = getState();
  try {
    setState({ ...emptyState(), prescription });
    assert.deepEqual(configuredDays(), ['Monday', 'Wednesday', 'Friday']);
    assert.equal(workoutName('Wednesday'), 'Upper body B');
    assert.ok(isWorkoutDay('Friday'));
    assert.equal(isWorkoutDay('Thursday'), false);
  } finally {
    setState(previous);
  }
});

test('crowded gym: no day runs four cable exercises in a row and every machine lift has a swap', async () => {
  const { CANONICAL_ROUTINE_3_DAY } = await import('../src/lib/workout/program.ts');
  for (const day of Object.values(CANONICAL_ROUTINE_3_DAY)) {
    let run = 0;
    for (const item of day) {
      const members = item.type === 'superset' ? item.members : [item];
      const cable = members.every((m) => m.station === 'cable');
      run = cable ? run + members.length : 0;
      assert.ok(run <= 3, `four cable lifts in a row on ${item.id}`);
      members
        .filter((m) => m.station !== 'neck' && m.station !== 'dumbbells')
        .forEach((m) => assert.ok(m.alternatives?.length, `${m.id} has no swap`));
    }
  }
});
