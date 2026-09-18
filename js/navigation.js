import { app } from './dom.js';

const ROUTES = new Set(['/', '/routine/', '/history/', '/workout/']);
const FORWARD_TRANSITION = 'route-forward';
const BACK_TRANSITION = 'route-back';
let activeViewTransition = null;

function routeTransitionType() {
  const activation = globalThis.navigation?.activation;
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
  if (typeof window === 'undefined' || (!('onpageswap' in window) && !('onpagereveal' in window)))
    return;
  const applyRouteTransition = (event) => {
    const type = routeTransitionType();
    if (type) event.viewTransition?.types?.add(type);
  };
  window.addEventListener('pageswap', applyRouteTransition);
  window.addEventListener('pagereveal', applyRouteTransition);
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

export function routeForPath(pathname) {
  if (pathname === '/') return 'today';
  if (pathname.startsWith('/routine/')) return 'routine';
  if (pathname.startsWith('/history/')) return 'history';
  if (pathname.startsWith('/workout/')) return 'workout';
  return null;
}

export function isAppUrl(url) {
  return url.origin === location.origin && [...ROUTES].some((route) => url.pathname === route);
}

export function navigateTo(url, { replace = false } = {}) {
  const target = new URL(url, location.href);
  const path = `${target.pathname}${target.search}${target.hash}`;
  if (replace) location.replace(path);
  else location.assign(path);
}
