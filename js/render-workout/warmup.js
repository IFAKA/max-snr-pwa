import { mount, state, runAction, workoutStage, primaryAction } from './shared.js';
import { beginLifting } from '../workout.js';
import { navigateTo } from '../navigation.js';

export function renderWarmup() {
  if (!state()) return;
  mount(
    workoutStage({ title: 'Ready', actions: primaryAction('begin-lifting', 'Choose exercise') }),
  );
  document
    .querySelector('#begin-lifting')
    ?.addEventListener('click', (event) =>
      runAction(event.currentTarget, beginLifting, () => navigateTo('/workout/?view=select')),
    );
}
