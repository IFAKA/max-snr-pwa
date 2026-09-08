import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {querySelector: () => null, addEventListener: () => {}, body: {dataset: {}}, visibilityState: 'visible'};
globalThis.confirm = () => true;
const stored = new Map();
globalThis.localStorage = {getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value)};

const {emptyState, getState, setState} = await import('../js/state.js');
const {loadState} = await import('../js/storage.js');
const {startPlank, beginLifting} = await import('../js/workout/timers.js');
const {start, findNext, deferCurrent, substituteCurrent, undoLastSet, completeSet, continueRest, completeStretch, finishWorkout, selectExercise, exerciseSelectionLocked, finishEarly} = await import('../js/workout/session.js');

const task = (exerciseId, set = 1) => ({id: `${exerciseId}-${set}`, exerciseId, originalName: exerciseId, performedName: exerciseId, alternatives: exerciseId === 'press' ? ['DB press'] : [], set, sets: 2, completed: null, skipped: false, groupId: null});
const supersetTask = (exerciseId, memberIndex, set = 1) => ({...task(exerciseId, set), groupId: 'arms', groupType: 'superset', memberIndex, groupLabel: 'Arms'});

test('next-task traversal ignores skipped sets', () => {
  const state = emptyState();
  state.active = {tasks: [task('a'), {...task('b'), skipped: true}, task('c')], pos: 0, deferredGroups: []};
  setState(state);
  assert.equal(findNext(), 2);
});

test('new workouts begin at the warmup screen', async () => {
  setState(emptyState());
  await start('Monday');
  assert.equal(getState().active.phase, 'warmup');
});

test('loads accept two decimals but reps remain whole numbers', async () => {
  const state = emptyState();
  state.active = {tasks: [task('press')], pos: 0, phase: 'lifting', deferredGroups: [], draft: {weight: '50.25', reps: '8'}};
  setState(state);
  assert.deepEqual((await completeSet()), {render: true});
  assert.equal(state.active.phase, 'stretch');
  assert.equal(state.active.tasks[0].completed.weight, 50.25);

  state.active = {tasks: [task('press')], pos: 0, phase: 'lifting', deferredGroups: [], draft: {weight: '50.256', reps: '8'}};
  setState(state);
  assert.match((await completeSet()).error, /2 decimals/);

  state.active.draft = {weight: '50', reps: '8.5'};
  assert.match((await completeSet()).error, /whole-number reps/);
});

test('doing an exercise later moves all remaining sets and selects the next exercise', async () => {
  const state = emptyState();
  state.active = {tasks: [task('press'), task('press', 2), task('row')], pos: 0, deferredGroups: [], draft: {}};
  setState(state);
  await deferCurrent();
  assert.deepEqual(state.active.tasks.map(item => item.exerciseId), ['row', 'press', 'press']);
  assert.equal(state.active.tasks[state.active.pos].exerciseId, 'row');
});

test('substitution updates every remaining set of the exercise', async () => {
  const state = emptyState();
  state.active = {tasks: [task('press'), task('press', 2), task('row')], pos: 0, deferredGroups: [], draft: {}};
  setState(state);
  assert.equal(await substituteCurrent('DB press'), true);
  assert.deepEqual(state.active.tasks.slice(0, 2).map(item => item.performedName), ['DB press', 'DB press']);
});

test('selecting a queued exercise opens its first unfinished set without reordering work', async () => {
  const state = emptyState();
  state.active = {tasks: [task('press'), task('press', 2), task('row'), task('row', 2)], pos: 0, phase: 'lifting', deferredGroups: [], draft: {weight: '50'}};
  setState(state);

  assert.equal(await selectExercise('row'), true);
  assert.equal(state.active.pos, 2);
  assert.equal(state.active.phase, 'lifting');
  assert.deepEqual(state.active.draft, {});
  assert.deepEqual(state.active.tasks.map(item => item.exerciseId), ['press', 'press', 'row', 'row']);
});

test('selecting another exercise is locked after the current exercise starts', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = {reps: 8, completedAt: '2026-09-06T12:00:00.000Z'};
  state.active = {tasks: [completed, task('press', 2), task('row'), task('row', 2)], pos: 1, phase: 'lifting', deferredGroups: [], draft: {reps: '9'}};
  const originalTasks = structuredClone(state.active.tasks);
  setState(state);

  assert.equal(await selectExercise('row'), false);
  assert.equal(state.active.pos, 1);
  assert.deepEqual(state.active.draft, {reps: '9'});
  assert.deepEqual(state.active.tasks, originalTasks);
});

test('selecting an exercise during rest preserves the countdown and changes the next position', async () => {
  const state = emptyState();
  const restEndsAt = Date.now() + 30000;
  const completed = task('press');
  completed.completed = {reps: 8, completedAt: '2026-09-06T12:00:00.000Z'};
  state.active = {tasks: [completed, task('press', 2), task('row'), task('row', 2)], pos: 1, nextPos: 2, phase: 'rest', deferredGroups: [], draft: {}, restEndsAt};
  setState(state);

  assert.equal(await selectExercise('row'), true);
  assert.equal(state.active.phase, 'rest');
  assert.equal(state.active.pos, 1);
  assert.equal(state.active.nextPos, 2);
  assert.equal(state.active.restEndsAt, restEndsAt);

  await continueRest();
  assert.equal(state.active.phase, 'lifting');
  assert.equal(state.active.pos, 2);
  assert.equal(state.active.nextPos, null);
});

test('switching exercises is available during rest between sets', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = {reps: 8, completedAt: '2026-09-06T12:00:00.000Z'};
  state.active = {tasks: [completed, task('press', 2), task('row')], pos: 0, nextPos: 1, phase: 'rest', deferredGroups: [], draft: {}, restEndsAt: Date.now() + 30000};
  setState(state);

  assert.equal(await selectExercise('row'), true);
  assert.equal(state.active.nextPos, 2);
});

test('selecting the second superset member makes it the lead for each round', async () => {
  const state = emptyState();
  state.active = {tasks: [supersetTask('curl', 0), supersetTask('extension', 1), supersetTask('curl', 0, 2), supersetTask('extension', 1, 2)], pos: 0, phase: 'lifting', deferredGroups: [], supersetLeads: {}, draft: {}};
  setState(state);

  assert.equal(await selectExercise('extension'), true);
  assert.equal(state.active.pos, 1);
  assert.equal(state.active.supersetLeads.arms, 1);

  state.active.draft = {reps: '8'};
  await completeSet();
  assert.equal(state.active.tasks[state.active.pos].exerciseId, 'curl');
  assert.equal(state.active.tasks[state.active.pos].set, 1);

  state.active.draft = {reps: '8'};
  await completeSet();
  assert.equal(state.active.phase, 'rest');
  assert.equal(state.active.tasks[state.active.nextPos].exerciseId, 'extension');
  assert.equal(state.active.tasks[state.active.nextPos].set, 2);
  assert.equal(state.active.supersetLeads.arms, 1);
});

test('switching exercises is locked after the first superset member starts', async () => {
  const state = emptyState();
  const completed = supersetTask('curl', 0);
  completed.completed = {reps: 8, completedAt: '2026-09-06T12:00:00.000Z'};
  state.active = {tasks: [completed, supersetTask('extension', 1), supersetTask('curl', 0, 2), supersetTask('extension', 1, 2), task('row')], pos: 1, phase: 'lifting', deferredGroups: [], supersetLeads: {}, draft: {}};
  setState(state);

  assert.equal(exerciseSelectionLocked(state.active), true);
  assert.equal(await selectExercise('row'), false);
  assert.equal(state.active.pos, 1);
});

test('a superset can be switched during rest when no partner is forced', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = {reps: 8, completedAt: '2026-09-06T12:00:00.000Z'};
  state.active = {tasks: [completed, supersetTask('curl', 0), supersetTask('extension', 1)], pos: 0, nextPos: 1, phase: 'rest', deferredGroups: [], supersetLeads: {}, draft: {}, restEndsAt: Date.now() + 30000};
  setState(state);

  assert.equal(await selectExercise('extension'), true);
  assert.equal(state.active.nextPos, 2);
  assert.equal(state.active.supersetLeads.arms, 1);
});

test('undo restores the latest completed set as an editable draft', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = {weight: 50, reps: 8, rir: '1', completedAt: '2026-09-06T12:00:00.000Z'};
  state.active = {tasks: [completed, task('row')], pos: 1, phase: 'rest', deferredGroups: [], draft: {}, restEndsAt: Date.now() + 1000};
  setState(state);
  await undoLastSet();
  assert.equal(state.active.pos, 0);
  assert.equal(state.active.tasks[0].completed, null);
  assert.deepEqual(state.active.draft, {weight: 50, reps: 8, rir: '1'});
});

test('finishing early saves completed work and marks unfinished tasks skipped', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = {weight: 50, reps: 8, rir: '1', unit: 'kg', completedAt: '2026-09-06T12:00:00.000Z'};
  state.active = {name: 'UPPER A', date: '2026-09-06T11:30:00.000Z', tasks: [completed, task('row')], pos: 1, phase: 'lifting', deferredGroups: [], draft: {}};
  setState(state);

  await finishEarly();

  assert.equal(state.active, null);
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].tasks[0].completed.weight, 50);
  assert.equal(state.history[0].tasks[1].skipped, true);
  assert.ok(state.history[0].completedAt);
});

test('normal direct save records a completion time', async () => {
  const state = emptyState();
  state.active = {name: 'UPPER A', date: '2026-09-06T11:30:00.000Z', tasks: [task('press')], pos: 0, phase: 'stretch', deferredGroups: [], draft: {}};
  setState(state);

  await finishWorkout();

  assert.ok(state.history[0].completedAt);
  assert.equal(state.active, null);
});

test('a complete workout persists and reloads through the fallback store', async () => {
  setState(emptyState());
  assert.equal(await start('Monday'), true);
  await startPlank();
  await beginLifting();
  while (getState().active.phase === 'lifting' || getState().active.phase === 'rest') {
    if (getState().active.phase === 'rest') {
      await continueRest();
      continue;
    }
    getState().active.draft = {weight: '50', reps: '8', rir: '1'};
    await completeSet();
  }
  assert.equal(getState().active.phase, 'stretch');
  await completeStretch();
  await finishWorkout();
  assert.equal(getState().history.length, 1);
  assert.equal(getState().active, null);
  setState(emptyState());
  await loadState();
  assert.equal(getState().history.length, 1);
  assert.equal(getState().history[0].tasks.every(item => item.completed), true);
});
