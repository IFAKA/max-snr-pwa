import type { AppState, Prescription, Workout } from '../types.ts';
import { getState } from '../state.ts';
import { persist } from '../storage/persistence.ts';
import {
  adaptiveRecommendations,
  rollingMuscleTrends,
  type AdaptiveRecommendation,
} from './adaptation.ts';
import { compareFrequencies, type FrequencyCandidate } from './optimizer.ts';
import { EXERCISES, type ExerciseKey } from './exercises.ts';
import { createPrescription, isFixedProgram, prescriptionAllocationEntries } from './program.ts';

export const MIN_NEW_SESSIONS = 6;
export const FREQUENCY_ADVANTAGE = 2;
export const FREQUENCY_COOLDOWN_MS = 14 * 86400000;
export const VOLUME_COOLDOWN_MS = 7 * 86400000;

export interface Evaluation {
  action: 'KEEP' | 'FREQUENCY' | 'VOLUME';
  reason: string;
  days?: number;
  prescription?: Prescription;
  evidence?: Workout[] | number;
  candidates?: FrequencyCandidate[];
}

const completed = (state: AppState) =>
  (state.history || []).filter((workout) => workout.completedAt);
const evidenceSince = (state: AppState) =>
  completed(state).filter(
    (workout) =>
      Date.parse(workout.completedAt as string) > (state.prescription?.lastEvaluatedAt || 0),
  );
const keyForMuscle = (muscle?: string) =>
  (Object.keys(EXERCISES) as ExerciseKey[]).find((key) =>
    muscle ? EXERCISES[key].primary?.[muscle] : false,
  );

function adaptVolume(prescription: Prescription, recommendations: AdaptiveRecommendation[]) {
  const allocation = Object.fromEntries(prescriptionAllocationEntries(prescription)) as Record<
    ExerciseKey,
    number
  >;
  const add = recommendations.find((item) => item.action === 'ADD 1 SET/WEEK');
  const remove = recommendations.find((item) => item.action === 'REMOVE 1 SET/WEEK');
  const move = recommendations.find((item) => item.action === 'REALLOCATE 1 SET/WEEK');
  if (move) {
    const from = keyForMuscle(move.muscle);
    const to = keyForMuscle(move.to);
    if (from && to && allocation[from] > 1) {
      allocation[from]--;
      allocation[to]++;
    }
  } else if (add) {
    const key = keyForMuscle(add.muscle);
    if (key) allocation[key]++;
  } else if (remove) {
    const key = keyForMuscle(remove.muscle);
    if (key && allocation[key] > 1) allocation[key]--;
  } else return null;
  return createPrescription(prescription.daysPerWeek, {
    allocation: Object.entries(allocation) as Array<[ExerciseKey, number]>,
    lastChangeReason: recommendations.find((item) => item.action !== 'KEEP')?.reason,
  });
}

function muscleAllocation(prescription: Prescription) {
  const allocation: Record<string, number> = {};
  prescriptionAllocationEntries(prescription).forEach(([key, sets]) => {
    Object.keys(EXERCISES[key].primary || {}).forEach((muscle) => {
      allocation[muscle] = (allocation[muscle] || 0) + sets;
    });
  });
  return allocation;
}

export function evaluatePrescription(state: AppState = getState(), now = Date.now()): Evaluation {
  const current = state.prescription;
  if (!current) return { action: 'KEEP', reason: 'No prescription loaded.' };
  if (isFixedProgram(current.programId))
    return { action: 'KEEP', reason: 'The fixed program is canonical.' };
  const evidence = evidenceSince(state);
  if (evidence.length < MIN_NEW_SESSIONS)
    return {
      action: 'KEEP',
      reason: 'Awaiting more completed sessions.',
      evidence: evidence.length,
    };
  const candidates = compareFrequencies({
    state,
    allocation: prescriptionAllocationEntries(current),
  });
  const winner = candidates.slice().sort((a, b) => b.utility - a.utility)[0];
  const incumbent = candidates.find((candidate) => candidate.days === current.daysPerWeek);
  if (
    winner.days !== current.daysPerWeek &&
    now - (current.lastEvaluatedAt || 0) >= FREQUENCY_COOLDOWN_MS &&
    winner.utility - (incumbent?.utility ?? 0) >= FREQUENCY_ADVANTAGE
  )
    return {
      action: 'FREQUENCY',
      days: winner.days,
      reason: `Observed session cost made ${winner.days}-day distribution meaningfully more efficient.`,
      evidence,
      candidates,
    };
  if (now - (current.lastEvaluatedAt || 0) >= VOLUME_COOLDOWN_MS) {
    const recommendations = adaptiveRecommendations({
      allocation: muscleAllocation(current),
      trends: rollingMuscleTrends(state.history),
      adherence: evidence.length / MIN_NEW_SESSIONS,
    });
    const next = adaptVolume(current, recommendations);
    if (next)
      return {
        action: 'VOLUME',
        prescription: next,
        reason: next.lastChangeReason,
        evidence,
        candidates,
      };
  }
  return {
    action: 'KEEP',
    reason: 'No alternative has a meaningful advantage.',
    evidence,
    candidates,
  };
}

export async function evaluateAndPersist(state: AppState = getState(), now = Date.now()) {
  const result = evaluatePrescription(state, now);
  const current = state.prescription;
  if (result.action === 'KEEP' || !current) return result;
  const next =
    result.action === 'FREQUENCY'
      ? createPrescription(result.days, {
          lastChangeReason: result.reason,
          evidence: result.evidence,
        })
      : (result.prescription as Prescription);
  next.createdAt = current.createdAt;
  next.lastEvaluatedAt = now;
  next.lastChangeReason = result.reason;
  next.evidence = result.evidence;
  state.prescription = next;
  await persist();
  return result;
}
