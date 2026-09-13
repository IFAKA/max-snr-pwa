import { app, bindViewInteractions, esc, listMarkup, titleMarkup } from './dom.js';
import { getState } from './state.js';
import { persist } from './storage.js';
import { adaptiveRecommendations, rollingMuscleTrends } from './workout/adaptation.js';
import {
  healthCoverage,
  sedentaryStatus,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from './workout/metrics.js';
import { OPTIMIZER_OUTPUT, compareFrequencies, selectedFrequency } from './workout/optimizer.js';
import {
  allocationDecisionReport,
  marginalCandidateReport,
  marginalSetReport,
  sensitivityAnalysis,
} from './workout/optimizer-analysis.js';

const today = () => new Date().toISOString();
const measurementFields = [
  'weight',
  'waist',
  'shoulders',
  'chest',
  'arms',
  'forearms',
  'thighs',
  'calves',
];
const input = (id, label, step = '0.1') =>
  `<label class="analytics-field"><span>${label}</span><input id="${id}" name="${id}" type="number" min="0" step="${step}" inputmode="decimal" /></label>`;
const raw = (value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? String(Number(value.toFixed(1)))
    : String(value);

function valueRows(values) {
  return Object.entries(values || {})
    .map(
      ([key, value]) =>
        `<li><div class="list-link"><span>${esc(key)}</span><strong>${raw(value)}</strong></div></li>`,
    )
    .join('');
}

const contribution = (values) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(values || {}).map(([key, value]) => [key, Number(Number(value).toFixed(1))]),
    ),
  );

function measurementRows(measurements) {
  const recent = measurements?.slice(-2) || [];
  if (recent.length < 2)
    return '<li><div class="list-link empty-state">Log two measurements to see rolling trends.</div></li>';
  return measurementFields
    .map((key) => {
      const delta = Number(recent[1][key] || 0) - Number(recent[0][key] || 0);
      return `<li><div class="list-link"><span>${esc(key)}</span><strong>${raw(Number(recent[1][key] || 0))} (${delta >= 0 ? '+' : ''}${raw(delta)})</strong></div></li>`;
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
      ...Object.fromEntries(measurementFields.map((key) => [key, Number(form.get(key) || 0)])),
    });
    state.health.sedentary.logs.push({
      date: today(),
      hours: Number(form.get('sedentaryHours') || state.health.sedentary.profileHoursPerDay),
      longestUninterruptedMinutes: Number(form.get('longestSit') || 0),
      interruptions: Number(form.get('interruptions') || 0),
    });
    state.health.sedentary.reminders = {
      enabled: form.get('reminders') === 'on',
      intervalMinutes: Number(form.get('reminderInterval') || 45),
    };
    await persist();
    renderAnalytics();
  });
  bindViewInteractions();
}

export function renderAnalytics() {
  const state = getState();
  const metrics = weeklyGymAnalytics(state);
  const health = healthCoverage(state);
  const sedentary = sedentaryStatus(state);
  const selected = selectedFrequency(state);
  const timing = sessionTimingComparison(state.history, selected.sessionMinutes);
  const sensitivity = sensitivityAnalysis();
  const decisions = allocationDecisionReport();
  const recommendations = adaptiveRecommendations({
    allocation: OPTIMIZER_OUTPUT.allocation,
    adherence: metrics.sessions / 2,
    trends: rollingMuscleTrends(state.history),
    actualTimeCost: Object.fromEntries(
      Object.entries(metrics.effectiveSets).map(([muscle, sets]) => [
        muscle,
        metrics.minutes
          ? (metrics.minutes * sets) /
            Object.values(metrics.effectiveSets).reduce((sum, value) => sum + value, 0)
          : 0,
      ]),
    ),
  });
  const summary = [
    ['Strength', `${health.resistanceDays}/2 days`],
    [
      'Aerobic MVPA',
      `${raw(metrics.cardioEquivalent + metrics.activityCardioEquivalent)}/150 moderate-equivalent min`,
    ],
    [
      'Sedentary exposure',
      `${raw(sedentary.profileHoursPerDay)} h/day · ${sedentary.exposureClass}`,
    ],
    ['Sitting interruptions', sedentary.interruptions],
    ['Longest sitting logged', `${raw(sedentary.longestUninterruptedMinutes)} min`],
    ['Daily movement', `${raw(metrics.movementMinutes + metrics.activityMinutes)} min logged`],
    [
      'Gym timing',
      timing.observedCount
        ? `${raw(timing.mean)} min observed vs ${raw(timing.estimate)} min model`
        : 'Awaiting session timestamps',
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
  const marginalRows = marginalSetReport()
    .map(
      (set) =>
        `<li><div class="list-link"><span>${esc(set.exercise)} · set ${set.set}</span><small>u/min ${raw(set.utilityPerMinute)} · direct ${esc(contribution(set.direct))} · fractional ${esc(contribution(set.fractional))}</small></div></li>`,
    )
    .join('');
  const candidateRows = marginalCandidateReport()
    .map(
      (set) =>
        `<li><div class="list-link"><span>Next: ${esc(set.exercise)} set ${set.nextSet}</span><small>u/min ${raw(set.utilityPerMinute)}</small></div></li>`,
    )
    .join('');
  const decisionRows = [
    ['Calves', decisions.calfFourth.reason],
    ['Wrist extensions', decisions.wristExtension.reason],
    ['Side delts', decisions.sideDelts.reason],
    ['Lats', decisions.lats.reason],
  ]
    .map(
      ([label, reason]) =>
        `<li><div class="list-link"><span>${esc(label)}</span><small>${esc(reason)}</small></div></li>`,
    )
    .join('');
  const threeWins = sensitivity.twoVsThree.filter((item) => item.winner === 3).length;
  const frequencyRows = compareFrequencies({ state })
    .map(
      (candidate) =>
        `<li><div class="list-link"><span>${candidate.days} days · ${candidate.minutes} min/week</span><strong>${raw(candidate.utility)}</strong></div></li>`,
    )
    .join('');
  const logForm = `<details class="analytics-details"><summary>Log health data</summary><form id="activity-form" class="analytics-form">${input('movement', 'Light/general movement minutes')} ${input('cardio', 'Cardio minutes')}<label class="analytics-field"><span>Cardio intensity</span><select id="intensity" name="intensity"><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option></select></label>${input('sedentaryHours', 'Approximate sitting hours/day')} ${input('longestSit', 'Longest uninterrupted sitting period (optional)', '1')} ${input('interruptions', 'Movement interruptions today', '1')}${measurementFields.map((key) => input(key, key)).join('')}<label class="analytics-field"><span><input name="reminders" type="checkbox" /> Enable movement reminder</span></label>${input('reminderInterval', 'Reminder interval (behavioral choice, not a proven threshold)', '1')}<button class="primary" type="submit">Save log</button></form></details>`;
  app.innerHTML = `<section aria-labelledby="analytics-title">${titleMarkup('Max-SNR analytics', 'analytics-title')}${listMarkup(summary, '', 'Weekly health dimensions')}<h2>Sedentary behavior</h2><p class="routine-summary">${esc(sedentary.recommendation)} Reminders replace sitting with brief movement; their interval is configurable and is not presented as a safety cutoff.</p><h2>Measurement trend</h2><ul class="app-list">${measurementRows(state.health.measurements)}</ul><h2>Direct sets by muscle</h2><ul class="app-list">${valueRows(metrics.directSets) || '<li><div class="list-link empty-state">Complete a workout to populate this.</div></li>'}</ul><h2>Fractional indirect sets by muscle</h2><ul class="app-list">${valueRows(metrics.fractionalSets) || '<li><div class="list-link empty-state">Complete a workout to populate this.</div></li>'}</ul><h2>Effective sets by muscle</h2><ul class="app-list">${valueRows(metrics.effectiveSets) || '<li><div class="list-link empty-state">Complete a workout to populate this.</div></li>'}</ul><h2>Optimizer recommendations</h2><ul class="app-list">${recommendationsMarkup}</ul><details class="analytics-details"><summary>Marginal utility per individual set</summary><p class="routine-summary">Raw model units per modeled minute. Values are ordinal heuristics, not biological measurements.</p><ul class="app-list">${marginalRows}</ul><h3>Allocation decisions</h3><ul class="app-list">${decisionRows}</ul><h3>Next-set candidates</h3><ul class="app-list">${candidateRows}</ul></details><details class="analytics-details"><summary>Frequency sensitivity</summary><p class="routine-summary">The current model winner is ${selected.days} days. Three days wins ${threeWins} of ${sensitivity.twoVsThree.length} configured 2-vs-3 scenarios. At default time and visit costs, three days needs relief greater than ${raw(sensitivity.threeDayReliefThreshold(0.08, 2))} model units to beat two days.</p><ul class="app-list">${frequencyRows}</ul></details>${logForm}</section>`;
  bindAnalytics();
}
