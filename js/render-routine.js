import { app, esc, pageNav, icon } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten } from './workout.js';
import { routineMarkup } from './routine-view.js';

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  const ordered = Object.entries(ROUTINE).sort(([a], [b]) => (a === today ? -1 : b === today ? 1 : 0));
  app.innerHTML = `<header class="page-header"><p class="eyebrow">Routine</p><h1>This week</h1></header><a class="history-link icon-link" href="/" aria-label="Back to Today">${icon('arrowLeft', 'Back to Today')}</a><div class="routine-list">${ordered.map(([day, items]) => items ? `<details class="routine-day ${day === today ? 'today' : ''}" ${day === today ? 'open' : ''}><summary><span><strong>${day === today ? 'Today · ' : ''}${esc(day)}</strong><small>${esc(NAMES[day])} · ${flatten(items).length} sets</small></span></summary>${routineMarkup(items)}</details>` : `<details class="routine-day rest"><summary><span><strong>${day === today ? 'Today · ' : ''}${day}</strong><small>Rest day</small></span><span class="muted">Recovery</span></summary></details>`).join('')}</div>${pageNav('routine')}`;
}
