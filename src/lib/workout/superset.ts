import type { ActiveWorkout, Task } from '../types.ts';

export const taskGroup = (task: Task | undefined) => task?.groupId || task?.exerciseId || task?.id;

const supersetLead = (active: ActiveWorkout, groupId: string) =>
  Number.isInteger(active?.supersetLeads?.[groupId]) ? active.supersetLeads[groupId] : 0;

export const setSupersetLead = (active: ActiveWorkout, task: Task | undefined) => {
  if (task?.groupType !== 'superset' || !task.groupId) return;
  active.supersetLeads ||= {};
  active.supersetLeads[task.groupId] = task.memberIndex as number;
};

const sameSupersetRound = (candidate: Task | undefined, task: Task | undefined) =>
  candidate?.groupType === 'superset' &&
  task?.groupType === 'superset' &&
  candidate.groupId === task.groupId &&
  candidate.set === task.set;

export const supersetPartnerIndex = (active: ActiveWorkout, task: Task) =>
  active?.tasks.findIndex(
    (candidate) =>
      sameSupersetRound(candidate, task) &&
      candidate.memberIndex !== task.memberIndex &&
      !candidate.completed &&
      !candidate.skipped,
  ) ?? -1;

export const nextSupersetRoundIndex = (active: ActiveWorkout, task: Task) => {
  if (task?.groupType !== 'superset' || !task.groupId) return -1;
  const lead = supersetLead(active, task.groupId);
  const candidates = active.tasks
    .map((candidate, index) => ({ candidate, index }))
    .filter(
      ({ candidate }) =>
        candidate.groupId === task.groupId &&
        candidate.set > task.set &&
        !candidate.completed &&
        !candidate.skipped,
    )
    .sort(
      (a, b) =>
        a.candidate.set - b.candidate.set ||
        (a.candidate.memberIndex ?? 0) - (b.candidate.memberIndex ?? 0),
    );
  return (
    candidates.find((item) => item.candidate.memberIndex === lead)?.index ??
    candidates[0]?.index ??
    -1
  );
};

export function supersetProgress(
  active: Pick<ActiveWorkout, 'tasks' | 'pos'> | null | undefined,
  task: Task | undefined = active?.tasks?.[active?.pos ?? 0],
) {
  if (task?.groupType !== 'superset' || !task.groupId) return null;
  const round = (active?.tasks || [])
    .filter(
      (candidate) => sameSupersetRound(candidate, task) && Number.isInteger(candidate.memberIndex),
    )
    .sort((a, b) => (a.memberIndex as number) - (b.memberIndex as number));
  const currentIndex = round.findIndex((candidate) => candidate === task);
  if (currentIndex < 0) return null;
  return {
    currentMember: currentIndex + 1,
    totalMembers: round.length,
    remaining: round
      .slice(currentIndex + 1)
      .filter((candidate) => !candidate.completed && !candidate.skipped).length,
  };
}
