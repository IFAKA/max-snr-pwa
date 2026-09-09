import { app, bindHoldScroll, bindTitleMarquee, esc, icon, listMarkup, titleMarkup } from '../dom.js';
import { save } from '../storage.js';
import { getState } from '../state.js';
import { selectExercise, exerciseSelectionLocked, start } from '../workout.js';
import { navigateTo } from '../navigation.js';

export const state = () => getState().active;
export function workoutStage({className = '', title, body = '', actions = ''}) {
  return `<section class="workout-stage ${className}" aria-labelledby="workout-title"><div class="stage-info">${titleMarkup(title, 'workout-title')}${body}</div><div class="thumb-zone">${actions}</div></section>`;
}
export const startRow = day => `<li><button class="list-link" type="button" data-start-day="${esc(day)}"><span>Start</span>${icon('chevron', 'Start workout')}</button></li>`;
export function bindStartDialog() {
  const trigger = document.querySelector('[data-start-day]');
  if (!trigger) return;
  const day = trigger.dataset.startDay;
  const dialog = document.createElement('dialog');
  dialog.className = 'confirm-dialog bottom-sheet';
  dialog.innerHTML = '<div class="sheet-handle" aria-hidden="true"></div><form method="dialog"><h2>Start?</h2><div class="dialog-actions"><button class="primary" value="default">Start</button><button value="cancel">Cancel</button></div></form>';
  document.body.append(dialog);
  const handle = dialog.querySelector('.sheet-handle');
  let dragStartY = 0;
  let dragStartTime = 0;
  const resetDrag = () => { dialog.classList.remove('is-dragging'); dialog.style.removeProperty('--sheet-drag-y'); };
  handle?.addEventListener('pointerdown', event => {
    if (!window.matchMedia('(max-width: 600px)').matches || event.pointerType === 'mouse' && event.button !== 0) return;
    dragStartY = event.clientY;
    dragStartTime = performance.now();
    dialog.classList.add('is-dragging');
    handle.setPointerCapture(event.pointerId);
  });
  handle?.addEventListener('pointermove', event => {
    if (!dialog.classList.contains('is-dragging')) return;
    const distance = Math.max(0, event.clientY - dragStartY);
    dialog.style.setProperty('--sheet-drag-y', `${distance}px`);
  });
  const finishDrag = event => {
    if (!dialog.classList.contains('is-dragging')) return;
    const distance = Math.max(0, event.clientY - dragStartY);
    const elapsed = Math.max(1, performance.now() - dragStartTime);
    const velocity = distance / elapsed;
    resetDrag();
    if (distance > 96 || velocity > .5) dialog.close('cancel');
  };
  handle?.addEventListener('pointerup', finishDrag);
  handle?.addEventListener('pointercancel', () => resetDrag());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close('cancel'); });
  trigger.addEventListener('click', () => {
    resetDrag();
    dialog.classList.add('is-opening');
    dialog.showModal();
    requestAnimationFrame(() => dialog.classList.remove('is-opening'));
  });
  dialog.addEventListener('close', async () => {
    resetDrag();
    if (dialog.returnValue !== 'default') return;
    const button = dialog.querySelector('[value="default"]');
    if (button) button.disabled = true;
    try { if (await start(day)) navigateTo('/workout/'); } catch (error) { showError(error); }
  });
}
export function exercisePicker(active) {
  const seen = new Set();
  const items = active.tasks.reduce((list, task) => {
    if (seen.has(task.exerciseId)) return list;
    seen.add(task.exerciseId);
    const exerciseTasks = active.tasks.filter(candidate => candidate.exerciseId === task.exerciseId);
    list.push({task, complete: exerciseTasks.every(candidate => candidate.completed || candidate.skipped)});
    return list;
  }, []);
  const rows = items.map(({task, complete}) => complete
    ? `<li class="complete-row"><div class="list-link" role="status"><span data-hold-scroll><span class="hold-scroll-text">${esc(task.performedName)}</span></span>${icon('check', 'Done')}</div></li>`
    : `<li><button class="list-link" type="button" data-exercise-id="${esc(task.exerciseId)}"><span data-hold-scroll><span class="hold-scroll-text">${esc(task.performedName)}</span></span>${icon('chevron', 'Select exercise')}</button></li>`);
  return `<section class="workout-picker" aria-labelledby="exercise-picker-title">${titleMarkup('Exercise', 'exercise-picker-title')}${listMarkup(rows, 'exercise-picker-list', 'Available exercises')}</section>`;
}
export function bindExercisePicker(active, onSelected = () => navigateTo('/workout/')) {
  document.querySelectorAll('[data-exercise-id]').forEach(button => button.addEventListener('click', () => runAction(button, () => selectExercise(button.dataset.exerciseId), onSelected)));
  if (exerciseSelectionLocked(active)) document.querySelectorAll('[data-exercise-id]').forEach(button => { button.disabled = true; });
}
export const primaryAction = (id, label, type = 'button') => `<button class="primary" id="${id}" type="${type}">${label}</button>`;
export const stepperMarkup = (name, label, value, down, up) => `<label class="stepper-label">${label}<div class="stepper"><button type="button" data-stepper="${name}" data-step="${down}" aria-label="Decrease ${label.toLowerCase()}">${icon('minus')}</button><output id="${name}-value" aria-live="polite">${esc(value)}</output><button type="button" data-stepper="${name}" data-step="${up}" aria-label="Increase ${label.toLowerCase()}">${icon('plus')}</button></div></label>`;
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
  bindHoldScroll(app);
  bindTitleMarquee(app);
  const saveLater = document.querySelector('#save-later');
  if (saveLater) saveLater.onclick = () => runAction(saveLater, async () => { await save(); return true; }, () => navigateTo('/'));
}
