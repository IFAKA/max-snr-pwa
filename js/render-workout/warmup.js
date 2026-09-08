import { mount, state, runAction, workoutStage, primaryAction } from './shared.js';
import { startPlank } from '../workout.js';

export function renderWarmup() {
  if (!state()) return;
  mount(workoutStage({eyebrow: 'Step 1 of 3', title: 'Warm up', body: '<p class="muted">Get ready for your focused session.</p>', actions: primaryAction('plank', 'Start plank')}));
  document.querySelector('#plank')?.addEventListener('click', event => runAction(event.currentTarget, startPlank));
}
