import type { ActiveWorkout, AppState, Task, Workout } from '../types.ts';
import { configuredDays } from '../routine/routine-data.ts';
import { SET_FIELDS, type SetField } from './lifting-model.ts';

const MAIN_PHASES = new Set(['warmup', 'lifting', 'rest', 'stretch', 'complete']);

export type WorkoutView =
  | { kind: 'activity'; type: string }
  | { kind: 'start'; day: string }
  | { kind: 'summary'; workout: Workout }
  | { kind: 'home' }
  | { kind: 'redirect'; to: string }
  | { kind: 'picker'; active: ActiveWorkout; returnTo: string }
  | { kind: 'select'; active: ActiveWorkout; task: Task }
  | { kind: 'lifting'; active: ActiveWorkout; task: Task }
  | { kind: 'pick'; active: ActiveWorkout; task: Task; field: SetField }
  | { kind: 'plank' | 'rest' | 'stretch'; active: ActiveWorkout }
  | { kind: 'save-legacy'; active: ActiveWorkout };

/** Decides which workout screen a URL shows. Pure, so routing rules are unit-testable. */
export function workoutView(state: AppState, params: URLSearchParams): WorkoutView {
  const active = state.active;
  const view = params.get('view');
  const activity = params.get('activity');
  if (activity && !active) return { kind: 'activity', type: activity };
  if (view === 'summary') {
    const workout = state.history.find((item) => String(item.id) === params.get('id'));
    return workout ? { kind: 'summary', workout } : { kind: 'home' };
  }
  const day = params.get('day');
  if (!active && day && configuredDays().includes(day)) return { kind: 'start', day };
  if (!active) return { kind: 'home' };
  const started = active.tasks.some((task) => task.completed);
  const task = active.tasks[active.pos];
  if (view === 'exercises') {
    const firstNotStarted = active.phase === 'lifting' && !started;
    return {
      kind: 'picker',
      active,
      returnTo:
        params.get('return') === 'select' || firstNotStarted
          ? '/workout/?view=exercise'
          : '/workout/',
    };
  }
  if (view === 'select' && (active.phase !== 'lifting' || started))
    return { kind: 'redirect', to: '/workout/?view=exercise' };
  if (active.phase === 'complete') return { kind: 'save-legacy', active };
  if (!task) return { kind: 'stretch', active };
  // The old two-step set logging (?step=reps / ?step=load) is now one screen.
  if (params.has('step')) return { kind: 'redirect', to: '/workout/' };
  const field = params.get('pick') as SetField | null;
  if (field && SET_FIELDS.includes(field) && active.phase === 'lifting')
    return { kind: 'pick', active, task, field };
  if (view === 'exercise') return { kind: 'lifting', active, task };
  if (view === 'select' || active.phase === 'warmup' || (active.phase === 'lifting' && !started))
    return { kind: 'select', active, task };
  if (active.phase === 'lifting') return { kind: 'lifting', active, task };
  if (active.phase === 'plank' || active.phase === 'rest' || active.phase === 'stretch')
    return { kind: active.phase, active };
  return { kind: 'select', active, task };
}

/** Main steps are where an accidental back gesture must not leave the workout. */
export function isMainStep(state: AppState, params: URLSearchParams) {
  const active = state.active;
  if (!active || !MAIN_PHASES.has(active.phase)) return false;
  return !params.has('view') && !params.has('pick');
}
