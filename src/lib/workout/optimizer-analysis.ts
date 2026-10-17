import type { ExerciseDefinition, MuscleMap } from '../types.ts';
import {
  allocationEntries,
  compareFrequencies,
  setBreakdown,
  weeklyAllocation,
  type FrequencyCandidate,
  type FrequencyOverrides,
} from './optimizer.ts';
import { HEURISTIC_RANGES, HEURISTICS, PRIORITY_WEIGHTS } from './exercises.ts';

const priorityRanges = Object.fromEntries(
  Object.entries(PRIORITY_WEIGHTS).map(([muscle, weight]) => [
    muscle,
    [weight * 0.5, weight, weight * 1.5],
  ]),
);

const setMinutes = (definition: ExerciseDefinition, includeSetup = false) =>
  (definition.executionSeconds || 0) / 60 +
  (definition.restMs || 0) / 60000 +
  (includeSetup ? (definition.setupSeconds || 0) / 60 : 0);

const weightedMarginal = (
  totals: MuscleMap,
  contribution: MuscleMap,
  priorities: Record<string, number> = PRIORITY_WEIGHTS,
) =>
  Object.entries(contribution).reduce((sum, [muscle, value]) => {
    const before = totals[muscle] || 0;
    totals[muscle] = before + value;
    return sum + (priorities[muscle] || 1) * (Math.sqrt(before + value) - Math.sqrt(before));
  }, 0);

export function marginalSetReport() {
  const totals: MuscleMap = {};
  return allocationEntries().flatMap(({ definition, sets }) =>
    Array.from({ length: sets }, (_, index) => {
      const set = index + 1;
      const breakdown = setBreakdown(definition, 1);
      const marginalUtility = weightedMarginal(totals, breakdown.effective);
      const marginalMinutes = setMinutes(definition, set === 1);
      return {
        exerciseId: definition.id,
        exercise: definition.name,
        set,
        direct: breakdown.direct,
        fractional: breakdown.fractional,
        marginalUtility,
        marginalMinutes,
        utilityPerMinute: marginalUtility / marginalMinutes,
      };
    }),
  );
}

export function marginalCandidateReport() {
  const totals = weeklyAllocation();
  return allocationEntries()
    .map(({ definition, sets }) => {
      const breakdown = setBreakdown(definition, 1);
      const marginalUtility = weightedMarginal({ ...totals }, breakdown.effective);
      const marginalMinutes = setMinutes(definition);
      return {
        exerciseId: definition.id,
        exercise: definition.name,
        nextSet: sets + 1,
        currentSets: sets,
        marginalUtility,
        marginalMinutes,
        utilityPerMinute: marginalUtility / marginalMinutes,
      };
    })
    .sort((a, b) => b.utilityPerMinute - a.utilityPerMinute);
}

export function allocationDecisionReport() {
  const current = marginalSetReport();
  const candidates = marginalCandidateReport();
  const findCurrent = (exerciseId: string, set: number) =>
    current.find((item) => item.exerciseId === exerciseId && item.set === set);
  const findCandidate = (exerciseId: string) =>
    candidates.find((item) => item.exerciseId === exerciseId);
  return {
    calfFourth: {
      selected: false,
      candidate: findCandidate('standing-calf-raise'),
      reason:
        'The fourth calf set is below the retained priority-set alternatives on marginal utility per modeled minute.',
    },
    wristExtension: {
      selectedSets: 2,
      secondSet: findCurrent('wrist-extension', 2),
      nextSet: findCandidate('wrist-extension'),
      reason:
        'Two direct forearm sets survive ahead of the fourth calf set and provide a direct priority stimulus.',
    },
    sideDelts: {
      directSets: 4,
      fourthSet: findCurrent('cable-lateral-raise', 4),
      nextSet: findCandidate('cable-lateral-raise'),
      reason:
        'Four direct sets are retained; the fifth is a lower-return optional candidate after priority and coverage constraints.',
    },
    lats: {
      directSets: 4,
      fourthSet: findCurrent('neutral-grip-pulldown', 4),
      nextSet: findCandidate('neutral-grip-pulldown'),
      reason:
        'The corrected allocation adds a fourth lat set; rows also contribute fractional lat work, so further pulldown volume is not automatically justified.',
    },
  };
}

const winner = (candidates: FrequencyCandidate[]) =>
  candidates.reduce((best, candidate) => (candidate.utility > best.utility ? candidate : best))
    .days;
const utilities = (candidates: FrequencyCandidate[]) =>
  Object.fromEntries(candidates.map((candidate) => [candidate.days, candidate.utility]));
const sweep = (value: number, overrides: FrequencyOverrides) => {
  const candidates = compareFrequencies(overrides);
  return { value, winner: winner(candidates), utilities: utilities(candidates) };
};

function parameterOverrides(parameter: string, value: number): FrequencyOverrides {
  if (parameter === 'priorityMultiplier')
    return {
      priorities: Object.fromEntries(
        Object.entries(PRIORITY_WEIGHTS).map(([muscle, weight]) => [muscle, weight * value]),
      ),
    };
  if (parameter === 'frequencyRelief') return { frequencyRelief: { 2: 0, 3: value, 4: value } };
  return { [parameter]: value };
}

export function sensitivityAnalysis() {
  const oneAtATime = Object.entries(HEURISTIC_RANGES).map(([parameter, values]) => ({
    parameter,
    values: values.map((value) => sweep(value, parameterOverrides(parameter, value))),
  }));
  const prioritySweeps = Object.entries(priorityRanges).map(([muscle, values]) => ({
    parameter: `priority:${muscle}`,
    values: values.map((value) => sweep(value, { priorities: { [muscle]: value } })),
  }));
  const twoVsThree = HEURISTIC_RANGES.minuteCost.flatMap((minuteCost) =>
    HEURISTIC_RANGES.visitCost.flatMap((visitCost) =>
      HEURISTIC_RANGES.frequencyRelief.map((frequencyRelief) => {
        const candidates = compareFrequencies({
          minuteCost,
          visitCost,
          frequencyRelief: { 2: 0, 3: frequencyRelief, 4: frequencyRelief },
        });
        return {
          minuteCost,
          visitCost,
          frequencyRelief,
          winner: candidates[1].utility > candidates[0].utility ? 3 : 2,
        };
      }),
    ),
  );
  return {
    ranges: HEURISTIC_RANGES,
    priorityRanges,
    oneAtATime: [...oneAtATime, ...prioritySweeps],
    twoVsThree,
    threeDayReliefThreshold: (
      minuteCost: number,
      visitCost: number,
      extraDayCost = HEURISTICS.extraDayCost,
    ) => minuteCost * 9 + visitCost + extraDayCost,
  };
}
