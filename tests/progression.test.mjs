import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextDoubleProgression,
  parseRepRange,
  recommendDoubleProgression,
} from '../js/workout/progression.js';
import { adaptiveRecommendations, rollingExerciseTrend } from '../js/workout/adaptation.js';

test('parses target rep ranges', () => {
  assert.deepEqual(parseRepRange('6–10'), { lower: 6, upper: 10 });
  assert.deepEqual(parseRepRange('12'), { lower: 12, upper: 12 });
});

test('double progression increases load only at the upper bound and target RIR', () => {
  assert.deepEqual(
    nextDoubleProgression({ load: 50, reps: 10, targetRepRange: '6–10', rir: '2' }),
    { action: 'increase-load', load: 52.5, reps: 6 },
  );
  assert.deepEqual(nextDoubleProgression({ load: 50, reps: 9, targetRepRange: '6–10', rir: '1' }), {
    action: 'repeat-load',
    load: 50,
    reps: 9,
  });
  assert.deepEqual(
    nextDoubleProgression({ load: 50, reps: 10, targetRepRange: '6–10', rir: '0' }),
    { action: 'increase-load', load: 52.5, reps: 6 },
  );
});

test('multi-set double progression waits for every prescribed set', () => {
  const base = {
    load: 80,
    prescribedSets: 3,
    targetRepRange: '6–10',
    targetRir: '2 → 1',
  };
  assert.deepEqual(
    recommendDoubleProgression({
      ...base,
      performances: [
        { reps: 10, rir: 2 },
        { reps: 10, rir: 1 },
        { reps: 9, rir: 1 },
      ],
    }),
    { action: 'repeat-load', load: 80, reps: 6 },
  );
  assert.deepEqual(
    recommendDoubleProgression({
      ...base,
      performances: [
        { reps: 10, rir: 2 },
        { reps: 10, rir: 1 },
        { reps: 10, rir: 1 },
      ],
    }),
    { action: 'increase-load', load: 82.5, reps: 6 },
  );
  assert.deepEqual(
    recommendDoubleProgression({
      ...base,
      performances: [
        { reps: 10, rir: 0 },
        { reps: 10, rir: 1 },
        { reps: 10, rir: 1 },
      ],
    }),
    { action: 'repeat-load', load: 80, reps: 6 },
  );
});

test('multi-set recommendation ignores a premature single-set peak', () => {
  assert.deepEqual(
    recommendDoubleProgression({
      load: 80,
      prescribedSets: 3,
      targetRepRange: '6–10',
      targetRir: '2 → 1',
      performances: [{ set: 1, reps: 10, rir: 2 }],
    }),
    { action: 'repeat-load', load: 80, reps: 6 },
  );
});

test('rolling trend uses recent completed workouts and adaptation defaults to keep', () => {
  const history = [
    {
      completedAt: '2026-09-10',
      tasks: [{ exerciseId: 'press', completed: { reps: 10, weight: 50 } }],
    },
    {
      completedAt: '2026-09-03',
      tasks: [{ exerciseId: 'press', completed: { reps: 8, weight: 47.5 } }],
    },
  ];
  assert.equal(rollingExerciseTrend(history, 'press').improving, true);
  assert.equal(
    adaptiveRecommendations({
      allocation: { upperChest: 5 },
      trends: { upperChest: { improving: false } },
      adherence: 1,
    })[0].action,
    'ADD 1 SET/WEEK',
  );
  assert.equal(
    adaptiveRecommendations({ allocation: { upperChest: 5 }, adherence: 0.5 })[0].action,
    'KEEP',
  );
});

test('adaptation can reallocate one set from low priority to a stagnant priority muscle', () => {
  const recommendations = adaptiveRecommendations({
    allocation: { calves: 3, sideDelts: 4 },
    trends: { sideDelts: { improving: false } },
    actualTimeCost: { calves: 5, sideDelts: 10 },
    adherence: 1,
  });
  const move = recommendations.find((item) => item.action.startsWith('REALLOCATE'));
  assert.equal(move.muscle, 'calves');
  assert.equal(move.to, 'sideDelts');
});
