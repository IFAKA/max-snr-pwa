import type { ActiveWorkout, Performance, Task, Unit } from '../types.ts';
import {
  exerciseChangeAvailable,
  lastExercisePerformances,
  lastPerformance,
  parseRirRange,
  recommendDoubleProgression,
  sessionBudgetState,
} from '../workout/index.ts';

export const LOAD_STEP = 2.5;
export const MAX_RIR = 3;

export const rirValue = (value: unknown) => {
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) ? Math.max(0, Math.min(MAX_RIR, number)) : 0;
};
export const formatRir = (value: number) => (value >= MAX_RIR ? '+3' : String(value));
const defaultRir = (target: string | undefined, set: number, sets: number) => {
  const range = parseRirRange(target);
  return set === sets ? (range.lower ?? 1) : (range.upper ?? 1);
};

export const formatLoad = (value: number) => String(Number(value.toFixed(2)));

/** Starting values and context for logging one set, from the draft or the last exposure. */
export function liftingModel(active: ActiveWorkout, task: Task, unit: Unit) {
  const draft = active.draft || {};
  const previous = lastPerformance(task.performedName, unit, task.exerciseId);
  const previousSets = lastExercisePerformances(task.exerciseId, unit);
  // Each set starts from what was done on the same set last time; a set that did not exist then
  // starts from the last one logged for the exercise.
  const lastForSet: Performance | null = previousSets[task.set - 1] ?? previous;
  const reps = String(draft.reps ?? lastForSet?.reps ?? String(task.reps).split('–')[0]);
  const recommendation = recommendDoubleProgression({
    load: previous?.weight,
    performances: previousSets,
    prescribedSets: task.workingSets || task.sets,
    targetRepRange: task.targetRepRange || task.reps,
    targetRir: task.targetRir || task.rir,
  });
  const increase = recommendation.action === 'increase-load';
  const recommendedLoad = increase ? recommendation.load : lastForSet?.weight;
  const budget = sessionBudgetState(active);
  return {
    reps,
    weight: String(draft.weight ?? recommendedLoad ?? ''),
    rir: formatRir(
      rirValue(
        draft.rir ?? lastForSet?.rir ?? defaultRir(task.targetRir || task.rir, task.set, task.sets),
      ),
    ),
    previous: lastForSet,
    previousSet: previousSets[task.set - 1],
    progressionLoad: increase ? recommendation.load : null,
    canCutOptional:
      budget.capReached &&
      active.tasks.some((item) => item.cutPriority && !item.completed && !item.skipped),
    canChangeExercise: exerciseChangeAvailable(active),
  };
}

export type SetField = 'reps' | 'weight' | 'rir';
export const SET_FIELDS: SetField[] = ['reps', 'weight', 'rir'];

/** The values a field's picker lists, low to high, always including the current one. */
export function pickerValues(field: SetField, current: string) {
  if (field === 'rir') return ['0', '1', '2', formatRir(MAX_RIR)];
  const value = Number(current || 0);
  if (field === 'reps') {
    const top = Math.max(30, Math.round(value) + 10);
    return Array.from({ length: top }, (_, index) => String(index + 1));
  }
  const top = Math.max(100, Math.ceil((value + 50) / LOAD_STEP) * LOAD_STEP);
  const loads = Array.from({ length: top / LOAD_STEP + 1 }, (_, index) => index * LOAD_STEP);
  if (!loads.includes(value)) loads.push(value);
  return loads.sort((a, b) => a - b).map(formatLoad);
}

/** The most recently logged set of the workout, if any. */
export function lastLoggedSet(active: ActiveWorkout): Performance | undefined {
  return active.tasks
    .flatMap((task) => task.completed || [])
    .filter((done) => done.completedAt)
    .sort((a, b) => Date.parse(b.completedAt || '') - Date.parse(a.completedAt || ''))[0];
}

/** A set beats the same set last time with more load, or more reps at the same load. */
export function isBetterSet(
  logged: { weight: string; reps: string },
  previous: { weight?: number | null; reps?: number | string } | undefined,
) {
  if (!previous || previous.weight == null) return false;
  const weight = Number(logged.weight || 0);
  return (
    weight > previous.weight ||
    (weight === previous.weight && Number(logged.reps) > Number(previous.reps))
  );
}
