import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  querySelector: () => null,
  addEventListener: () => {},
  body: { dataset: {} },
  visibilityState: 'visible',
};
globalThis.confirm = () => true;
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) || null,
  setItem: (key, value) => stored.set(key, value),
};

const { emptyState, getState, setState } = await import('../js/state.js');
const { loadState } = await import('../js/storage.js');
const { STRETCH_MS } = await import('../js/constants.js');
const { startPlank, beginLifting, setTimer } = await import('../js/workout/timers.js');
const {
  start,
  findNext,
  deferCurrent,
  substituteCurrent,
  undoLastSet,
  completeSet,
  continueRest,
  selectExercise,
  exerciseSelectionLocked,
  supersetProgress,
  sessionBudgetState,
  timeBudgetCutOrder,
} = await import('../js/workout/session.js');
const { completeStretch, finishWorkout, finishEarly, finishAtBudget } =
  await import('../js/workout/finish.js');
const { isCurrentDayComplete } = await import('../js/render-today.js');
const { ROUTINE, NAMES } = await import('../js/routine-data.js');

const task = (exerciseId, set = 1) => ({
  id: `${exerciseId}-${set}`,
  exerciseId,
  originalName: exerciseId,
  performedName: exerciseId,
  alternatives: exerciseId === 'press' ? ['DB press'] : [],
  set,
  sets: 2,
  completed: null,
  skipped: false,
  groupId: null,
});
const supersetTask = (exerciseId, memberIndex, set = 1) => ({
  ...task(exerciseId, set),
  groupId: 'arms',
  groupType: 'superset',
  memberIndex,
  groupLabel: 'Arms',
});

test('next-task traversal ignores skipped sets', () => {
  const state = emptyState();
  state.active = {
    tasks: [task('a'), { ...task('b'), skipped: true }, task('c')],
    pos: 0,
    deferredGroups: [],
  };
  setState(state);
  assert.equal(findNext(), 2);
});

test('superset progress describes the current round and unfinished members', () => {
  const first = supersetTask('curl', 0);
  const second = supersetTask('extension', 1);
  const active = { tasks: [first, second], pos: 0 };
  assert.deepEqual(supersetProgress(active, first), {
    currentMember: 1,
    totalMembers: 2,
    remaining: 1,
  });
  assert.deepEqual(supersetProgress(active, second), {
    currentMember: 2,
    totalMembers: 2,
    remaining: 0,
  });
});

test('superset progress ignores completed or skipped members after the current task', () => {
  const current = supersetTask('curl', 0);
  const completed = supersetTask('extension', 1);
  completed.completed = { reps: 8 };
  const skipped = supersetTask('pressdown', 2);
  skipped.skipped = true;
  const active = { tasks: [current, completed, skipped], pos: 0 };
  assert.deepEqual(supersetProgress(active), {
    currentMember: 1,
    totalMembers: 3,
    remaining: 0,
  });
});

test('superset progress handles an uneven later round', () => {
  const firstRound = supersetTask('curl', 0, 1);
  const laterRound = supersetTask('extension', 1, 2);
  const active = { tasks: [firstRound, laterRound], pos: 1 };
  assert.deepEqual(supersetProgress(active), {
    currentMember: 1,
    totalMembers: 1,
    remaining: 0,
  });
  assert.equal(supersetProgress(active, task('press')), null);
});

test('new workouts begin at exercise selection', async () => {
  setState(emptyState());
  await start('Monday');
  assert.equal(getState().active.phase, 'lifting');
});

test('initial exercise selection stays unlocked during warmup', () => {
  const state = emptyState();
  state.active = { phase: 'warmup', tasks: [task('press')], pos: 0 };
  assert.equal(exerciseSelectionLocked(state.active), false);
});

test('new workouts snapshot changed routine details and reject empty definitions', async () => {
  const originalRoutine = ROUTINE.Adapted;
  const originalName = NAMES.Adapted;
  try {
    ROUTINE.Adapted = [
      { type: 'exercise', id: 'updated-press', name: 'Updated Press', sets: 1, reps: '4–6' },
      {
        type: 'equipmentBlock',
        id: 'updated-block',
        label: 'Updated block',
        items: [
          { type: 'exercise', id: 'updated-row', name: 'Updated Row', sets: 2, reps: '8–10' },
        ],
      },
    ];
    NAMES.Adapted = 'ADAPTED';
    setState(emptyState());
    assert.equal(await start('Adapted'), true);
    assert.equal(getState().active.name, 'ADAPTED');
    assert.deepEqual(
      getState().active.tasks.map((item) => [item.originalName, item.sets, item.reps]),
      [
        ['Updated Press', 1, '4–6'],
        ['Updated Row', 2, '8–10'],
        ['Updated Row', 2, '8–10'],
      ],
    );
    await finishWorkout();
    assert.equal(getState().history[0].tasks[0].originalName, 'Updated Press');

    ROUTINE.Adapted = [];
    assert.equal(await start('Adapted'), false);
    assert.equal(getState().active, null);
    ROUTINE.Adapted = [{ type: 'superset', id: 'empty', members: [] }];
    assert.equal(await start('Adapted'), false);
  } finally {
    if (originalRoutine === undefined) delete ROUTINE.Adapted;
    else ROUTINE.Adapted = originalRoutine;
    if (originalName === undefined) delete NAMES.Adapted;
    else NAMES.Adapted = originalName;
  }
});

test('loads accept two decimals but reps remain whole numbers', async () => {
  const state = emptyState();
  state.active = {
    tasks: [task('press')],
    pos: 0,
    phase: 'lifting',
    deferredGroups: [],
    draft: { weight: '50.25', reps: '8' },
  };
  setState(state);
  assert.deepEqual(await completeSet(), { render: true });
  assert.equal(state.active.phase, 'stretch');
  assert.equal(state.active.tasks[0].completed.weight, 50.25);

  state.active = {
    tasks: [task('press')],
    pos: 0,
    phase: 'lifting',
    deferredGroups: [],
    draft: { weight: '50.256', reps: '8' },
  };
  setState(state);
  assert.match((await completeSet()).error, /2 decimals/);

  state.active.draft = { weight: '50', reps: '8.5' };
  assert.match((await completeSet()).error, /whole-number reps/);
});

test('finishing the final set opens idle stretch controls', async () => {
  const state = emptyState();
  state.active = {
    tasks: [task('press')],
    pos: 0,
    phase: 'lifting',
    deferredGroups: [],
    draft: { reps: '8' },
  };
  setState(state);

  await completeSet();

  assert.equal(state.active.phase, 'stretch');
  assert.equal(state.active.timerEndsAt, null);
});

test('stretch start persists a timer and completion returns to idle', async () => {
  const state = emptyState();
  state.active = { tasks: [task('press')], phase: 'stretch', timerEndsAt: null };
  setState(state);
  const before = Date.now();
  await setTimer(STRETCH_MS);
  assert.ok(state.active.timerEndsAt >= before + STRETCH_MS - 100);
  await completeStretch();
  assert.equal(state.active.timerEndsAt, null);
});

test('Today completion requires the same routine day and local completion date', () => {
  const now = new Date(2026, 8, 9, 12);
  const history = [
    { day: 'Monday', completedAt: new Date(2026, 8, 9, 9).toISOString() },
    { day: 'Tuesday', completedAt: new Date(2026, 8, 9, 9).toISOString() },
    { day: 'Monday', completedAt: new Date(2026, 8, 8, 23).toISOString() },
  ];
  assert.equal(isCurrentDayComplete(history, 'Monday', now), true);
  assert.equal(isCurrentDayComplete(history, 'Wednesday', now), false);
  assert.equal(isCurrentDayComplete(history.slice(1), 'Monday', now), false);
});

test('doing an exercise later moves all remaining sets and selects the next exercise', async () => {
  const state = emptyState();
  state.active = {
    tasks: [task('press'), task('press', 2), task('row')],
    pos: 0,
    deferredGroups: [],
    draft: {},
  };
  setState(state);
  await deferCurrent();
  assert.deepEqual(
    state.active.tasks.map((item) => item.exerciseId),
    ['row', 'press', 'press'],
  );
  assert.equal(state.active.tasks[state.active.pos].exerciseId, 'row');
});

test('substitution updates every remaining set of the exercise', async () => {
  const state = emptyState();
  state.active = {
    tasks: [task('press'), task('press', 2), task('row')],
    pos: 0,
    deferredGroups: [],
    draft: {},
  };
  setState(state);
  assert.equal(await substituteCurrent('DB press'), true);
  assert.deepEqual(
    state.active.tasks.slice(0, 2).map((item) => item.performedName),
    ['DB press', 'DB press'],
  );
});

test('selecting a queued exercise opens its first unfinished set without reordering work', async () => {
  const state = emptyState();
  state.active = {
    tasks: [task('press'), task('press', 2), task('row'), task('row', 2)],
    pos: 0,
    phase: 'lifting',
    deferredGroups: [],
    draft: { weight: '50' },
  };
  setState(state);

  assert.equal(await selectExercise('row'), true);
  assert.equal(state.active.pos, 2);
  assert.equal(state.active.phase, 'lifting');
  assert.deepEqual(state.active.draft, {});
  assert.deepEqual(
    state.active.tasks.map((item) => item.exerciseId),
    ['press', 'press', 'row', 'row'],
  );
});

test('selecting another exercise is locked after the current exercise starts', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = { reps: 8, completedAt: '2026-09-06T12:00:00.000Z' };
  state.active = {
    tasks: [completed, task('press', 2), task('row'), task('row', 2)],
    pos: 1,
    phase: 'lifting',
    deferredGroups: [],
    draft: { reps: '9' },
  };
  const originalTasks = structuredClone(state.active.tasks);
  setState(state);

  assert.equal(await selectExercise('row'), false);
  assert.equal(state.active.pos, 1);
  assert.deepEqual(state.active.draft, { reps: '9' });
  assert.deepEqual(state.active.tasks, originalTasks);
});

test('selecting an exercise during rest preserves the countdown and changes the next position', async () => {
  const state = emptyState();
  const restEndsAt = Date.now() + 30000;
  const completed = task('press');
  completed.completed = { reps: 8, completedAt: '2026-09-06T12:00:00.000Z' };
  state.active = {
    tasks: [completed, task('press', 2), task('row'), task('row', 2)],
    pos: 1,
    nextPos: 2,
    phase: 'rest',
    deferredGroups: [],
    draft: {},
    restEndsAt,
  };
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

test('switching exercises is allowed during rest between sets', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = { reps: 8, completedAt: '2026-09-06T12:00:00.000Z' };
  state.active = {
    tasks: [completed, task('press', 2), task('row')],
    pos: 0,
    nextPos: 1,
    phase: 'rest',
    deferredGroups: [],
    draft: {},
    restEndsAt: Date.now() + 30000,
  };
  setState(state);

  assert.equal(await selectExercise('row'), true);
  assert.equal(state.active.nextPos, 2);
});

test('selecting the second superset member makes it the lead for each round', async () => {
  const state = emptyState();
  state.active = {
    tasks: [
      supersetTask('curl', 0),
      supersetTask('extension', 1),
      supersetTask('curl', 0, 2),
      supersetTask('extension', 1, 2),
    ],
    pos: 0,
    phase: 'lifting',
    deferredGroups: [],
    supersetLeads: {},
    draft: {},
  };
  setState(state);

  assert.equal(await selectExercise('extension'), true);
  assert.equal(state.active.pos, 1);
  assert.equal(state.active.supersetLeads.arms, 1);

  state.active.draft = { reps: '8' };
  await completeSet();
  assert.equal(state.active.phase, 'lifting');
  assert.equal(state.active.tasks[state.active.pos].exerciseId, 'curl');
  assert.equal(state.active.tasks[state.active.pos].set, 1);

  state.active.draft = { reps: '8' };
  await completeSet();
  assert.equal(state.active.phase, 'rest');
  assert.equal(state.active.tasks[state.active.nextPos].exerciseId, 'extension');
  assert.equal(state.active.tasks[state.active.nextPos].set, 2);
  assert.equal(state.active.supersetLeads.arms, 1);
});

test('session budget reaches the cap without ending the active workout and cuts only optional work', async () => {
  const state = emptyState();
  state.active = {
    startedAt: Date.now() - 60 * 60 * 1000,
    phase: 'lifting',
    pos: 0,
    deferredGroups: [],
    tasks: [
      { ...task('press'), completed: { reps: 8 } },
      { ...task('calf'), cutPriority: 1 },
      { ...task('crunch'), cutPriority: 2 },
      { ...task('row') },
    ],
    draft: {},
  };
  setState(state);
  assert.equal(sessionBudgetState(state.active).capReached, true);
  assert.deepEqual(timeBudgetCutOrder(state.active), ['calf', 'crunch']);
  await finishAtBudget();
  assert.equal(state.active.tasks[1].skipReason, 'time-budget');
  assert.equal(state.active.tasks[2].skipReason, 'time-budget');
  assert.equal(Boolean(state.active.tasks[3].skipped), false);
  assert.equal(state.active.phase, 'lifting');
});

test('switching exercises is locked after the first superset member starts', async () => {
  const state = emptyState();
  const completed = supersetTask('curl', 0);
  completed.completed = { reps: 8, completedAt: '2026-09-06T12:00:00.000Z' };
  state.active = {
    tasks: [
      completed,
      supersetTask('extension', 1),
      supersetTask('curl', 0, 2),
      supersetTask('extension', 1, 2),
      task('row'),
    ],
    pos: 1,
    phase: 'lifting',
    deferredGroups: [],
    supersetLeads: {},
    draft: {},
  };
  setState(state);

  assert.equal(exerciseSelectionLocked(state.active), true);
  assert.equal(await selectExercise('row'), false);
  assert.equal(state.active.pos, 1);
});

test('a superset can be switched during rest when no partner is forced', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = { reps: 8, completedAt: '2026-09-06T12:00:00.000Z' };
  state.active = {
    tasks: [completed, supersetTask('curl', 0), supersetTask('extension', 1)],
    pos: 0,
    nextPos: 1,
    phase: 'rest',
    deferredGroups: [],
    supersetLeads: {},
    draft: {},
    restEndsAt: Date.now() + 30000,
  };
  setState(state);

  assert.equal(await selectExercise('extension'), true);
  assert.equal(state.active.nextPos, 2);
  assert.equal(state.active.supersetLeads.arms, 1);
});

test('undo restores the latest completed set as an editable draft', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = { weight: 50, reps: 8, rir: '1', completedAt: '2026-09-06T12:00:00.000Z' };
  state.active = {
    tasks: [completed, task('row')],
    pos: 1,
    phase: 'rest',
    deferredGroups: [],
    draft: {},
    restEndsAt: Date.now() + 1000,
  };
  setState(state);
  await undoLastSet();
  assert.equal(state.active.pos, 0);
  assert.equal(state.active.tasks[0].completed, null);
  assert.deepEqual(state.active.draft, { weight: 50, reps: 8, rir: '1' });
});

test('finishing early saves completed work and marks unfinished tasks skipped', async () => {
  const state = emptyState();
  const completed = task('press');
  completed.completed = {
    weight: 50,
    reps: 8,
    rir: '1',
    unit: 'kg',
    completedAt: '2026-09-06T12:00:00.000Z',
  };
  state.active = {
    name: 'UPPER A',
    date: '2026-09-06T11:30:00.000Z',
    tasks: [completed, task('row')],
    pos: 1,
    phase: 'lifting',
    deferredGroups: [],
    draft: {},
  };
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
  state.active = {
    name: 'UPPER A',
    date: '2026-09-06T11:30:00.000Z',
    tasks: [task('press')],
    pos: 0,
    phase: 'stretch',
    deferredGroups: [],
    draft: {},
  };
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
    getState().active.draft = { weight: '50', reps: '8', rir: '1' };
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
  assert.equal(
    getState().history[0].tasks.every((item) => item.completed),
    true,
  );
});
