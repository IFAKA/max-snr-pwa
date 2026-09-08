import { mount, state, runAction, showError, exitControls } from './shared.js';
import { continueRest, countdown, formatDuration, findNext } from '../workout.js';
import { buzz, esc } from '../dom.js';

const advance = button => runAction(button, continueRest);

export function renderRest() {
  const active = state(), running = active.restEndsAt > Date.now();
  if (!running) { advance(null); return; }
  const nextPosition = Number.isInteger(active.nextPos) ? active.nextPos : findNext(-1, true);
  const next = active.tasks[nextPosition] || active.tasks.find((task, index) => index > active.pos && !task.skipped) || active.tasks[active.pos + 1];
  mount(`<div class="workout-stage rest-stage"><div class="stage-info"><h1>${next ? esc(next.performedName) : 'Rest'}</h1><div class="big-timer" id="timer" role="timer" aria-label="Rest remaining">${formatDuration(active.restEndsAt - Date.now())}</div></div><div class="thumb-zone"><button class="primary" id="continue">End rest</button>${exitControls()}</div></div>`);
  document.querySelector('#continue')?.addEventListener('click', event => advance(event.currentTarget));
  countdown(document.querySelector('#timer'), 'restEndsAt', 'rest', async () => { try { buzz([35, 65, 35]); await continueRest(); location.reload(); } catch (error) { showError(error); } });
}
