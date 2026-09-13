import test from 'node:test';
import assert from 'node:assert/strict';
import { healthCoverage, weeklyGymAnalytics } from '../js/workout/metrics.js';

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
