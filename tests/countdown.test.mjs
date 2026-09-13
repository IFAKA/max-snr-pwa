import test from 'node:test';
import assert from 'node:assert/strict';
import { countdownMarkup } from '../js/render-workout/countdown.js';
import { activityDefinition } from '../js/activity-data.js';

test('countdown markup keeps one semantic timer contract across variants', () => {
  const markup = countdownMarkup({
    id: 'timer',
    remainingMs: 30000,
    label: 'Walk remaining',
    variant: 'activity',
  });

  assert.match(markup, /class="big-timer countdown countdown--activity"/);
  assert.match(markup, /id="timer"/);
  assert.match(markup, /role="timer"/);
  assert.match(markup, /aria-label="Walk remaining"/);
  assert.match(markup, />30</);
});

test('timed activity definitions provide countdown durations', () => {
  assert.equal(activityDefinition('walk').durationMs, 30 * 60 * 1000);
  assert.equal(activityDefinition('move').durationMs, 3 * 60 * 1000);
  assert.equal(activityDefinition('measurement').durationMs, 0);
});

test('timed activity definitions use compact navigation metrics', () => {
  assert.equal(activityDefinition('walk').metric, '30m');
  assert.equal(activityDefinition('move').metric, '3m');
});
