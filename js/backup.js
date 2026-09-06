import { emptyState } from './state.js';

const PHASES = new Set(['warmup', 'plank', 'lifting', 'rest', 'stretch', 'complete']);
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const validText = (value, max = 160) => typeof value === 'string' && value.length <= max;

function validPerformance(value) {
  return isRecord(value) && Number.isFinite(value.weight) && value.weight >= 0 && value.weight <= 10000 && Number.isInteger(value.reps) && value.reps > 0 && value.reps <= 1000 && ['0', '1', '2', '3+'].includes(String(value.rir));
}

function validTask(task) {
  if (!isRecord(task)) return false;
  const names = ['name', 'performedName', 'originalName'].filter(key => task[key] !== undefined);
  if (!names.length || names.some(key => !validText(task[key]))) return false;
  if (task.set !== undefined && (!Number.isInteger(task.set) || task.set < 1 || task.set > 1000)) return false;
  if (task.sets !== undefined && (!Number.isInteger(task.sets) || task.sets < 1 || task.sets > 1000)) return false;
  if (task.reps !== undefined && !validText(String(task.reps), 24)) return false;
  if (task.rir !== undefined && !validText(String(task.rir), 24)) return false;
  if (task.groupLabel !== undefined && !validText(task.groupLabel)) return false;
  if (task.alternatives !== undefined && (!Array.isArray(task.alternatives) || !task.alternatives.every(name => validText(name)))) return false;
  if (task.completed !== null && task.completed !== undefined) {
    if (Array.isArray(task.completed)) {
      if (!task.completed.every(validPerformance)) return false;
    } else if (!validPerformance(task.completed)) return false;
  }
  if (task.done !== undefined && (!Array.isArray(task.done) || !task.done.every(validPerformance))) return false;
  return true;
}

function validWorkout(workout, active = false) {
  if (!isRecord(workout) || !validText(workout.name || 'Workout')) return false;
  if (workout.note !== undefined && !validText(workout.note, 1000)) return false;
  if (workout.date !== undefined && Number.isNaN(Date.parse(workout.date))) return false;
  const tasks = workout.tasks || workout.queue;
  if (active && !Array.isArray(tasks)) return false;
  if (tasks !== undefined && (!Array.isArray(tasks) || tasks.length > 1000 || !tasks.every(validTask))) return false;
  if (active && workout.phase !== undefined && !PHASES.has(workout.phase)) return false;
  if (active && (!Number.isInteger(workout.pos || 0) || (tasks.length && (workout.pos || 0) >= tasks.length))) return false;
  if (active && workout.nextPos !== undefined && workout.nextPos !== null && (!Number.isInteger(workout.nextPos) || workout.nextPos < 0 || workout.nextPos >= tasks.length)) return false;
  if (active && workout.deferredGroups !== undefined && !Array.isArray(workout.deferredGroups)) return false;
  return true;
}

export function validateBackup(raw) {
  if (!isRecord(raw) || !Array.isArray(raw.history) || raw.history.length > 5000 || !raw.history.every(workout => validWorkout(workout))) throw new Error('Invalid backup file.');
  if (raw.active !== null && raw.active !== undefined && !validWorkout(raw.active, true)) throw new Error('Invalid backup file.');
  const next = JSON.parse(JSON.stringify({...emptyState(), ...raw, version: 2}));
  next.settings = {unit: raw.settings?.unit === 'lb' ? 'lb' : 'kg'};
  next.updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
  return next;
}
