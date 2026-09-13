import test from 'node:test';
import assert from 'node:assert/strict';
import {
  healthCoverage,
  observedSessionDurations,
  sedentaryStatus,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from '../js/workout/metrics.js';

test('weekly gym analytics separates direct and fractional muscle sets', () => {
  const state = {
    history: [
      {
        completedAt: '2026-09-08T10:00:00',
        durationMs: 2700000,
        tasks: [
          {
            exerciseId: 'press',
            primary: { upperChest: 1 },
            secondary: { arms: 0.25 },
            completed: { reps: 8 },
          },
          {
            exerciseId: 'press',
            primary: { upperChest: 1 },
            secondary: { arms: 0.25 },
            completed: { reps: 8 },
          },
        ],
      },
    ],
    health: {
      movementMinutes: [{ date: '2026-09-08', minutes: 20 }],
      cardioMinutes: [{ date: '2026-09-08', minutes: 30 }],
    },
  };
  const result = weeklyGymAnalytics(state, new Date('2026-09-09T12:00:00'));
  assert.equal(result.sessions, 1);
  assert.equal(result.minutes, 45);
  assert.equal(result.directSets.upperChest, 2);
  assert.equal(result.effectiveSets.arms, 0.5);
  assert.equal(result.cardioMinutes, 30);
  assert.equal(healthCoverage(state, new Date('2026-09-09T12:00:00')).resistanceMet, false);
});

test('two lifting sessions do not solve sedentary or movement exposure', () => {
  const state = {
    history: [
      { completedAt: '2026-09-08', tasks: [] },
      { completedAt: '2026-09-09', tasks: [] },
    ],
    health: {
      movementMinutes: [],
      cardioMinutes: [],
      sedentary: { profileHoursPerDay: 10, exposureClass: 'high', logs: [] },
    },
  };
  const coverage = healthCoverage(state, new Date('2026-09-09T12:00:00'));
  assert.equal(coverage.resistanceMet, true);
  assert.equal(coverage.movementLogged, false);
  assert.equal(sedentaryStatus(state).exposureClass, 'high');
});

test('150 moderate-equivalent minutes do not erase high sedentary exposure', () => {
  const state = {
    history: [],
    health: {
      movementMinutes: [{ date: '2026-09-09', minutes: 10 }],
      cardioMinutes: [{ date: '2026-09-09', minutes: 150, intensity: 'moderate' }],
      sedentary: { profileHoursPerDay: 10, exposureClass: 'high', logs: [] },
    },
  };
  const coverage = healthCoverage(state, new Date('2026-09-09T12:00:00'));
  const status = sedentaryStatus(state);
  assert.equal(coverage.aerobicMinimumMet, true);
  assert.equal(status.exposureClass, 'high');
  assert.match(status.recommendation, /more than the minimum MVPA/);
  assert.match(status.recommendation, /walk during calls/);
  assert.doesNotMatch(status.recommendation, /\b(?:30|45|60)\b/);
});

test('session estimate is compared with observed timestamps', () => {
  const history = [
    { startedAt: Date.parse('2026-09-09T10:00:00Z'), completedAt: '2026-09-09T10:51:00Z' },
    { startedAt: Date.parse('2026-09-08T10:00:00Z'), completedAt: '2026-09-08T10:49:00Z' },
  ];
  assert.deepEqual(observedSessionDurations(history), [51, 49]);
  assert.deepEqual(sessionTimingComparison(history, 51), {
    estimate: 51,
    observedCount: 2,
    mean: 50,
    median: 51,
    difference: -1,
  });
});
