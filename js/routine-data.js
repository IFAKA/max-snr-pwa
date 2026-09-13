import { OPTIMIZER_OUTPUT } from './workout/optimizer.js';
import { getState } from './state.js';

const DEFAULT_ROUTINE = {
  Monday: OPTIMIZER_OUTPUT.routine[0],
  Tuesday: null,
  Wednesday: null,
  Thursday: OPTIMIZER_OUTPUT.routine[1],
  Friday: null,
  Saturday: null,
  Sunday: null,
};

const DEFAULT_NAMES = {
  Monday: OPTIMIZER_OUTPUT.names[0],
  Thursday: OPTIMIZER_OUTPUT.names[1],
};
export const ROUTINE = DEFAULT_ROUTINE;
export const NAMES = DEFAULT_NAMES;
const activeRoutine = () => getState().prescription?.routine || DEFAULT_ROUTINE;
const activeNames = () => getState().prescription?.names || DEFAULT_NAMES;

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

export const dayItems = (day) => (Array.isArray(activeRoutine()[day]) ? activeRoutine()[day] : []);
export const isWorkoutDay = (day) =>
  dayItems(day).some(
    (item) =>
      isExerciseDefinition(item) ||
      (Array.isArray(groupMembers(item)) && groupMembers(item).some(isExerciseDefinition)),
  );
export const workoutName = (day) =>
  typeof activeNames()[day] === 'string' && activeNames()[day].trim() ? activeNames()[day] : day;
export const configuredDays = () => Object.keys(activeRoutine());
