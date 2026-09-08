import { mount, runAction, workoutStage, primaryAction } from './shared.js';
import { finishWorkout } from '../workout.js';

export function renderCompletion() {
  mount(workoutStage({title: 'Ready to save', actions: primaryAction('finish', 'Save workout')}));
  document.querySelector('#finish')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/')));
}
