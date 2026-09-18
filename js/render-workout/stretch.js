import { mount, state, runAction, showError, primaryAction } from './shared.js';
import { completeStretch, finishWorkout, setTimer } from '../workout.js';
import { STRETCH_MS } from '../constants.js';
import { buzz } from '../dom.js';
import { navigateTo, renderWithTransition } from '../navigation.js';
import { bindCountdown, countdownStage } from './countdown.js';

export function renderStretch() {
  const active = state();
  const running = Boolean(active.timerEndsAt && active.timerEndsAt > Date.now());
  const finish = () =>
    runAction(null, finishWorkout, () =>
      navigateTo(`/?completed=1&day=${encodeURIComponent(active.day)}`),
    );

  if (active.timerEndsAt && !running) {
    void finish().catch(showError);
    return;
  }

  mount(
    countdownStage({
      className: 'stretch-stage',
      title: 'Stretch',
      countdown: {
        remainingMs: running ? active.timerEndsAt - Date.now() : STRETCH_MS,
        label: running ? 'Stretch remaining' : 'Stretch timer, 30 seconds',
        variant: 'stretch',
      },
      actions: `<div class="controls">${running ? '<button class="secondary" id="cancel-stretch" type="button">Cancel</button>' : primaryAction('start-stretch', 'Start')}<button class="secondary" id="finish-stretch" type="button">Finish</button></div>`,
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
        await finish();
      } catch (error) {
        showError(error);
      }
    },
  });
}
