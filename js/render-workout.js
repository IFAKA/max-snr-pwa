import {
  state,
  startRow,
  bindStartDialog,
  configureWorkoutNavigation,
} from './render-workout/shared.js';
import { renderWarmup } from './render-workout/warmup.js';
import { renderLifting } from './render-workout/lifting.js';
import { renderPlank } from './render-workout/plank.js';
import { renderRest } from './render-workout/rest.js';
import { renderStretch } from './render-workout/stretch.js';
import { renderCompletion } from './render-workout/completion.js';
import { renderExerciseSelection, renderExercisePicker } from './render-workout/select.js';
import { bindViewInteractions, keepAwake } from './dom.js';
import { app, listMarkup, titleMarkup } from './dom.js';
import { isWorkoutDay, configuredDays, workoutName } from './routine-data.js';
import { navigateTo } from './navigation.js';
import { renderActivity } from './render-activity.js';

function renderStart(day) {
  const available = isWorkoutDay(day);
  app.innerHTML = `<section aria-labelledby="start-title">${titleMarkup(available ? workoutName(day) : 'Rest', 'start-title')}${available ? listMarkup([startRow(day)], '', 'Workout actions') : '<p class="notice">Rest</p>'}</section>`;
  bindStartDialog();
  bindViewInteractions();
}

export function renderWorkout() {
  const a = state();
  const params = new URLSearchParams(location.search);
  const activity = params.get('activity');
  if (activity && !a) return renderActivity(activity);
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (!a && requestedDay && configuredDays().includes(requestedDay))
    return renderStart(requestedDay);
  if (!a) return navigateTo('/');
  configureWorkoutNavigation(renderWorkout);
  if (params.get('view') === 'exercises') {
    const firstExerciseNotStarted =
      a.phase === 'lifting' && !a.tasks.some((task) => task.completed);
    renderExercisePicker(() =>
      navigateTo(
        params.get('return') === 'select' || firstExerciseNotStarted
          ? '/workout/?view=exercise'
          : '/workout/',
      ),
    );
    return;
  }
  if (params.get('view') === 'select') {
    if (a.phase !== 'lifting' || a.tasks.some((task) => task.completed))
      return navigateTo('/workout/?view=exercise');
    return renderExerciseSelection();
  }
  if (params.get('view') === 'exercise') return renderLifting();
  if (a.phase === 'lifting' && !a.tasks.some((task) => task.completed))
    return renderExerciseSelection();
  void keepAwake();
  (
    ({
      warmup: renderWarmup,
      plank: renderPlank,
      lifting: renderLifting,
      rest: renderRest,
      stretch: renderStretch,
      complete: renderCompletion,
    })[a.phase] || renderWarmup
  )();
}
