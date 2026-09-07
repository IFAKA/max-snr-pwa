import { mount, state, header, queue, runAction, showError, exitControls } from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { getState } from '../state.js';
import { activeTask, totalSets, completedSets, completeSet, deferCurrent, substituteCurrent, skipCurrent, undoLastSet, finishEarly, lastActivePerformance, lastPerformance, progressionSuggestion } from '../workout.js';

export function renderLifting() {
  const active = state(), task = activeTask();
  if (!task) return;
  const unit = getState().settings?.unit || 'kg';
  const previous = lastPerformance(task.performedName);
  const previousInUnit = previous && (previous.unit || 'kg') === unit ? previous : null;
  const activePrevious = lastActivePerformance(task.exerciseId, unit);
  const defaultPerformance = activePrevious || previousInUnit;
  const suggestion = progressionSuggestion(task.performedName, unit);
  const draft = active.draft || {};
  const next = active.tasks[(active.pos + 1) % active.tasks.length];
  const partner = task.groupType === 'superset' && next?.groupId === task.groupId && next?.set === task.set;
  const group = task.groupLabel ? `<p class="group-chip">${esc(task.groupLabel)}${task.groupType === 'superset' ? ` · ${task.memberIndex ? 'B' : 'A'}` : ''}</p>` : '';
  const options = [task.originalName, ...(task.alternatives || [])].filter((name, index, names) => names.indexOf(name) === index);
  const guidance = !defaultPerformance && !suggestion ? '<p class="field-help">First time? Choose a light weight you can control for the target reps.</p>' : '';
  const actionMarkup = `<button class="text-action" type="button" id="later">Do this exercise later</button><p class="sheet-label">Use an alternative</p>${options.map(name => `<button class="text-action" type="button" data-substitute="${esc(name)}" ${name === task.performedName ? 'disabled' : ''}>${esc(name)}</button>`).join('')}<button type="button" class="text-action destructive" id="skip-exercise">Skip exercise</button><button type="button" class="text-action destructive" id="finish-early">Finish early and save</button>${completedSets() ? '<button class="text-action" type="button" id="undo">Undo last completed set</button>' : ''}`;
  mount(`<div class="workout-stage"><div class="stage-info">${header(active)}${queue(active)}${group}<h1>${esc(task.performedName)}</h1><p class="meta">${esc(task.reps)} reps · ${esc(task.rir)} RIR · Set ${esc(task.set)} of ${esc(task.sets)}</p>${defaultPerformance ? `<p class="previous"><span>Previous set</span>${esc(defaultPerformance.weight)} ${esc(unit)} × ${esc(defaultPerformance.reps)} · RIR ${esc(defaultPerformance.rir)}</p>` : ''}${suggestion ? `<p class="next-up"><strong>Progression:</strong> try ${esc(suggestion)} ${esc(unit)} because every previous set reached the top of the rep range.</p>` : ''}</div><form class="thumb-zone" id="set-form"><div class="controls"><label>Weight (${esc(unit)})<input id="weight" type="number" inputmode="decimal" min="0" max="10000" step="0.5" value="${esc(draft.weight ?? defaultPerformance?.weight ?? suggestion ?? '')}" required>${guidance}</label><label>Repetitions<input id="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${esc(draft.reps ?? defaultPerformance?.reps ?? '')}" required><span class="field-help">Enter the reps you actually complete.</span></label></div><fieldset class="rir"><legend>Reps in reserve</legend>${[0, 1, 2, '3+'].map(rir => `<button type="button" data-rir="${rir}" aria-pressed="${String(draft.rir ?? defaultPerformance?.rir ?? '1') === String(rir)}">${rir}</button>`).join('')}</fieldset><button class="primary" type="submit">Complete set</button>${exitControls(actionMarkup)}</form></div>`);
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
  document.querySelector('#skip-exercise').onclick = event => runAction(event.currentTarget, skipCurrent);
  document.querySelector('#finish-early').onclick = event => runAction(event.currentTarget, finishEarly, () => location.assign('/history/'));
  document.querySelector('#undo')?.addEventListener('click', event => runAction(event.currentTarget, undoLastSet));
}
