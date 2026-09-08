import { mount, state, runAction, exitControls } from './shared.js';
import { startPlank } from '../workout.js';

export function renderWarmup() {
  if (!state()) return;
  mount(`<div class="workout-stage"><div class="stage-info"><p class="context-label">Step 1 of 3</p><h1>Warm up</h1><p class="muted">Get ready for your focused session.</p></div><div class="thumb-zone"><button class="primary" id="plank">Start plank</button>${exitControls()}</div></div>`);
  document.querySelector('#plank')?.addEventListener('click', event => runAction(event.currentTarget, startPlank));
}
