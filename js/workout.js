export { task, flatten } from './workout/task-factory.js';
export {
  lastActivePerformance,
  lastPerformance,
  progressionSuggestion,
} from './workout/progression.js';
export { completedWorkoutsThisWeek, weeklyGoalSummary, phaseProgress } from './workout/metrics.js';
export {
  healthCoverage,
  observedSessionDurations,
  sedentaryStatus,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from './workout/metrics.js';
export { nextDoubleProgression, parseRepRange } from './workout/progression.js';
export { adaptiveRecommendations, rollingExerciseTrend } from './workout/adaptation.js';
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
  findNext,
  skipPlank,
  beginLifting,
  startRest,
  continueRest,
  finishLifts,
  resolveDeferred,
  selectExercise,
  exerciseSelectionLocked,
  completeSet,
  deferCurrent,
  substituteCurrent,
  undoLastSet,
  completeStretch,
  finishEarly,
  finishWorkout,
  cancelWorkout,
} from './workout/session.js';
export {
  startPlank,
  setTimer,
  adjustRest,
  remaining,
  formatDuration,
  countdown,
} from './workout/timers.js';
