import { mount, state, runAction, showError, exitControls, exerciseProgress, renderDisclosure, workoutStage, primaryAction } from './shared.js';
import { adjustRest, continueRest, countdown, formatDuration, findNext } from '../workout.js';
import { buzz, esc } from '../dom.js';

const advance = button => runAction(button, continueRest);

export function renderRest() {
  const active = state(), running = active.restEndsAt > Date.now();
  if (!running) { advance(null); return; }
  const nextPosition = Number.isInteger(active.nextPos) ? active.nextPos : findNext(-1, true);
  const next = active.tasks[nextPosition] || active.tasks.find((task, index) => index > active.pos && !task.skipped) || active.tasks[active.pos + 1];
  const nextIndex = next ? active.tasks.indexOf(next) : -1;
  const progress = next ? `<div class="exercise-meta"><span class="sr-only">Next exercise progress</span>${exerciseProgress(active, nextIndex)}</div>` : '';
  const restDisclosure = renderDisclosure({id: 'rest-remaining', title: 'Adjust rest', content: '<p class="muted">Change the remaining rest time.</p><div class="choice-list"><button class="text-action" type="button" data-adjust-rest="-30">−30 seconds</button><button class="text-action" type="button" data-adjust-rest="30">+30 seconds</button><button class="text-action" type="button" data-adjust-rest="60">+1 minute</button></div>'});
  mount(workoutStage({className: 'rest-stage', eyebrow: 'Recovery · Next up', title: next ? esc(next.performedName) : 'Rest', body: `${progress}<div class="big-timer" id="timer" role="timer" aria-live="polite" aria-label="Rest remaining">${formatDuration(active.restEndsAt - Date.now())}</div>${restDisclosure}`, actions: `${primaryAction('continue', 'End rest')}${exitControls()}`}));
  document.querySelector('#continue')?.addEventListener('click', event => advance(event.currentTarget));
  document.querySelectorAll('[data-adjust-rest]').forEach(button => button.addEventListener('click', event => runAction(event.currentTarget, async () => {
    await adjustRest(Number(event.currentTarget.dataset.adjustRest) * 1000);
    return true;
  })));
  countdown(document.querySelector('#timer'), 'restEndsAt', 'rest', async () => { try { buzz([35, 65, 35]); await continueRest(); location.reload(); } catch (error) { showError(error); } });
}
