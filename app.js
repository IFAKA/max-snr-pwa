import { loadState } from './js/storage.js';
import { getState } from './js/state.js';
import { renderToday } from './js/render-today.js';
import { renderHistory } from './js/render-history.js';
import { renderRoutine } from './js/render-routine.js';
import { renderWorkout } from './js/render-workout.js';
import { renderAnalytics } from './js/render-analytics.js';
import { keepAwake, releaseWakeLock } from './js/dom.js';
import { setServiceWorkerRegistration } from './js/update-app.js';
import {
  initializeRouteTransitions,
  parentRouteUrl,
  referrerIsParentEntry,
} from './js/navigation.js';

const renderers = {
  today: renderToday,
  routine: renderRoutine,
  history: renderHistory,
  workout: renderWorkout,
};

async function boot() {
  try {
    await loadState();
    const route = document.body.dataset.route;
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const params = new URLSearchParams(location.search);
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const parentUrl = parentRouteUrl(route, params, Boolean(getState()?.active));
    const hasParentEntry = referrerIsParentEntry(route, params, referrer, parentUrl);
    if (route !== 'today' && !history.state?.route && !hasParentEntry) {
      history.replaceState(
        { route: parentUrl === '/' ? 'today' : route, path: parentUrl },
        '',
        parentUrl,
      );
      history.pushState({ route, path: currentUrl }, '', currentUrl);
    } else if (route === 'today' && !history.state?.route) {
      history.replaceState({ route: 'today' }, '', location.href);
    }
    if (route === 'workout') void keepAwake();
    else void releaseWakeLock();
    if (route === 'history' && params.get('view') === 'analytics') renderAnalytics();
    else (renderers[route] || renderToday)();
  } catch (error) {
    const target = document.querySelector('#app');
    if (target) {
      target.innerHTML = '<h1>Workout could not start</h1><p></p>';
      const message = target.querySelector('p');
      if (message) message.textContent = error?.message || 'Reload the app and try again.';
    } else {
      document.body?.append(
        `Workout could not start: ${error?.message || 'Reload the app and try again.'}`,
      );
    }
  }
}

initializeRouteTransitions();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(setServiceWorkerRegistration)
    .catch(() => {});
}

await boot();
