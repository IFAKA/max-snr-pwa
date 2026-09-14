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
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FALLBACK_TRAINING_DAYS = {
  2: ['Monday', 'Thursday'],
  3: ['Monday', 'Wednesday', 'Friday'],
  4: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
};
export const ROUTINE = DEFAULT_ROUTINE;
export const NAMES = DEFAULT_NAMES;
const activeRoutine = () => getState().prescription?.routine || DEFAULT_ROUTINE;
const activeNames = () => getState().prescription?.names || DEFAULT_NAMES;

function routineDays() {
  const routine = activeRoutine();
  if (!Array.isArray(routine)) return Object.keys(routine);
  const prescription = getState().prescription;
  const days = Array.isArray(prescription?.days)
    ? prescription.days
    : FALLBACK_TRAINING_DAYS[routine.length] || WEEKDAYS.slice(0, routine.length);
  return days.slice(0, routine.length);
}

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

export const dayItems = (day) => {
  const routine = activeRoutine();
  const key = Array.isArray(routine) ? routineDays().indexOf(day) : day;
  return Array.isArray(routine[key]) ? routine[key] : [];
};
export const isWorkoutDay = (day) =>
  dayItems(day).some(
    (item) =>
      isExerciseDefinition(item) ||
      (Array.isArray(groupMembers(item)) && groupMembers(item).some(isExerciseDefinition)),
  );
export const workoutName = (day) =>
  (() => {
    const names = activeNames();
    const key = Array.isArray(names) ? routineDays().indexOf(day) : day;
    return typeof names[key] === 'string' && names[key].trim() ? names[key] : day;
  })();
export const configuredDays = () => routineDays();
