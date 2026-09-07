import { app, esc, dayNow } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { start, weeklyGoalSummary } from './workout.js';

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
  const activeCard = active ? `<section class="active-card" aria-labelledby="active-title"><div class="row"><div><p class="eyebrow">In progress</p><h2 id="active-title">${esc(active.name)}</h2></div><span class="status-pill">${esc(active.phase)}</span></div><p class="active-summary">${completed}/${active.tasks.length} sets${skipped ? ` · ${skipped} skipped` : ''} · ${elapsed} min</p><a class="button primary" href="/workout/">Resume workout</a></section>` : '';
  const week = weeklyGoalSummary(state);
  const weeklyLine = `<p class="weekly-line"><span><strong>This week</strong> · ${week.completed} of ${week.goal} workouts</span><span class="weekly-percent">${week.percentage}%</span></p>`;
  const restDescription = next ? `Recover today. Next up: ${esc(next.day)} · ${esc(next.name)}.` : 'Recover today.';
  const startButton = routine ? '<button class="primary" id="start">Start today’s workout</button>' : next ? `<button class="primary" id="start-next">Start ${esc(next.day)}’s ${esc(next.name)}</button>` : '';
  const focus = routine ? `${routine.length} blocks · ${routine.flatMap(item => item.members || item.items || [item]).reduce((sum, item) => sum + item.sets, 0)} working sets.` : restDescription;
  app.innerHTML = `<header class="page-header"><h1>${routine ? esc(NAMES[day]) : 'Rest day'}</h1><p class="lede">${routine ? `${routine.length} blocks · optional plank · cooldown.` : restDescription}</p></header>${activeCard}${!active ? `<section class="today-action"><p>${focus}</p>${startButton}</section>` : ''}${weeklyLine}<section class="hub-links" aria-label="Explore"><a href="/routine/"><span><strong>Routine</strong><small>See every day and exercise</small></span><span aria-hidden="true">→</span></a><a href="/history/"><span><strong>History</strong><small>Review saved workouts and data</small></span><span aria-hidden="true">→</span></a></section>`;
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
