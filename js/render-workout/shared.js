import { app, esc } from '../dom.js';
import { cancelWorkout, selectExercise, finishEarly } from '../workout.js';
import { save } from '../storage.js';
import { getState } from '../state.js';
import { openSheet, closeSheet } from '../bottom-sheet.js';

export const state = () => getState().active;
function exerciseChoices() {
  const active = state();
  if (!active) return '';
  const groups = new Map();
  active.tasks.forEach(task => { if (!groups.has(task.exerciseId)) groups.set(task.exerciseId, task); });
  const current = active.tasks[active.pos];
  const currentStarted = Boolean(current && active.tasks.some(task => task.exerciseId === current.exerciseId && task.completed));
  const selectionLocked = active.phase !== 'lifting' || currentStarted;
  return [...groups.entries()].map(([exerciseId, task]) => {
    const started = active.tasks.some(item => item.exerciseId === exerciseId && item.completed);
    const disabled = started || selectionLocked;
    const status = started ? 'Started' : selectionLocked ? 'Locked' : '';
    return `<button class="text-action" type="button" data-choose-exercise="${esc(exerciseId)}"${disabled ? ' disabled' : ''}>${esc(task.performedName)}${status ? ` <span class="sheet-choice-status">${status}</span>` : ''}</button>`;
  }).join('') || '<p class="muted">No exercises.</p>';
}
export const exitControls = () => `<button class="text-action more-trigger" type="button" data-open-sheet="session-sheet" aria-haspopup="dialog">More</button><div class="sheet-backdrop" id="session-sheet-backdrop" data-sheet-backdrop="session-sheet" hidden></div><section class="action-sheet" id="session-sheet" data-sheet role="dialog" aria-modal="true" aria-labelledby="session-sheet-title" aria-hidden="true" tabindex="-1" hidden><div class="sheet-content"><div class="sheet-header" data-sheet-handle><div class="sheet-handle" aria-hidden="true"></div><h2 id="session-sheet-title">Workout</h2></div><p class="sheet-label">Choose another unfinished exercise</p><div class="choice-list">${exerciseChoices()}</div><button class="text-action destructive" id="finish-early" type="button">Finish and save early</button><button class="sheet-cancel" type="button" data-close-sheet>Cancel</button></div></section>`;
export const queue = () => '';
export function showError(error) { const message = error?.message || 'Something went wrong. Your latest change may not have been saved.'; let status = document.querySelector('#app-error'); if (!status) { status = document.createElement('p'); status.id = 'app-error'; status.className = 'notice error'; status.setAttribute('role', 'alert'); app.prepend(status); } status.textContent = message; }
export async function runAction(button, action, onSuccess = () => location.reload()) { if (button) button.disabled = true; try { const result = await action(); if (result !== false) onSuccess(result); else if (button) button.disabled = false; } catch (error) { if (button) button.disabled = false; showError(error); } }
export function mount(html) { app.innerHTML = html; document.querySelectorAll('[data-open-sheet]').forEach(button => button.onclick = () => openSheet(button.dataset.openSheet)); document.querySelectorAll('[data-close-sheet]').forEach(button => button.onclick = () => closeSheet(button.closest('[data-sheet]')?.id)); document.querySelectorAll('[data-choose-exercise]').forEach(button => button.onclick = event => runAction(event.currentTarget, () => selectExercise(event.currentTarget.dataset.chooseExercise))); const finish = document.querySelector('#finish-early'); if (finish) finish.onclick = event => runAction(event.currentTarget, finishEarly, () => location.assign('/history/')); const cancel = document.querySelector('#cancel'); if (cancel) cancel.onclick = () => runAction(cancel, cancelWorkout, () => location.assign('/')); const saveLater = document.querySelector('#save-later'); if (saveLater) saveLater.onclick = () => runAction(saveLater, async () => { await save(); return true; }, () => location.assign('/')); }
