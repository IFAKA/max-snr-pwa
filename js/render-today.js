import { app, esc, dayNow } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { start } from './workout.js';

const DAYS = Object.keys(ROUTINE);

function nextWorkout(day) {
  const today = DAYS.indexOf(day);
  for (let offset = 1; offset <= DAYS.length; offset++) {
    const nextDay = DAYS[(today + offset) % DAYS.length];
    if (ROUTINE[nextDay]) return {day: nextDay, name: NAMES[nextDay]};
  }
  return null;
}

export function renderToday() {
  const day = dayNow(), state = getState(), routine = ROUTINE[day], next = nextWorkout(day);
  const active = state.active;
  const completed = active?.tasks?.filter(task => task.completed).length || 0;
  const skipped = active?.tasks?.filter(task => task.skipped).length || 0;
  const elapsed = active ? Math.max(1, Math.round((Date.now() - Date.parse(active.date)) / 60000)) : 0;
  const activeCard = active ? `<section class="active-card"><p class="eyebrow">In progress</p><h2>${esc(active.name)}</h2><p>${completed}/${active.tasks.length} working sets${skipped ? ` · ${skipped} skipped` : ''} · ${elapsed} min · ${esc(active.phase)}</p><a class="button primary" href="/workout/">Resume workout</a></section>` : '';
  const restDescription = next ? `Recover today. Next up: ${esc(next.day)} · ${esc(next.name)}.` : 'Recover today.';
  const startButton = routine ? '<button class="primary" id="start">Start today’s workout</button>' : next ? `<button class="primary" id="start-next">Start ${esc(next.day)}’s ${esc(next.name)}</button>` : '';
  app.innerHTML = `<header class="page-header"><p class="eyebrow">${esc(day)}</p><h1>${routine ? esc(NAMES[day]) : 'Rest day'}</h1><p class="lede">${routine ? `${routine.length} exercise blocks plus an optional plank and cooldown.` : restDescription}</p></header>${activeCard}${!active ? startButton : ''}`;
  document.querySelector('#start')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { if (await start(day)) location.assign('/workout/'); }
    catch (error) { event.currentTarget.disabled = false; alert(error.message); }
  });
  document.querySelector('#start-next')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { if (await start(next.day)) location.assign('/workout/'); }
    catch (error) { event.currentTarget.disabled = false; alert(error.message); }
  });
}
