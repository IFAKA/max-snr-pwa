/**
 * Neutral weekly progress: counts what was done and never frames a missed day as a loss.
 * Going past the goal reads as "goal met" rather than an odd "4 of 3".
 */
export function weeklyProgressLabel(completed: number, goal: number) {
  if (completed >= goal && goal > 0) return `${completed} · goal met`;
  return `${completed} of ${goal}`;
}
