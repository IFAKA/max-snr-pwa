import { mount, state, runAction, showError, primaryAction } from './shared.js';
import { completeStretch, finishWorkout, setTimer } from '../workout.js';
import { STRETCH_MS } from '../constants.js';
import { buzz } from '../dom.js';
import { navigateTo, renderWithTransition } from '../navigation.js';
import { bindCountdown, countdownStage } from './countdown.js';

export function renderStretch() {
  const active = state();
  if (!active.timerEndsAt) {
    mount(
      countdownStage({
        className: 'stretch-stage',
        title: 'Stretch',
        countdown: {
          remainingMs: STRETCH_MS,
          label: 'Stretch timer, 30 seconds',
          variant: 'stretch',
        },
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
    countdownStage({
      className: 'stretch-stage',
      title: 'Stretch',
      countdown: {
        remainingMs: active.timerEndsAt - Date.now(),
        label: 'Stretch remaining',
        variant: 'stretch',
      },
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
  bindCountdown({
    element: document.querySelector('#timer'),
    getEndAt: () => state()?.timerEndsAt,
    shouldRun: () => state()?.phase === 'stretch' && Boolean(state()?.timerEndsAt),
    onEnd: async () => {
      try {
        buzz([35, 70]);
        await completeStretch();
        renderWithTransition(() => renderStretch(), { focus: false });
      } catch (error) {
        showError(error);
      }
    },
  });
}
