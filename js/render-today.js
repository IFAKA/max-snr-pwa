import { app, bindHoldScroll, bindTitleMarquee, dayNow, icon, listMarkup, titleMarkup } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { startRow, bindStartDialog } from './render-workout/shared.js';

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

export function isCurrentDayComplete(history, day, now = new Date()) {
  const today = localDateKey(now);
  return history.some(workout => workout.day === day && localDateKey(workout.completedAt) === today);
}

function showCompletionConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti';
  container.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 24; index++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--confetti-x', `${Math.round(Math.random() * 100)}vw`);
    piece.style.setProperty('--confetti-delay', `${Math.round(Math.random() * 220)}ms`);
    piece.style.setProperty('--confetti-rotate', `${Math.round(Math.random() * 360)}deg`);
    container.append(piece);
  }
  document.body.append(container);
  setTimeout(() => container.remove(), 1800);
}

export function renderToday() {
  const state = getState(), day = dayNow(), routine = ROUTINE[day], active = state.active;
  const title = routine ? NAMES[day] : 'Rest';
  const complete = !active && isCurrentDayComplete(state.history, day);
  const startItem = complete
    ? '<li class="complete-row"><div class="list-link" role="status"><span>Done</span>' + icon('check', 'Workout complete') + '</div></li>'
    : active
    ? `<li><a class="list-link" href="/workout/"><span>Continue</span>${icon('chevron', 'Continue')}</a></li>`
    : routine
      ? startRow(day)
      : `<li><button class="list-link is-disabled" type="button" disabled><span>Start</span>${icon('dash', 'Unavailable')}</button></li>`;
  app.innerHTML = `<section class="today-screen" aria-labelledby="today-title">${titleMarkup(title, 'today-title')}${listMarkup([startItem, `<li><a class="list-link" href="/routine/"><span>Routine</span>${icon('chevron', 'Open routine')}</a></li>`, `<li><a class="list-link" href="/history/"><span>History</span>${icon('chevron', 'Open history')}</a></li>`], 'navigation-list', 'Home navigation')}</section>`;
  bindHoldScroll();
  bindTitleMarquee();
  bindStartDialog();
  if (new URLSearchParams(location.search).get('completed') === '1') {
    history.replaceState(history.state, '', `${location.pathname}${location.hash}`);
    showCompletionConfetti();
  }
}
