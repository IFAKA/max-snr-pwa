import { mount, state, runAction, showError, exitControls, workoutStage, primaryAction } from './shared.js';
import { completedSets, skippedSets, finishWorkout, countdown } from '../workout.js';
import { buzz } from '../dom.js';

function duration(start, end = new Date().toISOString()) { const minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000)); return `${minutes} min`; }

export function renderStretch() {
  const active = state(), running = active.timerEndsAt > Date.now();
  mount(workoutStage({eyebrow: 'Step 3 of 3 · Cool down', title: 'Stretch', body: `<div class="summary-grid"><div><strong>${completedSets()}</strong><span>Completed</span></div><div><strong>${skippedSets()}</strong><span>Skipped</span></div><div><strong>${duration(active.date, active.completedAt)}</strong><span>Duration</span></div></div><div class="big-timer" id="timer" role="timer" aria-live="polite">0:30</div>`, actions: `${primaryAction('finish', 'Save workout')}${exitControls()}`}));
  document.querySelector('#finish')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/')));
  if (running) countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', () => { try { buzz([35, 70]); location.reload(); } catch (error) { showError(error); } });
}
