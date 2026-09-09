import { mount, state, runAction, showError, workoutStage, primaryAction } from './shared.js';
import { completeStretch, countdown, formatDuration, setTimer } from '../workout.js';
import { STRETCH_MS } from '../constants.js';
import { buzz } from '../dom.js';

export function renderStretch() {
  const active = state();
  if (!active.timerEndsAt) {
    void setTimer(STRETCH_MS).then(() => renderStretch()).catch(showError);
    return;
  }
  if (active.timerEndsAt <= Date.now()) {
    void completeStretch().then(() => location.reload()).catch(showError);
    return;
  }
  mount(workoutStage({title: 'Stretch', body: `<div class="big-timer" id="timer" role="timer" aria-live="polite">${formatDuration(active.timerEndsAt - Date.now())}</div>`, actions: primaryAction('skip-stretch', 'Skip stretch')}));
  document.querySelector('#skip-stretch')?.addEventListener('click', event => runAction(event.currentTarget, completeStretch, () => location.reload()));
  countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', async () => { try { buzz([35, 70]); await completeStretch(); location.reload(); } catch (error) { showError(error); } });
}
