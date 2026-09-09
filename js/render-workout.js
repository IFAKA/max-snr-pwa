import { state, startRow, bindStartDialog, titleMarquee } from './render-workout/shared.js';
import { renderWarmup } from './render-workout/warmup.js';
import { renderPlank } from './render-workout/plank.js';
import { renderLifting } from './render-workout/lifting.js';
import { renderRest } from './render-workout/rest.js';
import { renderStretch } from './render-workout/stretch.js';
import { renderCompletion } from './render-workout/completion.js';
import { renderExerciseSelection, renderExercisePicker } from './render-workout/select.js';
import { bindTitleMarquee, bindHoldScroll, keepAwake } from './dom.js';
import { app, esc, listMarkup } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';

function renderStart(day) {
  const items = ROUTINE[day];
  app.innerHTML = `<section aria-labelledby="start-title"><h1 id="start-title" data-title-marquee>${titleMarquee(esc(items ? NAMES[day] : 'Rest'))}</h1>${items ? listMarkup([startRow(day)], 'navigation-list', 'Workout actions') : '<p class="notice">Rest</p>'}</section>`;
  bindStartDialog();
  bindHoldScroll();
  bindTitleMarquee();
}

export function renderWorkout() {
  const a = state();
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (!a && requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return renderStart(requestedDay);
  if (!a) return location.assign('/');
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'exercises') {
    renderExercisePicker(() => location.assign(params.get('return') === 'select' ? '/workout/?view=exercise' : '/workout/'));
    return;
  }
  if (params.get('view') === 'select') {
    if (a.phase !== 'lifting' || a.tasks.some(task => task.completed)) return location.assign('/workout/?view=exercise');
    return renderExerciseSelection();
  }
  if (params.get('view') === 'exercise') return renderLifting();
  if (a.phase === 'lifting' && !a.tasks.some(task => task.completed)) return renderExerciseSelection();
  void keepAwake();
  ({warmup: renderWarmup, plank: renderPlank, lifting: renderLifting, rest: renderRest, stretch: renderStretch, complete: renderCompletion}[a.phase] || renderWarmup)();
}
