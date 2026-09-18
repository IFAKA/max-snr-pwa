import {
  mount,
  state,
  workoutStage,
  exercisePicker,
  bindExercisePicker,
  primaryAction,
} from './shared.js';
import { activeTask } from '../workout.js';
import { navigateTo } from '../navigation.js';

export function renderExerciseSelection() {
  const task = activeTask();
  if (!task) return;
  mount(
    workoutStage({
      className: 'exercise-selection-stage',
      title: task.performedName,
      body: '<p class="muted">Choose your first exercise.</p>',
      actions: `${primaryAction('continue-selection', 'Continue')}<button class="secondary" id="change-exercise" type="button">Change exercise</button>`,
    }),
  );
  document
    .querySelector('#continue-selection')
    ?.addEventListener('click', () => navigateTo('/workout/?view=exercise'));
  document
    .querySelector('#change-exercise')
    ?.addEventListener('click', () => navigateTo('/workout/?view=exercises&return=select'));
}

export function renderExercisePicker(onSelected) {
  const active = state();
  mount(exercisePicker(active));
  bindExercisePicker(active, onSelected);
}
