import { mount, state, runAction, showError, exitControls } from './shared.js';
import { completedSets, skippedSets, finishWorkout, countdown } from '../workout.js';
import { buzz } from '../dom.js';

function duration(start, end = new Date().toISOString()) { const minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000)); return `${minutes} min`; }

export function renderStretch() {
  const active = state(), running = active.timerEndsAt > Date.now();
  mount(`<div class="workout-stage"><div class="stage-info"><p class="context-label">Step 3 of 3 · Cool down</p><h1>Stretch</h1><div class="summary-grid"><div><strong>${completedSets()}</strong><span>Completed</span></div><div><strong>${skippedSets()}</strong><span>Skipped</span></div><div><strong>${duration(active.date, active.completedAt)}</strong><span>Duration</span></div></div><div class="big-timer" id="timer" role="timer" aria-live="polite">${running ? '0:30' : '0:30'}</div></div><div class="thumb-zone"><button class="primary" id="finish">Save workout</button>${exitControls()}</div></div>`);
  document.querySelector('#finish')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/')));
  if (running) countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', () => { try { buzz([35, 70]); location.reload(); } catch (error) { showError(error); } });
}
