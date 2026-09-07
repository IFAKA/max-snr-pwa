import { mount, state, header, queue, runAction, showError, exitControls } from './shared.js';
import { completedSets, totalSets, skippedSets, finishWorkout, undoLastSet } from '../workout.js';
import { save } from '../storage.js';

function duration(start, end) { const minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000)); return `${minutes} min`; }

export function renderCompletion() {
  const active = state();
  mount(`<div class="workout-stage"><div class="stage-info">${header(active)}${queue(active)}<p class="eyebrow">Workout review</p><h1>Ready to save</h1><div class="summary-grid"><div><strong>${completedSets()}</strong><span>Completed</span></div><div><strong>${skippedSets()}</strong><span>Skipped</span></div><div><strong>${duration(active.date, active.completedAt)}</strong><span>Duration</span></div></div><label class="note-field">Workout note<textarea id="note" maxlength="1000" placeholder="Optional note about today’s session"></textarea></label></div><div class="thumb-zone"><button class="primary" id="finish">Save workout</button>${completedSets() ? '<button class="secondary-link" id="undo">Undo last completed set</button>' : ''}${exitControls()}</div></div>`);
  const note = document.querySelector('#note');
  note.value = active.note || '';
  note.oninput = () => { active.note = note.value; save().catch(showError); };
  document.querySelector('#finish').onclick = event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/'));
  document.querySelector('#undo')?.addEventListener('click', event => runAction(event.currentTarget, undoLastSet));
}
