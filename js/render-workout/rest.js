import {
  mount,
  state,
  runAction,
  primaryAction,
  exercisePicker,
  bindExercisePicker,
  supersetMetadataMarkup,
} from './shared.js';
import {
  continueRest,
  findNext,
  exerciseSelectionLocked,
  exerciseChangeAvailable,
  sessionBudgetState,
  formatDuration,
  undoLastSet,
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
  const changeButton = `<button class="secondary" id="change-exercises" type="button"${canChange ? '' : ' disabled'}>Change Exercises</button>`;
  const hasCompletedSet = active.tasks.some((task) => task.completed);
  const undoButton = `<button class="secondary" id="undo-set" type="button"${hasCompletedSet ? '' : ' disabled'}>Undo Last Set</button>`;
  const setCount = next
    ? `${supersetMetadataMarkup(active, next)}<p class="set-count">Set ${esc(next.set)} of ${esc(next.sets)}</p><p class="target-prescription">Target: ${esc(next.targetRepRange || next.reps)} reps · ${esc(next.targetRir || next.rir)} RIR</p>`
    : '';
  const budget = sessionBudgetState(active);
  mount(
    countdownStage({
      className: 'rest-stage',
      title: next ? next.performedName : 'Rest',
      metadata: `${setCount}<p class="session-budget${budget.capReached ? ' is-at-cap' : ''}">Session <time id="rest-session-elapsed">${formatDuration(budget.elapsedMs)}</time>${budget.capReached ? ' · 60:00 reached' : ''}</p>`,
      countdown: {
        remainingMs: active.restEndsAt - Date.now(),
        label: 'Rest remaining',
        variant: 'rest',
      },
      actions: `${primaryAction('continue', 'Continue')}${changeButton}${undoButton}`,
    }),
  );
  document
    .querySelector('#continue')
    ?.addEventListener('click', (event) => advance(event.currentTarget));
  document
    .querySelector('#change-exercises')
    ?.addEventListener('click', () => navigateTo('/workout/?view=exercises'));
  document
    .querySelector('#undo-set')
    ?.addEventListener('click', (event) => runAction(event.currentTarget, undoLastSet));
  bindCountdown({
    element: document.querySelector('#timer'),
    getEndAt: () => state()?.restEndsAt,
    shouldRun: () => state()?.phase === 'rest' && Boolean(state()?.restEndsAt),
    onEnd: () => buzz([35, 65, 35]),
  });
  const elapsed = document.querySelector('#rest-session-elapsed');
  const clock = setInterval(() => {
    if (!elapsed || !document.body.contains(elapsed) || !state()) return clearInterval(clock);
    const currentBudget = sessionBudgetState(state());
    elapsed.textContent = formatDuration(currentBudget.elapsedMs);
    document
      .querySelector('.session-budget')
      ?.classList.toggle('is-at-cap', currentBudget.capReached);
  }, 1000);
}
