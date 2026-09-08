import { mount, state, runAction, exitControls, workoutStage, primaryAction } from './shared.js';
import { completedSets, skippedSets, finishWorkout } from '../workout.js';

function duration(start, end) { const minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000)); return `${minutes} min`; }

export function renderCompletion() {
  const active = state();
  mount(workoutStage({eyebrow: 'Workout complete', title: 'Ready to save', body: `<p class="muted">Your session is logged locally and ready for your history.</p><div class="summary-grid"><div><strong>${completedSets()}</strong><span>Completed</span></div><div><strong>${skippedSets()}</strong><span>Skipped</span></div><div><strong>${duration(active.date, active.completedAt)}</strong><span>Duration</span></div></div>`, actions: `${primaryAction('finish', 'Save workout')}${exitControls()}`}));
  document.querySelector('#finish')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/')));
}
