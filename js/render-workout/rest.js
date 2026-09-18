import {
  mount,
  state,
  runAction,
  primaryAction,
  exercisePicker,
  bindExercisePicker,
} from './shared.js';
import {
  continueRest,
  findNext,
  exerciseSelectionLocked,
  exerciseChangeAvailable,
} from '../workout.js';
import { buzz, esc } from '../dom.js';
import { navigateTo } from '../navigation.js';
import { bindCountdown, countdownStage } from './countdown.js';

const advance = (button) => runAction(button, continueRest);

export function renderRest() {
  const active = state();
  if (new URLSearchParams(location.search).get('view') === 'exercises') {
    mount(exercisePicker(active));
    bindExercisePicker(active, () => navigateTo('/workout/'));
    return;
  }
  const nextPosition = Number.isInteger(active.nextPos) ? active.nextPos : findNext(-1, true);
  const next =
    active.tasks[nextPosition] ||
    active.tasks.find((task, index) => index > active.pos && !task.skipped) ||
    active.tasks[active.pos + 1];
  const canChange =
    active.phase === 'rest' && !exerciseSelectionLocked(active) && exerciseChangeAvailable(active);
  const changeButton = `<button class="secondary" id="change-exercises" type="button"${canChange ? '' : ' disabled'}>Change exercises</button>`;
  const setCount = next ? `<p class="set-count">Set ${esc(next.set)} of ${esc(next.sets)}</p>` : '';
  mount(
    countdownStage({
      className: 'rest-stage',
      title: next ? next.performedName : 'Rest',
      metadata: setCount,
      countdown: {
        remainingMs: active.restEndsAt - Date.now(),
        label: 'Rest remaining',
        variant: 'rest',
      },
      actions: `${primaryAction('continue', 'Continue')}${changeButton}`,
    }),
  );
  document
    .querySelector('#continue')
    ?.addEventListener('click', (event) => advance(event.currentTarget));
  document
    .querySelector('#change-exercises')
    ?.addEventListener('click', () => navigateTo('/workout/?view=exercises'));
  bindCountdown({
    element: document.querySelector('#timer'),
    getEndAt: () => state()?.restEndsAt,
    shouldRun: () => state()?.phase === 'rest' && Boolean(state()?.restEndsAt),
    onEnd: () => buzz([35, 65, 35]),
  });
}
