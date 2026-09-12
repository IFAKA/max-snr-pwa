import { loadState } from './js/storage.js';
import { getState } from './js/state.js';
import { renderToday } from './js/render-today.js';
import { renderHistory } from './js/render-history.js';
import { renderRoutine } from './js/render-routine.js';
import { renderWorkout } from './js/render-workout.js';
import { keepAwake, releaseWakeLock } from './js/dom.js';
import { setServiceWorkerRegistration } from './js/update-app.js';

const renderers = {
  today: renderToday,
  routine: renderRoutine,
  history: renderHistory,
  workout: renderWorkout,
};

const LOADING_MIN_DURATION = 360;
const LOADING_EXIT_DURATION = 160;
const loadingStartedAt = performance.now();

async function finishLoading() {
  const loading = document.querySelector('#app-loading');
  if (!loading) return;

  const remaining = Math.max(0, LOADING_MIN_DURATION - (performance.now() - loadingStartedAt));
  if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
  loading.classList.add('is-loading-complete');
  await new Promise((resolve) => setTimeout(resolve, LOADING_EXIT_DURATION));
  loading.remove();
  document.querySelector('#app')?.setAttribute('aria-busy', 'false');
}

async function boot() {
  try {
    await loadState();
    const route = document.body.dataset.route;
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const params = new URLSearchParams(location.search);
    const hasParentEntry =
      referrer?.origin === location.origin &&
      ((route === 'routine' &&
        (params.has('day') ? referrer.pathname === '/routine/' : referrer.pathname === '/')) ||
        (route === 'workout' && params.has('day') && referrer.pathname === '/routine/') ||
        (route === 'workout' &&
          params.get('view') === 'exercises' &&
          referrer.pathname === '/workout/') ||
        (route !== 'routine' && route !== 'workout' && referrer.pathname === '/'));
    if (route !== 'today' && !history.state?.route && !hasParentEntry) {
      const currentUrl = `${location.pathname}${location.search}${location.hash}`;
      const parentUrl =
        route === 'routine' && params.has('day')
          ? '/routine/'
          : route === 'history' && params.get('view') === 'workout'
            ? '/history/?view=workouts'
            : route === 'history' && params.get('view')
              ? '/history/'
              : route === 'workout' && params.has('day') && !getState()?.active
                ? `/routine/?day=${encodeURIComponent(params.get('day'))}`
                : route === 'workout' && params.get('view') === 'exercises'
                  ? '/workout/'
                  : '/';
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
    (renderers[route] || renderToday)();
  } catch (error) {
    const target = document.querySelector('#app');
    if (target) {
      target.innerHTML = '<h1>MaxSNR could not start</h1><p></p>';
      const message = target.querySelector('p');
      if (message) message.textContent = error?.message || 'Reload the app and try again.';
    } else {
      document.body?.append(
        `MaxSNR could not start: ${error?.message || 'Reload the app and try again.'}`,
      );
    }
  } finally {
    await finishLoading();
  }
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(setServiceWorkerRegistration)
    .catch(() => {});
}

boot();
