import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { start } from '../src/lib/workout/session.ts';
import { finishEarly } from '../src/lib/workout/finish.ts';
import { isMainStep, workoutView } from '../src/lib/workout-screens/workout-view.ts';
import {
  isBetterSet,
  lastLoggedSet,
  pickerValues,
} from '../src/lib/workout-screens/lifting-model.ts';
import { weeklyProgressLabel } from '../src/lib/history/weekly-progress.ts';
import { parentRouteUrl, routeName } from '../src/lib/browser/routes.ts';
import { ancestorUrls } from '../src/lib/browser/route-history.ts';
import { activityDefinition } from '../src/lib/health/activity-data.ts';
import { activityLine, listDate, readableKey } from '../src/lib/history/history-format.ts';
import { supersetRowClass } from '../src/lib/components/superset-group.ts';
import type { ActiveWorkout } from '../src/lib/types.ts';

const params = (query = '') => new URLSearchParams(query);
const active = () => getState().active as ActiveWorkout;

beforeEach(() => setState(emptyState()));

describe('workout routing', () => {
  test('without an active workout, days start and everything else returns home', () => {
    expect(workoutView(getState(), params('day=Monday')).kind).toBe('start');
    expect(workoutView(getState(), params('activity=walk')).kind).toBe('activity');
    expect(workoutView(getState(), params()).kind).toBe('home');
  });

  test('a new workout opens set logging, and the old select step redirects there', async () => {
    await start('Monday');
    expect(workoutView(getState(), params()).kind).toBe('lifting');
    expect(workoutView(getState(), params('view=select')).kind).toBe('redirect');
    expect(workoutView(getState(), params('view=exercise')).kind).toBe('lifting');
    expect(workoutView(getState(), params('view=exercises')).kind).toBe('picker');
  });

  test('phases map to their screens and legacy review steps are saved', async () => {
    await start('Monday');
    active().tasks[0].completed = { reps: 10 };
    for (const phase of ['rest', 'stretch'] as const) {
      active().phase = phase;
      expect(workoutView(getState(), params()).kind).toBe(phase);
    }
    active().phase = 'complete';
    expect(workoutView(getState(), params()).kind).toBe('save-legacy');
  });

  test('a saved workout summary is addressable by id', async () => {
    await start('Monday');
    active().tasks[0].completed = { reps: 10 };
    const saved = await finishEarly();
    const view = workoutView(getState(), params(`view=summary&id=${saved?.id}`));
    expect(view.kind).toBe('summary');
  });

  test('the old two-step set URLs land on the one-step set screen', async () => {
    await start('Monday');
    active().tasks[0].completed = { reps: 10 };
    active().pos = 1;
    for (const step of ['step=load', 'step=reps'])
      expect(workoutView(getState(), params(step))).toMatchObject({
        kind: 'redirect',
        to: '/workout/',
      });
  });

  test('old full-screen value picker links return to the workout, where values are a wheel', async () => {
    await start('Monday');
    expect(workoutView(getState(), params('pick=weight'))).toMatchObject({
      kind: 'redirect',
      to: '/workout/',
    });
  });

  test('back is guarded on main steps only', async () => {
    await start('Monday');
    expect(isMainStep(getState(), params())).toBe(true);
    expect(isMainStep(getState(), params('view=exercises'))).toBe(false);
  });
});

describe('route history', () => {
  test('deep links unwind to their parent screen', () => {
    expect(routeName('/routine/')).toBe('routine');
    expect(routeName('/')).toBe('today');
    expect(parentRouteUrl('routine', params('day=Monday'), false)).toBe('/routine/');
    expect(parentRouteUrl('history', params('view=workout&id=0'), false)).toBe(
      '/history/?view=workouts',
    );
    expect(parentRouteUrl('workout', params('day=Monday'), false)).toBe('/routine/?day=Monday');
    expect(parentRouteUrl('workout', params(), true)).toBe('/');
  });

  test('fresh launches rebuild the whole chain back to Today', () => {
    const url = (path: string) => new URL(path, 'https://app.test');
    expect(ancestorUrls(url('/routine/?day=Monday&view=exercises'), false)).toEqual([
      '/',
      '/routine/',
      '/routine/?day=Monday',
    ]);
    expect(ancestorUrls(url('/history/?view=workout&id=0'), false)).toEqual([
      '/',
      '/history/',
      '/history/?view=workouts',
    ]);
    expect(ancestorUrls(url('/workout/'), true)).toEqual(['/']);
    expect(ancestorUrls(url('/'), false)).toEqual([]);
  });
});

describe('screen helpers', () => {
  test('pickers list valid values and always include the current one', () => {
    expect(pickerValues('rir', '2')).toEqual(['0', '1', '2', '+3']);
    expect(pickerValues('reps', '8')).toHaveLength(30);
    expect(pickerValues('reps', '28').at(-1)).toBe('38');
    const loads = pickerValues('weight', '41');
    expect(loads[0]).toBe('0');
    expect(loads).toContain('41');
    expect(loads).toContain('42.5');
    expect(loads.at(-1)).toBe('100');
    expect(pickerValues('weight', '120').at(-1)).toBe('170');
    expect(pickerValues('weight', '')).toContain('0');
  });

  test('a better set means more load, or more reps at the same load', () => {
    const last = { weight: 60, reps: 8 };
    expect(isBetterSet({ weight: '62.5', reps: '6' }, last)).toBe(true);
    expect(isBetterSet({ weight: '60', reps: '9' }, last)).toBe(true);
    expect(isBetterSet({ weight: '60', reps: '8' }, last)).toBe(false);
    expect(isBetterSet({ weight: '57.5', reps: '12' }, last)).toBe(false);
    expect(isBetterSet({ weight: '60', reps: '9' }, undefined)).toBe(false);
  });

  test('the last logged set is the most recent one, including superset entries', async () => {
    await start('Monday');
    expect(lastLoggedSet(active())).toBeUndefined();
    active().tasks[0].completed = { reps: 8, completedAt: '2026-10-17T10:00:00Z' };
    active().tasks[1].completed = [{ reps: 6, completedAt: '2026-10-17T10:05:00Z' }];
    expect(lastLoggedSet(active())?.reps).toBe(6);
  });

  test('weekly progress stays neutral and never frames a miss as a loss', () => {
    expect(weeklyProgressLabel(0, 3)).toBe('0 of 3');
    expect(weeklyProgressLabel(3, 3)).toBe('3 · goal met');
    expect(weeklyProgressLabel(4, 3)).toBe('4 · goal met');
  });

  test('timed activities provide countdown durations and compact metrics', () => {
    expect(activityDefinition('walk').durationMs).toBe(30 * 60 * 1000);
    expect(activityDefinition('move').metric).toBe('3m');
    expect(activityDefinition('measurement').durationMs).toBe(0);
    expect(activityDefinition('unknown').title).toBe('On track');
  });
});

describe('history lists', () => {
  test('activities read as one line: title-cased name and a plain duration', () => {
    const row = activityLine({
      id: 'a',
      type: 'walk',
      completedAt: '2026-10-17T12:00:00Z',
      durationMinutes: 1,
    });
    expect(row.label).toBe('Walk');
    expect(row.metric).toBe('1 min');
    expect(activityLine({ id: 'b', type: 'measurement', measurements: { waist: 82 } }).metric).toBe(
      'Waist 82',
    );
  });

  test('list dates drop the year only within the current year', () => {
    const now = new Date('2026-10-18T12:00:00');
    expect(listDate('2026-10-17T12:00:00', now)).not.toMatch(/2026/);
    expect(listDate('2025-10-17T12:00:00', now)).toMatch(/2025/);
  });

  test('data keys read as words', () => {
    expect(readableKey('upperChest')).toBe('Upper chest');
    expect(readableKey('lats')).toBe('Lats');
  });

  test('superset rows share one bar capped at both ends', () => {
    const groups = [null, 'arms', 'arms', null];
    expect(supersetRowClass(groups, 0)).toBe('');
    expect(supersetRowClass(groups, 1)).toBe('superset-member superset-start');
    expect(supersetRowClass(groups, 2)).toBe('superset-member superset-end');
  });
});
