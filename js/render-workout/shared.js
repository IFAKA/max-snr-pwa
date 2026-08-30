import { app, esc } from '../dom.js';
import { getState } from '../state.js';
import { cancelWorkout } from '../workout.js';
export const state = () => getState().active;
export const header = (a, count) => `<div class="row workout-top"><span>${esc(a.name)}</span><span>${count}</span></div>`;
export const mount = html => { app.innerHTML = html; document.querySelector('#cancel').onclick = () => { if (cancelWorkout()) location.assign('/'); }; };
