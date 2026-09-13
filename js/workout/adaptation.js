const PRIORITY_MUSCLES = new Set(['sideDelts', 'arms', 'upperChest', 'lats', 'abs', 'forearms']);

const completedSets = (workout, exerciseId) =>
  (workout?.tasks || []).filter((task) => task.exerciseId === exerciseId && task.completed);

export function rollingExerciseTrend(workoutsHistory, exerciseId, windowSize = 4) {
  const workouts = (workoutsHistory || [])
    .filter((workout) => completedSets(workout, exerciseId).length)
    .slice(0, windowSize);
  const points = workouts.map((workout) => {
    const sets = completedSets(workout, exerciseId);
    return {
      date: workout.completedAt || workout.date,
      reps: sets.reduce((sum, task) => sum + task.completed.reps, 0),
      load: Math.max(...sets.map((task) => Number(task.completed.weight || 0))),
      sets: sets.length,
    };
  });
  return {
    points,
    improving:
      points.length >= 2 &&
      points[0].reps >= points.at(-1).reps &&
      points[0].load >= points.at(-1).load,
  };
}

export function adaptiveRecommendations({
  allocation = {},
  trends = {},
  recovery = 'good',
  adherence = 1,
} = {}) {
  if (adherence < 0.75)
    return [{ action: 'KEEP', reason: 'Improve adherence before changing volume.' }];
  return Object.entries(allocation).map(([muscle, sets]) => {
    if (recovery === 'poor' && sets > 0)
      return {
        muscle,
        action: 'REMOVE 1 SET/WEEK',
        reason: 'Recovery cost is high; reduce the cheapest dose first.',
      };
    if (PRIORITY_MUSCLES.has(muscle) && trends[muscle]?.improving === false)
      return {
        muscle,
        action: 'ADD 1 SET/WEEK',
        reason: 'Priority muscle has a flat rolling performance trend at the current dose.',
      };
    return { muscle, action: 'KEEP', reason: 'No evidence justifies extra cost yet.' };
  });
}
