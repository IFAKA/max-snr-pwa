import type { Performance, Task, Workout } from '../types.ts';

const PRIORITY_MUSCLES = new Set([
  'sideDelts',
  'rearDelts',
  'biceps',
  'triceps',
  'upperChest',
  'lats',
  'abs',
  'obliques',
  'forearms',
]);

type Trend = { points: Array<{ date?: string; score: number }>; improving: boolean };

export interface AdaptiveRecommendation {
  muscle?: string;
  action: string;
  to?: string;
  reason: string;
}

const performanceOf = (task: Task) => task.completed as Performance;
const completedSets = (workout: Workout | undefined, exerciseId: string) =>
  (workout?.tasks || []).filter((task) => task.exerciseId === exerciseId && task.completed);

export function rollingExerciseTrend(
  workoutsHistory: Workout[] | undefined,
  exerciseId: string,
  windowSize = 4,
) {
  const workouts = (workoutsHistory || [])
    .filter((workout) => completedSets(workout, exerciseId).length)
    .slice(0, windowSize);
  const points = workouts.map((workout) => {
    const sets = completedSets(workout, exerciseId);
    return {
      date: workout.completedAt || workout.date,
      reps: sets.reduce((sum, task) => sum + performanceOf(task).reps, 0),
      load: Math.max(...sets.map((task) => Number(performanceOf(task).weight || 0))),
      sets: sets.length,
    };
  });
  const last = points.at(-1);
  return {
    points,
    improving:
      points.length >= 2 &&
      Boolean(last) &&
      points[0].reps >= (last?.reps ?? 0) &&
      points[0].load >= (last?.load ?? 0),
  };
}

export function rollingMuscleTrends(
  workoutsHistory: Workout[] | undefined,
  windowSize = 4,
): Record<string, Trend> {
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
                    sum +
                    Number(performanceOf(task).reps || 0) * Number(performanceOf(task).weight || 0),
                  0,
                ),
              }
            : null;
        })
        .filter((point): point is { date: string; score: number } => Boolean(point))
        .slice(0, windowSize);
      const last = points.at(-1);
      return [
        muscle,
        { points, improving: points.length >= 2 && points[0].score >= (last?.score ?? 0) },
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
}: {
  allocation?: Record<string, number>;
  trends?: Record<string, { improving: boolean }>;
  recovery?: string;
  adherence?: number;
  actualTimeCost?: Record<string, number>;
} = {}): AdaptiveRecommendation[] {
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
