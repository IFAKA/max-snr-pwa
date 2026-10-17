import type { ActiveWorkout, Task, Unit } from '../types.ts';
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
  const previousSetReps = previousSets[task.set - 1]?.reps;
  const reps = String(
    draft.reps ??
      (previousSetReps !== undefined ? previousSetReps : String(task.reps).split('–')[0]),
  );
  const recommendation = recommendDoubleProgression({
    load: previous?.weight,
    performances: previousSets,
    prescribedSets: task.workingSets || task.sets,
    targetRepRange: task.targetRepRange || task.reps,
    targetRir: task.targetRir || task.rir,
  });
  const increase = recommendation.action === 'increase-load';
  const recommendedLoad = increase ? recommendation.load : previous?.weight;
  const budget = sessionBudgetState(active);
  return {
    reps,
    weight: String(draft.weight ?? recommendedLoad ?? ''),
    rir: formatRir(
      rirValue(
        draft.rir ?? previous?.rir ?? defaultRir(task.targetRir || task.rir, task.set, task.sets),
      ),
    ),
    previous,
    progressionLoad: increase ? recommendation.load : null,
    canCutOptional:
      budget.capReached &&
      active.tasks.some((item) => item.cutPriority && !item.completed && !item.skipped),
    canChangeExercise: exerciseChangeAvailable(active),
  };
}

/** Applies one stepper press to a field value, keeping each field in its valid range. */
export function stepValue(field: 'reps' | 'weight' | 'rir', value: string, delta: number) {
  const minimum = field === 'reps' ? 1 : 0;
  const maximum = field === 'rir' ? MAX_RIR : Number.POSITIVE_INFINITY;
  const current = field === 'rir' ? rirValue(value) : Number(value || 0);
  const next = Math.min(maximum, Math.max(minimum, current + delta));
  if (field === 'reps') return String(Math.round(next));
  if (field === 'rir') return formatRir(Math.round(next));
  return formatLoad(next);
}
