import { beforeEach, describe, expect, test } from 'vitest';
import { emptyState, getState, setState } from '../src/lib/state.ts';
import { start } from '../src/lib/workout/session.ts';
import { finishEarly } from '../src/lib/workout/finish.ts';
import { isMainStep, workoutView } from '../src/lib/workout-screens/workout-view.ts';
import { stepValue } from '../src/lib/workout-screens/lifting-model.ts';
import { weeklyProgressLabel } from '../src/lib/today/weekly-progress.ts';
import { parentRouteUrl, routeName } from '../src/lib/browser/routes.ts';
import { ancestorUrls } from '../src/lib/browser/route-history.ts';
import { activityDefinition } from '../src/lib/health/activity-data.ts';
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

  test('a new workout opens exercise selection, then set logging', async () => {
    await start('Monday');
    expect(workoutView(getState(), params()).kind).toBe('select');
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

  test('reopening on the load step without saved reps starts the set over', async () => {
    await start('Monday');
    active().tasks[0].completed = { reps: 10 };
    active().pos = 1;
    expect(workoutView(getState(), params('step=load'))).toMatchObject({
      kind: 'redirect',
      to: '/workout/?step=reps',
    });
    active().draft = { reps: '9' };
    expect(workoutView(getState(), params('step=load')).kind).toBe('lifting');
  });

  test('back is guarded on main steps only', async () => {
    await start('Monday');
    expect(isMainStep(getState(), params())).toBe(true);
    expect(isMainStep(getState(), params('view=exercises'))).toBe(false);
    expect(isMainStep(getState(), params('step=load'))).toBe(false);
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
  test('steppers stay within valid ranges', () => {
    expect(stepValue('reps', '1', -1)).toBe('1');
    expect(stepValue('rir', '+3', 1)).toBe('+3');
    expect(stepValue('rir', '0', -1)).toBe('0');
    expect(stepValue('weight', '', 2.5)).toBe('2.5');
    expect(stepValue('weight', '2.5', -5)).toBe('0');
  });

  test('weekly progress stays neutral and never frames a miss as a loss', () => {
    expect(weeklyProgressLabel(0, 3)).toBe('0 of 3 this week');
    expect(weeklyProgressLabel(3, 3)).toBe('3 this week · goal met');
    expect(weeklyProgressLabel(4, 3)).toBe('4 this week · goal met');
  });

  test('timed activities provide countdown durations and compact metrics', () => {
    expect(activityDefinition('walk').durationMs).toBe(30 * 60 * 1000);
    expect(activityDefinition('move').metric).toBe('3m');
    expect(activityDefinition('measurement').durationMs).toBe(0);
    expect(activityDefinition('unknown').title).toBe('On track');
  });
});
