import { mount, state, queue, runAction, showError, exitControls } from './shared.js';
import { continueRest, countdown, formatDuration, findNext } from '../workout.js';
import { buzz, esc } from '../dom.js';

const advance = button => runAction(button, continueRest);

export function renderRest() {
  const active = state(), running = active.restEndsAt > Date.now();
  if (!running) { advance(null); return; }
  const nextPosition = Number.isInteger(active.nextPos) ? active.nextPos : findNext(-1, true);
  const next = active.tasks[nextPosition] || active.tasks.find((task, index) => index > active.pos && !task.skipped) || active.tasks[active.pos + 1];
  const betweenSets = next && active.tasks[active.pos]?.exerciseId === next.exerciseId;
  const nextLabel = betweenSets ? 'Next set' : 'Next exercise';
  const nextMarkup = next ? `${esc(next.performedName)} · set ${esc(next.set)} of ${esc(next.sets)}` : 'Choose an exercise from More';
  mount(`<div class="workout-stage"><div class="stage-info">${queue(active)}<h1>Rest</h1><div class="big-timer" id="timer" role="timer" aria-label="Rest remaining">${formatDuration(active.restEndsAt - Date.now())}</div><p class="next-up"><span>${nextLabel}</span>${nextMarkup}</p></div><div class="thumb-zone"><button class="primary" id="continue">End rest</button>${exitControls()}</div></div>`);
  document.querySelector('#continue')?.addEventListener('click', event => advance(event.currentTarget));
  countdown(document.querySelector('#timer'), 'restEndsAt', 'rest', async () => { try { buzz([35, 65, 35]); await continueRest(); location.reload(); } catch (error) { showError(error); } });
}
