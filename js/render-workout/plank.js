import { mount, state, header } from './shared.js';
import { totalSets, skipPlank, beginLifting, countdown } from '../workout.js';
import { buzz } from '../dom.js';
export function renderPlank() { const a = state(), running = a.timerEndsAt > Date.now(); mount(`<div class="workout-stage"><div class="stage-info">${header(a, `0/${totalSets()}`)}<h1>Plank</h1><div class="big-timer" id="timer">1:00</div></div><div class="thumb-zone"><button class="primary" id="skip-plank">Skip</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`); document.querySelector('#skip-plank').onclick = () => { skipPlank(); location.reload(); }; if (running) countdown(document.querySelector('#timer'), 'timerEndsAt', 'plank', () => { buzz([35, 70]); beginLifting(); location.reload(); }); }
