import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { continueRest, start } from '../src/lib/workout/session.ts';
import { completeSet, undoLastSet } from '../src/lib/workout/sets.ts';
import {
  previewLog,
  previewSkipRest,
  previewUndo,
  type StepPreview,
} from '../src/lib/workout/next-step.ts';
import type { ActiveWorkout } from '../src/lib/types.ts';

const active = () => getState().active as ActiveWorkout;

// What the workout actually shows now, in the preview's terms.
function landed(): StepPreview {
  const workout = active();
  if (workout.phase === 'rest')
    return {
      phase: 'rest',
      next: workout.tasks[workout.nextPos as number],
      restMs: workout.restEndsAt! - Date.now(),
    };
  if (workout.phase === 'lifting') return { phase: 'lifting', task: workout.tasks[workout.pos] };
  return { phase: 'stretch' };
}

const same = (preview: StepPreview | null, actual: StepPreview) => {
  expect(preview?.phase).toBe(actual.phase);
  if (preview?.phase === 'rest' && actual.phase === 'rest') {
    expect(preview.next.id).toBe(actual.next.id);
    expect(Math.abs(preview.restMs - actual.restMs)).toBeLessThan(1000);
  }
  if (preview?.phase === 'lifting' && actual.phase === 'lifting')
    expect(preview.task.id).toBe(actual.task.id);
};

beforeEach(() => setState(emptyState()));

describe('next-step previews', () => {
  test.each(['Monday', 'Thursday'])(
    'every log and skip on %s lands where its preview said, supersets included',
    async (day) => {
      await start(day);
      for (let step = 0; step < 200 && active().phase !== 'stretch'; step++) {
        if (active().phase === 'rest') {
          const preview = previewSkipRest(active());
          await continueRest();
          same(preview, landed());
          continue;
        }
        const preview = previewLog(active());
        active().draft = { reps: 10, weight: '20', rir: '1' };
        await completeSet();
        same(preview, landed());
      }
      expect(active().phase).toBe('stretch');
    },
  );

  test('undo previews the set it reopens', async () => {
    await start('Monday');
    expect(previewUndo(active())).toBeNull();
    active().draft = { reps: 10, weight: '20', rir: '1' };
    await completeSet();
    const preview = previewUndo(active());
    await undoLastSet();
    same(preview, landed());
  });

  test('previews leave the workout untouched', async () => {
    await start('Monday');
    const before = JSON.stringify(active());
    previewLog(active());
    previewSkipRest(active());
    previewUndo(active());
    expect(JSON.stringify(active())).toBe(before);
  });
});
