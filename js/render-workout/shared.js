import { app, esc, icon } from '../dom.js';
import { cancelWorkout, selectExercise, finishEarly } from '../workout.js';
import { save } from '../storage.js';
import { getState } from '../state.js';
import { openSheet, closeSheet } from '../bottom-sheet.js';

export const state = () => getState().active;
export function exerciseProgress(active, focusPos = active.pos, preview = false) {
  const exercises = [];
  active.tasks.forEach(task => { if (!exercises.some(item => item.exerciseId === task.exerciseId)) exercises.push(task); });
  const currentExerciseId = active.tasks[focusPos]?.exerciseId;
  const nextExercise = preview && active.tasks[active.pos]?.exerciseId !== currentExerciseId;
  const completed = exercises.filter(exercise => active.tasks.filter(task => task.exerciseId === exercise.exerciseId).every(task => task.completed || task.skipped)).length;
  const renderDot = exercise => {
    const tasks = active.tasks.filter(task => task.exerciseId === exercise.exerciseId);
    const completedSets = tasks.filter(task => task.completed).length;
    const done = tasks.every(task => task.completed || task.skipped);
    const current = exercise.exerciseId === currentExerciseId;
    const activeSet = current ? Number(active.tasks[focusPos]?.set || 1) : 0;
    const stateClass = `${done ? ' is-complete' : ''}${current ? ' is-current' : ''}${current && nextExercise ? ' is-next-exercise' : ''}`;
    return `<span class="exercise-dot${stateClass}" style="--set-count: ${tasks.length}; --set-completed: ${completedSets}; --set-active: ${activeSet}" aria-hidden="true"></span>`;
  };
  const dots = [];
  for (let index = 0; index < exercises.length; index++) {
    const exercise = exercises[index];
    if (exercise.groupType === 'superset') {
      const members = exercises.filter(candidate => candidate.groupType === 'superset' && candidate.groupId === exercise.groupId).slice(0, 2);
      if (members[0] === exercise) dots.push(`<span class="exercise-progress-group" aria-hidden="true">${members.map(renderDot).join('')}</span>`);
      continue;
    }
    dots.push(renderDot(exercise));
  }
  const gridCount = exercises.reduce((count, exercise) => count + (exercise.groupType === 'superset' ? (exercises.findIndex(item => item.groupId === exercise.groupId && item.groupType === 'superset') === exercises.indexOf(exercise) ? 2 : 0) : 1), 0);
  return `<span class="exercise-progress" style="--exercise-count: ${gridCount}" role="img" aria-label="${completed} of ${exercises.length} exercises complete">${dots.join('')}</span>`;
}
function exerciseChoices() {
  const active = state();
  if (!active) return '';
  const groups = new Map();
  active.tasks.forEach(task => { if (!groups.has(task.exerciseId)) groups.set(task.exerciseId, task); });
  const current = active.tasks[active.pos];
  const currentStarted = Boolean(current && active.tasks.some(task => task.exerciseId === current.exerciseId && task.completed));
  const next = active.tasks[active.nextPos];
  const restBetweenSets = active.phase === 'rest' && current && next && current.exerciseId === next.exerciseId;
  const selectionLocked = active.phase === 'lifting' && currentStarted || restBetweenSets || !['lifting', 'rest'].includes(active.phase);
  const renderProgress = (tasks, isCurrent) => {
    const completedSets = tasks.filter(task => task.completed).length;
    const progress = tasks.map(task => `<span class="sheet-set${task.completed ? ' is-complete' : ''}${task.skipped ? ' is-skipped' : ''}${isCurrent && task.id === current?.id ? ' is-current' : ''}" aria-hidden="true"></span>`).join('');
    return `<span class="sheet-set-progress" aria-label="${completedSets} of ${tasks.length} sets complete">${progress}</span>`;
  };
  const renderChoice = (exerciseId, task, wrapperClass = '') => {
    const exerciseTasks = active.tasks.filter(item => item.exerciseId === exerciseId);
    const done = exerciseTasks.every(item => item.completed || item.skipped);
    const isCurrent = current?.exerciseId === exerciseId;
    const disabled = done || isCurrent || selectionLocked;
    return `<button class="text-action sheet-choice${wrapperClass ? ` ${wrapperClass}` : ''}" type="button" data-choose-exercise="${esc(exerciseId)}"${disabled ? ' disabled' : ''}><span class="sheet-choice-name">${esc(task.performedName)}</span>${renderProgress(exerciseTasks, isCurrent)}</button>`;
  };
  const rendered = [];
  const renderedSupersets = new Set();
  [...groups.entries()].forEach(([exerciseId, task]) => {
    if (task.groupType !== 'superset' || renderedSupersets.has(task.groupId)) {
      if (task.groupType !== 'superset') rendered.push(renderChoice(exerciseId, task));
      return;
    }
    renderedSupersets.add(task.groupId);
    const members = [...groups.entries()].filter(([, member]) => member.groupType === 'superset' && member.groupId === task.groupId);
    rendered.push(`<section class="sheet-superset" aria-label="${esc(task.groupLabel || 'Superset')}"><p class="sheet-superset-label">${esc(task.groupLabel || 'Superset')}</p>${members.map(([memberId, member]) => renderChoice(memberId, member)).join('')}</section>`);
  });
  return rendered.join('');
}
export const exitControls = () => `<button class="secondary more-trigger" type="button" data-open-sheet="session-sheet" aria-haspopup="dialog" aria-label="More workout actions" title="More workout actions">${icon('more')}</button><div class="sheet-backdrop" id="session-sheet-backdrop" data-sheet-backdrop="session-sheet" hidden></div><section class="action-sheet" id="session-sheet" data-sheet role="dialog" aria-modal="true" aria-labelledby="session-sheet-title" aria-hidden="true" tabindex="-1" hidden><div class="sheet-content"><div class="sheet-header" data-sheet-handle><div class="sheet-handle" aria-hidden="true"></div><h2 id="session-sheet-title">Workout actions</h2></div><div class="choice-list">${exerciseChoices()}</div><button class="text-action destructive" id="finish-early" type="button">Finish and save early</button></div></section>`;
export function showError(error) { const message = error?.message || 'Something went wrong. Your latest change may not have been saved.'; let status = document.querySelector('#app-error'); if (!status) { status = document.createElement('p'); status.id = 'app-error'; status.className = 'notice error'; status.setAttribute('role', 'alert'); app.prepend(status); } status.textContent = message; }
export async function runAction(button, action, onSuccess = () => location.reload()) { if (button) button.disabled = true; try { const result = await action(); if (result !== false) onSuccess(result); else if (button) button.disabled = false; } catch (error) { if (button) button.disabled = false; showError(error); } }
export function mount(html) { app.innerHTML = html; document.querySelectorAll('[data-open-sheet]').forEach(button => button.onclick = () => openSheet(button.dataset.openSheet)); document.querySelectorAll('[data-close-sheet]').forEach(button => button.onclick = () => closeSheet(button.closest('[data-sheet]')?.id)); document.querySelectorAll('[data-choose-exercise]').forEach(button => button.onclick = event => runAction(event.currentTarget, () => selectExercise(event.currentTarget.dataset.chooseExercise))); const finish = document.querySelector('#finish-early'); if (finish) finish.onclick = event => runAction(event.currentTarget, finishEarly, () => location.assign('/history/')); const cancel = document.querySelector('#cancel'); if (cancel) cancel.onclick = () => runAction(cancel, cancelWorkout, () => location.assign('/')); const saveLater = document.querySelector('#save-later'); if (saveLater) saveLater.onclick = () => runAction(saveLater, async () => { await save(); return true; }, () => location.assign('/')); }
