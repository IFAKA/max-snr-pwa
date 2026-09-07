import { mount, state, header, queue, runAction, exitControls } from './shared.js';
import { startPlank, beginLifting } from '../workout.js';

export function renderWarmup() {
  const active = state();
  mount(`<div class="workout-stage"><div class="stage-info">${header(active)}${queue(active)}<p class="eyebrow">Before the first set</p><h1>Warm up</h1><div class="instruction-card"><p>Move easily for 5–10 minutes, then do 1–3 lighter ramp-up sets for your first lift.</p><p class="muted">Warm-up sets are not counted in the workout.</p></div></div><div class="thumb-zone"><button class="primary" id="plank">Start plank</button>${exitControls('<button class="text-action" id="lifting" type="button">Skip plank</button>')}</div></div>`);
  document.querySelector('#plank').onclick = event => runAction(event.currentTarget, startPlank);
  document.querySelector('#lifting').onclick = event => runAction(event.currentTarget, beginLifting);
}
