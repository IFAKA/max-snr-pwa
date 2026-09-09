import { mount, state, runAction, showError, workoutStage, primaryAction } from './shared.js';
import { completeStretch, countdown, finishWorkout, formatDuration, setTimer } from '../workout.js';
import { STRETCH_MS } from '../constants.js';
import { buzz } from '../dom.js';
import { navigateTo, renderWithTransition } from '../navigation.js';

export function renderStretch() {
  const active = state();
  if (!active.timerEndsAt) {
    mount(
      workoutStage({
        className: 'stretch-stage countdown-stage',
        title: 'Stretch',
        body: '<div class="big-timer" aria-label="Stretch timer, 30 seconds">30</div>',
        actions: `<div class="controls">${primaryAction('start-stretch', 'Start')}<button class="secondary" id="finish-stretch" type="button">Finish</button></div>`,
      }),
    );
    document.querySelector('#start-stretch')?.addEventListener('click', (event) =>
      runAction(
        event.currentTarget,
        () => setTimer(STRETCH_MS),
        () => renderWithTransition(() => renderStretch()),
      ),
    );
    document
      .querySelector('#finish-stretch')
      ?.addEventListener('click', (event) =>
        runAction(event.currentTarget, finishWorkout, () =>
          navigateTo(`/?completed=1&day=${encodeURIComponent(active.day)}`),
        ),
      );
    return;
  }
  if (active.timerEndsAt <= Date.now()) {
    void completeStretch()
      .then(() => renderWithTransition(() => renderStretch()))
      .catch(showError);
    return;
  }
  mount(
    workoutStage({
      className: 'stretch-stage countdown-stage',
      title: 'Stretch',
      body: `<div class="big-timer" id="timer" role="timer" aria-live="polite">${formatDuration(active.timerEndsAt - Date.now())}</div>`,
      actions: '<button class="secondary" id="cancel-stretch" type="button">Cancel</button>',
    }),
  );
  document
    .querySelector('#cancel-stretch')
    ?.addEventListener('click', (event) =>
      runAction(event.currentTarget, completeStretch, () =>
        renderWithTransition(() => renderStretch()),
      ),
    );
  countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', async () => {
    try {
      buzz([35, 70]);
      await completeStretch();
      renderWithTransition(() => renderStretch(), { focus: false });
    } catch (error) {
      showError(error);
    }
  });
}
