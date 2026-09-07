import { mount, state, header, queue, runAction, showError, exitControls } from './shared.js';
import { STRETCH_MS } from '../constants.js';
import { completedSets, totalSets, skippedSets, setTimer, finishWorkout, countdown, undoLastSet } from '../workout.js';
import { buzz } from '../dom.js';
import { save } from '../storage.js';

function duration(start, end = new Date().toISOString()) { const minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000)); return `${minutes} min`; }

export function renderStretch() {
  const active = state(), running = active.timerEndsAt > Date.now();
  mount(`<div class="workout-stage"><div class="stage-info">${header(active)}${queue(active)}<p class="eyebrow">Optional cooldown</p><h1>Stretch</h1><div class="summary-grid"><div><strong>${completedSets()}</strong><span>Completed</span></div><div><strong>${skippedSets()}</strong><span>Skipped</span></div><div><strong>${duration(active.date, active.completedAt)}</strong><span>Duration</span></div></div><label class="note-field">Workout note<textarea id="note" maxlength="1000" placeholder="Optional note about today’s session"></textarea></label><div class="big-timer" id="timer" role="timer">${running ? '0:30' : '0:30'}</div></div><div class="thumb-zone"><button class="primary" id="finish">Finish &amp; save workout</button><button class="secondary" id="repeat">${running ? 'Restart 30-second timer' : 'Start 30-second timer'}</button><button class="secondary-link" id="undo">Undo last completed set</button>${exitControls()}</div></div>`);
  const note = document.querySelector('#note');
  note.value = active.note || '';
  note.oninput = () => { active.note = note.value; save().catch(showError); };
  document.querySelector('#finish').onclick = event => runAction(event.currentTarget, finishWorkout, () => location.assign('/history/'));
  document.querySelector('#repeat').onclick = event => runAction(event.currentTarget, () => setTimer(STRETCH_MS));
  document.querySelector('#undo').onclick = event => runAction(event.currentTarget, undoLastSet);
  if (running) countdown(document.querySelector('#timer'), 'timerEndsAt', 'stretch', () => { try { buzz([35, 70]); location.reload(); } catch (error) { showError(error); } });
}
