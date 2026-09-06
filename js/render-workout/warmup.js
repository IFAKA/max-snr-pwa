import { mount, state, header, queue, runAction } from './shared.js';
import { totalSets, startPlank, beginLifting } from '../workout.js';

export function renderWarmup() {
  const active = state();
  mount(`<div class="workout-stage"><div class="stage-info">${header(active, `0/${totalSets()}`)}${queue(active)}<p class="eyebrow">Before the first set</p><h1>Warm up</h1><div class="instruction-card"><p>Move easily for 5–10 minutes, then do 1–3 lighter ramp-up sets for your first lift.</p><p class="muted">Warm-up sets are not counted in the workout.</p></div></div><div class="thumb-zone"><button class="primary" id="plank">Start 1-minute plank</button><button class="secondary" id="lifting">Skip plank · Start lifting</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`);
  document.querySelector('#plank').onclick = event => runAction(event.currentTarget, startPlank);
  document.querySelector('#lifting').onclick = event => runAction(event.currentTarget, beginLifting);
}
