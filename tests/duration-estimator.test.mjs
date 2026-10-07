import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activityDurationEstimate,
  minutesPerSetEstimate,
  robustDurationEstimate,
  routineDurationEstimate,
} from '../js/workout/duration-estimator.js';
import { compareFrequencies } from '../js/workout/optimizer.js';

test('duration estimate keeps the prior then moves toward repeated personal observations', () => {
  assert.equal(robustDurationEstimate(30, []), 30);
  const state = {
    health: {
      activities: [
        { type: 'walk', completed: true, durationMs: 25 * 60000 },
        { type: 'walk', completed: true, durationMs: 24 * 60000 },
        { type: 'walk', completed: true, durationMs: 26 * 60000 },
      ],
    },
  };
  const estimate = activityDurationEstimate(state, 'walk', 30);
  assert.ok(estimate < 30);
  assert.ok(estimate > 24);
});

test('one anomalous duration is bounded by the robust prior blend', () => {
  assert.equal(robustDurationEstimate(30, [180]), 52.5);
});

test('learned routine time reaches the frequency optimizer', () => {
  const state = {
    history: [
      { completed: true, durationMs: 60 * 60000 },
      { completed: true, durationMs: 60 * 60000 },
      { completed: true, durationMs: 60 * 60000 },
    ],
  };
  assert.ok(routineDurationEstimate(state) > 51);
  assert.equal(compareFrequencies({ state })[0].sessionMinutes, routineDurationEstimate(state));
  assert.ok(compareFrequencies({ state })[0].minutes > 102);
});

test('minutes per set start from the prior and move toward the observed pace', () => {
  assert.equal(minutesPerSetEstimate({ history: [] }), 51 / 24);
  const sets = (count) => Array.from({ length: count }, () => ({ completed: { reps: 8 } }));
  const slow = {
    history: Array.from({ length: 3 }, () => ({
      completed: true,
      durationMs: 72 * 60000,
      tasks: sets(24),
    })),
  };
  assert.ok(minutesPerSetEstimate(slow) > 51 / 24);
  assert.ok(minutesPerSetEstimate(slow) < 3);
});

test('skipped sets do not shrink the observed time per set', () => {
  const tasks = [
    ...Array.from({ length: 10 }, () => ({ completed: { reps: 8 } })),
    ...Array.from({ length: 14 }, () => ({ completed: null, skipped: true })),
  ];
  const state = { history: [{ completed: true, durationMs: 30 * 60000, tasks }] };
  assert.ok(minutesPerSetEstimate(state) > 51 / 24);
});
