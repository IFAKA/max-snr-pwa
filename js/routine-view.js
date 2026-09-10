import { esc, listMarkup } from './dom.js';
import { isExerciseDefinition } from './routine-data.js';

function exerciseRow(exercise, prefix = '') {
  return `<li><div class="list-link"><span data-hold-scroll><span class="hold-scroll-text">${prefix}${esc(exercise.name)}</span></span><span>${exercise.sets} × ${exercise.reps}</span></div></li>`;
}

function routineRows(items) {
  return (Array.isArray(items) ? items : []).flatMap((item, itemIndex) => {
    if (isExerciseDefinition(item)) return [exerciseRow(item)];
    const members = (item?.members || item?.items || []).filter(isExerciseDefinition);
    if (!members.length) return [];
    const rows = [
      `<li data-picker-skip><h2 class="list-link list-title" id="routine-group-title-${itemIndex}">${esc(item.label)}</h2></li>`,
    ];
    return rows.concat(
      members.map((exercise, index) =>
        exerciseRow(exercise, item.type === 'superset' ? `${index ? 'B' : 'A'} · ` : ''),
      ),
    );
  });
}

export function routineMarkup(items) {
  return listMarkup(routineRows(items), '', 'Exercises');
}
