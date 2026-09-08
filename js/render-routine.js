import { app, esc } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten } from './workout.js';
import { routineMarkup } from './routine-view.js';

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return renderDay(requestedDay);
  app.innerHTML = `<section aria-labelledby="routine-title"><header class="page-header"><p class="context-label">Plan</p><h1 id="routine-title">Routine</h1><p class="muted">Choose a day to see its workout.</p></header><ul class="routine-list" aria-label="Routine days">${Object.entries(ROUTINE).map(([day, items]) => `<li class="routine-day ${day === today ? 'today' : ''}"><a class="routine-day-link" href="/routine/?day=${encodeURIComponent(day)}"><span><strong>${day === today ? 'Today · ' : ''}${esc(day)}</strong><small>${items ? `${esc(NAMES[day])} · ${flatten(items).length} sets` : 'Rest day'}</small></span><span class="routine-day-action" aria-hidden="true">›</span></a></li>`).join('')}</ul></section>`;
}

function renderDay(day) {
  const items = ROUTINE[day];
  app.innerHTML = `<section aria-labelledby="day-title"><header class="page-header"><a class="back-link" href="/routine/">Routine</a><p class="context-label">${esc(day)}</p><h1 id="day-title">${esc(NAMES[day] || 'Rest day')}</h1></header>${items ? `<p class="muted">${flatten(items).length} sets · ${day === new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date()) ? 'Today' : 'Scheduled workout'}</p>${routineMarkup(items)}<a class="button primary" href="/workout/?day=${encodeURIComponent(day)}&confirm=1">Start</a>` : '<p class="notice">Rest and recover today.</p>'}</section>`;
}
