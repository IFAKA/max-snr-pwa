import { state } from './render-workout/shared.js';
import { renderWarmup } from './render-workout/warmup.js';
import { renderPlank } from './render-workout/plank.js';
import { renderLifting } from './render-workout/lifting.js';
import { renderRest } from './render-workout/rest.js';
import { renderStretch } from './render-workout/stretch.js';
import { renderCompletion } from './render-workout/completion.js';
import { keepAwake } from './dom.js';
import { app, dayNow, esc, pageNav } from './dom.js';
import { getState } from './state.js';
import { ROUTINE, NAMES } from './routine-data.js';
import { flatten, start } from './workout.js';
import { routineMarkup } from './routine-view.js';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function localDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function historyForDay(history, day) {
  return history.filter(workout => workout.day === day);
}

function historyForDate(history, date) {
  return history.filter(workout => localDate(workout.completedAt || workout.date) === date);
}

function missedDays(history, selectedDay) {
  const todayIndex = DAY_ORDER.indexOf(dayNow());
  const selectedIndex = DAY_ORDER.indexOf(selectedDay);
  const end = selectedDay === dayNow() ? todayIndex : Math.min(selectedIndex, todayIndex);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - todayIndex);
  const weekDates = new Set(DAY_ORDER.map((_, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); return localDate(date); }));
  return DAY_ORDER.filter((day, index) => index < end && ROUTINE[day] && !historyForDay(history, day).some(workout => weekDates.has(localDate(workout.completedAt || workout.date))));
}

function workoutHistoryMarkup(workouts) {
  if (!workouts.length) return '';
  return `<section class="setup-history"><h2>Completed</h2>${workouts.map(workout => `<a class="button secondary" href="/history/">${esc(new Date(workout.completedAt || workout.date).toLocaleDateString())} · View history</a>`).join('')}</section>`;
}

function renderStart(day) {
  const state = getState();
  const items = ROUTINE[day];
  const selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);
  selectedDate.setDate(selectedDate.getDate() + DAY_ORDER.indexOf(day) - DAY_ORDER.indexOf(dayNow()));
  const workouts = items ? historyForDay(state.history, day) : historyForDate(state.history, localDate(selectedDate));
  const recoveryDays = !items ? missedDays(state.history, day) : [];
  const recoveryMarkup = recoveryDays.length ? `<section class="setup-recovery"><h2>Make up a missed workout</h2><p class="muted">Choose a routine you missed earlier this week.</p>${recoveryDays.map(missed => `<a class="button secondary" href="/workout/?day=${encodeURIComponent(missed)}">${esc(NAMES[missed])}<span>${esc(missed)}</span></a>`).join('')}</section>` : '';
  const content = items ? `<p class="context-label">${esc(day)} · ${flatten(items).length} sets</p><h1>${esc(NAMES[day])}</h1><button class="primary" id="start" type="button">Start workout</button><section class="setup-routine" aria-label="Exercises">${routineMarkup(items)}</section>${workoutHistoryMarkup(workouts)}` : `<p class="context-label">${esc(day)}</p><h1>Rest day</h1><p class="muted">Recover today, or make up a missed session.</p>${recoveryMarkup}${workouts.length ? workoutHistoryMarkup(workouts) : ''}`;
  app.innerHTML = `<div class="workout-stage setup-stage"><div class="stage-info">${content}</div><div class="thumb-zone"><a class="button secondary" href="/routine/">Back to routine</a></div></div>${pageNav('routine')}`;
  document.querySelector('#start')?.addEventListener('click', async event => { event.currentTarget.disabled = true; try { if (await start(day)) location.assign('/workout/'); } catch (error) { event.currentTarget.disabled = false; const message = document.createElement('p'); message.className = 'notice error'; message.textContent = error.message; event.currentTarget.after(message); } });
}

export function renderWorkout() {
  const a = state();
  const requestedDay = new URLSearchParams(location.search).get('day');
  if (!a && requestedDay && Object.prototype.hasOwnProperty.call(ROUTINE, requestedDay)) return renderStart(requestedDay);
  if (!a) return location.assign('/');
  void keepAwake();
  ({warmup: renderWarmup, plank: renderPlank, lifting: renderLifting, rest: renderRest, stretch: renderStretch, complete: renderCompletion}[a.phase] || renderWarmup)();
}
