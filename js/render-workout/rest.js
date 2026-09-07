import { mount, state, queue, runAction, showError, exitControls } from './shared.js';
import { continueRest, countdown, formatDuration } from '../workout.js';
import { buzz, esc } from '../dom.js';

const advance = button => runAction(button, continueRest);

export function renderRest() {
  const active = state(), running = active.restEndsAt > Date.now();
  if (!running) { advance(null); return; }
  const next = active.tasks[active.nextPos];
  mount(`<div class="workout-stage"><div class="stage-info">${queue(active)}<h1>Rest</h1><div class="big-timer" id="timer" role="timer" aria-label="Rest remaining">${formatDuration(active.restEndsAt - Date.now())}</div><p class="next-up"><strong>Next:</strong> ${next ? `${esc(next.performedName)} · set ${esc(next.set)} of ${esc(next.sets)}` : 'Continue'}</p></div><div class="thumb-zone"><button class="primary" id="continue">End rest</button>${exitControls()}</div></div>`);
  document.querySelector('#continue')?.addEventListener('click', event => advance(event.currentTarget));
  countdown(document.querySelector('#timer'), 'restEndsAt', 'rest', async () => { try { buzz([35, 65, 35]); await continueRest(); location.reload(); } catch (error) { showError(error); } });
}
