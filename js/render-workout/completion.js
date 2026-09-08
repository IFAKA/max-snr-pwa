import { mount, runAction, workoutStage, primaryAction } from './shared.js';
import { finishWorkout } from '../workout.js';

export function renderCompletion() {
  mount(workoutStage({eyebrow: 'Workout complete', title: 'Ready to save', body: '<p class="muted">Your session is ready for history.</p>', actions: primaryAction('finish', 'Save workout')}));
  document.querySelector('#finish')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/')));
}
