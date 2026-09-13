import { OPTIMIZER_OUTPUT } from './workout/optimizer.js';

export const ROUTINE = {
  Monday: OPTIMIZER_OUTPUT.routine[0],
  Tuesday: null,
  Wednesday: null,
  Thursday: OPTIMIZER_OUTPUT.routine[1],
  Friday: null,
  Saturday: null,
  Sunday: null,
};

export const NAMES = {
  Monday: OPTIMIZER_OUTPUT.names[0],
  Thursday: OPTIMIZER_OUTPUT.names[1],
};

export const isExerciseDefinition = (item) =>
  Boolean(
    item &&
    item.type === 'exercise' &&
    typeof item.id === 'string' &&
    item.id &&
    typeof item.name === 'string' &&
    item.name &&
    Number.isInteger(item.sets) &&
    item.sets > 0,
  );

const groupMembers = (item) =>
  item?.type === 'superset' ? item.members : item?.type === 'equipmentBlock' ? item.items : null;

export const dayItems = (day) => (Array.isArray(ROUTINE[day]) ? ROUTINE[day] : []);
export const isWorkoutDay = (day) =>
  dayItems(day).some(
    (item) =>
      isExerciseDefinition(item) ||
      (Array.isArray(groupMembers(item)) && groupMembers(item).some(isExerciseDefinition)),
  );
export const workoutName = (day) =>
  typeof NAMES[day] === 'string' && NAMES[day].trim() ? NAMES[day] : day;
export const configuredDays = () => Object.keys(ROUTINE);
