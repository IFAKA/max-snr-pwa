import { esc, listMarkup } from './dom.js';

function routineItem(item) {
  if (item.type === 'exercise') return `<li class="routine-exercise"><span>${esc(item.name)}</span><span>${item.sets} × ${item.reps}</span></li>`;
  const members = item.members || item.items;
  return `<li class="routine-group ${item.type === 'superset' ? 'superset' : 'block'}"><p class="group-label">${esc(item.label)}</p>${listMarkup(members.map((exercise, index) => `<li class="routine-exercise"><span>${item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : ''}${esc(exercise.name)}</span><span>${exercise.sets} × ${exercise.reps}</span></li>`))}</li>`;
}

export function routineMarkup(items, className = '') {
  return listMarkup(items.map(routineItem), `exercise-list${className ? ` ${className}` : ''}`, 'Exercises');
}
