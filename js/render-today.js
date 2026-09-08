import { app, esc, dayNow, listMarkup } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { startRow, bindStartDialog } from './render-workout/shared.js';

export function renderToday() {
  const day = dayNow(), routine = ROUTINE[day], active = getState().active;
  const title = routine ? NAMES[day] : 'Rest day';
  const startItem = active
    ? '<li><a class="list-link" href="/workout/"><span>Continue</span><span aria-hidden="true">›</span></a></li>'
    : routine
      ? startRow(day)
      : '<li><button class="list-link is-disabled" type="button" disabled><span>Start</span><span aria-hidden="true">—</span></button></li>';
  app.innerHTML = `<section class="today-screen" aria-labelledby="today-title"><h1 id="today-title">${esc(title)}</h1>${listMarkup([startItem, '<li><a class="list-link" href="/routine/"><span>Routine</span><span aria-hidden="true">›</span></a></li>', '<li><a class="list-link" href="/history/"><span>History</span><span aria-hidden="true">›</span></a></li>'], 'navigation-list', 'Today navigation')}</section>`;
  bindStartDialog();
}
