import type { ActiveWorkout, AppState, Task, Workout } from '../types.ts';
import { configuredDays } from '../routine/routine-data.ts';

const MAIN_PHASES = new Set(['warmup', 'lifting', 'rest', 'stretch', 'complete']);

export type WorkoutView =
  | { kind: 'activity'; type: string }
  | { kind: 'start'; day: string }
  | { kind: 'summary'; workout: Workout }
  | { kind: 'home' }
  | { kind: 'redirect'; to: string }
  | { kind: 'picker'; active: ActiveWorkout; returnTo: string }
  | { kind: 'select'; active: ActiveWorkout; task: Task }
  | { kind: 'lifting'; active: ActiveWorkout; task: Task; step: 'reps' | 'load' }
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
  const step = params.get('step') === 'load' ? 'load' : 'reps';
  // Reopened on the load step without the reps from step one: start the set over.
  if (step === 'load' && started && !Object.keys(active.draft || {}).length)
    return { kind: 'redirect', to: '/workout/?step=reps' };
  if (view === 'exercise' || (params.has('step') && active.phase === 'lifting'))
    return { kind: 'lifting', active, task, step };
  if (view === 'select' || active.phase === 'warmup' || (active.phase === 'lifting' && !started))
    return { kind: 'select', active, task };
  if (active.phase === 'lifting') return { kind: 'lifting', active, task, step };
  if (active.phase === 'plank' || active.phase === 'rest' || active.phase === 'stretch')
    return { kind: active.phase, active };
  return { kind: 'select', active, task };
}

/** Main steps are where an accidental back gesture must not leave the workout. */
export function isMainStep(state: AppState, params: URLSearchParams) {
  const active = state.active;
  if (!active || !MAIN_PHASES.has(active.phase)) return false;
  return !params.has('view') && !(active.phase === 'lifting' && params.get('step') === 'load');
}
