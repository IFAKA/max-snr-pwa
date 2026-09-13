import { app, bindViewInteractions, esc, titleMarkup } from './dom.js';
import { getState } from './state.js';
import { persist } from './storage.js';
import { navigateTo } from './navigation.js';

const ACTIVITY_DEFINITIONS = {
  walk: {
    title: 'Walk',
    metric: '30:00',
    minutes: 30,
    dimensions: ['aerobic', 'movement', 'sedentary'],
  },
  run: {
    title: 'Run',
    metric: '20:00',
    minutes: 20,
    intensity: 'vigorous',
    dimensions: ['aerobic', 'movement', 'sedentary'],
  },
  cycle: {
    title: 'Cycle',
    metric: '30:00',
    minutes: 30,
    dimensions: ['aerobic', 'movement', 'sedentary'],
  },
  move: { title: 'Move', metric: '03:00', minutes: 3, dimensions: ['movement', 'sedentary'] },
  measurement: { title: 'Check-in', metric: 'Waist', minutes: 0, dimensions: ['body'] },
  rest: { title: 'On track', metric: 'No action needed', minutes: 0, dimensions: [] },
};

function recordActivity(type, form, startedAtMs) {
  const definition = ACTIVITY_DEFINITIONS[type];
  if (!definition || type === 'rest') return;
  const startedAt = new Date(startedAtMs).toISOString();
  const durationMs = Math.max(0, Date.now() - startedAtMs);
  const activity = {
    id: `activity-${Date.now()}`,
    type,
    startedAt,
    completedAt: new Date().toISOString(),
    estimatedMinutes: definition.minutes,
    durationMinutes: definition.minutes ? Math.max(1, Math.round(durationMs / 60000)) : 0,
    durationMs,
    intensity: definition.intensity || 'light',
    dimensions: definition.dimensions,
    planned: true,
    contextual: type !== 'measurement',
    completed: true,
  };
  if (type === 'measurement') {
    const waist = Number(form?.get('waist'));
    if (Number.isFinite(waist) && waist > 0) activity.measurements = { waist };
  }
  const state = getState();
  state.health.activities.push(activity);
  if (type === 'measurement' && activity.measurements)
    state.health.measurements.push({ date: activity.completedAt, ...activity.measurements });
}

export function renderActivity(type) {
  const definition = ACTIVITY_DEFINITIONS[type] || ACTIVITY_DEFINITIONS.rest;
  const startedAtMs = Date.now();
  const isMeasurement = type === 'measurement';
  const body = isMeasurement
    ? '<form id="activity-form" class="activity-form"><label class="analytics-field"><span>Waist (cm)</span><input name="waist" type="number" min="1" step="0.1" inputmode="decimal" required /></label><button class="primary" type="submit">Save</button></form>'
    : `<button class="primary" id="finish-activity" type="button">${type === 'rest' ? 'Continue' : 'Finish'}</button>`;
  app.innerHTML = `<section class="workout-stage activity-stage" aria-labelledby="activity-title"><div class="stage-info">${titleMarkup(definition.title, 'activity-title')}<p class="workout-metric" aria-label="Activity metric">${esc(definition.metric)}</p></div><div class="thumb-zone">${body}</div></section>`;
  const finish = (form) => {
    recordActivity(type, form, startedAtMs);
    void persist().then(() => navigateTo('/'));
  };
  document.querySelector('#finish-activity')?.addEventListener('click', () => finish(null));
  document.querySelector('#activity-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    finish(new FormData(event.currentTarget));
  });
  bindViewInteractions();
  return definition;
}

export const supportedActivities = () => Object.keys(ACTIVITY_DEFINITIONS);
