import { app, esc, pageNav } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten } from './workout.js';
import { routineMarkup } from './routine-view.js';

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  app.innerHTML = `<header class="page-header"><h1>This week</h1></header><div class="routine-list">${Object.entries(ROUTINE).map(([day, items]) => items ? `<a class="routine-day routine-day-link ${day === today ? 'today' : ''}" href="/workout/?day=${encodeURIComponent(day)}"><span><strong>${day === today ? 'Today · ' : ''}${esc(day)}</strong><small>${esc(NAMES[day])} · ${flatten(items).length} sets</small></span><span class="routine-day-action" aria-hidden="true">›</span></a>` : `<a class="routine-day routine-day-link rest" href="/workout/?day=${encodeURIComponent(day)}"><span><strong>${day === today ? 'Today · ' : ''}${day}</strong><small>Rest day</small></span><span class="routine-day-action" aria-hidden="true">›</span></a>`).join('')}</div>${pageNav('routine')}`;
}
