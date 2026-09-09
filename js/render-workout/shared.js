import { app, bindHoldScroll, bindTitleMarquee, esc, icon, listMarkup, titleMarkup } from '../dom.js';
import { save } from '../storage.js';
import { getState } from '../state.js';
import { selectExercise, exerciseSelectionLocked, start, cancelWorkout } from '../workout.js';
import { navigateTo } from '../navigation.js';

const MAIN_PHASES = new Set(['warmup', 'plank', 'lifting', 'rest', 'stretch', 'complete']);
let workoutRouteRenderer = null;
let cancelDialog = null;
let backTimer = null;
let lastBackAt = 0;
let lastWorkoutPath = '';

function isEditableTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
}

function isMainPhase(active) {
  if (!active || !MAIN_PHASES.has(active.phase) || location.pathname !== '/workout/') return false;
  const params = new URLSearchParams(location.search);
  return !params.has('view') && !(active.phase === 'lifting' && params.get('step') === 'load');
}

function armBackSentinel() {
  const path = `${location.pathname}${location.search}${location.hash}`;
  if (!history.state?.workoutSentinel || history.state.path !== path) history.pushState({...(history.state || {}), route: 'workout', path, workoutSentinel: true}, '', path);
}

function resetBackTimer() {
  clearTimeout(backTimer);
  backTimer = null;
  lastBackAt = 0;
}

function bindCancelDialog() {
  if (cancelDialog) return cancelDialog;
  const dialog = document.createElement('dialog');
  dialog.className = 'confirm-dialog bottom-sheet';
  dialog.setAttribute('aria-labelledby', 'cancel-workout-title');
  dialog.innerHTML = '<div class="sheet-handle" aria-hidden="true"></div><form method="dialog"><h2 id="cancel-workout-title">Cancel workout?</h2><p>Your completed sets will stay in history.</p><div class="dialog-actions"><button class="primary" value="default">Cancel workout</button><button value="cancel">Keep working out</button></div></form>';
  document.body.append(dialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close('cancel'); });
  dialog.addEventListener('close', async () => {
    if (dialog.returnValue === 'default') {
      const button = dialog.querySelector('[value="default"]');
      if (button) button.disabled = true;
      try {
        if (await cancelWorkout()) navigateTo('/');
      } catch (error) {
        if (button) button.disabled = false;
        showError(error);
      }
    }
    resetBackTimer();
    if (isMainPhase(state())) armBackSentinel();
  });
  cancelDialog = dialog;
  return dialog;
}

function openCancelDialog() {
  const dialog = bindCancelDialog();
  if (dialog.open || !isMainPhase(state())) return;
  dialog.showModal();
}

function handleWorkoutNavigation(event) {
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const previousPath = lastWorkoutPath;
  lastWorkoutPath = currentPath;
  const previousParams = new URL(previousPath || location.href, location.href).searchParams;
  const currentParams = new URL(currentPath, location.href).searchParams;
  if (previousParams.get('step') === 'load' && currentParams.get('step') === 'reps' && state()?.phase === 'lifting') {
    if (workoutRouteRenderer) workoutRouteRenderer();
    return;
  }
  if (isMainPhase(state())) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const now = performance.now();
    const isDoubleBack = now - lastBackAt <= 500;
    lastBackAt = isDoubleBack ? 0 : now;
    armBackSentinel();
    clearTimeout(backTimer);
    if (isDoubleBack) openCancelDialog();
    else backTimer = setTimeout(resetBackTimer, 500);
    return;
  }
  if (location.pathname === '/workout/' && workoutRouteRenderer) workoutRouteRenderer();
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !isMainPhase(state()) || document.querySelector('dialog[open]') || isEditableTarget(event.target)) return;
  event.preventDefault();
  openCancelDialog();
});
window.addEventListener('popstate', handleWorkoutNavigation);

export function configureWorkoutNavigation(render) {
  workoutRouteRenderer = render;
  lastWorkoutPath = `${location.pathname}${location.search}${location.hash}`;
  if (isMainPhase(state())) armBackSentinel();
}

export const state = () => getState().active;
export function workoutStage({className = '', title, body = '', actions = ''}) {
  return `<section class="workout-stage ${className}" aria-labelledby="workout-title"><div class="stage-info">${titleMarkup(title, 'workout-title', 'h1', 'workout-title')}${body}</div><div class="thumb-zone">${actions}</div></section>`;
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
    let timer, startedAt;
    let interval;
    const stop = () => { clearTimeout(timer); clearInterval(interval); if (interval) button.dataset.skipClick = '1'; interval = null; };
    const multiplier = () => {
      const elapsed = performance.now() - startedAt;
      if (elapsed >= 2500) return 10;
      if (elapsed >= 1500) return 5;
      if (elapsed >= 800) return 2;
      return 1;
    };
    button.addEventListener('pointerdown', () => {
      button.dataset.skipClick = '1';
      startedAt = performance.now();
      changeValue(button, 1);
      timer = setTimeout(() => { interval = setInterval(() => changeValue(button, multiplier()), 110); }, 450);
    });
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
