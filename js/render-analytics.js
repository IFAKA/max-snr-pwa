import { app, bindViewInteractions, esc, titleMarkup } from './dom.js';
import { getState } from './state.js';
import { persist } from './storage.js';
import { adaptiveRecommendations, rollingMuscleTrends } from './workout/adaptation.js';
import {
  healthCoverage,
  sedentaryStatus,
  sessionTimingComparison,
  weeklyGymAnalytics,
} from './workout/metrics.js';
import { EXERCISES, compareFrequencies, selectedFrequency } from './workout/optimizer.js';
import {
  allocationDecisionReport,
  marginalCandidateReport,
  marginalSetReport,
  sensitivityAnalysis,
} from './workout/optimizer-analysis.js';
import { measurementFields, recordMeasurement } from './health-data.js';

const today = () => new Date().toISOString();
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
      const previousValue = recent[0][key];
      const latestValue = recent[1][key];
      if (previousValue === undefined || latestValue === undefined)
        return `<li><div class="list-link"><span>${esc(key)}</span><strong>—</strong></div></li>`;
      const delta = Number(latestValue) - Number(previousValue);
      return `<li><div class="list-link"><span>${esc(key)}</span><strong>${raw(Number(latestValue))} (${delta >= 0 ? '+' : ''}${raw(delta)})</strong></div></li>`;
    })
    .join('');
}

function bindAnalytics() {
  document.querySelector('#activity-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const state = getState();
    const movement = form.get('movement');
    if (movement) state.health.movementMinutes.push({ date: today(), minutes: Number(movement) });
    const cardio = form.get('cardio');
    if (cardio)
      state.health.cardioMinutes.push({
        date: today(),
        minutes: Number(cardio),
        intensity: form.get('intensity') || 'moderate',
      });
    recordMeasurement(
      state,
      Object.fromEntries(measurementFields.map((key) => [key, form.get(key)])),
    );
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
  const prescriptionEntries = Object.entries(state.prescription?.weeklySetAllocation || {})
    .map(([id, sets]) => [Object.keys(EXERCISES).find((key) => EXERCISES[key].id === id), sets])
    .filter(([key]) => key);
  const allocation = {};
  prescriptionEntries.forEach(([key, sets]) =>
    Object.keys(EXERCISES[key].primary || {}).forEach((muscle) => {
      allocation[muscle] = (allocation[muscle] || 0) + sets;
    }),
  );
  const selected = selectedFrequency({ state, allocation: prescriptionEntries });
  const timing = sessionTimingComparison(state.history, selected.sessionMinutes);
  const sensitivity = sensitivityAnalysis();
  const decisions = allocationDecisionReport();
  const recommendations = adaptiveRecommendations({
    allocation,
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
      `${raw(metrics.cardioEquivalent + metrics.activityCardioEquivalent)}/150 moderate-equivalent&nbsp;min`,
    ],
    [
      'Sedentary exposure',
      `${raw(sedentary.profileHoursPerDay)}&nbsp;h/day · ${sedentary.exposureClass}`,
    ],
    ['Sitting interruptions', sedentary.interruptions],
    ['Longest sitting logged', `${raw(sedentary.longestUninterruptedMinutes)}&nbsp;min`],
    [
      'Daily movement',
      `${raw(metrics.movementMinutes + metrics.activityMinutes)}&nbsp;min&nbsp;logged`,
    ],
    [
      'Gym timing',
      timing.observedCount
        ? `${raw(timing.mean)}&nbsp;min observed vs ${raw(timing.estimate)}&nbsp;min model`
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
  const frequencyRows = compareFrequencies({ state, allocation: prescriptionEntries })
    .map(
      (candidate) =>
        `<li><div class="list-link"><span>${candidate.days} days · ${candidate.minutes}&nbsp;min/week</span><strong>${raw(candidate.utility)}</strong></div></li>`,
    )
    .join('');
  const logForm = `<details class="analytics-details"><summary>Log Health Data</summary><form id="activity-form" class="analytics-form">${input('movement', 'Light/general movement minutes')} ${input('cardio', 'Cardio minutes')}<label class="analytics-field"><span>Cardio intensity</span><select id="intensity" name="intensity"><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option></select></label>${input('sedentaryHours', 'Approximate sitting hours/day')} ${input('longestSit', 'Longest uninterrupted sitting period (optional)', '1')} ${input('interruptions', 'Movement interruptions today', '1')}${measurementFields.map((key) => input(key, key)).join('')}<label class="analytics-field"><span><input name="reminders" type="checkbox" /> Enable movement reminder</span></label>${input('reminderInterval', 'Reminder interval (behavioral choice, not a proven threshold)', '1')}<button class="primary" type="submit">Save log</button></form></details>`;
  const heading = (text) =>
    `<li data-picker-skip class="list-block"><h2 class="list-link list-title">${esc(text)}</h2></li>`;
  const note = (text) =>
    `<li data-picker-skip class="list-block"><div class="list-link empty-state"><span>${text}</span></div></li>`;
  const empty = (text) => note(text);
  const rows = (markup, fallback) => markup || empty(fallback);
  const block = (markup) => markup.replaceAll('<li><div', '<li class="list-block"><div');
  const details = (title, body) =>
    `<li data-picker-skip class="list-block"><details class="analytics-details"><summary>${title}</summary>${body}</details></li>`;
  const detailList = (markup) => `<ul class="analytics-rows">${block(markup)}</ul>`;
  const frequencyNote = `The current model winner is ${selected.days} days. Three days wins ${threeWins} of ${sensitivity.twoVsThree.length} configured 2-vs-3 scenarios. At default time and visit costs, three days needs relief greater than ${raw(sensitivity.threeDayReliefThreshold(0.08, 2))} model units to beat two days.`;
  const items = [
    block(summary),
    heading('Sedentary Behavior'),
    note(
      `${esc(sedentary.recommendation)} Reminders replace sitting with brief movement; their interval is configurable and is not presented as a safety cutoff.`,
    ),
    heading('Measurement Trend'),
    block(measurementRows(state.health.measurements)),
    heading('Direct Sets by Muscle'),
    block(rows(valueRows(metrics.directSets), 'Complete a workout to populate this.')),
    heading('Fractional Indirect Sets by Muscle'),
    block(rows(valueRows(metrics.fractionalSets), 'Complete a workout to populate this.')),
    heading('Effective Sets by Muscle'),
    block(rows(valueRows(metrics.effectiveSets), 'Complete a workout to populate this.')),
    heading('Optimizer Recommendations'),
    block(recommendationsMarkup),
    details(
      'Marginal Utility per Individual Set',
      `<p class="routine-summary">Raw model units per modeled minute. Values are ordinal heuristics, not biological measurements.</p>${detailList(marginalRows)}<h3>Allocation Decisions</h3>${detailList(decisionRows)}<h3>Next-Set Candidates</h3>${detailList(candidateRows)}`,
    ),
    details(
      'Frequency Sensitivity',
      `<p class="routine-summary">${frequencyNote}</p>${detailList(frequencyRows)}`,
    ),
    `<li data-picker-skip class="list-block">${logForm}</li>`,
  ].join('');
  app.innerHTML = `<section aria-labelledby="analytics-title">${titleMarkup('Workout analytics', 'analytics-title')}<ul class="app-list" aria-label="Workout analytics">${items}</ul></section>`;
  bindAnalytics();
}
