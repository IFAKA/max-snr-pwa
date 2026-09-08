import { state, exercisePicker, bindExercisePicker, startRow, bindStartDialog } from './render-workout/shared.js';
import { renderWarmup } from './render-workout/warmup.js';
import { renderPlank } from './render-workout/plank.js';
import { renderLifting } from './render-workout/lifting.js';
import { renderRest } from './render-workout/rest.js';
import { renderStretch } from './render-workout/stretch.js';
import { renderCompletion } from './render-workout/completion.js';
import { keepAwake } from './dom.js';
import { app, esc, listMarkup } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';

function renderStart(day) {
  const items = ROUTINE[day];
  app.innerHTML = `<section aria-labelledby="start-title"><h1 id="start-title">${esc(items ? NAMES[day] : 'Rest day')}</h1>${items ? listMarkup([startRow(day)], 'navigation-list', 'Workout actions') : '<p class="notice">Rest day</p>'}</section>`;
  bindStartDialog();
}

export function renderWorkout() {
  const a = state();
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (!a && requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return renderStart(requestedDay);
  if (!a) return location.assign('/');
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'exercises') {
    app.innerHTML = exercisePicker(a);
    bindExercisePicker(a);
    return;
  }
  void keepAwake();
  ({warmup: renderWarmup, plank: renderPlank, lifting: renderLifting, rest: renderRest, stretch: renderStretch, complete: renderCompletion}[a.phase] || renderWarmup)();
}
