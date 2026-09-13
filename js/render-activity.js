import { app, bindViewInteractions, esc, titleMarkup } from './dom.js';
import { getState } from './state.js';
import { persist } from './storage.js';
import { navigateTo } from './navigation.js';
import { ACTIVITY_DEFINITIONS, activityDefinition } from './activity-data.js';
import { bindCountdown, countdownMarkup } from './render-workout/countdown.js';

const activityStorageKey = (type) => `maxsnr-activity-started:${type}`;
function activityStart(type, durationMs) {
  if (!durationMs) return null;
  const key = activityStorageKey(type);
  const stored = Number(globalThis.sessionStorage?.getItem(key));
  if (Number.isFinite(stored) && stored > 0) return stored;
  const startedAtMs = Date.now();
  globalThis.sessionStorage?.setItem(key, String(startedAtMs));
  return startedAtMs;
}
function clearActivityStart(type) {
  globalThis.sessionStorage?.removeItem(activityStorageKey(type));
}

function recordActivity(type, form, startedAtMs) {
  const definition = activityDefinition(type);
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
  const definition = activityDefinition(type);
  const startedAtMs = activityStart(type, definition.durationMs) || Date.now();
  const isMeasurement = type === 'measurement';
  const isTimed = definition.durationMs > 0;
  let completed = false;
  const finish = (form) => {
    if (completed) return;
    completed = true;
    recordActivity(type, form, startedAtMs);
    clearActivityStart(type);
    void persist().then(() => navigateTo('/'));
  };
  const body = isMeasurement
    ? '<form id="activity-form" class="activity-form"><label class="analytics-field"><span>Waist (cm)</span><input name="waist" type="number" min="1" step="0.1" inputmode="decimal" required /></label><button class="primary" type="submit">Save</button></form>'
    : `${isTimed ? countdownMarkup({ remainingMs: startedAtMs + definition.durationMs - Date.now(), label: `${definition.title} remaining`, variant: 'activity' }) : `<p class="workout-metric" aria-label="Activity metric">${esc(definition.metric)}</p>`}<button class="primary" id="finish-activity" type="button">${type === 'rest' ? 'Continue' : 'Finish'}</button>`;
  app.innerHTML = `<section class="workout-stage activity-stage${isTimed ? ' countdown-stage' : ''}" aria-labelledby="activity-title"><div class="stage-info">${titleMarkup(definition.title, 'activity-title')}</div><div class="thumb-zone">${body}</div></section>`;
  if (isTimed)
    bindCountdown({
      element: document.querySelector('#timer'),
      getEndAt: () => startedAtMs + definition.durationMs,
      onEnd: () => finish(null),
    });
  document.querySelector('#finish-activity')?.addEventListener('click', () => finish(null));
  document.querySelector('#activity-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    finish(new FormData(event.currentTarget));
  });
  bindViewInteractions();
  return definition;
}

export const supportedActivities = () => Object.keys(ACTIVITY_DEFINITIONS);
export { activityDefinition };
