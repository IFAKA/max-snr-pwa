import { REST_MS, PLANK_MS } from '../constants.ts';
import { getState } from '../state.ts';
import { persist } from '../storage/persistence.ts';
import type { ActiveWorkout } from '../types.ts';

const active = () => getState().active as ActiveWorkout;

export async function startPlank() {
  const a = active();
  a.phase = 'plank';
  a.timerEndsAt = Date.now() + PLANK_MS;
  await persist();
}
export async function beginLifting() {
  const a = active();
  a.phase = 'lifting';
  a.timerEndsAt = null;
  a.draft = {};
  await persist();
}
export async function startRest(pos: number) {
  const a = active();
  a.phase = 'rest';
  a.restEndsAt = Date.now() + (a.tasks[a.pos]?.restMs || REST_MS);
  a.nextPos = pos;
  await persist();
}
export async function continueRest(nextPosition: () => number) {
  const a = active();
  a.restEndsAt = null;
  a.pos = a.nextPos ?? nextPosition();
  a.nextPos = null;
  a.draft = {};
  await persist();
  return a.pos;
}
export async function setTimer(ms: number) {
  const a = active();
  a.phase = 'stretch';
  a.timerEndsAt = Date.now() + ms;
  await persist();
}
export async function clearTimer() {
  const a = getState().active;
  if (!a) return false;
  a.timerEndsAt = null;
  await persist();
  return true;
}
export async function adjustRest(ms: number) {
  const a = active();
  a.restEndsAt = Math.max(Date.now(), (a.restEndsAt || Date.now()) + ms);
  await persist();
}
export const remaining = (endAt: number | null | undefined, now = Date.now()) =>
  Math.max(0, (endAt || 0) - now);
export function formatDuration(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return seconds < 60
    ? String(seconds)
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
