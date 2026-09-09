import { mount, state, workoutStage, exercisePicker, bindExercisePicker } from './shared.js';
import { activeTask } from '../workout.js';
import { esc, icon, listMarkup } from '../dom.js';

export function renderExerciseSelection() {
  const task = activeTask();
  if (!task) return;
  const rows = [
    `<li><a class="list-link" href="/workout/?view=exercise"><span>Continue</span>${icon('chevron', 'Continue workout')}</a></li>`,
    `<li><a class="list-link" href="/workout/?view=exercises&return=select"><span>Change exercise</span>${icon('chevron', 'Change exercise')}</a></li>`,
  ];
  mount(
    workoutStage({
      className: 'exercise-selection-stage',
      title: esc(task.performedName),
      body: '<p class="muted">Choose your first exercise.</p>',
      actions: listMarkup(rows, 'stage-action-list', 'Workout options'),
    }),
  );
}

export function renderExercisePicker(onSelected) {
  const active = state();
  mount(exercisePicker(active));
  bindExercisePicker(active, onSelected);
}
