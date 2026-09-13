const PRIORITY_MUSCLES = new Set([
  'sideDelts',
  'rearDelts',
  'biceps',
  'triceps',
  'upperChest',
  'lats',
  'abs',
  'forearms',
]);

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

export function rollingMuscleTrends(workoutsHistory, windowSize = 4) {
  const muscles = new Set(
    (workoutsHistory || []).flatMap((workout) =>
      (workout.tasks || []).flatMap((task) => Object.keys(task.primary || {})),
    ),
  );
  return Object.fromEntries(
    [...muscles].map((muscle) => {
      const points = (workoutsHistory || [])
        .map((workout) => {
          const tasks = (workout.tasks || []).filter(
            (task) => task.completed && task.primary?.[muscle],
          );
          return tasks.length
            ? {
                date: workout.completedAt || workout.date,
                score: tasks.reduce(
                  (sum, task) =>
                    sum + Number(task.completed.reps || 0) * Number(task.completed.weight || 0),
                  0,
                ),
              }
            : null;
        })
        .filter(Boolean)
        .slice(0, windowSize);
      return [
        muscle,
        {
          points,
          improving: points.length >= 2 && points[0].score >= points.at(-1).score,
        },
      ];
    }),
  );
}

export function adaptiveRecommendations({
  allocation = {},
  trends = {},
  recovery = 'good',
  adherence = 1,
  actualTimeCost = {},
} = {}) {
  if (adherence < 0.75)
    return [{ action: 'KEEP', reason: 'Improve adherence before changing volume.' }];
  const stagnantPriority = Object.keys(allocation).find(
    (muscle) => PRIORITY_MUSCLES.has(muscle) && trends[muscle]?.improving === false,
  );
  const lowValue = Object.keys(allocation)
    .filter((muscle) => muscle !== stagnantPriority && allocation[muscle] > 0)
    .sort(
      (a, b) =>
        (actualTimeCost[a] || 0) - (actualTimeCost[b] || 0) ||
        (PRIORITY_MUSCLES.has(b) ? 1 : 0) - (PRIORITY_MUSCLES.has(a) ? 1 : 0),
    )[0];
  return Object.entries(allocation).map(([muscle, sets]) => {
    if (recovery === 'poor' && sets > 0)
      return {
        muscle,
        action: 'REMOVE 1 SET/WEEK',
        reason: 'Recovery cost is high; reduce the cheapest dose first.',
      };
    if (muscle === lowValue && stagnantPriority)
      return {
        muscle,
        action: 'REALLOCATE 1 SET/WEEK',
        to: stagnantPriority,
        reason:
          'Move one low-value weekly set to a higher-priority muscle with a flat rolling trend.',
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
