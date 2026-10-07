import assert from 'node:assert/strict';
import test from 'node:test';
import { loadState, migrate } from '../js/storage.js';
import {
  createDefaultPrescription,
  createPrescription,
  optimizeRoutine,
  compareFrequencies,
} from '../js/workout/optimizer.js';
import { evaluatePrescription, FREQUENCY_COOLDOWN_MS } from '../js/workout/coordinator.js';

const workout = (minutes, sets = 21, index = 0) => ({
  completedAt: new Date(Date.now() - index * 86400000).toISOString(),
  durationMs: minutes * 60000,
  tasks: Array.from({ length: sets }, () => ({ completed: { reps: 8, weight: 50 } })),
});

test('migration adds the current three-day prescription without changing history', () => {
  const history = [{ date: '2026-01-01', tasks: [] }];
  const state = migrate({ version: 2, history });
  assert.equal(state.prescription.daysPerWeek, 3);
  assert.deepEqual(state.prescription.days, ['Monday', 'Wednesday', 'Friday']);
  assert.equal(state.history[0], history[0]);
  assert.equal(state.prescription.programId, 'fixed-hypertrophy-3-day-v1');
  assert.equal(state.prescription.weeklySetAllocation['cable-crunch'], 2);
});

test('migration replaces an old prescription but leaves historical records untouched', () => {
  const history = [{ day: 'Monday', tasks: [{ exerciseId: 'old-press', completed: { reps: 8 } }] }];
  const state = migrate({
    version: 2,
    history,
    prescription: { version: 1, daysPerWeek: 2, routine: [], names: [] },
  });
  assert.equal(state.prescription.programId, 'fixed-hypertrophy-3-day-v1');
  assert.deepEqual(state.history, history);
});

test('migration upgrades the legacy two-day program and keeps every completed set', () => {
  const history = [
    {
      day: 'Thursday',
      completedAt: '2026-10-01T17:20:21.499Z',
      tasks: [{ exerciseId: 'cable-curl', completed: { reps: 10, weight: 25, unit: 'kg' } }],
    },
  ];
  const state = migrate({ version: 2, history, prescription: createPrescription(2) });
  assert.equal(state.prescription.programId, 'fixed-hypertrophy-3-day-v1');
  assert.deepEqual(state.prescription.days, ['Monday', 'Wednesday', 'Friday']);
  assert.deepEqual(state.history, history);
});

test('migration leaves the current three-day program untouched', () => {
  const current = createDefaultPrescription({ lastEvaluatedAt: 123 });
  const state = migrate({ version: 2, history: [], prescription: current });
  assert.equal(state.prescription, current);
  assert.equal(state.prescription.lastEvaluatedAt, 123);
});

test('a fresh install starts on the three-day program', async () => {
  const state = await loadState();
  assert.equal(state.prescription.programId, 'fixed-hypertrophy-3-day-v1');
  assert.equal(state.history.length, 0);
});

test('real generator supports 2, 3, and 4 days while preserving exercise IDs', () => {
  const ids = (days) =>
    optimizeRoutine({ daysPerWeek: days })
      .routine.flat(2)
      .flatMap((item) => item.members || [item])
      .map((item) => item.id);
  assert.deepEqual(optimizeRoutine({ daysPerWeek: 3 }).days, ['Monday', 'Wednesday', 'Friday']);
  assert.deepEqual(optimizeRoutine({ daysPerWeek: 4 }).days, [
    'Monday',
    'Tuesday',
    'Thursday',
    'Saturday',
  ]);
  assert.deepEqual(new Set(ids(2)), new Set(ids(3)));
});

test('six overloaded personal sessions can justify 2 to 3, but one anomaly cannot', () => {
  const current = createPrescription(2, {
    lastEvaluatedAt: Date.now() - FREQUENCY_COOLDOWN_MS - 1,
    programId: 'adaptive-routine',
  });
  const noisy = { prescription: current, history: [workout(180, 21)] };
  assert.equal(evaluatePrescription(noisy).action, 'KEEP');
  const sustained = {
    prescription: current,
    history: Array.from({ length: 6 }, (_, index) => workout(index < 3 ? 150 : 35, 21, index)),
  };
  const result = evaluatePrescription(sustained);
  assert.equal(result.action, 'FREQUENCY');
  assert.equal(result.days, 3);
  assert.equal(
    compareFrequencies({ state: sustained }).sort((a, b) => b.utility - a.utility)[0].days,
    3,
  );
});

test('fixed programs are never re-optimized, even after sustained overload', () => {
  const history = Array.from({ length: 6 }, (_, index) => workout(index < 3 ? 150 : 35, 21, index));
  [createPrescription(2), createDefaultPrescription()].forEach((prescription) => {
    const stale = { ...prescription, lastEvaluatedAt: Date.now() - FREQUENCY_COOLDOWN_MS - 1 };
    const result = evaluatePrescription({ prescription: stale, history });
    assert.equal(result.action, 'KEEP', prescription.programId);
    assert.equal(result.reason, 'The fixed program is canonical.');
  });
});
