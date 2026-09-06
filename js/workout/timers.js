import { REST_MS, PLANK_MS } from '../constants.js';
import { getState } from '../state.js';
import { save } from '../storage.js';

export async function startPlank() { const a = getState().active; a.phase = 'plank'; a.timerEndsAt = Date.now() + PLANK_MS; await save(); }
export async function beginLifting() { const a = getState().active; a.phase = 'lifting'; a.timerEndsAt = null; a.draft = {}; await save(); }
export async function startRest(pos) { const a = getState().active; a.phase = 'rest'; a.restEndsAt = Date.now() + (a.tasks[a.pos]?.restMs || REST_MS); a.nextPos = pos; await save(); }
export async function continueRest(nextPosition) { const a = getState().active; a.restEndsAt = null; a.pos = a.nextPos ?? nextPosition(); a.nextPos = null; a.draft = {}; await save(); return a.pos; }
export async function setTimer(ms) { const a = getState().active; a.phase = 'stretch'; a.timerEndsAt = Date.now() + ms; await save(); }
export async function adjustRest(ms) { const a = getState().active; a.restEndsAt = Math.max(Date.now(), (a.restEndsAt || Date.now()) + ms); await save(); }
export const remaining = endAt => Math.max(0, (endAt || 0) - Date.now());
export function formatDuration(ms) { const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
export function countdown(el, key, phase, onEnd) { let ended = false; const tick = () => { const left = remaining(getState().active?.[key]); el.textContent = formatDuration(left); if (!left && !ended) { ended = true; void Promise.resolve(onEnd()); } }; tick(); const id = setInterval(() => { if (!getState().active || getState().active.phase !== phase) clearInterval(id); else tick(); }, 250); }
