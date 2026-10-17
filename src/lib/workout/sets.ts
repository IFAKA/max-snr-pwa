import type { ActiveWorkout, Performance } from '../types.ts';
import { getState } from '../state.ts';
import { persist } from '../storage/persistence.ts';
import { startRest } from './timers.ts';
import {
  nextSupersetRoundIndex,
  setSupersetLead,
  supersetPartnerIndex,
  taskGroup,
} from './superset.ts';
import { activeTask, finishLifts, nextPosition } from './session.ts';

export type SetOutcome = { render: true } | { error: string };

const current = () => getState().active as ActiveWorkout;

function parseDraft(draft: ActiveWorkout['draft']) {
  const repsText = String(draft.reps ?? '').trim();
  const weightText = String(draft.weight ?? '').trim();
  const reps = Number(repsText);
  const hasWeight = draft.weight !== undefined && draft.weight !== '';
  const weight = hasWeight ? Number(weightText) : null;
  const validWeight =
    !hasWeight ||
    (/^\d+(?:\.\d{1,2})?$/.test(weightText) && Number.isFinite(weight) && (weight as number) >= 0);
  const validReps = /^\d+$/.test(repsText) && Number.isInteger(reps) && reps >= 1;
  return { reps, weight, hasWeight, validWeight, validReps };
}

export async function completeSet(): Promise<SetOutcome> {
  const state = getState(),
    active = current(),
    task = activeTask(),
    draft = active.draft || {};
  const { reps, weight, hasWeight, validWeight, validReps } = parseDraft(draft);
  if (!task || !validReps || !validWeight)
    return {
      error:
        hasWeight && !validWeight
          ? 'Enter a valid load with up to 2 decimals.'
          : 'Enter whole-number reps.',
    };
  const performance: Performance = {
    reps,
    completedAt: new Date().toISOString(),
    actualName: task.performedName,
    originalName: task.originalName,
    targetRepRange: task.targetRepRange || task.reps,
  };
  if (hasWeight) {
    performance.weight = weight as number;
    task.load = weight;
    performance.unit = state.settings?.unit || 'kg';
  }
  if (draft.rir !== undefined) performance.rir = draft.rir;
  task.completed = performance;
  active.draft = {};
  if (task.groupType === 'superset') {
    const partner = supersetPartnerIndex(active, task);
    if (partner >= 0) {
      setSupersetLead(active, task);
      active.pos = partner;
      await persist();
      return { render: true };
    }
    const nextRound = nextSupersetRoundIndex(active, task);
    if (nextRound >= 0) {
      await startRest(nextRound);
      return { render: true };
    }
  }
  const following = nextPosition();
  if (following < 0) await finishLifts();
  else await startRest(following);
  return { render: true };
}

export async function deferCurrent() {
  const active = getState().active,
    task = activeTask();
  if (!active || !task) return;
  const group = taskGroup(task) as string;
  const moved = active.tasks.filter(
    (item) => taskGroup(item) === group && !item.completed && !item.skipped,
  );
  const remaining = active.tasks.filter((item) => !moved.includes(item));
  active.tasks = [...remaining, ...moved];
  if (!active.deferredGroups.includes(group)) active.deferredGroups.push(group);
  active.pos = active.tasks.findIndex(
    (item) => !item.completed && !item.skipped && taskGroup(item) !== group,
  );
  if (active.pos < 0) {
    active.pos = active.tasks.findIndex((item) => !item.completed && !item.skipped);
    active.deferredGroups = active.deferredGroups.filter((id) => id !== group);
  }
  active.draft = {};
  await persist();
}

export async function substituteCurrent(name: string) {
  const active = getState().active,
    task = activeTask();
  const choices = [task?.originalName, ...(task?.alternatives || [])];
  if (!active || !task || !choices.includes(name)) return false;
  active.tasks
    .filter((item) => item.exerciseId === task.exerciseId && !item.completed && !item.skipped)
    .forEach((item) => {
      item.performedName = name;
    });
  active.draft = {};
  await persist();
  return true;
}

export async function undoLastSet() {
  const active = getState().active;
  if (!active) return false;
  const completedAt = (index: number) =>
    Date.parse((active.tasks[index].completed as Performance).completedAt || '0');
  const latest = active.tasks
    .map((task, index) => ({ task, index }))
    .filter((item) => item.task.completed)
    .sort((a, b) => completedAt(b.index) - completedAt(a.index))[0];
  if (!latest) return false;
  const previous = latest.task.completed as Performance;
  latest.task.completed = null;
  active.pos = latest.index;
  active.phase = 'lifting';
  active.restEndsAt = null;
  active.timerEndsAt = null;
  active.nextPos = null;
  active.draft = { weight: previous.weight ?? '', reps: previous.reps, rir: previous.rir };
  await persist();
  return true;
}
