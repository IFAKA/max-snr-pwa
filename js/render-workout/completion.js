import { app } from '../dom.js';
import { completedSets, totalSets, finishWorkout } from '../workout.js';
export function renderCompletion() { app.innerHTML = `<div class="workout-stage"><div class="stage-info"><h1>Done</h1><p class="muted">${completedSets()}/${totalSets()}</p></div><div class="thumb-zone"><button class="primary" id="finish">Done</button></div></div>`; document.querySelector('#finish').onclick = () => { finishWorkout(); location.assign('/'); }; }
