import { expect, test } from 'vitest';
import { recommendDoubleProgression } from '../src/lib/workout/progression.ts';

// Ethics guardrail: the app must never push more load after an incomplete or failed exposure.
const base = { load: 40, prescribedSets: 3, targetRepRange: '8–12', targetRir: '1–2' };
const top = { reps: 12, rir: '1' };

test('load increases only when every prescribed set reached the top of the range', () => {
  expect(recommendDoubleProgression({ ...base, performances: [top, top, top] })).toMatchObject({
    action: 'increase-load',
    load: 42.5,
  });
});

test('a skipped or missing set never adds load', () => {
  expect(recommendDoubleProgression({ ...base, performances: [top, top] }).action).toBe(
    'repeat-load',
  );
});

test('a set below the top of the range never adds load', () => {
  const short = { reps: 9, rir: '1' };
  expect(recommendDoubleProgression({ ...base, performances: [top, short, top] })).toMatchObject({
    action: 'repeat-load',
    load: 40,
  });
});

test('reaching the reps at a harder effort than prescribed (failure) never adds load', () => {
  const failure = { reps: 12, rir: '0' };
  expect(recommendDoubleProgression({ ...base, performances: [top, top, failure] }).action).toBe(
    'repeat-load',
  );
});
