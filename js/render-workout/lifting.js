import { mount, state, runAction, showError, exitControls, exerciseProgress } from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { activeTask, completeSet } from '../workout.js';

export function renderLifting() {
  const active = state(), task = activeTask();
  if (!task) return;
  const draft = active.draft || {};
  mount(`<div class="workout-stage"><div class="stage-info"><p class="context-label">Strength · Set ${esc(task.set)} of ${esc(task.sets)}</p><h1>${esc(task.performedName)}</h1><div class="exercise-meta"><span class="sr-only">Exercise progress</span>${exerciseProgress(active)}</div></div><form class="thumb-zone" id="set-form"><div class="controls"><label><span>Reps</span><input id="reps" aria-label="Reps" type="number" inputmode="numeric" min="1" max="1000" step="1" pattern="\\d+" placeholder="${esc(task.reps)}" value="${esc(draft.reps ?? '')}" required></label><label><span>Load</span><input id="weight" aria-label="Load" type="number" inputmode="decimal" min="0" max="10000" step="0.01" pattern="\\d+(\\.\\d{1,2})?" value="${esc(draft.weight ?? '')}" required></label></div><button class="primary" id="log-set" type="submit" disabled>Log set</button>${exitControls()}</form></div>`);
  const weight = document.querySelector('#weight'), reps = document.querySelector('#reps'), form = document.querySelector('#set-form');
  if (!weight || !reps || !form) return showError(new Error('The set form could not be loaded. Reload the workout.'));
  const submit = document.querySelector('#log-set');
  const updateSubmitState = () => { if (submit) submit.disabled = !form.checkValidity(); };
  const saveDraft = () => { active.draft.weight = weight.value; active.draft.reps = reps.value; updateSubmitState(); save().catch(showError); };
  weight.addEventListener('input', saveDraft);
  reps.addEventListener('input', saveDraft);
  updateSubmitState();
  reps.focus();
  reps.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); weight.focus(); } });
  form.onsubmit = event => runAction(event.submitter, async () => { event.preventDefault(); active.draft.weight = weight.value; active.draft.reps = reps.value; const result = await completeSet(); if (result?.error) { showError(new Error(result.error)); return false; } return result; });
}
