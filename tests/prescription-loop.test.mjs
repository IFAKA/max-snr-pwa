import assert from 'node:assert/strict';
import test from 'node:test';
import { migrate } from '../js/storage.js';
import {
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

test('migration adds the current two-day prescription without changing history', () => {
  const history = [{ date: '2026-01-01', tasks: [] }];
  const state = migrate({ version: 2, history });
  assert.equal(state.prescription.daysPerWeek, 2);
  assert.deepEqual(state.prescription.days, ['Monday', 'Thursday']);
  assert.equal(state.history[0], history[0]);
  assert.equal(state.prescription.weeklySetAllocation['cable-crunch'], 4);
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
