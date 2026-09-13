import { app, bindViewInteractions, esc, listMarkup, titleMarkup } from './dom.js';
import { getState } from './state.js';
import { persist } from './storage.js';
import { adaptiveRecommendations } from './workout/adaptation.js';
import { healthCoverage, weeklyGymAnalytics } from './workout/metrics.js';
import { OPTIMIZER_OUTPUT } from './workout/optimizer.js';

const today = () => new Date().toISOString();
const fields = ['weight', 'waist', 'shoulders', 'chest', 'arms', 'forearms', 'thighs', 'calves'];
const input = (id, label) =>
  `<label class="analytics-field"><span>${label}</span><input id="${id}" name="${id}" type="number" min="0" step="0.1" inputmode="decimal" /></label>`;

function valueRows(values) {
  return Object.entries(values || {})
    .map(
      ([key, value]) =>
        `<li><div class="list-link"><span>${esc(key)}</span><strong>${Number(value).toFixed(1)}</strong></div></li>`,
    )
    .join('');
}

function measurementRows(measurements) {
  const recent = measurements?.slice(-2) || [];
  if (recent.length < 2)
    return '<li><div class="list-link empty-state">Log two measurements to see rolling trends.</div></li>';
  return fields
    .map((key) => {
      const delta = Number(recent[1][key] || 0) - Number(recent[0][key] || 0);
      return `<li><div class="list-link"><span>${esc(key)}</span><strong>${Number(recent[1][key] || 0).toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})</strong></div></li>`;
    })
    .join('');
}

function bindAnalytics() {
  document.querySelector('#activity-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const state = getState();
    state.health.movementMinutes.push({
      date: today(),
      minutes: Number(form.get('movement') || 0),
    });
    state.health.cardioMinutes.push({
      date: today(),
      minutes: Number(form.get('cardio') || 0),
      intensity: form.get('intensity') || 'moderate',
    });
    state.health.measurements.push({
      date: today(),
      ...Object.fromEntries(fields.map((key) => [key, Number(form.get(key) || 0)])),
    });
    await persist();
    renderAnalytics();
  });
  bindViewInteractions();
}

export function renderAnalytics() {
  const state = getState();
  const metrics = weeklyGymAnalytics(state);
  const health = healthCoverage(state);
  const recommendations = adaptiveRecommendations({
    allocation: OPTIMIZER_OUTPUT.allocation,
    adherence: metrics.sessions / 2,
  });
  const summary = [
    ['Gym sessions', metrics.sessions],
    ['Gym minutes', metrics.minutes],
    ['Movement minutes', metrics.movementMinutes],
    ['Cardio minutes', metrics.cardioMinutes],
    [
      'WHO aerobic equivalent',
      health.aerobicMinimumMet ? 'On track' : `${metrics.cardioEquivalent}/150 min`,
    ],
  ]
    .map(
      ([label, value]) =>
        `<li><div class="list-link"><span>${label}</span><strong>${value}</strong></div></li>`,
    )
    .join('');
  const recommendationsMarkup = recommendations
    .map(
      (item) =>
        `<li><div class="list-link"><span>${esc(item.muscle || 'System')}</span><small>${esc(item.action)}</small></div></li>`,
    )
    .join('');
  const logForm = `<details class="analytics-details"><summary>Log this week</summary><form id="activity-form" class="analytics-form">${input('movement', 'Movement minutes')} ${input('cardio', 'Cardio minutes')}<label class="analytics-field"><span>Cardio intensity</span><select id="intensity" name="intensity"><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option></select></label>${fields.map((key) => input(key, key)).join('')}<button class="primary" type="submit">Save log</button></form></details>`;
  app.innerHTML = `<section aria-labelledby="analytics-title">${titleMarkup('Max-SNR analytics', 'analytics-title')}${listMarkup(summary, '', 'Weekly activity summary')}<h2>Measurement trend</h2><ul class="app-list">${measurementRows(state.health.measurements)}</ul><h2>Direct sets by muscle</h2><ul class="app-list">${valueRows(metrics.directSets) || '<li><div class="list-link empty-state">Complete a workout to populate this.</div></li>'}</ul><h2>Effective sets by muscle</h2><ul class="app-list">${valueRows(metrics.effectiveSets) || '<li><div class="list-link empty-state">Complete a workout to populate this.</div></li>'}</ul><h2>Optimizer recommendations</h2><ul class="app-list">${recommendationsMarkup}</ul>${logForm}</section>`;
  bindAnalytics();
}
