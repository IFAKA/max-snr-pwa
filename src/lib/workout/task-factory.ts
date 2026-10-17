import type { ExerciseDefinition, RoutineItem, Task } from '../types.ts';
import { REST_MS } from '../constants.ts';
import { groupMembers, isExerciseDefinition } from '../routine/routine-data.ts';

export function task(
  item: ExerciseDefinition,
  set: number,
  groupId: string | null = null,
  groupType: Task['groupType'] = 'exercise',
  memberIndex?: number,
  groupLabel?: string,
): Task {
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
    targetRepRange: item.reps,
    targetRir: item.rir,
    workingSets: item.sets,
    load: null,
    primary: { ...(item.primary || {}) },
    secondary: { ...(item.secondary || {}) },
    station: item.station,
    alternatives: item.alternatives,
    restMs,
    cutPriority: item.cutPriority || null,
    groupId,
    groupType,
    memberIndex,
    groupLabel,
    completed: null,
  };
}

const exercisesForGroup = (item: RoutineItem) =>
  (groupMembers(item) || []).filter(isExerciseDefinition);

export function flatten(template: RoutineItem[] | null | undefined): Task[] {
  const tasks: Task[] = [];
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
          tasks.push(task(member, set, item.id, 'equipmentBlock', undefined, item.label));
      }
    }
  }
  return tasks;
}
