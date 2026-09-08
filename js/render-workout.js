import { state, exercisePicker, bindExercisePicker } from './render-workout/shared.js';
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
  const content = items ? `<a class="back-link" href="/routine/?day=${encodeURIComponent(day)}">Routine</a><h1>${esc(NAMES[day])}</h1><button class="primary" id="start" type="button">Start</button>` : `<a class="back-link" href="/routine/?day=${encodeURIComponent(day)}">Routine</a><h1>Rest day</h1>`;
  app.innerHTML = `<div class="workout-stage setup-stage"><div class="stage-info">${content}</div></div>`;
  document.querySelector('#start')?.addEventListener('click', () => document.querySelector('#start-dialog')?.showModal());
  if (items) {
    const dialog = document.createElement('dialog');
    dialog.id = 'start-dialog';
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `<form method="dialog"><h2>Start?</h2><div class="dialog-actions"><button value="cancel">Cancel</button><button class="primary" id="confirm-start" value="default">Start</button></div></form>`;
    document.body.append(dialog);
    if (new URLSearchParams(location.search).get('confirm') === '1') dialog.showModal();
    dialog.addEventListener('close', async () => {
      if (dialog.returnValue !== 'default') return;
      const button = dialog.querySelector('#confirm-start');
      if (button) button.disabled = true;
      try { if (await start(day)) location.assign('/workout/'); } catch (error) { const message = document.createElement('p'); message.className = 'notice error'; message.textContent = error.message; document.querySelector('#start')?.after(message); }
    });
  }
}

export function renderWorkout() {
  const a = state();
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (!a && requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return renderStart(requestedDay);
  if (!a) return location.assign('/');
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'exercises') {
    app.innerHTML = exercisePicker(a);
    bindExercisePicker(a);
    return;
  }
  void keepAwake();
  ({warmup: renderWarmup, plank: renderPlank, lifting: renderLifting, rest: renderRest, stretch: renderStretch, complete: renderCompletion}[a.phase] || renderWarmup)();
}
