import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINE } from '../js/routine-data.js';
import { flatten } from '../js/workout/task-factory.js';
import { formatDuration } from '../js/workout/timers.js';
import { getState, setState, emptyState } from '../js/state.js';
import { lastActivePerformance, lastPerformance } from '../js/workout/progression.js';

test('ordinary exercises finish all sets before the next exercise', () => {
  const tasks = flatten(ROUTINE.Monday);
  assert.deepEqual(tasks.slice(0, 3).map(task => [task.performedName, task.set]), [
    ['High-Incline Machine Press', 1],
    ['High-Incline Machine Press', 2],
    ['High-Incline Machine Press', 3]
  ]);
});

test('superset members alternate within each round', () => {
  const tasks = flatten(ROUTINE.Monday).filter(task => task.groupType === 'superset');
  assert.deepEqual(tasks.map(task => [task.memberIndex, task.set]), [
    [0, 1], [1, 1], [0, 2], [1, 2]
  ]);
});

test('timer formatting does not show zero at a minute boundary', () => {
  assert.equal(formatDuration(59999), '1:00');
  assert.equal(formatDuration(59000), '0:59');
  assert.equal(formatDuration(0), '0:00');
});

test('last performance returns the final completed set in the latest workout', () => {
  const state = emptyState();
  state.history = [{tasks: [
    {performedName: 'Press', completed: {weight: 40, reps: 10, rir: '1'}},
    {performedName: 'Press', completed: {weight: 45, reps: 8, rir: '1'}}
  ]}];
  setState(state);
  assert.equal(lastPerformance('Press').weight, 45);
  setState(emptyState());
  assert.equal(getState().history.length, 0);
});

test('last active performance uses the latest completed set of the same exercise and unit', () => {
  const state = emptyState();
  state.active = {tasks: [
    {exerciseId: 'press', completed: {weight: 50, reps: 8, rir: '1', unit: 'kg', completedAt: '2026-09-06T12:00:00.000Z'}},
    {exerciseId: 'press', completed: {weight: 52.5, reps: 7, rir: '0', unit: 'kg', completedAt: '2026-09-06T12:01:00.000Z'}},
    {exerciseId: 'press', completed: null}
  ]};
  setState(state);

  assert.deepEqual(lastActivePerformance('press', 'kg'), {weight: 52.5, reps: 7, rir: '0', unit: 'kg', completedAt: '2026-09-06T12:01:00.000Z'});
  assert.equal(lastActivePerformance('press', 'lb'), null);
});
