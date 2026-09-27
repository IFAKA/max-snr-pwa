import { mount, state, runAction, showError, primaryAction } from './shared.js';
import { completeStretch, completeWorkout, setTimer } from '../workout.js';
import { STRETCH_MS } from '../constants.js';
import { buzz } from '../dom.js';
import { renderWithTransition } from '../navigation.js';
import { bindCountdown, countdownStage } from './countdown.js';

const finish = () => runAction(null, completeWorkout);

export async function renderStretch() {
  const active = state();
  if (!active.timerEndsAt) await setTimer(STRETCH_MS);
  const current = state();
  const running = Boolean(current.timerEndsAt && current.timerEndsAt > Date.now());

  if (current.timerEndsAt && !running) {
    void finish().catch(showError);
    return;
  }

  mount(
    countdownStage({
      className: 'stretch-stage',
      title: 'Stretch',
      countdown: {
        remainingMs: current.timerEndsAt - Date.now(),
        label: 'Stretch remaining',
        variant: 'stretch',
      },
      actions: `<div class="controls"><button class="secondary" id="cancel-stretch" type="button">Restart</button>${primaryAction('finish-stretch', 'Finish')}</div>`,
    }),
  );
  document
    .querySelector('#finish-stretch')
    ?.addEventListener('click', (event) => runAction(event.currentTarget, completeWorkout));
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
