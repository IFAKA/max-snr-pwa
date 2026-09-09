import { REST_MS } from '../constants.js';
import { isExerciseDefinition } from '../routine-data.js';

export function task(item, set, groupId = null, groupType = 'exercise', memberIndex, groupLabel) {
  const lowerReps = Number.parseInt(item.reps, 10);
  const restMs = item.restMs || (item.sets >= 3 && lowerReps <= 8 ? 120000 : 60000) || REST_MS;
  return {
    id: `${item.id}-${set}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    exerciseId: item.id,
    originalName: item.name,
    performedName: item.name,
    sets: item.sets,
    set,
    reps: item.reps,
    rir: item.rir,
    station: item.station,
    alternatives: item.alternatives,
    restMs,
    groupId,
    groupType,
    memberIndex,
    groupLabel,
    completed: null,
  };
}

function exercisesForGroup(item) {
  if (item?.type === 'superset' || item?.type === 'equipmentBlock')
    return Array.isArray(item[item.type === 'superset' ? 'members' : 'items'])
      ? item[item.type === 'superset' ? 'members' : 'items'].filter(isExerciseDefinition)
      : [];
  return [];
}

export function flatten(template) {
  const tasks = [];
  for (const item of Array.isArray(template) ? template : []) {
    if (isExerciseDefinition(item)) {
      for (let set = 1; set <= item.sets; set++) tasks.push(task(item, set));
    }
    if (item?.type === 'superset') {
      const members = exercisesForGroup(item);
      const rounds = members.length ? Math.max(...members.map((member) => member.sets)) : 0;
      for (let set = 1; set <= rounds; set++) {
        members.forEach((member, memberIndex) => {
          if (set <= member.sets)
            tasks.push(task(member, set, item.id, 'superset', memberIndex, item.label));
        });
      }
    }
    if (item?.type === 'equipmentBlock') {
      for (const member of exercisesForGroup(item)) {
        for (let set = 1; set <= member.sets; set++)
          tasks.push(task(member, set, item.id, 'equipmentBlock', null, item.label));
      }
    }
  }
  return tasks;
}
