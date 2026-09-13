export const DEFAULT_WEEKLY_GOAL = 4;
export const normalizeWeeklyGoal = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 7 ? value : DEFAULT_WEEKLY_GOAL;
const DEFAULT_PROFILE = {
  sex: 'male',
  age: 26,
  heightCm: 172,
  weightKg: 73.45,
  measurements: {
    waistCm: 79,
    chestCm: 92,
    shouldersCm: 111,
    bicepsCm: 28.5,
    forearmsCm: 26,
    calvesCm: 36,
    quadsCm: 52,
    neckCm: 37,
  },
};
export const emptyState = () => ({
  version: 2,
  history: [],
  active: null,
  settings: {
    unit: 'kg',
    weeklyGoal: DEFAULT_WEEKLY_GOAL,
    recommendation: null,
    profile: { ...DEFAULT_PROFILE, measurements: { ...DEFAULT_PROFILE.measurements } },
  },
  health: {
    activities: [],
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
