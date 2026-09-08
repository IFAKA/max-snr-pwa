import { mount, state, runAction, showError, workoutStage, primaryAction } from './shared.js';
import { finishWorkout, countdown } from '../workout.js';
import { buzz } from '../dom.js';

export function renderStretch() {
  const active = state(), running = active.timerEndsAt > Date.now();
  mount(workoutStage({title: 'Stretch', body: '<div class="big-timer" id="timer" role="timer" aria-live="polite">0:30</div>', actions: primaryAction('finish', 'Save workout')}));
  document.querySelector('#finish')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/')));
  if (running) countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', () => { try { buzz([35, 70]); location.reload(); } catch (error) { showError(error); } });
}
