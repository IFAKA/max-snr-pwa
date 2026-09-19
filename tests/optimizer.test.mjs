import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXERCISES,
  compareFrequencies,
  diminishingReturn,
  fractionalSets,
  marginalSetValue,
  optimizeRoutine,
  selectedFrequency,
  weeklyAllocation,
  weeklyMuscleSets,
  prescriptionAllocation,
} from '../js/workout/optimizer.js';
import {
  allocationDecisionReport,
  marginalCandidateReport,
  marginalSetReport,
  sensitivityAnalysis,
} from '../js/workout/optimizer-analysis.js';
import { flatten } from '../js/workout/task-factory.js';

test('marginal return diminishes as weekly sets increase', () => {
  assert.ok(marginalSetValue(1) > marginalSetValue(12));
  assert.ok(diminishingReturn(4) > diminishingReturn(1));
  assert.equal(diminishingReturn(-1), 0);
});

test('indirect contributions are fractional and exercise-specific', () => {
  assert.deepEqual(fractionalSets(EXERCISES.inclinePress, 4), {
    upperChest: 4,
    chest: 1,
    sideDelts: 1,
    triceps: 0.8,
  });
});

test('optimizer compares all requested frequencies and selects the efficient frontier', () => {
  const candidates = compareFrequencies();
  assert.deepEqual(
    candidates.map((candidate) => candidate.days),
    [2, 3, 4],
  );
  assert.equal(selectedFrequency().days, 2);
  assert.ok(candidates[0].minutes < candidates[1].minutes);
});

test('routine is generated from allocation and preserves metadata through flattening', () => {
  const output = optimizeRoutine();
  const tasks = output.routine.flatMap(flatten);
  assert.ok(tasks.length > 0);
  assert.equal(tasks.filter((task) => task.exerciseId === 'cable-crunch').length, 4);
  assert.equal(tasks.find((task) => task.exerciseId === 'cable-crunch').reps, '8–15');
  assert.equal(tasks.find((task) => task.exerciseId === 'cable-crunch').restMs, 60000);
});

test('weekly allocation covers the priority and health layers', () => {
  const allocation = weeklyAllocation();
  [
    'sideDelts',
    'biceps',
    'triceps',
    'upperChest',
    'lats',
    'abs',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
  ].forEach((muscle) => {
    assert.ok(allocation[muscle] > 0, muscle);
  });
});

test('direct and fractional allocation remain separately inspectable', () => {
  const sets = weeklyMuscleSets();
  assert.equal(sets.sideDelts.direct, 4);
  assert.ok(Math.abs(sets.sideDelts.fractional - 1.25) < 1e-9);
  assert.equal(sets.triceps.direct, 4);
  assert.equal(sets.biceps.direct, 4);
  assert.ok(Math.abs(sets.rearDelts.fractional - 0.45) < 1e-9);
  assert.equal(sets.lats.direct, 4);
  assert.equal(sets.lats.fractional, 1.35);
  assert.equal(sets.calves.fractional, 0);
  assert.equal(prescriptionAllocation()['standing-calf-raise'], 3);
  assert.equal(prescriptionAllocation()['wrist-extension'], 2);
});

test('marginal reports include every prescribed set and next-set candidates', () => {
  assert.equal(marginalSetReport().length, 41);
  const candidates = marginalCandidateReport();
  assert.ok(candidates.find((candidate) => candidate.exerciseId === 'standing-calf-raise'));
  assert.ok(candidates.find((candidate) => candidate.exerciseId === 'wrist-extension'));
  assert.ok(candidates.every((candidate) => Number.isFinite(candidate.utilityPerMinute)));
});

test('frequency sensitivity exposes ranges and the relief threshold for three days', () => {
  const sensitivity = sensitivityAnalysis();
  assert.ok(sensitivity.oneAtATime.some((item) => item.parameter === 'priority:sideDelts'));
  assert.equal(sensitivity.threeDayReliefThreshold(0.08, 2), 4.22);
  assert.equal(
    sensitivity.twoVsThree.some((item) => item.winner === 3),
    true,
  );
});

test('allocation decisions explain the calf, wrist, delt, and lat tradeoffs', () => {
  const decisions = allocationDecisionReport();
  assert.equal(decisions.calfFourth.selected, false);
  assert.equal(decisions.wristExtension.selectedSets, 2);
  assert.equal(decisions.sideDelts.directSets, 4);
  assert.equal(decisions.lats.directSets, 4);
  assert.ok(
    decisions.wristExtension.secondSet.utilityPerMinute >
      decisions.calfFourth.candidate.utilityPerMinute,
  );
});
