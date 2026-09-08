import { state } from './render-workout/shared.js';
import { renderWarmup } from './render-workout/warmup.js';
import { renderPlank } from './render-workout/plank.js';
import { renderLifting } from './render-workout/lifting.js';
import { renderRest } from './render-workout/rest.js';
import { renderStretch } from './render-workout/stretch.js';
import { renderCompletion } from './render-workout/completion.js';
import { keepAwake } from './dom.js';
import { app, dayNow, esc } from './dom.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { start } from './workout.js';

function renderStart(day) {
  const items = ROUTINE[day];
  const content = items ? `<p class="context-label">${esc(day)}</p><h1>${esc(NAMES[day])}</h1><button class="primary" id="start" type="button">Start workout</button>` : `<p class="context-label">${esc(day)}</p><h1>Rest day</h1><p class="muted">Recover today.</p>`;
  app.innerHTML = `<div class="workout-stage setup-stage"><div class="stage-info">${content}</div></div>`;
  document.querySelector('#start')?.addEventListener('click', async event => { event.currentTarget.disabled = true; try { if (await start(day)) location.assign('/workout/'); } catch (error) { event.currentTarget.disabled = false; const message = document.createElement('p'); message.className = 'notice error'; message.textContent = error.message; event.currentTarget.after(message); } });
}

export function renderWorkout() {
  const a = state();
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (!a && requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return renderStart(requestedDay);
  if (!a) return location.assign('/');
  void keepAwake();
  ({warmup: renderWarmup, plank: renderPlank, lifting: renderLifting, rest: renderRest, stretch: renderStretch, complete: renderCompletion}[a.phase] || renderWarmup)();
}
