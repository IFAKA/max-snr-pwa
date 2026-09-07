import { mount, state, queue, runAction, showError, exitControls } from './shared.js';
import { skipPlank, beginLifting, countdown } from '../workout.js';
import { buzz } from '../dom.js';

export function renderPlank() {
  const active = state(), running = active.timerEndsAt > Date.now();
  if (!running) {
    void runAction(null, beginLifting);
    return;
  }
  mount(`<div class="workout-stage"><div class="stage-info">${queue(active)}<h1>Plank</h1><div class="big-timer" id="timer" role="timer">1:00</div></div><div class="thumb-zone"><button class="primary" id="skip-plank">Finish plank</button>${exitControls()}</div></div>`);
  document.querySelector('#skip-plank')?.addEventListener('click', event => runAction(event.currentTarget, skipPlank));
  countdown(document.querySelector('#timer'), 'timerEndsAt', 'plank', async () => { try { buzz([35, 70]); await beginLifting(); location.reload(); } catch (error) { showError(error); } });
}
