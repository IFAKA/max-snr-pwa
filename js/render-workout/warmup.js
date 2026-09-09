import { mount, state, runAction, workoutStage, primaryAction } from './shared.js';
import { startPlank } from '../workout.js';

export function renderWarmup() {
  if (!state()) return;
  mount(workoutStage({ title: 'Warm up', actions: primaryAction('plank', 'Start plank') }));
  document
    .querySelector('#plank')
    ?.addEventListener('click', (event) => runAction(event.currentTarget, startPlank));
}
