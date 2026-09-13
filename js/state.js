export const DEFAULT_WEEKLY_GOAL = 4;
export const normalizeWeeklyGoal = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 7 ? value : DEFAULT_WEEKLY_GOAL;
export const emptyState = () => ({
  version: 2,
  history: [],
  active: null,
  settings: { unit: 'kg', weeklyGoal: DEFAULT_WEEKLY_GOAL },
  health: {
    movementMinutes: [],
    cardioMinutes: [],
    measurements: [],
    sedentary: {
      profileHoursPerDay: 10,
      exposureClass: 'high',
      logs: [],
      reminders: { enabled: false, intervalMinutes: 45 },
    },
  },
  updatedAt: 0,
});
let state = emptyState();
export const getState = () => state;
export const setState = (next) => {
  state = next;
  return state;
};
