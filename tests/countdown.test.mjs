import test from 'node:test';
import assert from 'node:assert/strict';
import { countdownMarkup, countdownStage } from '../js/render-workout/countdown.js';
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

test('countdown stages share the title, timer, and bottom action structure', () => {
  for (const variant of ['rest', 'plank', 'stretch', 'activity']) {
    const markup = countdownStage({
      title: variant,
      metadata: '<p class="set-count">Set 1 of 2</p>',
      countdown: { remainingMs: 30000, label: `${variant} remaining`, variant },
      actions: `<button type="button">${variant}</button>`,
    });

    assert.match(markup, /<div class="stage-info">[\s\S]*<\/div><div class="thumb-zone">/);
    assert.match(markup, /<div class="thumb-zone">[\s\S]*class="big-timer countdown/);
    assert.match(markup, /<div class="countdown-actions"><button type="button">/);
    assert.equal((markup.match(/class="stage-info"/g) || []).length, 1);
    assert.equal((markup.match(/class="thumb-zone"/g) || []).length, 1);
  }
});

test('countdown stage titles remain escaped', () => {
  const markup = countdownStage({ title: '<Rest>' });

  assert.match(markup, />&lt;Rest&gt;</);
  assert.doesNotMatch(markup, /<h1[^>]*><Rest>/);
});

test('countdown actions support primary continuation and secondary exercise changes', () => {
  const markup = countdownStage({
    title: 'Squat',
    actions:
      '<button class="primary" id="continue" type="button">Continue</button><button class="secondary" id="change-exercises" type="button">Change exercises</button>',
  });

  assert.match(
    markup,
    /class="countdown-actions"><button class="primary" id="continue" type="button">Continue<\/button><button class="secondary" id="change-exercises" type="button">Change exercises<\/button>/,
  );
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
