import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { migrate } from '../src/lib/storage/migrate.ts';
import { rotationDays } from '../src/lib/routine/routine-data.ts';
import { finishWorkout } from '../src/lib/workout/finish.ts';
import {
  CANONICAL_ROUTINE_3_DAY,
  createDefaultPrescription,
  createPrescription,
  FLOOR_ROUTINE,
  HOME_FLOOR_ROUTINE,
} from '../src/lib/workout/program.ts';
import { nextRotationDay, RESTART_PLANS } from '../src/lib/workout/rotation.ts';
import { start } from '../src/lib/workout/session.ts';
import { flatten } from '../src/lib/workout/task-factory.ts';
import type { Workout } from '../src/lib/types.ts';

const nextDay = () => nextRotationDay(getState().history);

async function complete(day: string) {
  expect(await start(day)).toBe(true);
  const saved = await finishWorkout();
  expect(saved?.day).toBe(day);
}

beforeEach(() => {
  const state = emptyState();
  state.prescription = createDefaultPrescription();
  setState(state);
});

describe('rotation', () => {
  test('the program rotates A → B → C → A, starting at A', async () => {
    expect(rotationDays()).toEqual(['Monday', 'Wednesday', 'Friday']);
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      order.push(nextDay());
      await complete(nextDay());
    }
    expect(order).toEqual(['Monday', 'Wednesday', 'Friday', 'Monday']);
  });

  test('a gap changes nothing: the next workout is the day after the last one', async () => {
    await complete('Monday');
    const [saved] = getState().history;
    saved.date = new Date('2020-01-01').toISOString();
    expect(nextDay()).toBe('Wednesday');
  });

  test('the newest workout decides, whatever the order of the stored history', () => {
    const history = [
      { id: 1, day: 'Friday' },
      { id: 3, day: 'Wednesday' },
      { id: 2, day: 'Monday' },
    ];
    expect(nextRotationDay(history, ['Monday', 'Wednesday', 'Friday'])).toBe('Friday');
  });
});

describe('restart workouts', () => {
  test('the floor routine is 10 sets and the home routine uses no gym stations', () => {
    expect(flatten(FLOOR_ROUTINE)).toHaveLength(10);
    const home = flatten(HOME_FLOOR_ROUTINE);
    expect(home).toHaveLength(10);
    expect(home.every((task) => task.station === 'home')).toBe(true);
    expect(home.some((task) => /dumbbell|band|door/i.test(task.name ?? ''))).toBe(false);
  });

  test.each(['floor', 'home'] as const)(
    'after the %s restart the rotation continues from A',
    async (kind) => {
      await complete('Monday');
      await complete('Wednesday');
      expect(nextDay()).toBe('Friday');
      const plan = RESTART_PLANS[kind];
      expect(await start(plan.day)).toBe(true);
      expect(getState().active?.name).toBe(plan.name);
      expect(getState().active?.tasks).toHaveLength(10);
      await finishWorkout();
      expect(nextDay()).toBe('Monday');
    },
  );
});

describe('routine volume', () => {
  test('curl sits in the arm superset every day and crunch carries a cut priority', () => {
    const days = Object.values(CANONICAL_ROUTINE_3_DAY);
    const items = days.flatMap((day) =>
      day.flatMap((item) =>
        item.type === 'superset' ? item.members : item.type === 'exercise' ? [item] : [],
      ),
    );
    expect(items.filter((item) => item.id === 'cable-curl').map((item) => item.sets)).toEqual([
      1, 2, 2,
    ]);
    const crunches = items.filter((item) => item.id === 'cable-crunch');
    expect(crunches.map((item) => item.sets)).toEqual([2, 2]);
  });
});

describe('old data', () => {
  test('a stored v1 program loads, keeps history, and is rebuilt as the current program', () => {
    const old = emptyState();
    old.prescription = createPrescription(3, { programId: 'fixed-hypertrophy-3-day-v1' });
    const workout = {
      id: 7,
      day: 'Wednesday',
      name: 'Upper body B',
      tasks: [],
    } as unknown as Workout;
    old.history = [workout];
    const loaded = migrate(JSON.parse(JSON.stringify(old)));
    expect(loaded.version).toBe(2);
    expect(loaded.history).toEqual([workout]);
    expect(loaded.prescription?.programId).toBe('fixed-hypertrophy-3-day-v4');
    expect(nextRotationDay(loaded.history, loaded.prescription?.days)).toBe('Friday');
  });

  test('a stored v2 program is rebuilt as v4 and keeps history', () => {
    const old = emptyState();
    old.prescription = createPrescription(3, { programId: 'fixed-hypertrophy-3-day-v2' });
    const workout = { id: 3, day: 'Monday', name: 'Full body A', tasks: [] } as unknown as Workout;
    old.history = [workout];
    const loaded = migrate(JSON.parse(JSON.stringify(old)));
    expect(loaded.history).toEqual([workout]);
    expect(loaded.prescription?.programId).toBe('fixed-hypertrophy-3-day-v4');
    expect(loaded.prescription?.weeklySetAllocation['cable-rope-hammer-curl']).toBe(5);
  });

  test('saved history with weekday names and no restart days still rotates', () => {
    expect(nextRotationDay([{ id: 1, day: 'Friday' }])).toBe('Monday');
    expect(nextRotationDay([{ id: 1, day: 'Tuesday' }])).toBe('Monday');
  });
});
