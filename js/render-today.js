import { app, esc, dayNow, pageNav, icon } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { start } from './workout.js';
import { routineMarkup } from './routine-view.js';

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
  const day = dayNow(), state = getState(), routine = ROUTINE[day], active = state.active, completedWorkout = completedToday(state.history);
  const completed = active?.tasks?.filter(task => task.completed).length || 0;
  const routineSection = routine ? `<section class="today-routine" aria-label="Routine"><div class="today-routine-heading"><p class="muted">${routine.flatMap(item => item.type === 'exercise' ? Array(item.sets).fill(item) : (item.members || item.items).flatMap(exercise => Array(exercise.sets).fill(exercise))).length} sets</p></div>${routineMarkup(routine, 'today-routine-list')}</section>` : '';
  const completedHistorySets = completedWorkout ? completedSetCount(completedWorkout) : 0;
  const action = active ? `<div class="today-bottom-action"><p>${completed} of ${active.tasks.length} sets logged.</p><a class="button primary" href="/workout/">Resume</a></div>` : completedWorkout ? `<div class="today-bottom-action"><p>${completedHistorySets} sets completed today.</p><a class="button primary" href="/history/">View history</a></div>` : routine ? '<div class="today-bottom-action"><button class="primary" id="start">Start</button></div>' : '';
  app.innerHTML = `<div class="today-screen"><header class="page-header"><h1>${routine ? esc(NAMES[day]) : 'Rest day'}</h1></header>${routineSection}${action}</div>${pageNav('today')}`;
  document.querySelector('#start')?.addEventListener('click', async event => { event.currentTarget.disabled = true; try { if (await start(day)) location.assign('/workout/'); } catch (error) { event.currentTarget.disabled = false; alert(error.message); } });
}
