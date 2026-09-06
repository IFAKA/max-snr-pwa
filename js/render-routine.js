import { app, esc } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten, start } from './workout.js';

function routineItem(item) {
  if (item.type === 'exercise') return `<div class="routine-exercise"><span>${esc(item.name)}</span><span>${item.sets} × ${item.reps}</span></div>`;
  const members = item.members || item.items;
  const kind = item.type === 'superset' ? 'Superset · alternate A/B' : 'Equipment block · stay at one station';
  return `<div class="routine-group ${item.type === 'superset' ? 'superset' : 'block'}"><p class="group-label">${esc(item.label)}</p><p class="muted group-help">${kind}</p>${members.map((exercise, index) => `<div class="routine-exercise"><span>${item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : ''}${esc(exercise.name)}</span><span>${exercise.sets} × ${exercise.reps}</span></div>`).join('')}</div>`;
}

export function renderRoutine() {
  const active = getState().active;
  app.innerHTML = `<header class="page-header"><p class="eyebrow">Weekly plan</p><h1>Routine</h1><p class="lede">Working sets are completed exercise by exercise. Supersets alternate A/B. Every workout starts with an optional plank and ends with an optional cooldown.</p></header>${active ? `<section class="active-card"><p class="eyebrow">In progress</p><h2>${esc(active.name)}</h2><a class="button primary" href="/workout/">Resume workout</a></section>` : ''}` + Object.entries(ROUTINE).map(([day, items]) => items ? `<section class="routine-day"><div class="row"><div><h2>${day}</h2><p><b>${esc(NAMES[day])}</b> · ${flatten(items).length} sets</p></div><button type="button" data-day="${day}">${active ? 'Replace' : 'Start'}</button></div><div class="routine-list">${items.map(routineItem).join('')}</div></section>` : `<section class="routine-day rest"><div class="row"><h2>${day}</h2><span>Rest</span></div></section>`).join('');
  document.querySelectorAll('[data-day]').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try { if (await start(button.dataset.day)) location.assign('/workout/'); else button.disabled = false; }
    catch (error) { button.disabled = false; alert(error.message); }
  });
}
