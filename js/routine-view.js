import { esc, listMarkup } from './dom.js';

function exerciseRow(exercise, prefix = '') {
  return `<li class="routine-exercise"><span data-hold-scroll><span class="hold-scroll-text">${prefix}${esc(exercise.name)}</span></span><span>${exercise.sets} × ${exercise.reps}</span></li>`;
}

function routineRows(items) {
  return items.flatMap(item => {
    if (item.type === 'exercise') return [exerciseRow(item)];
    const members = item.members || item.items || [];
    const rows = [`<li class="routine-group-label"><span class="group-label">${esc(item.label)}</span></li>`];
    return rows.concat(members.map((exercise, index) => exerciseRow(exercise, item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : '')));
  });
}

export function routineMarkup(items, className = '') {
  return listMarkup(routineRows(items), `exercise-list${className ? ` ${className}` : ''}`, 'Exercises');
}
