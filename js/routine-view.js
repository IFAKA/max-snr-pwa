import { esc, listMarkup, titleMarkup } from './dom.js';

function exerciseRow(exercise, prefix = '') {
  return `<li class="routine-exercise"><span data-hold-scroll><span class="hold-scroll-text">${prefix}${esc(exercise.name)}</span></span><span>${exercise.sets} × ${exercise.reps}</span></li>`;
}

function routineRows(items) {
  return items.flatMap((item, itemIndex) => {
    if (item.type === 'exercise') return [exerciseRow(item)];
    const members = item.members || item.items || [];
    const rows = [`<li class="routine-group-label">${titleMarkup(item.label, `routine-group-title-${itemIndex}`, 'h2', 'list-title')}</li>`];
    return rows.concat(members.map((exercise, index) => exerciseRow(exercise, item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : '')));
  });
}

export function routineMarkup(items, className = '') {
  return listMarkup(routineRows(items), `exercise-list${className ? ` ${className}` : ''}`, 'Exercises');
}
