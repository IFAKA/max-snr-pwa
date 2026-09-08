import { app, bindHoldScroll, esc, dayNow, icon, listMarkup } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { startRow, bindStartDialog } from './render-workout/shared.js';

export function renderToday() {
  const day = dayNow(), routine = ROUTINE[day], active = getState().active;
  const title = routine ? NAMES[day] : 'Rest';
  const startItem = active
    ? `<li><a class="list-link" href="/workout/"><span>Continue</span>${icon('chevron', 'Continue')}</a></li>`
    : routine
      ? startRow(day)
      : `<li><button class="list-link is-disabled" type="button" disabled><span>Start</span>${icon('dash', 'Unavailable')}</button></li>`;
  app.innerHTML = `<section class="today-screen" aria-labelledby="today-title"><h1 id="today-title">${esc(title)}</h1>${listMarkup([startItem, `<li><a class="list-link" href="/routine/"><span>Routine</span>${icon('chevron', 'Open routine')}</a></li>`, `<li><a class="list-link" href="/history/"><span>History</span>${icon('chevron', 'Open history')}</a></li>`], 'navigation-list', 'Home navigation')}</section>`;
  bindHoldScroll();
  bindStartDialog();
}
