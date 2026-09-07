import { app, esc, dayNow } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { start } from './workout.js';

export function renderToday() {
  const day = dayNow(), state = getState(), routine = ROUTINE[day], active = state.active;
  const completed = active?.tasks?.filter(task => task.completed).length || 0;
  const startButton = routine ? '<button class="primary" id="start">Start</button>' : '<p class="muted">Rest day</p>';
  app.innerHTML = `<header class="page-header"><p class="eyebrow">Today</p><h1>${routine ? esc(NAMES[day]) : 'Rest day'}</h1></header>${active ? `<section class="today-action"><p class="eyebrow">Workout in progress</p><p>${completed} of ${active.tasks.length} sets logged.</p><a class="button primary" href="/workout/">Resume</a></section>` : `<section class="today-action">${startButton}</section>`}<div class="hub-links"><a href="/routine/"><span><strong>Routine</strong><small>See the week</small></span><span aria-hidden="true">→</span></a><a href="/history/"><span><strong>History</strong><small>Past workouts</small></span><span aria-hidden="true">→</span></a></div>`;
  document.querySelector('#start')?.addEventListener('click', async event => { event.currentTarget.disabled = true; try { if (await start(day)) location.assign('/workout/'); } catch (error) { event.currentTarget.disabled = false; alert(error.message); } });
}
