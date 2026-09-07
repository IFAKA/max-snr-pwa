import { app, esc } from './dom.js';
import { getState, setState, normalizeWeeklyGoal } from './state.js';
import { migrate, persist } from './storage.js';
import { validateBackup } from './backup.js';

const unitFor = performance => performance?.unit || 'kg';

function duration(workout) {
  if (!workout.date || !workout.completedAt) return '';
  const minutes = Math.round((Date.parse(workout.completedAt) - Date.parse(workout.date)) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? `${minutes} min` : '';
}

function download(value, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'}));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function setLine(task, workoutIndex, taskIndex) {
  if (task.skipped) return '<li><span>Skipped</span></li>';
  const performance = task.completed && !Array.isArray(task.completed) ? task.completed : null;
  if (!performance) return '<li><span>Not completed</span></li>';
  const editId = `edit-${workoutIndex}-${taskIndex}`;
  return `<li><span>Set ${esc(task.set || taskIndex + 1)} · ${esc(performance.weight)} ${esc(unitFor(performance))} × ${esc(performance.reps)} · RIR ${esc(performance.rir)}</span><button class="text-button" type="button" data-edit="${editId}">Edit</button><form class="set-edit" id="${editId}" hidden data-workout="${workoutIndex}" data-task="${taskIndex}"><label>Weight<input name="weight" type="number" min="0" max="10000" step="0.5" value="${esc(performance.weight)}" required></label><label>Reps<input name="reps" type="number" min="1" max="1000" step="1" value="${esc(performance.reps)}" required></label><label>RIR<select name="rir">${['0', '1', '2', '3+'].map(value => `<option ${String(performance.rir) === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><button type="submit">Save correction</button></form></li>`;
}

function legacyLines(task) {
  const sets = task.done || (Array.isArray(task.completed) ? task.completed : []);
  return sets.length ? sets.map((performance, index) => `<li>Set ${index + 1} · ${esc(performance.weight)} ${esc(unitFor(performance))} × ${esc(performance.reps)} · RIR ${esc(performance.rir)}</li>`).join('') : '<li>Not completed</li>';
}

function workoutMarkup(workout, workoutIndex) {
  const tasks = workout.tasks || workout.queue || [];
  const groups = new Map();
  tasks.forEach((task, taskIndex) => {
    const name = task.performedName || task.name || 'Exercise';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push({task, taskIndex});
  });
  const completed = tasks.filter(task => task.completed || task.done?.length).length;
  const skipped = tasks.filter(task => task.skipped).length;
  const totals = new Map();
  tasks.forEach(task => { if (task.completed && !Array.isArray(task.completed)) { const unit = unitFor(task.completed); totals.set(unit, (totals.get(unit) || 0) + task.completed.weight * task.completed.reps); } });
  const volume = [...totals].map(([unit, total]) => `${Math.round(total).toLocaleString()} ${unit}`).join(' + ');
  const meta = [duration(workout), `${completed} completed`, skipped ? `${skipped} skipped` : '', volume ? `${volume} volume` : ''].filter(Boolean).join(' · ');
  return `<details class="history-workout"><summary><span><strong>${esc(workout.name || 'Workout')}</strong><small>${esc(new Date(workout.date).toLocaleDateString())} · ${esc(meta)}</small></span></summary><div class="history-body">${workout.note ? `<p class="history-note">${esc(workout.note)}</p>` : ''}${[...groups].map(([name, entries]) => `<section class="history-exercise"><h3>${esc(name)}</h3><ul>${entries.map(({task, taskIndex}) => task.completed && !Array.isArray(task.completed) || task.skipped ? setLine(task, workoutIndex, taskIndex) : legacyLines(task)).join('')}</ul></section>`).join('')}<button class="danger-outline" type="button" data-delete-workout="${workoutIndex}">Delete workout</button></div></details>`;
}

export function renderHistory() {
  const state = getState();
  app.innerHTML = `<header class="page-header"><h1>History</h1><p class="lede">Open a workout to review its sets and notes.</p></header><section class="history-list" aria-label="Workout history">${state.history.length ? state.history.map(workoutMarkup).join('') : '<div class="empty-state"><h2>No workouts yet</h2><p>Saved workouts will appear here.</p></div>'}</section><details class="settings-disclosure"><summary>Settings &amp; data</summary><div><section class="settings-card"><label for="unit">Unit for future sets</label><select id="unit"><option value="kg" ${state.settings?.unit !== 'lb' ? 'selected' : ''}>Kilograms (kg)</option><option value="lb" ${state.settings?.unit === 'lb' ? 'selected' : ''}>Pounds (lb)</option></select><p class="muted">Existing sets keep their recorded unit.</p><label for="weekly-goal">Weekly workout goal</label><select id="weekly-goal">${[1, 2, 3, 4, 5, 6, 7].map(goal => `<option value="${goal}" ${normalizeWeeklyGoal(state.settings?.weeklyGoal) === goal ? 'selected' : ''}>${goal} workout${goal === 1 ? '' : 's'} per week</option>`).join('')}</select><p class="muted">Monday–Sunday target.</p></section><section class="history-data"><div class="data-actions"><button id="export" type="button">Export backup</button><label class="import-button" tabindex="0">Import backup<input id="import" tabindex="-1" type="file" accept="application/json,.json"></label></div><p id="data-status" class="muted" role="status"></p></section>${state.history.length ? '<button class="danger-outline full" id="clear-history" type="button">Delete all workout history</button>' : ''}</div></details>`;
  const status = document.querySelector('#data-status');
  document.querySelector('#export').onclick = () => { download(state, 'maxsnr-backup.json'); status.textContent = 'Backup downloaded.'; };
  document.querySelector('#unit').onchange = async event => {
    state.settings = {...state.settings, unit: event.target.value === 'lb' ? 'lb' : 'kg'};
    try { await persist(); status.textContent = `Future sets will use ${state.settings.unit}.`; }
    catch (error) { status.textContent = error.message; }
  };
  document.querySelector('#weekly-goal').onchange = async event => {
    state.settings = {...state.settings, weeklyGoal: normalizeWeeklyGoal(Number(event.target.value))};
    try { await persist(); status.textContent = `Weekly goal set to ${state.settings.weeklyGoal} workouts.`; }
    catch (error) { status.textContent = error.message; }
  };
  const importInput = document.querySelector('#import');
  document.querySelector('.import-button').onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); importInput.click(); } };
  importInput.onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Backup is larger than 5 MB.');
      const imported = validateBackup(JSON.parse(await file.text()));
      if (!confirm('Replace the current app data with this backup? A copy of your current data will download first.')) return;
      if (state.history.length || state.active) download(state, 'maxsnr-before-import.json');
      setState(migrate(imported));
      await persist();
      location.reload();
    } catch (error) { status.textContent = error.message || 'Invalid backup file.'; }
    finally { event.target.value = ''; }
  };
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => { const form = document.querySelector(`#${button.dataset.edit}`); form.hidden = !form.hidden; if (!form.hidden) form.querySelector('input').focus(); });
  document.querySelectorAll('.set-edit').forEach(form => form.onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(form), weight = Number(data.get('weight')), reps = Number(data.get('reps'));
    if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) { status.textContent = 'Enter a valid weight and whole-number reps.'; return; }
    const task = state.history[Number(form.dataset.workout)].tasks[Number(form.dataset.task)];
    task.completed = {...task.completed, weight, reps, rir: data.get('rir')};
    try { await persist(); renderHistory(); }
    catch (error) { status.textContent = error.message; }
  });
  document.querySelectorAll('[data-delete-workout]').forEach(button => button.onclick = async () => {
    const index = Number(button.dataset.deleteWorkout);
    if (!confirm(`Delete ${state.history[index].name || 'this workout'} from history?`)) return;
    state.history.splice(index, 1);
    try { await persist(); renderHistory(); }
    catch (error) { status.textContent = error.message; }
  });
  document.querySelector('#clear-history')?.addEventListener('click', async () => {
    if (!confirm('Delete all workout history? Export a backup first if you may need it later.')) return;
    state.history = [];
    try { await persist(); renderHistory(); }
    catch (error) { status.textContent = error.message; }
  });
}
