import { app, esc, listMarkup } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten } from './workout.js';
import { routineMarkup } from './routine-view.js';

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return renderDay(requestedDay);
  const days = Object.entries(ROUTINE).map(([day, items]) => `<li class="${day === today ? 'today' : ''}"><a class="list-link" href="/routine/?day=${encodeURIComponent(day)}"><span><strong>${day === today ? 'Today · ' : ''}${esc(day)}</strong><small>${items ? `${esc(NAMES[day])} · ${flatten(items).length} sets` : 'Rest day'}</small></span><span aria-hidden="true">›</span></a></li>`);
  app.innerHTML = `<section aria-labelledby="routine-title"><h1 id="routine-title">Routine</h1>${listMarkup(days, 'routine-list', 'Routine days')}</section>`;
}

function renderDay(day) {
  const items = ROUTINE[day];
  app.innerHTML = `<section aria-labelledby="day-title"><a class="back-link" href="/routine/">Routine</a><h1 id="day-title">${esc(NAMES[day] || 'Rest day')}</h1>${items ? `${routineMarkup(items)}<a class="button primary" href="/workout/?day=${encodeURIComponent(day)}&confirm=1">Start</a>` : '<p class="notice">Rest and recover today.</p>'}</section>`;
}
