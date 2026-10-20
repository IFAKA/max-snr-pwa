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

function restStatus(active: ActiveWorkout, unit: Unit, now: number): NativeStatus {
  const next = Number.isInteger(active.nextPos) ? active.tasks[active.nextPos as number] : null;
  // The next set starts from a clean draft, like the set screen after rest.
  const set = next && setText(plannedSet({ ...active, draft: {} }, next, unit), unit);
  const ended = !active.restEndsAt || active.restEndsAt <= now;
  return {
    endsAt: ended ? null : active.restEndsAt,
    total: active.tasks[active.pos]?.restMs || REST_MS,
    title: ended ? 'Rest over' : 'Rest',
    text: next ? `Next: ${next.performedName} · ${set}` : 'Next: stretch',
    progress: progress(active, now),
    chip: ended ? 'Go' : '',
    actions: ended ? ['next'] : ['skip', 'undo'],
    doneTitle: 'Rest over',
    doneText: next ? `${next.performedName}, ${ofSets(next)} · ${set}` : 'Time to stretch',
  };
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
export async function runNativeAction(action: NativeAction) {
  const active = getState().active;
  if (!active) return false;
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
