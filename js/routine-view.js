import { esc, listMarkup } from './dom.js';
import { isExerciseDefinition } from './routine-data.js';

const memberLabel = (index) => {
  let label = '';
  let value = index;
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return label;
};

function exerciseRow(exercise, prefix = '', group = null, memberIndex = null) {
  const isSuperset = group?.type === 'superset';
  const rowClass = isSuperset ? ' class="routine-superset-member"' : '';
  const groupAttributes = isSuperset
    ? ` data-group-type="superset" data-group-id="${esc(group.id)}" data-member-index="${memberIndex}"`
    : '';
  return `<li${rowClass}${groupAttributes}><div class="list-link"><span data-hold-scroll><span class="hold-scroll-text">${prefix}${esc(exercise.name)}</span></span><span>${exercise.sets} × ${exercise.reps}</span></div></li>`;
}

function routineRows(items) {
  return (Array.isArray(items) ? items : []).flatMap((item, itemIndex) => {
    if (isExerciseDefinition(item)) return [exerciseRow(item)];
    const members = (item?.members || item?.items || []).filter(isExerciseDefinition);
    if (!members.length) return [];
    const isSuperset = item.type === 'superset';
    const rows = [
      `<li class="routine-group-header${isSuperset ? ' routine-superset-header' : ''}" data-picker-skip${isSuperset ? ` data-group-type="superset" data-group-id="${esc(item.id)}"` : ''}><h2 class="list-link list-title" id="routine-group-title-${itemIndex}"><span>${esc(item.label)}</span>${isSuperset ? `<small>Superset · ${members.length} ${members.length === 1 ? 'exercise' : 'exercises'}</small>` : ''}</h2></li>`,
    ];
    return rows.concat(
      members.map((exercise, index) =>
        exerciseRow(
          exercise,
          isSuperset ? `${memberLabel(index)} · ` : '',
          isSuperset ? item : null,
          isSuperset ? index : null,
        ),
      ),
    );
  });
}

export function routineMarkup(items) {
  return listMarkup(routineRows(items), '', 'Exercises');
}
