import { app } from './dom.js';

const ROUTES = new Set(['/', '/routine/', '/history/', '/workout/']);
let activeViewTransition = null;

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function focusView() {
  const heading = app?.querySelector('h1, h2');
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  heading.focus({preventScroll: true});
  heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), {once: true});
}

function updateView(render, focus) {
  const result = render();
  if (focus) focusView();
  return result;
}

export function renderWithTransition(render, {focus = true} = {}) {
  if (prefersReducedMotion()) return updateView(render, focus);
  if (typeof document.startViewTransition === 'function') {
    if (activeViewTransition) return updateView(render, focus);
    try {
      activeViewTransition = document.startViewTransition(() => updateView(render, focus));
      activeViewTransition.finished.finally(() => { activeViewTransition = null; });
      return activeViewTransition;
    } catch {
      activeViewTransition = null;
      return updateView(render, focus);
    }
  }
  app?.classList.add('is-view-transitioning');
  const result = updateView(render, focus);
  (globalThis.requestAnimationFrame || globalThis.setTimeout)(() => app?.classList.remove('is-view-transitioning'), 0);
  return result;
}

export function routeForPath(pathname) {
  if (pathname === '/') return 'today';
  if (pathname.startsWith('/routine/')) return 'routine';
  if (pathname.startsWith('/history/')) return 'history';
  if (pathname.startsWith('/workout/')) return 'workout';
  return null;
}

export function isAppUrl(url) {
  return url.origin === location.origin && [...ROUTES].some(route => url.pathname === route);
}

export function navigateTo(url, {replace = false} = {}) {
  const target = new URL(url, location.href);
  const path = `${target.pathname}${target.search}${target.hash}`;
  if (replace) location.replace(path);
  else location.assign(path);
}
