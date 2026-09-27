export { task, flatten } from './workout/task-factory.js';
export {
  lastActivePerformance,
  lastExercisePerformances,
  lastPerformance,
  nextDoubleProgression,
  recommendDoubleProgression,
  parseRepRange,
  parseRirRange,
} from './workout/progression.js';
export { completedWorkoutsThisWeek, weeklyGoalSummary, phaseProgress } from './workout/metrics.js';
export {
  healthCoverage,
  observedSessionDurations,
  sedentaryStatus,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from './workout/metrics.js';
export { adaptiveRecommendations, rollingExerciseTrend } from './workout/adaptation.js';
export { evaluatePrescription, evaluateAndPersist } from './workout/coordinator.js';
export { bodyHealthSummary, selectRecommendation } from './workout/health-optimizer.js';
export {
  compareFrequencies,
  selectedFrequency,
  setBreakdown,
  weeklyAllocation,
  weeklyMuscleSets,
} from './workout/optimizer.js';
export {
  allocationDecisionReport,
  marginalCandidateReport,
  marginalSetReport,
  sensitivityAnalysis,
} from './workout/optimizer-analysis.js';
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
  completeSet,
  deferCurrent,
  substituteCurrent,
  undoLastSet,
} from './workout/session.js';
export {
  completeStretch,
  finishEarly,
  finishAtBudget,
  completeWorkout,
  finishWorkout,
  cancelWorkout,
} from './workout/finish.js';
export {
  startPlank,
  setTimer,
  adjustRest,
  remaining,
  formatDuration,
  countdown,
} from './workout/timers.js';
export { sessionBudgetState, sessionElapsedMs, timeBudgetCutOrder } from './workout/budget.js';
