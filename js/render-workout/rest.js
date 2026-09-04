import { mount, state, header } from './shared.js';
import { completedSets, totalSets, continueRest, countdown } from '../workout.js';
import { persist } from '../storage.js';
import { buzz } from '../dom.js';
const advance = async () => { continueRest(); await persist(); location.reload(); };
export function renderRest() { const a = state(), running = a.restEndsAt > Date.now(); if (!running) { advance(); return; } const next = a.tasks[a.nextPos]; mount(`<div class="workout-stage"><div class="stage-info">${header(a, `${completedSets()}/${totalSets()}`)}<div class="big-timer" id="timer">1:30</div><p class="next-up">${next?.performedName || 'Continue'}${next ? ` · ${next.set}/${next.sets}` : ''}</p></div><div class="thumb-zone"><button class="primary" id="continue">Skip</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`); document.querySelector('#continue').onclick = advance; countdown(document.querySelector('#timer'), 'restEndsAt', 'rest', () => { buzz([35, 65, 35]); advance(); }); }
