import { app, esc, dayNow } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { start } from './workout.js';
export function renderToday() { const day = dayNow(), S = getState(); if (!ROUTINE[day]) { app.innerHTML = `<h1>Rest day</h1>${S.active ? '<a class="button primary" href="/workout/">Resume</a>' : ''}`; return; } app.innerHTML = `<h1>${esc(NAMES[day])}</h1>${S.active ? '<a class="button primary" href="/workout/">Resume</a>' : '<button class="primary" id="start">Start</button>'}`; document.querySelector('#start')?.addEventListener('click', () => { if (start(day)) location.assign('/workout/'); }); }
