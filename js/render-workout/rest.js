import { mount, state, header, queue, runAction, showError, exitControls } from './shared.js';
import { continueRest, countdown, formatDuration, adjustRest, undoLastSet } from '../workout.js';
import { buzz, esc } from '../dom.js';

const advance = button => runAction(button, continueRest);

export function renderRest() {
  const active = state(), running = active.restEndsAt > Date.now();
  if (!running) { advance(null); return; }
  const next = active.tasks[active.nextPos];
  mount(`<div class="workout-stage"><div class="stage-info">${header(active)}${queue(active)}<p class="eyebrow">Recovery</p><h1>Rest</h1><div class="big-timer" id="timer" role="timer">${formatDuration(active.restEndsAt - Date.now())}</div><div class="timer-adjust"><button type="button" data-rest="-30000">−30 sec</button><button type="button" data-rest="30000">+30 sec</button></div><p class="next-up"><strong>Next:</strong> ${next ? `${esc(next.performedName)} · set ${esc(next.set)} of ${esc(next.sets)}` : 'Continue'}</p></div><div class="thumb-zone"><button class="primary" id="continue">End rest</button><button class="secondary-link" id="undo">Undo last completed set</button>${exitControls()}</div></div>`);
  document.querySelector('#continue').onclick = event => advance(event.currentTarget);
  document.querySelector('#undo').onclick = event => runAction(event.currentTarget, undoLastSet);
  document.querySelectorAll('[data-rest]').forEach(button => button.onclick = async () => { try { await adjustRest(Number(button.dataset.rest)); document.querySelector('#timer').textContent = formatDuration(active.restEndsAt - Date.now()); } catch (error) { showError(error); } });
  countdown(document.querySelector('#timer'), 'restEndsAt', 'rest', async () => { try { buzz([35, 65, 35]); await continueRest(); location.reload(); } catch (error) { showError(error); } });
}
