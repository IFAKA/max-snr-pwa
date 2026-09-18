import {
  mount,
  state,
  runAction,
  showError,
  primaryAction,
  exercisePicker,
  bindExercisePicker,
} from './shared.js';
import { continueRest, findNext, exerciseSelectionLocked } from '../workout.js';
import { buzz, esc, icon, listMarkup } from '../dom.js';
import { navigateTo } from '../navigation.js';
import { bindCountdown, countdownStage } from './countdown.js';

const advance = (button) => runAction(button, continueRest);

export function renderRest() {
  const active = state(),
    running = active.restEndsAt > Date.now();
  if (!running) {
    advance(null);
    return;
  }
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
  const canChange = active.phase === 'rest' && !exerciseSelectionLocked(active);
  const changeLink = canChange
    ? listMarkup(
        [
          `<li><a class="list-link stage-link" href="/workout/?view=exercises"><span>Change exercise</span>${icon('chevron', 'Change exercise')}</a></li>`,
        ],
        '',
        'Workout options',
      )
    : '';
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
      actions: `${changeLink}${primaryAction('continue', 'End rest')}`,
    }),
  );
  document
    .querySelector('#continue')
    ?.addEventListener('click', (event) => advance(event.currentTarget));
  bindCountdown({
    element: document.querySelector('#timer'),
    getEndAt: () => state()?.restEndsAt,
    shouldRun: () => state()?.phase === 'rest' && Boolean(state()?.restEndsAt),
    onEnd: async () => {
      try {
        buzz([35, 65, 35]);
        await continueRest();
        location.reload();
      } catch (error) {
        showError(error);
      }
    },
  });
}
