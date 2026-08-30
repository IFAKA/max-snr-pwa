import { REST_MS } from '../constants.js';

export function task(item, set, groupId = null, groupType = 'exercise', memberIndex, groupLabel) {
  return {id: `${item.id}-${set}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, exerciseId: item.id, originalName: item.name, performedName: item.name, sets: item.sets, set, reps: item.reps, rir: item.rir, station: item.station, alternatives: item.alternatives, restMs: REST_MS, groupId, groupType, memberIndex, groupLabel, completed: null};
}

export function flatten(template) {
  const tasks = [];
  for (const item of template) {
    if (item.type === 'exercise') for (let set = 1; set <= item.sets; set++) tasks.push(task(item, set));
    if (item.type === 'superset') for (let set = 1; set <= item.members[0].sets; set++) for (const [i, member] of item.members.entries()) tasks.push(task(member, set, item.id, 'superset', i, item.label));
    if (item.type === 'equipmentBlock') for (const member of item.items) for (let set = 1; set <= member.sets; set++) tasks.push(task(member, set, item.id, 'equipmentBlock', null, item.label));
  }
  return tasks;
}
