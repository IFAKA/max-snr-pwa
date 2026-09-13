import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activityDurationEstimate,
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
