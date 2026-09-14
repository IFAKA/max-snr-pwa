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
import { persist } from './storage.js';
import { selectRecommendation } from './workout/health-optimizer.js';
import confetti from './vendor/canvas-confetti.js';
import { bindUpdateButton } from './update-app.js';

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
    active = state.active,
    recommendation = selectRecommendation(state, { day: routine ? day : '', now: new Date() });
  if (
    state.settings.recommendation?.type !== recommendation.type ||
    state.settings.recommendation?.score !== recommendation.score
  ) {
    state.settings.recommendation = {
      type: recommendation.type,
      score: recommendation.score,
      selectedAt: Date.now(),
    };
    void persist();
  }
  const title =
    active || recommendation.type === 'resistance' ? workoutName(day) : recommendation.title;
  const complete = !active && isCurrentDayComplete(state.history, day);
  const startItem = complete
    ? '<li class="complete-row" data-picker-skip><div class="list-link" role="status"><span>Done</span>' +
      icon('check', 'Workout complete') +
      '</div></li>'
    : active
      ? `<li><a class="list-link" href="/workout/"><span>Continue</span>${icon('chevron', 'Continue')}</a></li>`
      : recommendation.type === 'resistance' && routine
        ? startRow(day)
        : recommendation.type === 'rest'
          ? `<li><div class="list-link" role="status"><span>${recommendation.metric}</span>${icon('check', 'On track')}</div></li>`
          : `<li><a class="list-link" href="/workout/?activity=${encodeURIComponent(recommendation.type)}"><span>Start · ${recommendation.metric}</span>${icon('chevron', 'Start activity')}</a></li>`;
  const updateItem = `<li><button class="list-link app-update-button" id="update-app" type="button"><span class="app-update-label">Check for updates</span>${icon('reload', 'Check for app updates')}</button></li>`;
  app.innerHTML = `<section class="today-screen" aria-labelledby="today-title">${titleMarkup(title, 'today-title')}${listMarkup([startItem, `<li><a class="list-link" href="/routine/"><span>Routine</span>${icon('chevron', 'Open routine')}</a></li>`, `<li><a class="list-link" href="/history/"><span>History</span>${icon('chevron', 'Open history')}</a></li>`, updateItem], '', 'Home navigation')}<p id="app-update-status" class="app-update-status sr-only" role="status" aria-live="polite" aria-atomic="true"></p></section>`;
  bindHoldScroll();
  bindTitleMarquee();
  bindDirectStart();
  bindUpdateButton();
  if (params.get('completed') === '1') {
    history.replaceState(history.state, '', `${location.pathname}${location.hash}`);
    showCompletionConfetti();
  }
}
