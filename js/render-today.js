import {
  app,
  bindHoldScroll,
  bindTitleMarquee,
  dayNow,
  icon,
  listMarkup,
  titleMarkup,
} from './dom.js';
import { getState } from './state.js';
import { isWorkoutDay, workoutName } from './routine-data.js';
import { startRow, bindDirectStart } from './render-workout/shared.js';
import confetti from './vendor/canvas-confetti.js';

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

export function isCurrentDayComplete(history, day, now = new Date()) {
  const today = localDateKey(now);
  return history.some(
    (workout) => workout.day === day && localDateKey(workout.completedAt) === today,
  );
}

function showCompletionConfetti() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, disableForReducedMotion: true });
}

export function renderToday() {
  const state = getState(),
    params = new URLSearchParams(location.search),
    redirectDay = params.get('day');
  const day = params.get('completed') === '1' && isWorkoutDay(redirectDay) ? redirectDay : dayNow();
  const routine = isWorkoutDay(day),
    active = state.active;
  const title = routine ? workoutName(day) : 'Rest';
  const complete = !active && isCurrentDayComplete(state.history, day);
  const startItem = complete
    ? '<li class="complete-row" data-picker-exclude><div class="list-link" role="status"><span>Done</span>' +
      icon('check', 'Workout complete') +
      '</div></li>'
    : active
      ? `<li><a class="list-link" href="/workout/"><span>Continue</span>${icon('chevron', 'Continue')}</a></li>`
      : routine
        ? startRow(day)
        : `<li><button class="list-link is-disabled" type="button" disabled><span>Start</span>${icon('dash', 'Unavailable')}</button></li>`;
  app.innerHTML = `<section class="today-screen" aria-labelledby="today-title">${titleMarkup(title, 'today-title')}${listMarkup([startItem, `<li><a class="list-link" href="/routine/"><span>Routine</span>${icon('chevron', 'Open routine')}</a></li>`, `<li><a class="list-link" href="/history/"><span>History</span>${icon('chevron', 'Open history')}</a></li>`], 'navigation-list', 'Home navigation')}</section>`;
  bindHoldScroll();
  bindTitleMarquee();
  bindDirectStart();
  if (params.get('completed') === '1') {
    history.replaceState(history.state, '', `${location.pathname}${location.hash}`);
    showCompletionConfetti();
  }
}
