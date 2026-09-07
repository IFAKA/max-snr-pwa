import { app, esc } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten } from './workout.js';

function routineItem(item) {
  if (item.type === 'exercise') return `<div class="routine-exercise"><span>${esc(item.name)}</span><span>${item.sets} × ${item.reps}</span></div>`;
  const members = item.members || item.items;
  return `<div class="routine-group ${item.type === 'superset' ? 'superset' : 'block'}"><p class="group-label">${esc(item.label)}</p>${members.map((exercise, index) => `<div class="routine-exercise"><span>${item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : ''}${esc(exercise.name)}</span><span>${exercise.sets} × ${exercise.reps}</span></div>`).join('')}</div>`;
}

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  const ordered = Object.entries(ROUTINE).sort(([a], [b]) => (a === today ? -1 : b === today ? 1 : 0));
  app.innerHTML = `<header class="page-header"><p class="eyebrow">Routine</p><h1>This week</h1><p class="lede">A quiet reference for what is planned.</p></header><a class="history-link" href="/">Back to Today <span aria-hidden="true">×</span></a><div class="routine-list">${ordered.map(([day, items]) => items ? `<details class="routine-day ${day === today ? 'today' : ''}" ${day === today ? 'open' : ''}><summary><span><strong>${day === today ? 'Today · ' : ''}${esc(day)}</strong><small>${esc(NAMES[day])} · ${flatten(items).length} sets</small></span></summary><div class="routine-list">${items.map(routineItem).join('')}</div></details>` : `<details class="routine-day rest"><summary><span><strong>${day === today ? 'Today · ' : ''}${day}</strong><small>Rest day</small></span><span class="muted">Recovery</span></summary></details>`).join('')}</div>`;
}
