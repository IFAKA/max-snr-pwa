import type { ActiveWorkout, AppState, Task, Unit } from '../types.ts';
import { PLANK_MS, REST_MS, STRETCH_MS } from '../constants.ts';
import { getState } from '../state.ts';
import { act } from '../app-state.svelte.ts';
import { completeSet, continueRest, remainingWork, undoLastSet } from '../workout/index.ts';
import { cue } from '../browser/feedback.ts';
import type { NativeAction, NativeStatus } from '../browser/native-app.ts';
import { liftingModel } from './lifting-model.ts';

// What the lock screen and status bar show of the running workout, built for a glance with the
// phone in a pocket: what to do now (or how long until it), what comes next, and how close the
// finish is, so the end stays in sight; plus the one button the moment needs.

const unitOf = (state: AppState): Unit => state.settings?.unit || 'kg';

/** The values Log set would save: the draft, else last time's, as on the set screen. */
const plannedSet = (active: ActiveWorkout, task: Task, unit: Unit) => {
  const { reps, weight, rir } = liftingModel(active, task, unit);
  return { reps, weight, rir };
};

const setText = ({ reps, weight }: { reps: string; weight: string }, unit: Unit) =>
  Number(weight) > 0 ? `${weight} ${unit} × ${reps}` : `${reps} reps`;

const ofSets = (task: Task) => `set ${task.set} of ${task.sets}`;

function progress(active: ActiveWorkout, now: number) {
  const left = remainingWork(active, now);
  const where = left.lastExercise
    ? 'Last exercise'
    : `Exercise ${left.exercise} of ${left.exercises}`;
  return `${where} · ~${left.minutesLeft} min left`;
}

function liftingStatus(active: ActiveWorkout, unit: Unit, now: number): NativeStatus | null {
  const task = active.tasks[active.pos];
  if (!task) return null;
  return {
    endsAt: null,
    total: 0,
    title: `${task.performedName} · ${ofSets(task)}`,
    text: setText(plannedSet(active, task, unit), unit),
    progress: progress(active, now),
    chip: `${task.set}/${task.sets}`,
    actions: ['log'],
    doneTitle: '',
    doneText: '',
  };
}

/** The set rest leads to, as the lifting screen will show it (from a clean draft). */
const nextSetStatus = (active: ActiveWorkout, unit: Unit, now: number) =>
  Number.isInteger(active.nextPos)
    ? liftingStatus(
        { ...active, phase: 'lifting', pos: active.nextPos as number, restEndsAt: null, draft: {} },
        unit,
        now,
      )
    : null;

// When rest ends the next set is simply the thing to do: the notification shows it with Log set,
// as the app moves on by itself. Undo is gone by then; it was there for the whole rest.
function restStatus(active: ActiveWorkout, unit: Unit, now: number): NativeStatus | null {
  const next = Number.isInteger(active.nextPos) ? active.tasks[active.nextPos as number] : null;
  const after = nextSetStatus(active, unit, now);
  const ended = !active.restEndsAt || active.restEndsAt <= now;
  if (ended && after) return after;
  const stretch: NativeStatus = {
    endsAt: null,
    total: 0,
    title: 'Rest over',
    text: 'Time to stretch',
    progress: 'Last step',
    chip: 'Go',
    actions: ['next'],
    doneTitle: '',
    doneText: '',
  };
  if (ended) return stretch;
  return {
    endsAt: active.restEndsAt,
    total: active.tasks[active.pos]?.restMs || REST_MS,
    title: 'Rest',
    text: next && after ? `Next: ${next.performedName} · ${after.text}` : 'Next: stretch',
    progress: progress(active, now),
    chip: '',
    actions: ['skip', 'undo'],
    doneTitle: 'Rest over',
    doneText:
      next && after ? `${next.performedName}, ${ofSets(next)} · ${after.text}` : 'Time to stretch',
    after: after || stretch,
  };
}

function timerStatus(active: ActiveWorkout, now: number): NativeStatus | null {
  const endsAt = active.timerEndsAt;
  if (!endsAt || endsAt <= now) return null;
  const plank = active.phase === 'plank';
  return {
    endsAt,
    total: plank ? PLANK_MS : STRETCH_MS,
    title: plank ? 'Plank' : 'Stretch',
    text: plank ? 'Hold' : 'Breathe and hold, then it is saved',
    progress: plank ? progress(active, now) : 'Last step',
    chip: '',
    actions: [],
    doneTitle: plank ? 'Plank done' : 'Stretch done',
    doneText: plank ? 'Rest up' : 'Finish when ready',
  };
}

/** The workout's lock-screen status, or null when no workout is under way. */
export function liveStatus(state: AppState, now = Date.now()): NativeStatus | null {
  const active = state.active;
  if (!active) return null;
  const unit = unitOf(state);
  if (active.phase === 'rest') return restStatus(active, unit, now);
  if (active.phase === 'lifting') return liftingStatus(active, unit, now);
  if (active.phase === 'plank' || active.phase === 'stretch') return timerStatus(active, now);
  return null;
}

/**
 * Runs a notification button like its on-screen twin. A stale button (the workout moved on
 * before it was tapped) does nothing.
 */
export async function runNativeAction(action: NativeAction): Promise<boolean> {
  const active = getState().active;
  if (!active) return false;
  // The page may have slept through the end of rest: move on to the set first, as the app would.
  if (action === 'log' && active.phase === 'rest' && (active.restEndsAt || 0) <= Date.now()) {
    await act(continueRest);
    return getState().active?.phase === 'lifting' && runNativeAction(action);
  }
  if (action === 'log' && active.phase === 'lifting') {
    const task = active.tasks[active.pos];
    if (!task) return false;
    active.draft = { ...active.draft, ...plannedSet(active, task, unitOf(getState())) };
    const result = await act(completeSet);
    const logged = Boolean(result && !('error' in result));
    if (logged) cue('setLogged');
    return logged;
  }
  if ((action === 'skip' || action === 'next') && active.phase === 'rest') {
    await act(continueRest);
    return true;
  }
  if (action === 'undo' && active.phase === 'rest') {
    cue('undo');
    return Boolean(await act(undoLastSet));
  }
  return false;
}
