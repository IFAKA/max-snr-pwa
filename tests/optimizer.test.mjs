import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXERCISES,
  compareFrequencies,
  diminishingReturn,
  fractionalSets,
  marginalSetValue,
  optimizeRoutine,
  selectedFrequency,
  weeklyAllocation,
} from '../js/workout/optimizer.js';
import { flatten } from '../js/workout/task-factory.js';

test('marginal return diminishes as weekly sets increase', () => {
  assert.ok(marginalSetValue(1) > marginalSetValue(12));
  assert.ok(diminishingReturn(4) > diminishingReturn(1));
  assert.equal(diminishingReturn(-1), 0);
});

test('indirect contributions are fractional and exercise-specific', () => {
  assert.deepEqual(fractionalSets(EXERCISES.inclinePress, 4), {
    upperChest: 4,
    sideDelts: 1,
    arms: 1,
  });
});

test('optimizer compares all requested frequencies and selects the efficient frontier', () => {
  const candidates = compareFrequencies();
  assert.deepEqual(
    candidates.map((candidate) => candidate.days),
    [2, 3, 4],
  );
  assert.equal(selectedFrequency().days, 2);
  assert.ok(candidates[0].minutes < candidates[1].minutes);
});

test('routine is generated from allocation and preserves metadata through flattening', () => {
  const output = optimizeRoutine();
  const tasks = output.routine.flatMap(flatten);
  assert.ok(tasks.length > 0);
  assert.equal(tasks.filter((task) => task.exerciseId === 'cable-crunch').length, 4);
  assert.equal(tasks.find((task) => task.exerciseId === 'cable-crunch').reps, '10–15');
  assert.equal(tasks.find((task) => task.exerciseId === 'cable-crunch').restMs, 60000);
});

test('weekly allocation covers the priority and health layers', () => {
  const allocation = weeklyAllocation();
  ['sideDelts', 'arms', 'upperChest', 'lats', 'abs', 'lowerBody', 'calves'].forEach((muscle) => {
    assert.ok(allocation[muscle] > 0, muscle);
  });
});
