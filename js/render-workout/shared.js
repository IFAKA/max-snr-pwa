import { app, esc } from '../dom.js';
import { getState } from '../state.js';
import { cancelWorkout, selectExercise } from '../workout.js';

export const state = () => getState().active;
export const header = (active, count) => `<div class="row workout-top"><span>${esc(active.name)}</span><span>${count} working sets</span></div>`;

export function queue(active) {
  const groups = new Map();
  active.tasks.forEach((task, index) => { if (!groups.has(task.exerciseId)) groups.set(task.exerciseId, []); groups.get(task.exerciseId).push({task, index}); });
  const currentId = active.tasks[active.pos]?.exerciseId;
  const nextTask = active.tasks.find((task, index) => index !== active.pos && !task.completed && !task.skipped && task.exerciseId !== currentId && !active.deferredGroups.includes(task.groupId || task.exerciseId || task.id));
  return `<div class="queue-wrap"><div class="row queue-heading"><span class="eyebrow">Workout queue</span><span class="muted">Swipe to browse</span></div><ol class="exercise-queue" aria-label="Workout queue">${[...groups.values()].map(entries => {
    const task = entries[0].task, current = task.exerciseId === currentId && !active.tasks[active.pos]?.completed;
    const done = entries.every(entry => entry.task.completed || entry.task.skipped), skipped = entries.every(entry => entry.task.skipped);
    const deferred = entries.some(entry => active.deferredGroups.includes(entry.task.groupId || entry.task.exerciseId || entry.task.id));
    const status = skipped ? 'Skipped' : done ? 'Done' : current ? 'Now' : task.exerciseId === nextTask?.exerciseId ? 'Next' : deferred ? 'Later' : 'Queued';
    const completeCount = entries.filter(entry => entry.task.completed).length;
    const name = entries.find(entry => !entry.task.completed)?.task.performedName || task.performedName;
    const selectable = active.phase === 'lifting' && !current && !done;
    const content = `<span class="queue-status">${status}</span><strong>${esc(name)}</strong><span class="queue-detail">${completeCount}/${entries.length} sets</span>`;
    return `<li class="queue-item ${current ? 'current' : ''} ${done ? 'completed' : ''} ${skipped ? 'skipped' : ''}" ${current ? 'aria-current="step"' : ''}>${selectable ? `<button type="button" data-queue-exercise="${esc(task.exerciseId)}" aria-label="Select ${esc(name)}">${content}</button>` : content}</li>`;
  }).join('')}</ol></div>`;
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
  const cancel = document.querySelector('#cancel');
  if (cancel) cancel.onclick = () => runAction(cancel, cancelWorkout, () => location.assign('/'));
  document.querySelectorAll('[data-queue-exercise]').forEach(button => {
    button.onclick = event => runAction(event.currentTarget, () => selectExercise(event.currentTarget.dataset.queueExercise));
  });
  document.querySelector('.queue-item.current')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center'});
}
