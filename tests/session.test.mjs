import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {querySelector: () => null, addEventListener: () => {}, body: {dataset: {}}, visibilityState: 'visible'};
globalThis.confirm = () => true;
const stored = new Map();
globalThis.localStorage = {getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value)};

const {emptyState, getState, setState} = await import('../js/state.js');
const {loadState} = await import('../js/storage.js');
const {startPlank, beginLifting} = await import('../js/workout/timers.js');
const {start, findNext, deferCurrent, substituteCurrent, undoLastSet, completeSet, continueRest, completeStretch, finishWorkout} = await import('../js/workout/session.js');

const task = (exerciseId, set = 1) => ({id: `${exerciseId}-${set}`, exerciseId, originalName: exerciseId, performedName: exerciseId, alternatives: exerciseId === 'press' ? ['DB press'] : [], set, sets: 2, completed: null, skipped: false, groupId: null});

test('next-task traversal ignores skipped sets', () => {
  const state = emptyState();
  state.active = {tasks: [task('a'), {...task('b'), skipped: true}, task('c')], pos: 0, deferredGroups: []};
  setState(state);
  assert.equal(findNext(), 2);
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
