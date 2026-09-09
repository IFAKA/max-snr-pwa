import { mount, state, runAction, showError, workoutStage, primaryAction } from './shared.js';
import { skipPlank, beginLifting, countdown } from '../workout.js';
import { buzz } from '../dom.js';
import { navigateTo } from '../navigation.js';

export function renderPlank() {
  const active = state(), running = active.timerEndsAt > Date.now();
  if (!running) {
    void runAction(null, beginLifting, () => navigateTo('/workout/?view=select'));
    return;
  }
  mount(workoutStage({className: 'countdown-stage', title: 'Plank', body: '<div class="big-timer" id="timer" role="timer" aria-live="polite">1:00</div>', actions: primaryAction('skip-plank', 'Finish')}));
  document.querySelector('#skip-plank')?.addEventListener('click', event => runAction(event.currentTarget, skipPlank, () => navigateTo('/workout/?view=select')));
  countdown(document.querySelector('#timer'), 'timerEndsAt', 'plank', async () => { try { buzz([35, 70]); await beginLifting(); navigateTo('/workout/?view=select'); } catch (error) { showError(error); } });
}
