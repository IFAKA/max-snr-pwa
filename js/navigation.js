import { app } from './dom.js';

const FORWARD_TRANSITION = 'route-forward';
const BACK_TRANSITION = 'route-back';
let activeViewTransition = null;

function routeTransitionType(activation = globalThis.navigation?.activation) {
  const currentIndex = activation?.entry?.index;
  const previousIndex = activation?.from?.index;
  if (!Number.isInteger(currentIndex) || !Number.isInteger(previousIndex)) return null;
  if (currentIndex > previousIndex) return FORWARD_TRANSITION;
  if (currentIndex < previousIndex) return BACK_TRANSITION;
  return null;
}

function transitionTypes(type) {
  return type ? [type] : [];
}

export function initializeRouteTransitions() {
  window.addEventListener('pagereveal', (event) => {
    const type = routeTransitionType(event.activation);
    if (type) event.viewTransition?.types?.add(type);
  });
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function focusView() {
  const heading = app?.querySelector('h1, h2');
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
  heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
}

function updateView(render, focus) {
  const result = render();
  if (focus) focusView();
  return result;
}

export function renderWithTransition(render, { focus = true, direction = 'forward' } = {}) {
  if (prefersReducedMotion()) return updateView(render, focus);
  if (typeof document.startViewTransition === 'function') {
    if (activeViewTransition) return updateView(render, focus);
    try {
      const type = direction === 'back' ? BACK_TRANSITION : FORWARD_TRANSITION;
      activeViewTransition = document.startViewTransition({
        update: () => updateView(render, focus),
        types: transitionTypes(type),
      });
      activeViewTransition.finished.finally(() => {
        activeViewTransition = null;
      });
      return activeViewTransition;
    } catch {
      activeViewTransition = null;
      try {
        activeViewTransition = document.startViewTransition(() => updateView(render, focus));
        activeViewTransition.finished.finally(() => {
          activeViewTransition = null;
        });
        return activeViewTransition;
      } catch {
        activeViewTransition = null;
        return updateView(render, focus);
      }
    }
  }
  return updateView(render, focus);
}

export function navigateTo(url, { replace = false } = {}) {
  const target = new URL(url, location.href);
  const path = `${target.pathname}${target.search}${target.hash}`;
  if (replace) location.replace(path);
  else location.assign(path);
}

export function parentRouteUrl(route, params, hasActiveWorkout) {
  if (route === 'routine' && params.has('day')) return '/routine/';
  if (route === 'history' && params.get('view') === 'workout') return '/history/?view=workouts';
  if (route === 'history' && params.get('view')) return '/history/';
  if (route === 'workout' && params.has('day') && !hasActiveWorkout)
    return `/routine/?day=${encodeURIComponent(params.get('day'))}`;
  if (route === 'workout' && params.get('view') === 'exercises') return '/workout/';
  return '/';
}

export function referrerIsParentEntry(route, params, referrer, parentUrl) {
  if (referrer?.origin !== location.origin) return false;
  const parent = new URL(parentUrl, location.origin);
  if (
    referrer.pathname === parent.pathname &&
    (!parent.search || referrer.search === parent.search)
  )
    return true;
  if (route === 'routine') return referrer.pathname === (params.has('day') ? '/routine/' : '/');
  if (route === 'workout')
    return (
      referrer.pathname === (params.has('day') ? '/routine/' : '/workout/') &&
      (params.has('day') || params.get('view') === 'exercises')
    );
  return referrer.pathname === '/';
}
