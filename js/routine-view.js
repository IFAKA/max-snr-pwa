import { esc } from './dom.js';

function routineItem(item) {
  if (item.type === 'exercise') return `<div class="routine-exercise"><span>${esc(item.name)}</span><span>${item.sets} × ${item.reps}</span></div>`;
  const members = item.members || item.items;
  return `<div class="routine-group ${item.type === 'superset' ? 'superset' : 'block'}"><p class="group-label">${esc(item.label)}</p>${members.map((exercise, index) => `<div class="routine-exercise"><span>${item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : ''}${esc(exercise.name)}</span><span>${exercise.sets} × ${exercise.reps}</span></div>`).join('')}</div>`;
}

export function routineMarkup(items, className = '') {
  return `<div class="routine-list${className ? ` ${className}` : ''}">${items.map(routineItem).join('')}</div>`;
}
