import { app, esc } from '../dom.js';
import { getState } from '../state.js';
import { cancelWorkout, phaseProgress, selectExercise } from '../workout.js';
import { save } from '../storage.js';

export const state = () => getState().active;
export const setProgress = active => { const completed = active.tasks.filter(task => task.completed).length; const percentage = active.tasks.length ? Math.round(completed / active.tasks.length * 100) : 0; return {completed, total: active.tasks.length, percentage}; };
export const header = active => { const progress = setProgress(active), phase = phaseProgress(active.phase); return `<div class="workout-progress"><div class="row workout-top"><span>${esc(active.name)}</span><span>${phase.label} · ${progress.completed}/${progress.total}</span></div><div class="progress-track phase-progress" role="progressbar" aria-label="Workout progress" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${progress.completed}"><span style="width:${progress.percentage}%"></span></div><div class="progress-copy"><span>Step ${phase.step} of ${phase.total}</span></div></div>`; };
export const exitControls = (extra = '') => `<button class="text-action more-trigger" type="button" data-open-sheet="session-sheet">More</button><dialog class="action-sheet" id="session-sheet"><div><div class="sheet-handle" aria-hidden="true"></div><h2>More</h2>${extra}<button class="text-action save-later" id="save-later" type="button">Save &amp; finish later</button><button class="text-action destructive" id="cancel" type="button">Discard workout</button><button class="sheet-cancel" type="button" data-close-sheet>Cancel</button></div></dialog>`;

export function queue(active) {
  const groups = new Map();
  active.tasks.forEach((task, index) => { if (!groups.has(task.exerciseId)) groups.set(task.exerciseId, []); groups.get(task.exerciseId).push({task, index}); });
  const currentId = active.tasks[active.pos]?.exerciseId;
  const nextTask = active.tasks.find((task, index) => index !== active.pos && !task.completed && !task.skipped && task.exerciseId !== currentId && !active.deferredGroups.includes(task.groupId || task.exerciseId || task.id));
  const currentEntries = [...groups.values()].find(entries => entries.some(entry => entry.task.exerciseId === currentId)) || [];
  const nextName = nextTask?.performedName || 'Finish the workout';
  return `<details class="queue-wrap"><summary><span><span class="eyebrow">Now</span><strong>${esc(currentEntries.find(entry => !entry.task.completed)?.task.performedName || currentEntries[0]?.task.performedName || 'Workout')}</strong><small>${currentEntries.filter(entry => entry.task.completed).length}/${currentEntries.length || 0} sets complete</small></span><span class="queue-next">Next · ${esc(nextName)}</span></summary><div class="queue-browser"><div class="row queue-heading"><span class="eyebrow">Browse exercises</span><span class="muted">Select any unfinished exercise</span></div><ol class="exercise-queue" aria-label="Workout queue">${[...groups.values()].map(entries => {
    const task = entries[0].task, current = task.exerciseId === currentId && !active.tasks[active.pos]?.completed;
    const done = entries.every(entry => entry.task.completed || entry.task.skipped), skipped = entries.every(entry => entry.task.skipped);
    const deferred = entries.some(entry => active.deferredGroups.includes(entry.task.groupId || entry.task.exerciseId || entry.task.id));
    const status = skipped ? 'Skipped' : done ? 'Done' : current ? 'Now' : task.exerciseId === nextTask?.exerciseId ? 'Next' : deferred ? 'Later' : 'Queued';
    const completeCount = entries.filter(entry => entry.task.completed).length;
    const name = entries.find(entry => !entry.task.completed)?.task.performedName || task.performedName;
    const selectable = active.phase === 'lifting' && !current && !done;
    const content = `<span class="queue-status">${status}</span><strong>${esc(name)}</strong><span class="queue-detail">${completeCount}/${entries.length} sets</span>`;
    return `<li class="queue-item ${current ? 'current' : ''} ${done ? 'completed' : ''} ${skipped ? 'skipped' : ''}" ${current ? 'aria-current="step"' : ''}>${selectable ? `<button type="button" data-queue-exercise="${esc(task.exerciseId)}" aria-label="Select ${esc(name)}">${content}</button>` : content}</li>`;
  }).join('')}</ol></div></details>`;
}

export function showError(error) {
  const message = error?.message || 'Something went wrong. Your latest change may not have been saved.';
  let status = document.querySelector('#app-error');
  if (!status) {
    status = document.createElement('p');
    status.id = 'app-error';
    status.className = 'notice error';
    status.setAttribute('role', 'alert');
    app.prepend(status);
  }
  status.textContent = message;
}

export async function runAction(button, action, onSuccess = () => location.reload()) {
  if (button) button.disabled = true;
  try {
    const result = await action();
    if (result !== false) onSuccess(result);
    else if (button) button.disabled = false;
  } catch (error) {
    if (button) button.disabled = false;
    showError(error);
  }
}

export function mount(html) {
  app.innerHTML = html;
  document.querySelectorAll('[data-open-sheet]').forEach(button => button.onclick = () => document.getElementById(button.dataset.openSheet)?.showModal());
  document.querySelectorAll('[data-close-sheet]').forEach(button => button.onclick = () => button.closest('dialog')?.close());
  document.querySelectorAll('.action-sheet').forEach(sheet => sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); }));
  const cancel = document.querySelector('#cancel');
  if (cancel) cancel.onclick = () => runAction(cancel, cancelWorkout, () => location.assign('/'));
  const saveLater = document.querySelector('#save-later');
  if (saveLater) saveLater.onclick = () => runAction(saveLater, async () => { await save(); return true; }, () => location.assign('/'));
  document.querySelectorAll('[data-queue-exercise]').forEach(button => {
    button.onclick = event => runAction(event.currentTarget, () => selectExercise(event.currentTarget.dataset.queueExercise));
  });
  document.querySelector('.queue-item.current')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center'});
}
