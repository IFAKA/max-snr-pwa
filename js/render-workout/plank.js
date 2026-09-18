import { mount, state, runAction, showError, primaryAction } from './shared.js';
import { skipPlank, beginLifting } from '../workout.js';
import { buzz } from '../dom.js';
import { navigateTo } from '../navigation.js';
import { bindCountdown, countdownStage } from './countdown.js';

export function renderPlank() {
  const active = state(),
    running = active.timerEndsAt > Date.now();
  if (!running) {
    void runAction(null, beginLifting, () => navigateTo('/workout/?view=select'));
    return;
  }
  mount(
    countdownStage({
      title: 'Plank',
      countdown: {
        remainingMs: active.timerEndsAt - Date.now(),
        label: 'Plank remaining',
        variant: 'plank',
      },
      actions: primaryAction('skip-plank', 'Finish'),
    }),
  );
  document
    .querySelector('#skip-plank')
    ?.addEventListener('click', (event) =>
      runAction(event.currentTarget, skipPlank, () => navigateTo('/workout/?view=select')),
    );
  bindCountdown({
    element: document.querySelector('#timer'),
    getEndAt: () => state()?.timerEndsAt,
    shouldRun: () => state()?.phase === 'plank' && Boolean(state()?.timerEndsAt),
    onEnd: async () => {
      try {
        buzz([35, 70]);
        await beginLifting();
        navigateTo('/workout/?view=select');
      } catch (error) {
        showError(error);
      }
    },
  });
}
