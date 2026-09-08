import { mount, state, runAction, showError, exitControls, exerciseProgress } from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { activeTask, completeSet } from '../workout.js';

export function renderLifting() {
  const active = state(), task = activeTask();
  if (!task) return;
  const draft = active.draft || {};
  const repsValue = draft.reps ?? String(String(task.reps).split('–')[0]);
  const weightValue = draft.weight ?? '0';
  mount(`<div class="workout-stage"><div class="stage-info"><p class="context-label">Strength · Set ${esc(task.set)} of ${esc(task.sets)}</p><h1>${esc(task.performedName)}</h1><div class="exercise-meta"><span class="sr-only">Exercise progress</span>${exerciseProgress(active)}</div></div><form class="thumb-zone" id="set-form"><div class="controls"><label class="stepper-label">Reps<div class="stepper"><button type="button" data-stepper="reps" data-step="-1" aria-label="Decrease reps">−</button><output id="reps-value" aria-live="polite">${esc(repsValue)}</output><button type="button" data-stepper="reps" data-step="1" aria-label="Increase reps">+</button></div></label><label class="stepper-label">Load · kg<div class="stepper"><button type="button" data-stepper="weight" data-step="-2.5" aria-label="Decrease load">−</button><output id="weight-value" aria-live="polite">${esc(weightValue)}</output><button type="button" data-stepper="weight" data-step="2.5" aria-label="Increase load">+</button></div></label></div><input id="reps" type="hidden" value="${esc(repsValue)}"><input id="weight" type="hidden" value="${esc(weightValue)}"><button class="primary" id="log-set" type="submit">Log set</button>${exitControls()}</form></div>`);
  const weight = document.querySelector('#weight'), reps = document.querySelector('#reps'), form = document.querySelector('#set-form');
  if (!weight || !reps || !form) return showError(new Error('The set form could not be loaded. Reload the workout.'));
  const saveDraft = () => { active.draft.weight = weight.value; active.draft.reps = reps.value; save().catch(showError); };
  document.querySelectorAll('[data-stepper]').forEach(button => button.addEventListener('click', () => {
    const field = button.dataset.stepper === 'reps' ? reps : weight;
    const step = Number(button.dataset.step);
    const next = Math.max(button.dataset.stepper === 'reps' ? 1 : 0, Number(field.value || 0) + step);
    field.value = button.dataset.stepper === 'reps' ? String(Math.round(next)) : next.toFixed(2).replace(/\.00$/, '');
    document.querySelector(`#${button.dataset.stepper}-value`).textContent = field.value;
    saveDraft();
  }));
  form.onsubmit = event => runAction(event.submitter, async () => { event.preventDefault(); saveDraft(); const result = await completeSet(); if (result?.error) { showError(new Error(result.error)); return false; } return result; });
}
