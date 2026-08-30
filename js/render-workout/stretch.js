import { mount, state } from './shared.js';
import { STRETCH_MS } from '../constants.js';
import { setTimer, completeStretch, countdown } from '../workout.js';
import { buzz } from '../dom.js';
export function renderStretch() { const a = state(), running = a.timerEndsAt > Date.now(); mount(`<div class="workout-stage"><div class="stage-info"><h1>Stretch</h1><div class="big-timer" id="timer">0:30</div></div><div class="thumb-zone"><button class="primary" id="repeat">${running ? 'Repeat 30 sec' : 'Start 30 sec'}</button><button id="finish-stretch">Finish</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`); document.querySelector('#repeat').onclick = () => { setTimer(STRETCH_MS); location.reload(); }; document.querySelector('#finish-stretch').onclick = () => { completeStretch(); location.reload(); }; if (running) countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', () => { buzz([35, 70]); location.reload(); }); }
