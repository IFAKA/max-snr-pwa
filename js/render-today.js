import { app, esc, dayNow } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';

function localDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function completedToday(history, now = new Date()) {
  const today = localDate(now);
  return history.find(workout => localDate(workout.completedAt || workout.date) === today) || null;
}

function completedSetCount(workout) {
  return (workout.tasks || workout.queue || []).filter(task => task.completed || (Array.isArray(task.done) && task.done.length)).length;
}

export function renderToday() {
  const day = dayNow(), routine = ROUTINE[day], state = getState(), active = state.active, completedWorkout = completedToday(state.history);
  const status = active ? 'Workout in progress' : completedWorkout ? 'Workout completed today' : routine ? 'Ready when you are' : 'Recovery day';
  app.innerHTML = `<section class="today-screen" aria-labelledby="today-title"><header class="page-header"><p class="context-label">${esc(day)}</p><h1 id="today-title">${routine ? esc(NAMES[day]) : 'Rest day'}</h1><p class="today-status">${status}</p></header><nav class="today-actions" aria-label="Today navigation"><a class="button primary" href="/routine/">Routine</a><a class="button secondary" href="/history/">History</a></nav></section>`;
}
