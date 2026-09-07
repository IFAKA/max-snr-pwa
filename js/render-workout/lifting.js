import { mount, state, runAction, showError, exitControls } from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { activeTask, completeSet } from '../workout.js';

export function renderLifting() {
  const active = state(), task = activeTask();
  if (!task) return;
  const draft = active.draft || {};
  const group = task.groupLabel ? `<p class="group-chip">${esc(task.groupLabel)}</p>` : '';
  mount(`<div class="workout-stage"><div class="stage-info">${group}<h1>${esc(task.performedName)}</h1><p class="meta">Set ${esc(task.set)} of ${esc(task.sets)} · target ${esc(task.reps)} reps</p></div><form class="thumb-zone" id="set-form"><div class="controls"><label>Reps<input id="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${esc(draft.reps ?? '')}" required></label><label>Load<input id="weight" aria-label="Load" type="number" inputmode="decimal" min="0" max="10000" step="0.5" value="${esc(draft.weight ?? '')}"></label></div><button class="primary" type="submit">Log set</button>${exitControls()}</form></div>`);
  const weight = document.querySelector('#weight'), reps = document.querySelector('#reps'), form = document.querySelector('#set-form');
  if (!weight || !reps || !form) return showError(new Error('The set form could not be loaded. Reload the workout.'));
  const saveDraft = () => { active.draft.weight = weight.value; active.draft.reps = reps.value; save().catch(showError); };
  weight.addEventListener('input', saveDraft);
  reps.addEventListener('input', saveDraft);
  reps.focus();
  reps.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); weight.focus(); } });
  form.onsubmit = event => runAction(event.submitter, async () => { event.preventDefault(); active.draft.weight = weight.value; active.draft.reps = reps.value; const result = await completeSet(); if (result?.error) { showError(new Error(result.error)); return false; } return result; });
}
