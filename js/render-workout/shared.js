import { app, esc } from '../dom.js';
import { save } from '../storage.js';
import { getState } from '../state.js';
import { selectExercise, exerciseSelectionLocked } from '../workout.js';

export const state = () => getState().active;
export function workoutStage({className = '', title, body = '', actions = ''}) {
  return `<section class="workout-stage ${className}" aria-labelledby="workout-title"><div class="stage-info"><h1 id="workout-title">${title}</h1>${body}</div><div class="thumb-zone">${actions}</div></section>`;
}
export function exercisePicker(active, backHref = '/workout/') {
  const seen = new Set();
  const items = active.tasks.filter(task => {
    if (seen.has(task.exerciseId) || task.completed || task.skipped) return false;
    seen.add(task.exerciseId);
    return true;
  });
  const rows = items.map(task => `<li><button class="list-link" type="button" data-exercise-id="${esc(task.exerciseId)}"><span>${esc(task.performedName)}</span><span aria-hidden="true">›</span></button></li>`).join('');
  return `<section class="workout-picker" aria-labelledby="exercise-picker-title"><a class="back-link" href="${backHref}">Back</a><h1 id="exercise-picker-title">Exercise</h1><ul class="app-list exercise-picker-list">${rows}</ul></section>`;
}
export function bindExercisePicker(active, onSelected = () => location.assign('/workout/')) {
  document.querySelectorAll('[data-exercise-id]').forEach(button => button.addEventListener('click', () => runAction(button, () => selectExercise(button.dataset.exerciseId), onSelected)));
  if (exerciseSelectionLocked(active)) document.querySelectorAll('[data-exercise-id]').forEach(button => { button.disabled = true; });
}
export const primaryAction = (id, label, type = 'button') => `<button class="primary" id="${id}" type="${type}">${label}</button>`;
export const stepperMarkup = (name, label, value, down, up) => `<label class="stepper-label">${label}<div class="stepper"><button type="button" data-stepper="${name}" data-step="${down}" aria-label="Decrease ${label.toLowerCase()}">−</button><output id="${name}-value" aria-live="polite">${esc(value)}</output><button type="button" data-stepper="${name}" data-step="${up}" aria-label="Increase ${label.toLowerCase()}">+</button></div></label>`;
export function bindHoldSteppers(changeValue) {
  document.querySelectorAll('[data-stepper]').forEach(button => {
    let timer;
    let interval;
    const stop = () => { clearTimeout(timer); clearInterval(interval); if (interval) button.dataset.skipClick = '1'; interval = null; };
    button.addEventListener('pointerdown', () => { button.dataset.skipClick = '1'; changeValue(button); timer = setTimeout(() => { interval = setInterval(() => changeValue(button), 110); }, 450); });
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);
    button.addEventListener('pointerleave', stop);
    button.addEventListener('click', () => { if (button.dataset.skipClick) delete button.dataset.skipClick; else changeValue(button); });
  });
}
export function showError(error) { const message = error?.message || 'Something went wrong. Your latest change may not have been saved.'; let status = document.querySelector('#app-error'); if (!status) { status = document.createElement('p'); status.id = 'app-error'; status.className = 'notice error'; status.setAttribute('role', 'alert'); app.prepend(status); } status.textContent = message; }
export async function runAction(button, action, onSuccess = () => location.reload()) { if (button) button.disabled = true; try { const result = await action(); if (result !== false) onSuccess(result); else if (button) button.disabled = false; } catch (error) { if (button) button.disabled = false; showError(error); } }
export function mount(html) {
  app.innerHTML = html;
  const saveLater = document.querySelector('#save-later');
  if (saveLater) saveLater.onclick = () => runAction(saveLater, async () => { await save(); return true; }, () => location.assign('/'));
}
