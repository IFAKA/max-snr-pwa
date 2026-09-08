import { mount, state, runAction, showError, exitControls, exerciseProgress } from './shared.js';
import { adjustRest, continueRest, countdown, formatDuration, findNext } from '../workout.js';
import { buzz, esc } from '../dom.js';
import { closeSheet } from '../bottom-sheet.js';

const advance = button => runAction(button, continueRest);

export function renderRest() {
  const active = state(), running = active.restEndsAt > Date.now();
  if (!running) { advance(null); return; }
  const nextPosition = Number.isInteger(active.nextPos) ? active.nextPos : findNext(-1, true);
  const next = active.tasks[nextPosition] || active.tasks.find((task, index) => index > active.pos && !task.skipped) || active.tasks[active.pos + 1];
  const nextIndex = next ? active.tasks.indexOf(next) : -1;
  const progress = next ? `<div class="exercise-meta"><span class="sr-only">Next exercise progress</span>${exerciseProgress(active, nextIndex)}</div>` : '';
  const restSheet = `<div class="sheet-backdrop" id="rest-remaining-sheet-backdrop" data-sheet-backdrop="rest-remaining-sheet" hidden></div><section class="action-sheet" id="rest-remaining-sheet" data-sheet role="dialog" aria-modal="true" aria-labelledby="rest-remaining-sheet-title" aria-hidden="true" tabindex="-1" hidden><div class="sheet-content"><div class="sheet-header" data-sheet-handle><div class="sheet-handle" aria-hidden="true"></div><h2 id="rest-remaining-sheet-title">Adjust rest</h2></div><p class="muted">Change the remaining rest time.</p><div class="choice-list"><button class="text-action" type="button" data-adjust-rest="-30">−30 seconds</button><button class="text-action" type="button" data-adjust-rest="30">+30 seconds</button><button class="text-action" type="button" data-adjust-rest="60">+1 minute</button></div></div></section>`;
  mount(`<div class="workout-stage rest-stage"><div class="stage-info"><h1>${next ? esc(next.performedName) : 'Rest'}</h1>${progress}<button class="big-timer" id="timer" type="button" data-open-sheet="rest-remaining-sheet" aria-haspopup="dialog" aria-controls="rest-remaining-sheet" aria-label="Rest remaining. Tap to adjust.">${formatDuration(active.restEndsAt - Date.now())}</button>${restSheet}</div><div class="thumb-zone"><button class="primary" id="continue">End rest</button>${exitControls()}</div></div>`);
  document.querySelector('#continue')?.addEventListener('click', event => advance(event.currentTarget));
  document.querySelectorAll('[data-adjust-rest]').forEach(button => button.addEventListener('click', event => runAction(event.currentTarget, async () => {
    await adjustRest(Number(event.currentTarget.dataset.adjustRest) * 1000);
    closeSheet('rest-remaining-sheet');
    return true;
  })));
  countdown(document.querySelector('#timer'), 'restEndsAt', 'rest', async () => { try { buzz([35, 65, 35]); await continueRest(); location.reload(); } catch (error) { showError(error); } });
}
