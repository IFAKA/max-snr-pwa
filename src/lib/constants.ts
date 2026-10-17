export const REST_MS = 90000;
export const PLANK_MS = 60000;
export const STRETCH_MS = 30000;
export const SESSION_TARGET_MS = 55 * 60 * 1000;
export const SESSION_CAP_MS = 60 * 60 * 1000;
export const DB_NAME = 'maxsnr-workout';
export const DB_VERSION = 1;
export const STORAGE_KEY = 'maxsnr';
export const DEFAULT_WEEKLY_GOAL = 4;
export const normalizeWeeklyGoal = (value: unknown): number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7
    ? (value as number)
    : DEFAULT_WEEKLY_GOAL;
