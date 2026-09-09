import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTINE, NAMES, configuredDays, dayItems, isWorkoutDay, workoutName } from '../js/routine-data.js';
import { flatten } from '../js/workout/task-factory.js';
import { formatDuration } from '../js/workout/timers.js';
import { getState, setState, emptyState } from '../js/state.js';
import { lastActivePerformance, lastPerformance } from '../js/workout/progression.js';
import { completedWorkoutsThisWeek, weeklyGoalSummary, phaseProgress } from '../js/workout/metrics.js';

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

test('routine helpers safely reflect configured days and missing names', () => {
  const original = ROUTINE.TestDay;
  const originalName = NAMES.TestDay;
  try {
    ROUTINE.TestDay = [{type: 'exercise', id: 'changed', name: 'Changed exercise', sets: 2, reps: '5–7'}];
    delete NAMES.TestDay;
    assert.deepEqual(configuredDays().includes('TestDay'), true);
    assert.deepEqual(dayItems('TestDay'), ROUTINE.TestDay);
    assert.equal(isWorkoutDay('TestDay'), true);
    assert.equal(workoutName('TestDay'), 'TestDay');
    assert.equal(isWorkoutDay('MissingDay'), false);
    assert.deepEqual(dayItems('MissingDay'), []);
  } finally {
    if (original === undefined) delete ROUTINE.TestDay;
    else ROUTINE.TestDay = original;
    if (originalName === undefined) delete NAMES.TestDay;
    else NAMES.TestDay = originalName;
  }
});

test('flatten ignores empty and malformed groups while keeping valid members', () => {
  const template = [
    {type: 'superset', id: 'empty', members: []},
    {type: 'equipmentBlock', id: 'bad', items: [null, {type: 'exercise', id: 'block-press', name: 'Block press', sets: 2, reps: '8'}]},
    {type: 'superset', id: 'uneven', label: 'Uneven', members: [
      {type: 'exercise', id: 'short', name: 'Short', sets: 1, reps: '10'},
      {type: 'exercise', id: 'long', name: 'Long', sets: 3, reps: '8'}
    ]}
  ];
  assert.deepEqual(flatten(template).map(item => [item.exerciseId, item.set, item.groupType]), [
    ['block-press', 1, 'equipmentBlock'], ['block-press', 2, 'equipmentBlock'],
    ['short', 1, 'superset'], ['long', 1, 'superset'], ['long', 2, 'superset'], ['long', 3, 'superset']
  ]);
  assert.equal(flatten([{type: 'superset', id: 'empty', members: []}]).length, 0);
});

test('timer formatting uses plain seconds below one minute', () => {
  assert.equal(formatDuration(0), '0');
  assert.equal(formatDuration(1000), '1');
  assert.equal(formatDuration(2000), '2');
  assert.equal(formatDuration(59000), '59');
  assert.equal(formatDuration(59999), '1:00');
  assert.equal(formatDuration(60000), '1:00');
  assert.equal(formatDuration(65000), '1:05');
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

test('counts only saved workouts in the local Monday to Sunday week', () => {
  const now = new Date('2026-09-09T12:00:00');
  const history = [
    {completedAt: '2026-09-07T08:00:00'},
    {completedAt: '2026-09-13T23:59:00'},
    {completedAt: '2026-09-14T00:00:00'},
    {date: '2026-09-08T10:00:00'}
  ];
  assert.equal(completedWorkoutsThisWeek(history, now), 2);
});

test('weekly goal progress is capped at 100 percent', () => {
  const state = {settings: {weeklyGoal: 2}, history: [{completedAt: '2026-09-07T08:00:00'}, {completedAt: '2026-09-08T08:00:00'}, {completedAt: '2026-09-09T08:00:00'}]};
  assert.deepEqual(weeklyGoalSummary(state, new Date('2026-09-09T12:00:00')), {completed: 3, goal: 2, percentage: 100});
});

test('phase progress maps workout phases to three honest steps', () => {
  assert.deepEqual(phaseProgress('warmup'), {step: 1, total: 3, label: 'Warm-up'});
  assert.deepEqual(phaseProgress('rest'), {step: 2, total: 3, label: 'Lifting'});
  assert.deepEqual(phaseProgress('stretch'), {step: 3, total: 3, label: 'Cooldown and review'});
});
