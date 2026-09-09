import { mount, state, runAction, showError, workoutStage, primaryAction, stepperMarkup, bindHoldSteppers } from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { getState } from '../state.js';
import { activeTask, completeSet } from '../workout.js';

export function renderLifting() {
  const active = state(), task = activeTask();
  if (!task) return;
  const draft = active.draft || {};
  const repsValue = draft.reps ?? String(String(task.reps).split('–')[0]);
  const weightValue = draft.weight ?? '';
  const stage = workoutStage({className: 'lifting-stage', title: esc(task.performedName), actions: ''});
  const unit = getState().settings?.unit || 'kg';
  const formMarkup = `<form class="thumb-zone" id="set-form"><p class="set-count">Set ${esc(task.set)} of ${esc(task.sets)}</p><div class="lifting-fields">${stepperMarkup('reps', 'Reps', repsValue, -1, 1)}${stepperMarkup('weight', `Load · ${unit}`, weightValue, -2.5, 2.5)}</div><input id="reps" type="hidden" value="${esc(repsValue)}"><input id="weight" type="hidden" value="${esc(weightValue)}">${primaryAction('log-set', 'Log set', 'submit')}</form>`;
  mount(stage.replace('<div class="thumb-zone"></div>', formMarkup));
  const weight = document.querySelector('#weight'), reps = document.querySelector('#reps'), form = document.querySelector('#set-form');
  if (!weight || !reps || !form) return showError(new Error('The set form could not be loaded. Reload the workout.'));
  const saveDraft = () => { active.draft.weight = weight.value; active.draft.reps = reps.value; save().catch(showError); };
  const changeValue = button => {
    const field = button.dataset.stepper === 'reps' ? reps : weight;
    const step = Number(button.dataset.step);
    const next = Math.max(button.dataset.stepper === 'reps' ? 1 : 0, Number(field.value || 0) + step);
    field.value = button.dataset.stepper === 'reps' ? String(Math.round(next)) : next.toFixed(2).replace(/\.00$/, '');
    document.querySelector(`#${button.dataset.stepper}-value`).textContent = field.value;
    saveDraft();
  };
  bindHoldSteppers(changeValue);
  form.onsubmit = event => runAction(event.submitter, async () => { event.preventDefault(); saveDraft(); const result = await completeSet(); if (result?.error) { showError(new Error(result.error)); return false; } return result; });
}
