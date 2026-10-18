import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { start } from '../src/lib/workout/session.ts';
import { liftingModel } from '../src/lib/workout-screens/lifting-model.ts';
import type { ActiveWorkout, Performance, Task, Workout } from '../src/lib/types.ts';

const active = () => getState().active as ActiveWorkout;

beforeEach(() => setState(emptyState()));

describe('lifting starting values', () => {
  test('each set starts from the same set of the last workout', async () => {
    await start('Monday');
    const task = (set: number) =>
      active().tasks.find(
        (item) => item.exerciseId === 'chest-supported-row' && item.set === set,
      ) as Task;
    const logged: Performance[] = [
      { reps: 12, weight: 20, unit: 'kg', rir: '2' },
      { reps: 10, weight: 22.5, unit: 'kg', rir: '1' },
    ];
    getState().history = [
      {
        id: 1,
        tasks: logged.map((completed, index) => ({ ...task(1), set: index + 1, completed })),
      } as unknown as Workout,
    ];
    const first = liftingModel(active(), task(1), 'kg');
    const second = liftingModel(active(), task(2), 'kg');
    expect([first.reps, first.weight, first.rir]).toEqual(['12', '20', '2']);
    expect([second.reps, second.weight, second.rir]).toEqual(['10', '22.5', '1']);
  });
});
