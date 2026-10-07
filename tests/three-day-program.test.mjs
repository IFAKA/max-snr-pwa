import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultPrescription, EXERCISES } from '../js/workout/optimizer.js';
import { flatten } from '../js/workout/task-factory.js';
import { emptyState, getState, setState } from '../js/state.js';
import { configuredDays, isWorkoutDay, workoutName } from '../js/routine-data.js';

const prescription = createDefaultPrescription();
const members = (day) => day.flatMap((item) => (item.type === 'superset' ? item.members : [item]));
const sessionSets = prescription.routine.map((day) =>
  members(day).reduce((sum, item) => sum + item.sets, 0),
);

test('default program is the fixed Monday/Wednesday/Friday routine', () => {
  assert.equal(prescription.programId, 'fixed-hypertrophy-3-day-v1');
  assert.equal(prescription.daysPerWeek, 3);
  assert.deepEqual(prescription.days, ['Monday', 'Wednesday', 'Friday']);
  assert.deepEqual(prescription.names, ['Full body A', 'Upper body B', 'Full body C']);
  assert.deepEqual(sessionSets, [22, 18, 20]);
});

test('weekly set allocation is exact', () => {
  assert.deepEqual(prescription.weeklySetAllocation, {
    'cable-lateral-raise': 11,
    'incline-machine-press': 7,
    'neutral-grip-pulldown': 6,
    'chest-supported-row': 4,
    'leg-press': 4,
    'seated-leg-curl': 4,
    'cable-curl': 6,
    'overhead-cable-triceps-extension': 6,
    'reverse-cable-fly': 3,
    'chest-supported-shrug': 1,
    'standing-calf-raise': 2,
    'cable-crunch': 2,
    'neck-flexion': 2,
    'neck-extension': 2,
  });
});

test('every major muscle is directly trained on at least two days', () => {
  const major = [
    'upperChest',
    'lats',
    'upperBack',
    'sideDelts',
    'rearDelts',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'calves',
    'abs',
  ];
  for (const muscle of major) {
    const days = prescription.routine.filter((day) =>
      members(day).some((item) => item.primary?.[muscle]),
    ).length;
    assert.ok(days >= 2, `${muscle} trained on ${days} day(s)`);
  }
});

test('reverse fly replaces wrist extension on every day', () => {
  assert.ok(prescription.exerciseIds.includes('reverse-cable-fly'));
  assert.ok(
    prescription.routine.every((day) => members(day).some((i) => i.id === 'reverse-cable-fly')),
  );
  assert.ok(
    prescription.routine.every((day) => members(day).every((i) => i.id !== 'wrist-extension')),
  );
  assert.equal(EXERCISES.reverseFly.reps, '12–20');
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
  const tasks = flatten(prescription.routine[0]);
  assert.equal(tasks.length, sessionSets[0]);
  const fly = tasks.find((t) => t.exerciseId === 'reverse-cable-fly');
  assert.equal(fly.reps, '12–20');
  assert.equal(fly.rir, '1 → 0');
  assert.equal(fly.restMs, 60000);
  const arms = tasks.filter((t) => t.groupId === 'arms-monday').map((t) => t.exerciseId);
  assert.deepEqual(arms, [
    'cable-curl',
    'overhead-cable-triceps-extension',
    'cable-curl',
    'overhead-cable-triceps-extension',
  ]);
});

test('time-cap cut order trims calves, then abs, then neck, never delts or fly', () => {
  const byId = (id) =>
    prescription.routine.flatMap(members).find((item) => item.id === id)?.cutPriority;
  assert.equal(byId('standing-calf-raise'), 1);
  assert.equal(byId('cable-crunch'), 2);
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
