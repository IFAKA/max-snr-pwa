import { REST_MS, PLANK_MS } from '../constants.js';
import { getState } from '../state.js';
import { save } from '../storage.js';

export function startPlank() { const a = getState().active; a.phase = 'plank'; a.timerEndsAt = Date.now() + PLANK_MS; save(); }
export function beginLifting() { const a = getState().active; a.phase = 'lifting'; a.timerEndsAt = null; a.draft = {}; save(); }
export function startRest(pos) { const a = getState().active; a.phase = 'rest'; a.restEndsAt = Date.now() + (a.tasks[a.pos]?.restMs || REST_MS); a.nextPos = pos; save(); }
export function continueRest(nextPosition) { const a = getState().active; a.restEndsAt = null; a.pos = a.nextPos ?? nextPosition(); a.nextPos = null; a.draft = {}; save(); return a.pos; }
export function setTimer(ms) { const a = getState().active; a.phase = 'stretch'; a.timerEndsAt = Date.now() + ms; save(); }
export const remaining = endAt => Math.max(0, (endAt || 0) - Date.now());
export function countdown(el, key, phase, onEnd) { let ended = false; const tick = () => { const left = remaining(getState().active?.[key]); el.textContent = `${Math.floor(left / 60000)}:${String(Math.ceil(left / 1000) % 60).padStart(2, '0')}`; if (!left && !ended) { ended = true; onEnd(); } }; tick(); const id = setInterval(() => { if (!getState().active || getState().active.phase !== phase) clearInterval(id); else tick(); }, 250); }
