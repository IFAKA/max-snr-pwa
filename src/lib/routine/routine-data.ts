import type { ExerciseDefinition, RoutineDay, RoutineItem } from '../types.ts';
import { OPTIMIZER_OUTPUT } from '../workout/program.ts';
import { getState } from '../state.ts';

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DEFAULT_ROUTINE: Record<string, RoutineDay | null> = {
  Monday: OPTIMIZER_OUTPUT.routine[0],
  Tuesday: null,
  Wednesday: null,
  Thursday: OPTIMIZER_OUTPUT.routine[1],
  Friday: null,
  Saturday: null,
  Sunday: null,
};

const DEFAULT_NAMES: Record<string, string> = {
  Monday: OPTIMIZER_OUTPUT.names[0],
  Thursday: OPTIMIZER_OUTPUT.names[1],
};
const FALLBACK_TRAINING_DAYS: Record<number, string[]> = {
  2: ['Monday', 'Thursday'],
  3: ['Monday', 'Wednesday', 'Friday'],
  4: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
};
export const ROUTINE = DEFAULT_ROUTINE;
export const NAMES = DEFAULT_NAMES;
const activeRoutine = () => getState().prescription?.routine || DEFAULT_ROUTINE;
const activeNames = () => getState().prescription?.names || DEFAULT_NAMES;

function routineDays(): string[] {
  const routine = activeRoutine();
  if (!Array.isArray(routine)) return Object.keys(routine);
  const prescription = getState().prescription;
  const days = Array.isArray(prescription?.days)
    ? prescription.days
    : FALLBACK_TRAINING_DAYS[routine.length] || WEEKDAYS.slice(0, routine.length);
  return days.slice(0, routine.length);
}

export const isExerciseDefinition = (item: unknown): item is ExerciseDefinition => {
  const value = item as Partial<ExerciseDefinition> | null | undefined;
  return Boolean(
    value &&
    value.type === 'exercise' &&
    typeof value.id === 'string' &&
    value.id &&
    typeof value.name === 'string' &&
    value.name &&
    Number.isInteger(value.sets) &&
    (value.sets as number) > 0,
  );
};

export const groupMembers = (item: RoutineItem | null | undefined): ExerciseDefinition[] | null =>
  item?.type === 'superset' ? item.members : item?.type === 'equipmentBlock' ? item.items : null;

export const dayItems = (day: string): RoutineDay => {
  const routine = activeRoutine();
  const items = Array.isArray(routine)
    ? routine[routineDays().indexOf(day)]
    : (routine as Record<string, RoutineDay | null>)[day];
  return Array.isArray(items) ? items : [];
};

export const isWorkoutDay = (day: string | null | undefined) =>
  Boolean(day) &&
  dayItems(day as string).some((item) => {
    const members = groupMembers(item);
    return (
      isExerciseDefinition(item) || (Array.isArray(members) && members.some(isExerciseDefinition))
    );
  });

export const workoutName = (day: string) => {
  const names = activeNames();
  const name = Array.isArray(names)
    ? names[routineDays().indexOf(day)]
    : (names as Record<string, string>)[day];
  return typeof name === 'string' && name.trim() ? name : day;
};

export const configuredDays = () => routineDays();
