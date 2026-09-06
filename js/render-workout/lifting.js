import { mount, state, queue, runAction, showError } from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { getState } from '../state.js';
import { activeTask, totalSets, completedSets, completeSet, deferCurrent, substituteCurrent, skipCurrent, undoLastSet, lastPerformance, progressionSuggestion } from '../workout.js';

export function renderLifting() {
  const active = state(), task = activeTask();
  if (!task) return;
  const unit = getState().settings?.unit || 'kg';
  const previous = lastPerformance(task.performedName);
  const previousInUnit = previous && (previous.unit || 'kg') === unit ? previous : null;
  const suggestion = progressionSuggestion(task.performedName, unit);
  const draft = active.draft || {};
  const next = active.tasks[(active.pos + 1) % active.tasks.length];
  const partner = task.groupType === 'superset' && next?.groupId === task.groupId && next?.set === task.set;
  const group = task.groupLabel ? `<p class="group-chip">${esc(task.groupLabel)}${task.groupType === 'superset' ? ` · ${task.memberIndex ? 'B' : 'A'}` : ''}</p>` : '';
  const options = [task.originalName, ...(task.alternatives || [])].filter((name, index, names) => names.indexOf(name) === index);
  mount(`<div class="workout-stage"><div class="stage-info"><div class="row workout-top"><span>${esc(active.name)}</span><span>${completedSets() + 1}/${totalSets()} working sets</span></div>${queue(active)}${group}<h1>${esc(task.performedName)}</h1><p class="meta">${esc(task.reps)} reps · ${esc(task.rir)} RIR · Set ${esc(task.set)} of ${esc(task.sets)}</p>${previousInUnit ? `<p class="previous"><span>Previous set</span>${esc(previousInUnit.weight)} ${esc(unit)} × ${esc(previousInUnit.reps)} · RIR ${esc(previousInUnit.rir)}</p>` : ''}${suggestion ? `<p class="next-up"><strong>Progression:</strong> try ${esc(suggestion)} ${esc(unit)} because every previous set reached the top of the rep range.</p>` : ''}${partner ? `<p class="next-up"><strong>Next, without rest:</strong> ${esc(next.performedName)} · set ${esc(next.set)}</p>` : ''}</div><form class="thumb-zone" id="set-form"><div class="controls"><label>Weight (${esc(unit)})<input id="weight" type="number" inputmode="decimal" min="0" max="10000" step="0.5" value="${esc(draft.weight ?? suggestion ?? previousInUnit?.weight ?? '')}" required></label><label>Repetitions<input id="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${esc(draft.reps ?? '')}" required></label></div><fieldset class="rir"><legend>Reps in reserve</legend>${[0, 1, 2, '3+'].map(rir => `<button type="button" data-rir="${rir}" aria-pressed="${String(draft.rir ?? '1') === String(rir)}">${rir}</button>`).join('')}</fieldset><button class="primary" type="submit">Complete set</button><details class="substitute"><summary>Exercise options</summary><div>${options.map(name => `<button type="button" data-substitute="${esc(name)}" ${name === task.performedName ? 'disabled' : ''}>Use ${esc(name)}</button>`).join('')}<button type="button" id="later">Do this exercise later</button><button type="button" class="danger" id="skip-exercise">Skip this exercise</button></div></details>${completedSets() ? '<button class="secondary-link" type="button" id="undo">Undo last completed set</button>' : ''}<button class="cancel" id="cancel" type="button">Cancel workout</button></form></div>`);
  const weight = document.querySelector('#weight'), reps = document.querySelector('#reps');
  const saveDraft = () => { active.draft.weight = weight.value; active.draft.reps = reps.value; save().catch(showError); };
  weight.addEventListener('input', saveDraft);
  reps.addEventListener('input', saveDraft);
  weight.focus();
  weight.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); reps.focus(); } });
  document.querySelector('#set-form').onsubmit = event => runAction(event.submitter, async () => { event.preventDefault(); active.draft.weight = weight.value; active.draft.reps = reps.value; const result = await completeSet(); if (result?.error) { showError(new Error(result.error)); return false; } return result; });
  document.querySelectorAll('[data-rir]').forEach(button => button.onclick = async () => { active.draft.rir = button.dataset.rir; document.querySelectorAll('[data-rir]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.rir) === String(active.draft.rir))); try { await save(); } catch (error) { showError(error); } });
  document.querySelectorAll('[data-substitute]').forEach(button => button.onclick = () => runAction(button, () => substituteCurrent(button.dataset.substitute)));
  document.querySelector('#later').onclick = event => runAction(event.currentTarget, deferCurrent);
  document.querySelector('#skip-exercise').onclick = event => { if (confirm(`Skip all remaining sets of ${task.performedName}?`)) runAction(event.currentTarget, skipCurrent); };
  document.querySelector('#undo')?.addEventListener('click', event => runAction(event.currentTarget, undoLastSet));
}
