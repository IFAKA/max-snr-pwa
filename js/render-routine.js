import { app, esc, listMarkup } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { routineMarkup } from './routine-view.js';
import { startRow, bindStartDialog } from './render-workout/shared.js';

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
  const params = new URLSearchParams(location.search);
  const requestedDay = params.get('day');
  if (requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return params.get('view') === 'exercises' ? renderExercises(requestedDay) : renderDay(requestedDay);
  const days = Object.entries(ROUTINE).map(([day]) => `<li class="${day === today ? 'today' : ''}"><a class="list-link" href="/routine/?day=${encodeURIComponent(day)}"><span>${day === today ? 'Today · ' : ''}${esc(day)}</span><span aria-hidden="true">›</span></a></li>`);
  app.innerHTML = `<section aria-labelledby="routine-title"><h1 id="routine-title">Routine</h1>${listMarkup(days, 'routine-list', 'Routine days')}</section>`;
}

function renderDay(day) {
  const items = ROUTINE[day];
  const rows = items ? ['<li><a class="list-link" href="?day=' + encodeURIComponent(day) + '&view=exercises"><span>Exercises</span><span aria-hidden="true">›</span></a></li>', startRow(day)] : ['<li><button class="list-link is-disabled" type="button" disabled><span>Start</span><span aria-hidden="true">—</span></button></li>'];
  app.innerHTML = `<section aria-labelledby="day-title"><h1 id="day-title">${esc(NAMES[day] || 'Rest day')}</h1>${listMarkup(rows, 'navigation-list', 'Workout actions')}</section>`;
  bindStartDialog();
}

function renderExercises(day) {
  const items = ROUTINE[day];
  app.innerHTML = `<section aria-labelledby="exercise-title"><h1 id="exercise-title">Exercises</h1>${routineMarkup(items)}</section>`;
}
