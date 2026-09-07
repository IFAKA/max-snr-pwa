import { app, esc, dayNow, pageNav, icon } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { start } from './workout.js';
import { routineMarkup } from './routine-view.js';

export function renderToday() {
  const day = dayNow(), state = getState(), routine = ROUTINE[day], active = state.active;
  const completed = active?.tasks?.filter(task => task.completed).length || 0;
  const routineSection = routine ? `<section class="today-routine" aria-labelledby="today-routine-title"><div class="today-routine-heading"><p class="eyebrow" id="today-routine-title">Today's routine</p><p class="muted">${esc(NAMES[day])} · ${routine.flatMap(item => item.type === 'exercise' ? Array(item.sets).fill(item) : (item.members || item.items).flatMap(exercise => Array(exercise.sets).fill(exercise))).length} sets</p></div>${routineMarkup(routine, 'today-routine-list')}</section>` : '<section class="today-rest"><p class="eyebrow">Today</p><p class="muted">Rest day</p></section>';
  const action = active ? `<div class="today-bottom-action"><p class="eyebrow">Workout in progress</p><p>${completed} of ${active.tasks.length} sets logged.</p><a class="button primary" href="/workout/">Resume</a></div>` : routine ? '<div class="today-bottom-action"><button class="primary" id="start">Start</button></div>' : '';
  app.innerHTML = `<div class="today-screen"><header class="page-header"><p class="eyebrow">Today</p><h1>${routine ? esc(NAMES[day]) : 'Rest day'}</h1></header>${routineSection}${action}</div>${pageNav('today')}`;
  document.querySelector('#start')?.addEventListener('click', async event => { event.currentTarget.disabled = true; try { if (await start(day)) location.assign('/workout/'); } catch (error) { event.currentTarget.disabled = false; alert(error.message); } });
}
