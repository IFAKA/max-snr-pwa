// Public workout API for screens. Screens import from here, never from individual modules.
export { task, flatten } from './task-factory.ts';
export {
  lastActivePerformance,
  lastExercisePerformances,
  lastPerformance,
  nextDoubleProgression,
  recommendDoubleProgression,
  parseRepRange,
  parseRirRange,
} from './progression.ts';
export {
  completedWorkoutsThisWeek,
  weeklyGoalSummary,
  phaseProgress,
  healthCoverage,
  observedSessionDurations,
  sedentaryStatus,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from './metrics.ts';
export {
  adaptiveRecommendations,
  rollingExerciseTrend,
  rollingMuscleTrends,
} from './adaptation.ts';
export { minutesPerSetEstimate } from './duration-estimator.ts';
export { evaluatePrescription, evaluateAndPersist } from './coordinator.ts';
export {
  bodyHealthSummary,
  selectRecommendation,
  type HealthRecommendation,
} from './health-optimizer.ts';
export {
  compareFrequencies,
  selectedFrequency,
  setBreakdown,
  weeklyAllocation,
  weeklyMuscleSets,
  EXERCISES,
} from './optimizer.ts';
export { exerciseKeyForId } from './exercises.ts';
export {
  allocationDecisionReport,
  marginalCandidateReport,
  marginalSetReport,
  sensitivityAnalysis,
} from './optimizer-analysis.ts';
export {
  start,
  activeTask,
  totalSets,
  completedSets,
  skippedSets,
  groupDeferred,
  supersetProgress,
  findNext,
  skipPlank,
  beginLifting,
  startRest,
  continueRest,
  finishLifts,
  resolveDeferred,
  selectExercise,
  exerciseSelectionLocked,
  exerciseChangeAvailable,
} from './session.ts';
export { completeSet, substituteCurrent, undoLastSet } from './sets.ts';
export {
  completeStretch,
  finishEarly,
  finishAtBudget,
  completeWorkout,
  finishWorkout,
  reopenWorkout,
  cancelWorkout,
} from './finish.ts';
export { startPlank, setTimer, adjustRest, remaining, formatDuration } from './timers.ts';
export { sessionBudgetState, sessionElapsedMs, timeBudgetCutOrder } from './budget.ts';
export { improvementCallouts, workoutSummary } from './summary.ts';
export { dayNow, isCurrentDayComplete, localDateKey } from './calendar.ts';
