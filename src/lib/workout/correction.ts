import type { ExerciseDefinition, Task } from '../types.ts';
import { getState } from '../state.ts';
import { persist } from '../storage/persistence.ts';
import { evaluateAndPersist } from './coordinator.ts';
import { EXERCISES } from './exercises.ts';
import { HOME_EXERCISES } from './home-exercises.ts';

const catalogue = (): ExerciseDefinition[] => [
  ...Object.values(EXERCISES),
  ...Object.values(HOME_EXERCISES),
];

/** The exercises a saved workout's sets can be corrected to, by name. */
export const correctionChoices = () =>
  catalogue()
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Relabels the sets logged under one exercise of a saved workout as another ("I did Y, not X").
 * Reps, loads and efforts stay exactly as logged; if the workout already has the target exercise
 * the sets join it and its sets are numbered again. Analytics and progression are re-evaluated
 * from History afterwards.
 */
export async function correctExercise(workoutId: number, fromId: string, toId: string) {
  const workout = getState().history.find((item) => item.id === workoutId);
  const target = catalogue().find((item) => item.id === toId);
  if (!workout || !target || fromId === toId) return false;
  const tasks: Task[] = workout.tasks || [];
  const moved = tasks.filter((task) => task.exerciseId === fromId);
  if (!moved.length) return false;
  for (const task of moved) {
    task.exerciseId = target.id;
    task.originalName = target.name;
    task.performedName = target.name;
    task.name = target.name;
    task.primary = { ...(target.primary || {}) };
    task.secondary = { ...(target.secondary || {}) };
    task.station = target.station;
    task.alternatives = [...(target.alternatives || [])];
  }
  const joined = tasks.filter((task) => task.exerciseId === target.id);
  joined.forEach((task, index) => {
    task.set = index + 1;
    task.sets = joined.length;
  });
  await persist();
  await evaluateAndPersist(getState());
  return true;
}
