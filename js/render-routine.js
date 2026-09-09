import { app, bindHoldScroll, bindTitleMarquee, esc, icon, listMarkup, titleMarkup } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { routineMarkup } from './routine-view.js';
import { startRow, bindStartDialog } from './render-workout/shared.js';

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  const params = new URLSearchParams(location.search);
  const requestedDay = params.get('day');
  if (requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return params.get('view') === 'exercises' ? renderExercises(requestedDay) : renderDay(requestedDay);
  const days = Object.entries(ROUTINE).map(([day, items]) => items
    ? `<li class="${day === today ? 'today' : ''}"><a class="list-link" href="/routine/?day=${encodeURIComponent(day)}"><span data-hold-scroll><span class="hold-scroll-text">${esc(day)}</span>${day === today ? '<small class="day-indicator" aria-label="Current day"></small>' : ''}</span>${icon('chevron', 'Open day')}</a></li>`
    : `<li class="rest-day"><button class="list-link is-disabled" type="button" disabled><span data-hold-scroll><span class="hold-scroll-text">${esc(day)} · Rest</span></span>${icon('dash', 'Rest day')}</button></li>`);
  app.innerHTML = `<section aria-labelledby="routine-title">${titleMarkup('Routine', 'routine-title')}${listMarkup(days, 'routine-list', 'Routine days')}</section>`;
  bindHoldScroll();
  bindTitleMarquee();
}

function renderDay(day) {
  const items = ROUTINE[day];
  const rows = items ? [`<li><a class="list-link" href="?day=${encodeURIComponent(day)}&view=exercises"><span>Exercises</span>${icon('chevron', 'Open exercises')}</a></li>`, startRow(day)] : [`<li><button class="list-link is-disabled" type="button" disabled><span>Start</span>${icon('dash', 'Unavailable')}</button></li>`];
  app.innerHTML = `<section aria-labelledby="day-title">${titleMarkup(NAMES[day] || 'Rest', 'day-title')}${listMarkup(rows, 'navigation-list', 'Workout actions')}</section>`;
  bindStartDialog();
  bindHoldScroll();
  bindTitleMarquee();
}

function renderExercises(day) {
  const items = ROUTINE[day];
  app.innerHTML = `<section aria-labelledby="exercise-title">${titleMarkup('Exercises', 'exercise-title')}${routineMarkup(items)}</section>`;
  bindHoldScroll();
  bindTitleMarquee();
}
