import { esc } from './dom.js';

function routineItem(item) {
  if (item.type === 'exercise') return `<li class="routine-exercise"><span>${esc(item.name)}</span><span>${item.sets} × ${item.reps}</span></li>`;
  const members = item.members || item.items;
  return `<li class="routine-group ${item.type === 'superset' ? 'superset' : 'block'}"><p class="group-label">${esc(item.label)}</p><ul>${members.map((exercise, index) => `<li class="routine-exercise"><span>${item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : ''}${esc(exercise.name)}</span><span>${exercise.sets} × ${exercise.reps}</span></li>`).join('')}</ul></li>`;
}

export function routineMarkup(items, className = '') {
  return `<ul class="routine-list${className ? ` ${className}` : ''}">${items.map(routineItem).join('')}</ul>`;
}
