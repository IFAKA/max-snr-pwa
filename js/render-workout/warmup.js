import { mount, state, header } from './shared.js';
import { totalSets, startPlank } from '../workout.js';
export function renderWarmup() { const a = state(); mount(`<div class="workout-stage"><div class="stage-info">${header(a, `0/${totalSets()}`)}<h1>Warm up</h1></div><div class="thumb-zone"><button class="primary" id="ready">Done</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`); document.querySelector('#ready').onclick = () => { startPlank(); location.reload(); }; }
