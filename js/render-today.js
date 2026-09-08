import { app, esc, dayNow, listMarkup } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';

export function renderToday() {
  const day = dayNow(), routine = ROUTINE[day];
  const title = routine ? NAMES[day] : 'Rest day';
  app.innerHTML = `<section class="today-screen" aria-labelledby="today-title"><h1 id="today-title">${esc(title)}</h1>${listMarkup(['<li><a class="list-link" href="/routine/"><span>Routine</span><span aria-hidden="true">›</span></a></li>', '<li><a class="list-link" href="/history/"><span>History</span><span aria-hidden="true">›</span></a></li>'], 'navigation-list', 'Today navigation')}</section>`;
}
