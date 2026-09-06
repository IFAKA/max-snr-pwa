import { mount, state, header, queue, runAction, showError } from './shared.js';
import { STRETCH_MS } from '../constants.js';
import { completedSets, totalSets, skippedSets, setTimer, completeStretch, countdown, undoLastSet } from '../workout.js';
import { buzz } from '../dom.js';

export function renderStretch() {
  const active = state(), running = active.timerEndsAt > Date.now();
  mount(`<div class="workout-stage"><div class="stage-info">${header(active, `${completedSets()}/${totalSets()}`)}${queue(active)}<p class="eyebrow">Optional cooldown</p><h1>Stretch</h1><p class="muted">${completedSets()} completed${skippedSets() ? ` · ${skippedSets()} skipped` : ''}</p><div class="big-timer" id="timer" role="timer">${running ? '0:30' : '0:30'}</div></div><div class="thumb-zone"><button class="primary" id="repeat">${running ? 'Restart 30-second timer' : 'Start 30-second timer'}</button><button class="secondary" id="finish-stretch">Review workout</button><button class="secondary-link" id="undo">Undo last completed set</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`);
  document.querySelector('#repeat').onclick = event => runAction(event.currentTarget, () => setTimer(STRETCH_MS));
  document.querySelector('#finish-stretch').onclick = event => runAction(event.currentTarget, completeStretch);
  document.querySelector('#undo').onclick = event => runAction(event.currentTarget, undoLastSet);
  if (running) countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', () => { try { buzz([35, 70]); location.reload(); } catch (error) { showError(error); } });
}
