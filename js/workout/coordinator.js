import { getState } from '../state.js';
import { save } from '../storage.js';
import { adaptiveRecommendations, rollingMuscleTrends } from './adaptation.js';
import { compareFrequencies, createPrescription, EXERCISES } from './optimizer.js';

export const MIN_NEW_SESSIONS = 6;
export const FREQUENCY_ADVANTAGE = 2;
export const FREQUENCY_COOLDOWN_MS = 14 * 86400000;
export const VOLUME_COOLDOWN_MS = 7 * 86400000;

const completed = (state) => (state.history || []).filter((workout) => workout.completedAt);
const evidenceSince = (state) =>
  completed(state).filter(
    (workout) => Date.parse(workout.completedAt) > (state.prescription?.lastEvaluatedAt || 0),
  );
const keyForMuscle = (muscle) =>
  Object.keys(EXERCISES).find((key) => EXERCISES[key].primary?.[muscle]);
const prescriptionEntries = (prescription) =>
  Object.entries(prescription.weeklySetAllocation || {})
    .map(([id, sets]) => [Object.keys(EXERCISES).find((key) => EXERCISES[key].id === id), sets])
    .filter(([key]) => key);

function adaptVolume(prescription, recommendations) {
  const allocation = Object.fromEntries(prescriptionEntries(prescription));
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
    allocation: Object.entries(allocation),
    lastChangeReason: recommendations.find((item) => item.action !== 'KEEP')?.reason,
  });
}

export function evaluatePrescription(state = getState(), now = Date.now()) {
  const current = state.prescription;
  if (!current) return { action: 'KEEP', reason: 'No prescription loaded.' };
  const evidence = evidenceSince(state);
  if (evidence.length < MIN_NEW_SESSIONS)
    return {
      action: 'KEEP',
      reason: 'Awaiting more completed sessions.',
      evidence: evidence.length,
    };
  const candidates = compareFrequencies({ state, allocation: prescriptionEntries(current) });
  const winner = candidates.slice().sort((a, b) => b.utility - a.utility)[0];
  const incumbent = candidates.find((candidate) => candidate.days === current.daysPerWeek);
  if (
    winner.days !== current.daysPerWeek &&
    now - (current.lastEvaluatedAt || 0) >= FREQUENCY_COOLDOWN_MS &&
    winner.utility - incumbent.utility >= FREQUENCY_ADVANTAGE
  )
    return {
      action: 'FREQUENCY',
      days: winner.days,
      reason: `Observed session cost made ${winner.days}-day distribution meaningfully more efficient.`,
      evidence,
      candidates,
    };
  if (now - (current.lastEvaluatedAt || 0) >= VOLUME_COOLDOWN_MS) {
    const allocation = {};
    prescriptionEntries(current).forEach(([key, sets]) => {
      Object.keys(EXERCISES[key].primary || {}).forEach((muscle) => {
        allocation[muscle] = (allocation[muscle] || 0) + sets;
      });
    });
    const recommendations = adaptiveRecommendations({
      allocation,
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

export async function evaluateAndPersist(state = getState(), now = Date.now()) {
  const result = evaluatePrescription(state, now);
  if (result.action === 'KEEP') return result;
  const current = state.prescription;
  const next =
    result.action === 'FREQUENCY'
      ? createPrescription(result.days, {
          lastChangeReason: result.reason,
          evidence: result.evidence,
        })
      : result.prescription;
  next.createdAt = current.createdAt;
  next.lastEvaluatedAt = now;
  next.lastChangeReason = result.reason;
  next.evidence = result.evidence;
  state.prescription = next;
  await save();
  return result;
}
