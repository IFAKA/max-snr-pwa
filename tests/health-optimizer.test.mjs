import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyHealthSummary, selectRecommendation } from '../js/workout/health-optimizer.js';

const now = new Date('2026-09-09T12:00:00Z');
const base = (overrides = {}) => ({
  history: [],
  active: null,
  settings: {},
  health: {
    cardioMinutes: [],
    movementMinutes: [],
    measurements: [{ date: '2026-09-08', waist: 79 }],
    sedentary: { profileHoursPerDay: 10, logs: [] },
    activities: [],
  },
  ...overrides,
});

test('resistance is selected when due on a planned day', () => {
  const result = selectRecommendation(base(), { day: 'Wednesday', now });
  assert.equal(result.type, 'resistance');
});

test('one walk overlaps aerobic and sedentary deficits', () => {
  const state = base({
    history: [
      { completed: true, completedAt: '2026-09-08T10:00:00Z' },
      { completed: true, completedAt: '2026-09-09T10:00:00Z' },
    ],
  });
  const result = selectRecommendation(state, { day: '', now });
  assert.equal(result.type, 'walk');
  assert.equal(result.durationMinutes, 30);
  assert.equal(result.metric, '30m');
  assert.match(result.reason, /cardio.*sitting/i);
});

test('adequate dimensions allow doing nothing', () => {
  const state = base({
    history: [
      { completed: true, completedAt: '2026-09-08T10:00:00Z' },
      { completed: true, completedAt: '2026-09-09T10:00:00Z' },
    ],
    health: {
      ...base().health,
      movementMinutes: [{ date: '2026-09-08', minutes: 20 }],
      cardioMinutes: [{ date: '2026-09-08', minutes: 150, intensity: 'moderate' }],
      sedentary: { profileHoursPerDay: 6, logs: [] },
    },
  });
  assert.equal(selectRecommendation(state, { day: '', now }).type, 'rest');
});

test('resistance and aerobic activity do not solve sedentary exposure', () => {
  const state = base({
    history: [
      { completed: true, completedAt: '2026-09-08T10:00:00Z' },
      { completed: true, completedAt: '2026-09-09T10:00:00Z' },
    ],
    health: {
      ...base().health,
      cardioMinutes: [{ date: '2026-09-08', minutes: 150, intensity: 'moderate' }],
    },
  });
  const summary = bodyHealthSummary(state, now);
  assert.equal(summary.aerobicMet, true);
  assert.equal(summary.sedentaryHigh, true);
});

test('high sitting does not infer corrective exercise', () => {
  const result = selectRecommendation(
    base({
      history: [
        { completed: true, completedAt: '2026-09-08T10:00:00Z' },
        { completed: true, completedAt: '2026-09-09T10:00:00Z' },
      ],
      health: { ...base().health, cardioMinutes: [{ date: '2026-09-08', minutes: 150 }] },
    }),
    { day: '', now },
  );
  assert.equal(result.type, 'walk');
  assert.doesNotMatch(result.title, /posture|face pull|mobility|activation/i);
});

test('vigorous legacy cardio uses the same moderate-equivalent calculation', () => {
  const state = base({
    health: {
      ...base().health,
      cardioMinutes: [{ date: '2026-09-09', minutes: 75, intensity: 'vigorous' }],
    },
  });
  assert.equal(bodyHealthSummary(state, now).aerobicEquivalent, 150);
});

test('overlap value falls when aerobic is already covered', () => {
  const state = base({
    health: {
      ...base().health,
      cardioMinutes: [{ date: '2026-09-09', minutes: 150 }],
    },
  });
  const result = selectRecommendation(state, { day: '', now });
  assert.equal(result.type, 'walk');
  assert.match(result.reason, /movement.*sitting/i);
});

test('small changes retain an existing recommendation', () => {
  const state = base({
    settings: { recommendation: { type: 'move', score: 45 } },
    health: { ...base().health, cardioMinutes: [{ date: '2026-09-08', minutes: 150 }] },
  });
  const result = selectRecommendation(state, { day: '', now });
  assert.equal(result.type, 'move');
  assert.equal(result.stable, true);
});
