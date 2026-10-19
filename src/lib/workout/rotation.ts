import type { RoutineDay, Workout } from '../types.ts';
import { rotationDays } from '../routine/routine-data.ts';
import { FLOOR_ROUTINE, HOME_FLOOR_ROUTINE } from './program.ts';

export type RestartKind = 'floor' | 'home';

export interface RestartPlan {
  day: string;
  name: string;
  routine: RoutineDay;
}

// Restart workouts are saved under these `day` values. They are not rotation days, so the
// rotation after one of them continues from A.
export const RESTART_PLANS: Record<RestartKind, RestartPlan> = {
  floor: { day: 'Restart', name: 'Restart', routine: FLOOR_ROUTINE },
  home: { day: 'Restart at home', name: 'Restart at home', routine: HOME_FLOOR_ROUTINE },
};

export const restartPlanForDay = (day: string | null | undefined): RestartPlan | undefined =>
  Object.values(RESTART_PLANS).find((plan) => plan.day === day);

/**
 * The next workout is the day after the last saved one in the cycle A → B → C → A. No weekday,
 * no "missed" state: a gap of any length leaves the next workout unchanged. A restart workout
 * (or an unknown day) sends the cycle back to A.
 */
export function nextRotationDay(
  history: ReadonlyArray<Pick<Workout, 'id' | 'day'>>,
  days: readonly string[] = rotationDays(),
): string {
  const last = history.reduce<(typeof history)[number] | undefined>(
    (latest, workout) => (!latest || Number(workout.id) > Number(latest.id) ? workout : latest),
    undefined,
  );
  const index = last ? days.indexOf(last.day) : -1;
  return days[(index + 1) % days.length];
}
