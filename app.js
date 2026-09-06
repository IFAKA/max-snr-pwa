import { loadState } from './js/storage.js';
import { renderToday } from './js/render-today.js';
import { renderRoutine } from './js/render-routine.js';
import { renderHistory } from './js/render-history.js';
import { renderWorkout } from './js/render-workout.js';

const renderers = { today: renderToday, routine: renderRoutine, history: renderHistory, workout: renderWorkout };

async function boot() {
  try {
    await loadState();
    (renderers[document.body.dataset.route] || renderToday)();
  } catch (error) {
    const target = document.querySelector('#app');
    target.innerHTML = '<h1>MaxSNR could not start</h1><p></p>';
    target.querySelector('p').textContent = error?.message || 'Reload the app and try again.';
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Offline mode unavailable.', error));
}

boot();
