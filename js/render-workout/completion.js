import { mount, state, runAction, exitControls } from './shared.js';
import { completedSets, skippedSets, finishWorkout } from '../workout.js';

function duration(start, end) { const minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000)); return `${minutes} min`; }

export function renderCompletion() {
  const active = state();
  mount(`<div class="workout-stage"><div class="stage-info"><h1>Ready to save</h1><div class="summary-grid"><div><strong>${completedSets()}</strong><span>Completed</span></div><div><strong>${skippedSets()}</strong><span>Skipped</span></div><div><strong>${duration(active.date, active.completedAt)}</strong><span>Duration</span></div></div></div><div class="thumb-zone"><button class="primary" id="finish">Save workout</button>${exitControls()}</div></div>`);
  document.querySelector('#finish')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/')));
}
