import { app, esc } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten, start } from './workout.js';

function routineItem(item) {
  if (item.type === 'exercise') return `<div class="routine-exercise"><span><span>${esc(item.name)}</span><small class="exercise-detail">${esc(item.station)}${item.alternatives?.length ? ` · Alternatives: ${esc(item.alternatives.join(', '))}` : ''}</small></span><span>${item.sets} × ${item.reps}</span></div>`;
  const members = item.members || item.items;
  const kind = item.type === 'superset' ? 'Superset · alternate A/B' : 'Equipment block · stay at one station';
  return `<div class="routine-group ${item.type === 'superset' ? 'superset' : 'block'}"><p class="group-label">${esc(item.label)}</p><p class="muted group-help">${kind}</p>${members.map((exercise, index) => `<div class="routine-exercise"><span>${item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : ''}${esc(exercise.name)}</span><span>${exercise.sets} × ${exercise.reps}</span></div>`).join('')}</div>`;
}

export function renderRoutine() {
  const active = getState().active;
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  const ordered = Object.entries(ROUTINE).sort(([a], [b]) => (a === today ? -1 : b === today ? 1 : 0));
  app.innerHTML = `<header class="page-header"><h1>Routine</h1><p class="lede">Today first. Open a day to see its exercises and start it.</p></header>${active ? `<section class="active-card"><p class="eyebrow">In progress</p><h2>${esc(active.name)}</h2><p class="muted">Resume where you left off.</p><a class="button primary" href="/workout/">Resume workout</a></section>` : ''}${ordered.map(([day, items]) => items ? `<details class="routine-day ${day === today ? 'today' : ''}" ${day === today ? 'open' : ''}><summary><span><strong>${day === today ? 'Today · ' : ''}${esc(day)}</strong><small>${esc(NAMES[day])} · ${flatten(items).length} sets</small></span></summary><div class="routine-day-actions"><button type="button" data-day="${day}">${active ? 'Replace active workout' : 'Start workout'}</button></div><div class="routine-list">${items.map(routineItem).join('')}</div></details>` : `<details class="routine-day rest"><summary><span><strong>${day === today ? 'Today · ' : ''}${day}</strong><small>Rest day</small></span><span class="muted">Recovery</span></summary><p class="muted">No working sets planned.</p></details>`).join('')}`;
  document.querySelectorAll('[data-day]').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try { if (await start(button.dataset.day)) location.assign('/workout/'); else button.disabled = false; }
    catch (error) { button.disabled = false; alert(error.message); }
  });
}
