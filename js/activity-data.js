export const ACTIVITY_DEFINITIONS = {
  walk: {
    title: 'Walk',
    metric: '30:00',
    minutes: 30,
    durationMs: 30 * 60 * 1000,
    dimensions: ['aerobic', 'movement', 'sedentary'],
  },
  run: {
    title: 'Run',
    metric: '20:00',
    minutes: 20,
    durationMs: 20 * 60 * 1000,
    intensity: 'vigorous',
    dimensions: ['aerobic', 'movement', 'sedentary'],
  },
  cycle: {
    title: 'Cycle',
    metric: '30:00',
    minutes: 30,
    durationMs: 30 * 60 * 1000,
    dimensions: ['aerobic', 'movement', 'sedentary'],
  },
  move: {
    title: 'Move',
    metric: '03:00',
    minutes: 3,
    durationMs: 3 * 60 * 1000,
    dimensions: ['movement', 'sedentary'],
  },
  measurement: {
    title: 'Check-in',
    metric: 'Waist',
    minutes: 0,
    durationMs: 0,
    dimensions: ['body'],
  },
  rest: {
    title: 'On track',
    metric: 'No action needed',
    minutes: 0,
    durationMs: 0,
    dimensions: [],
  },
};

export const activityDefinition = (type) => ACTIVITY_DEFINITIONS[type] || ACTIVITY_DEFINITIONS.rest;
