import { mount, state, runAction, exitControls } from './shared.js';
import { startPlank, beginLifting } from '../workout.js';

export function renderWarmup() {
  if (!state()) return;
  mount('<div class="workout-stage"><div class="stage-info"><p class="eyebrow">Optional primer</p><h1>Warm up</h1><p class="meta">Move easily, then start your first set.</p></div><div class="thumb-zone"><button class="primary" id="plank">Start plank</button><button class="secondary" id="lifting" type="button">Skip</button>${exitControls()}</div></div>');
  document.querySelector('#plank')?.addEventListener('click', event => runAction(event.currentTarget, startPlank));
  document.querySelector('#lifting')?.addEventListener('click', event => runAction(event.currentTarget, beginLifting));
}
