import {
  allocationEntries,
  compareFrequencies,
  HEURISTIC_RANGES,
  HEURISTICS,
  PRIORITY_WEIGHTS,
  weeklyAllocation,
  setBreakdown,
} from './optimizer.js';

const priorityRanges = Object.fromEntries(
  Object.entries(PRIORITY_WEIGHTS).map(([muscle, weight]) => [
    muscle,
    [weight * 0.5, weight, weight * 1.5],
  ]),
);

const setMinutes = (definition, includeSetup = false) =>
  definition.executionSeconds / 60 +
  definition.restMs / 60000 +
  (includeSetup ? definition.setupSeconds / 60 : 0);

const weightedMarginal = (totals, contribution, priorities = PRIORITY_WEIGHTS) =>
  Object.entries(contribution).reduce((sum, [muscle, value]) => {
    const before = totals[muscle] || 0;
    totals[muscle] = before + value;
    return sum + (priorities[muscle] || 1) * (Math.sqrt(before + value) - Math.sqrt(before));
  }, 0);

export function marginalSetReport() {
  const totals = {};
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
  const findCurrent = (exerciseId, set) =>
    current.find((item) => item.exerciseId === exerciseId && item.set === set);
  const findCandidate = (exerciseId) => candidates.find((item) => item.exerciseId === exerciseId);
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

const winner = (candidates) =>
  candidates.reduce((best, candidate) => (candidate.utility > best.utility ? candidate : best))
    .days;
const utilities = (candidates) =>
  Object.fromEntries(candidates.map((candidate) => [candidate.days, candidate.utility]));

export function sensitivityAnalysis() {
  const oneAtATime = Object.entries(HEURISTIC_RANGES).map(([parameter, values]) => ({
    parameter,
    values: values.map((value) => {
      const overrides =
        parameter === 'priorityMultiplier'
          ? {
              priorities: Object.fromEntries(
                Object.entries(PRIORITY_WEIGHTS).map(([muscle, weight]) => [
                  muscle,
                  weight * value,
                ]),
              ),
            }
          : parameter === 'frequencyRelief'
            ? { frequencyRelief: { 2: 0, 3: value, 4: value } }
            : { [parameter]: value };
      const candidates = compareFrequencies(overrides);
      return { value, winner: winner(candidates), utilities: utilities(candidates) };
    }),
  }));
  const prioritySweeps = Object.entries(priorityRanges).map(([muscle, values]) => ({
    parameter: `priority:${muscle}`,
    values: values.map((value) => {
      const candidates = compareFrequencies({ priorities: { [muscle]: value } });
      return { value, winner: winner(candidates), utilities: utilities(candidates) };
    }),
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
    threeDayReliefThreshold: (minuteCost, visitCost, extraDayCost = HEURISTICS.extraDayCost) =>
      minuteCost * 9 + visitCost + extraDayCost,
  };
}
