import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { querySelector: () => null };

const { routineMarkup } = await import('../js/routine-view.js');

test('routine markup groups supersets and labels each member', () => {
  const markup = routineMarkup([
    {
      type: 'superset',
      id: 'upper-pair',
      label: 'Upper pair',
      members: [
        { type: 'exercise', id: 'press', name: 'Press', sets: 3, reps: '8–10' },
        { type: 'exercise', id: 'row', name: 'Row', sets: 3, reps: '8–10' },
      ],
    },
    { type: 'exercise', id: 'squat', name: 'Squat', sets: 2, reps: '5' },
  ]);

  assert.match(markup, /Superset · 2 exercises/);
  assert.match(markup, /data-group-type="superset" data-group-id="upper-pair"/);
  assert.match(markup, /A · Press/);
  assert.match(markup, /B · Row/);
  assert.match(markup, /Squat/);
  assert.doesNotMatch(markup, /data-group-type="superset"[^>]*>[^<]*Squat/);
});
