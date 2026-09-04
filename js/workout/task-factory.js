import { REST_MS } from '../constants.js';

export function task(item, set, groupId = null, groupType = 'exercise', memberIndex, groupLabel) {
  return {id: `${item.id}-${set}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, exerciseId: item.id, originalName: item.name, performedName: item.name, sets: item.sets, set, reps: item.reps, rir: item.rir, station: item.station, alternatives: item.alternatives, restMs: REST_MS, groupId, groupType, memberIndex, groupLabel, completed: null};
}

export function flatten(template) {
  const tasks = [];
  const rounds = Math.max(...template.map(item => item.type === 'exercise' ? item.sets : item.type === 'superset' ? Math.max(...item.members.map(member => member.sets)) : Math.max(...item.items.map(member => member.sets))));
  for (let set = 1; set <= rounds; set++) for (const item of template) {
    if (item.type === 'exercise' && set <= item.sets) tasks.push(task(item, set));
    if (item.type === 'superset' && set <= Math.max(...item.members.map(member => member.sets))) for (const [i, member] of item.members.entries()) if (set <= member.sets) tasks.push(task(member, set, item.id, 'superset', i, item.label));
    if (item.type === 'equipmentBlock') for (const member of item.items) if (set <= member.sets) tasks.push(task(member, set, item.id, 'equipmentBlock', null, item.label));
  }
  return tasks;
}
