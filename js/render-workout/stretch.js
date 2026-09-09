import { mount, state, runAction, showError, workoutStage, primaryAction } from './shared.js';
import { completeStretch, countdown, finishWorkout, formatDuration, setTimer } from '../workout.js';
import { STRETCH_MS } from '../constants.js';
import { buzz } from '../dom.js';

export function renderStretch() {
  const active = state();
  if (!active.timerEndsAt) {
    mount(workoutStage({className: 'stretch-stage', title: 'Stretch', body: '<div class="big-timer" aria-label="Stretch timer, 30 seconds">30</div>', actions: `<div class="controls">${primaryAction('start-stretch', 'Start')}<button class="secondary" id="finish-stretch" type="button">Finish</button></div>`}));
    document.querySelector('#start-stretch')?.addEventListener('click', event => runAction(event.currentTarget, () => setTimer(STRETCH_MS), renderStretch));
    document.querySelector('#finish-stretch')?.addEventListener('click', event => runAction(event.currentTarget, finishWorkout, () => location.assign(`/?completed=1&day=${encodeURIComponent(active.day)}`)));
    return;
  }
  if (active.timerEndsAt <= Date.now()) {
    void completeStretch().then(() => renderStretch()).catch(showError);
    return;
  }
  mount(workoutStage({className: 'stretch-stage', title: 'Stretch', body: `<div class="big-timer" id="timer" role="timer" aria-live="polite">${formatDuration(active.timerEndsAt - Date.now())}</div>`, actions: '<button class="secondary" id="cancel-stretch" type="button">Cancel</button>'}));
  document.querySelector('#cancel-stretch')?.addEventListener('click', event => runAction(event.currentTarget, completeStretch, renderStretch));
  countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', async () => { try { buzz([35, 70]); await completeStretch(); renderStretch(); } catch (error) { showError(error); } });
}
