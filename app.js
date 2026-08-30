import { loadState } from './js/storage.js';
import { renderToday } from './js/render-today.js';
import { renderRoutine } from './js/render-routine.js';
import { renderHistory } from './js/render-history.js';
import { renderWorkout } from './js/render-workout.js';

const renderers = { today: renderToday, routine: renderRoutine, history: renderHistory, workout: renderWorkout };

async function boot() {
  await loadState();
  (renderers[document.body.dataset.route] || renderToday)();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js');
}

boot();
