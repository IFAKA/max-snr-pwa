import { app, esc, icon } from '../dom.js';
import { cancelWorkout, selectExercise, finishEarly, exerciseSelectionLocked } from '../workout.js';
import { save } from '../storage.js';
import { getState } from '../state.js';
import { openSheet, closeSheet } from '../bottom-sheet.js';

export const state = () => getState().active;
export function renderSheet({id, title, content, className = ''}) {
  return `<div class="sheet-backdrop" id="${id}-backdrop" data-sheet-backdrop="${id}" hidden></div><section class="action-sheet ${className}" id="${id}" data-sheet role="dialog" aria-modal="true" aria-labelledby="${id}-title" aria-hidden="true" tabindex="-1" hidden><div class="sheet-content"><div class="sheet-header" data-sheet-handle><div class="sheet-handle" aria-hidden="true"></div><h2 id="${id}-title">${title}</h2></div>${content}</div></section>`;
}
function exerciseInitials(name) {
  return String(name || 'Exercise')
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}
export function exerciseProgress(active, focusPos = active.pos) {
  const exercises = [];
  active.tasks.forEach(task => { if (!exercises.some(item => item.exerciseId === task.exerciseId)) exercises.push(task); });
  const currentExerciseId = active.tasks[focusPos]?.exerciseId;
  const currentExercise = exercises.find(exercise => exercise.exerciseId === currentExerciseId);
  const currentExerciseIds = new Set(currentExercise?.groupType === 'superset'
    ? exercises.filter(exercise => exercise.groupType === 'superset' && exercise.groupId === currentExercise.groupId).map(exercise => exercise.exerciseId)
    : currentExerciseId ? [currentExerciseId] : []);
  const isDone = exercise => active.tasks.filter(task => task.exerciseId === exercise.exerciseId).every(task => task.completed || task.skipped);
  const completed = exercises.filter(exercise => !currentExerciseIds.has(exercise.exerciseId) && isDone(exercise)).length;
  const remaining = exercises.length - completed - currentExerciseIds.size;
  const completedExercises = exercises.filter(exercise => !currentExerciseIds.has(exercise.exerciseId) && isDone(exercise));
  const remainingExercises = exercises.filter(exercise => !currentExerciseIds.has(exercise.exerciseId) && !isDone(exercise));
  const currentExercises = exercises.filter(exercise => currentExerciseIds.has(exercise.exerciseId));
  const renderSheetItems = (items, interactive = false, canSelect = true) => items.length
    ? `<ul class="progress-sheet-list">${items.map(exercise => interactive ? `<li><button class="text-action sheet-choice" type="button" data-choose-exercise="${esc(exercise.exerciseId)}" aria-label="Choose ${esc(exercise.performedName)}"${canSelect ? '' : ' disabled'}><span class="sheet-choice-name">${esc(exercise.performedName)}</span></button></li>` : `<li>${esc(exercise.performedName)}</li>`).join('')}</ul>`
    : '<p class="progress-sheet-empty">Nothing here yet.</p>';
  const renderProgressSheet = (id, title, items, interactive = false, canSelect = true) => renderSheet({id, title, className: 'progress-sheet', content: renderSheetItems(items, interactive, canSelect)});
  const renderDot = exercise => {
    const tasks = active.tasks.filter(task => task.exerciseId === exercise.exerciseId);
    const completedSets = tasks.filter(task => task.completed).length;
    const done = tasks.every(task => task.completed || task.skipped);
    const current = exercise.exerciseId === currentExerciseId;
    const activeSet = current ? Number(active.tasks[focusPos]?.set || 1) : 0;
    const stateClass = `${done ? ' is-complete' : ''}${current ? ' is-current' : ''}`;
    const initials = currentExerciseIds.has(exercise.exerciseId) ? `<span class="exercise-dot-label">${esc(exerciseInitials(exercise.performedName))}</span>` : '';
    return `<span class="exercise-dot${stateClass}" style="--set-count: ${tasks.length}; --set-completed: ${completedSets}; --set-active: ${activeSet}" aria-hidden="true">${initials}</span>`;
  };
  const currentDots = [];
  for (const exercise of exercises) {
    if (!currentExerciseIds.has(exercise.exerciseId)) continue;
    if (exercise.groupType === 'superset') {
      const members = exercises.filter(candidate => candidate.groupType === 'superset' && candidate.groupId === exercise.groupId).slice(0, 2);
      if (members[0] === exercise) currentDots.push(`<span class="exercise-progress-group" aria-hidden="true">${members.map(renderDot).join('')}</span>`);
      continue;
    }
    currentDots.push(renderDot(exercise));
  }
  const currentLabel = currentExercises.map(exercise => exercise.performedName).join(', ') || 'No current exercise';
  const anySetStarted = active.tasks.some(task => task.completed);
  const promptSelection = active.phase === 'lifting' && !anySetStarted;
  const canSelectRemaining = remaining > 0 && !exerciseSelectionLocked(active);
  const remainingLabel = canSelectRemaining ? `${remaining} remaining exercises. Tap to choose.` : `${remaining} remaining exercises. Tap to view; selection is unavailable right now.`;
  return `<div class="exercise-progress" role="group" aria-label="Exercise progress"><button class="exercise-progress-section progress-completed" type="button" data-open-sheet="progress-completed-sheet" aria-haspopup="dialog" aria-controls="progress-completed-sheet" aria-label="${completed} completed exercises"><span class="exercise-progress-count is-complete">${completed}</span></button><button class="exercise-progress-section progress-current is-current" type="button" data-open-sheet="progress-current-sheet" aria-haspopup="dialog" aria-controls="progress-current-sheet" aria-label="Current: ${esc(currentLabel)}"><span class="exercise-progress-current">${currentDots.join('')}</span></button><button class="exercise-progress-section progress-remaining${promptSelection ? ' is-attention' : ''}" type="button" data-open-sheet="progress-remaining-sheet" aria-haspopup="dialog" aria-controls="progress-remaining-sheet" aria-label="${remainingLabel}" aria-describedby="progress-remaining-hint"><span class="exercise-progress-count">${remaining}</span></button><span id="progress-remaining-hint" class="sr-only">${canSelectRemaining ? 'Choose the next exercise from the remaining exercises.' : 'You can view the remaining exercises, but cannot change exercises during this part of the workout.'}</span>${renderProgressSheet('progress-completed-sheet', 'Completed exercises', completedExercises)}${renderProgressSheet('progress-current-sheet', 'Current exercise', currentExercises)}${renderProgressSheet('progress-remaining-sheet', 'Remaining exercises', remainingExercises, true, canSelectRemaining)}</div>`;
}
export const exitControls = () => `<button class="secondary more-trigger" type="button" data-open-sheet="session-sheet" aria-haspopup="dialog" aria-label="More workout actions" title="More workout actions">${icon('more')}</button>${renderSheet({id: 'session-sheet', title: 'Workout actions', content: '<div class="choice-list"><button class="text-action destructive" id="finish-early" type="button">Finish and save early</button><button class="text-action destructive" id="cancel" type="button">Cancel routine</button></div>'})}`;
export function showError(error) { const message = error?.message || 'Something went wrong. Your latest change may not have been saved.'; let status = document.querySelector('#app-error'); if (!status) { status = document.createElement('p'); status.id = 'app-error'; status.className = 'notice error'; status.setAttribute('role', 'alert'); app.prepend(status); } status.textContent = message; }
export async function runAction(button, action, onSuccess = () => location.reload()) { if (button) button.disabled = true; try { const result = await action(); if (result !== false) onSuccess(result); else if (button) button.disabled = false; } catch (error) { if (button) button.disabled = false; showError(error); } }
export function mount(html) { app.innerHTML = html; document.querySelectorAll('[data-open-sheet]').forEach(button => button.onclick = () => openSheet(button.dataset.openSheet)); document.querySelectorAll('[data-close-sheet]').forEach(button => button.onclick = () => closeSheet(button.closest('[data-sheet]')?.id)); document.querySelectorAll('[data-choose-exercise]').forEach(button => button.onclick = event => runAction(event.currentTarget, () => selectExercise(event.currentTarget.dataset.chooseExercise))); const finish = document.querySelector('#finish-early'); if (finish) finish.onclick = event => runAction(event.currentTarget, finishEarly, () => location.assign('/history/')); const cancel = document.querySelector('#cancel'); if (cancel) cancel.onclick = () => runAction(cancel, cancelWorkout, () => location.assign('/')); const saveLater = document.querySelector('#save-later'); if (saveLater) saveLater.onclick = () => runAction(saveLater, async () => { await save(); return true; }, () => location.assign('/')); }
