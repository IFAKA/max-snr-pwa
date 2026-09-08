import { mount, state, runAction, showError, workoutStage, primaryAction } from './shared.js';
import { skipPlank, beginLifting, countdown } from '../workout.js';
import { buzz } from '../dom.js';

export function renderPlank() {
  const active = state(), running = active.timerEndsAt > Date.now();
  if (!running) {
    void runAction(null, beginLifting);
    return;
  }
  mount(workoutStage({eyebrow: 'Step 2 of 3 · Timer', title: 'Plank', body: '<div class="big-timer" id="timer" role="timer" aria-live="polite">1:00</div>', actions: primaryAction('skip-plank', 'Finish plank')}));
  document.querySelector('#skip-plank')?.addEventListener('click', event => runAction(event.currentTarget, skipPlank));
  countdown(document.querySelector('#timer'), 'timerEndsAt', 'plank', async () => { try { buzz([35, 70]); await beginLifting(); location.reload(); } catch (error) { showError(error); } });
}
