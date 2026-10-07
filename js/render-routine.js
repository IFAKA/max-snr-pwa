import { app, bindViewInteractions, esc, icon, listMarkup, titleMarkup } from './dom.js';
import { configuredDays, dayItems, isWorkoutDay, workoutName } from './routine-data.js';
import { routineMarkup } from './routine-view.js';
import { startRow, bindStartDialog } from './render-workout/shared.js';
import { minutesPerSetEstimate, selectedFrequency } from './workout.js';
import { getState } from './state.js';
import { isCurrentDayComplete } from './render-today.js';

function weeklySummary(state) {
  const prescription = state.prescription;
  if (!prescription) {
    const frontier = selectedFrequency({ state });
    return `${frontier.days} gym days · about ${frontier.minutes} min/week. The optimizer favors the lowest-visit option that still trains all major muscle groups twice weekly.`;
  }
  const weeklySets = Object.values(prescription.weeklySetAllocation || {}).reduce(
    (sum, sets) => sum + sets,
    0,
  );
  const minutes = Math.round(weeklySets * minutesPerSetEstimate(state));
  return `${prescription.daysPerWeek} gym days · about ${minutes} min/week. Each major muscle group is trained at least twice a week.`;
}

export function renderRoutine() {
  const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date());
  const params = new URLSearchParams(location.search);
  const requestedDay = params.get('day');
  if (requestedDay && configuredDays().includes(requestedDay))
    return params.get('view') === 'exercises'
      ? renderExercises(requestedDay)
      : renderDay(requestedDay);
  const days = configuredDays().map((day) =>
    isWorkoutDay(day) && !isCurrentDayComplete(getState().history, day)
      ? `<li class="${day === today ? 'today' : ''}"><a class="list-link" href="/routine/?day=${encodeURIComponent(day)}"><span class="day-label" data-hold-scroll><span class="hold-scroll-text">${esc(day)}</span>${day === today ? '<small class="day-indicator" aria-label="Current day"></small>' : ''}</span>${icon('chevron', 'Open day')}</a></li>`
      : isWorkoutDay(day)
        ? `<li class="complete-row"><button class="list-link" type="button" disabled><span class="day-label"><span>${esc(day)}</span></span>${icon('check', 'Workout complete')}</button></li>`
        : `<li class="rest-day"><button class="list-link is-disabled" type="button" disabled><span data-hold-scroll><span class="hold-scroll-text">${esc(day)} · Rest</span></span>${icon('dash', 'Rest day')}</button></li>`,
  );
  app.innerHTML = `<section aria-labelledby="routine-title">${titleMarkup('Routine', 'routine-title')}<p class="routine-summary">${esc(weeklySummary(getState()))}</p>${listMarkup(days, '', 'Routine days')}</section>`;
  bindViewInteractions();
}

function renderDay(day) {
  const available = isWorkoutDay(day);
  const rows = available
    ? [
        `<li><a class="list-link" href="?day=${encodeURIComponent(day)}&view=exercises"><span>Exercises</span>${icon('chevron', 'Open exercises')}</a></li>`,
        startRow(day),
      ]
    : [
        `<li><button class="list-link is-disabled" type="button" disabled><span>Start</span>${icon('dash', 'Unavailable')}</button></li>`,
      ];
  app.innerHTML = `<section aria-labelledby="day-title">${titleMarkup(isWorkoutDay(day) ? workoutName(day) : 'Rest', 'day-title')}${listMarkup(rows, '', 'Workout actions')}</section>`;
  bindStartDialog();
  bindViewInteractions();
}

function renderExercises(day) {
  const items = dayItems(day);
  app.innerHTML = `<section aria-labelledby="exercise-title">${titleMarkup('Exercises', 'exercise-title')}${routineMarkup(items)}</section>`;
  bindViewInteractions();
}
