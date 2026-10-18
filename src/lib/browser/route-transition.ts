import type { OnNavigate } from '$app/navigation';
import { prefersReducedMotion } from './device.ts';

let active: ViewTransition | null = null;
let swipedAt = -Infinity;
/** How long after a swipe a navigation still counts as the swipe's own result. */
const SWIPE_WINDOW_MS = 1500;

/** A swipe card throws itself off screen, so the navigation its action causes skips the slide. */
export function swipeNavigation() {
  swipedAt = performance.now();
}

/** Whether a swipe just acted: the screen it leads to was already shown under the card. */
export const swipedRecently = () => performance.now() - swipedAt < SWIPE_WINDOW_MS;

/**
 * Animates a client navigation with the route-forward/route-back view transitions in app.css.
 * Overlapping navigations (redirects, quick taps) skip the animation instead of interrupting it.
 */
export function routeTransition(navigation: OnNavigate) {
  if (!document.startViewTransition || prefersReducedMotion() || active) return;
  // The exercise drawer opens and closes over its screen with its own motion, not a page slide.
  const drawer = (url?: URL) => url?.searchParams.get('view') === 'exercises';
  if (drawer(navigation.to?.url) || drawer(navigation.from?.url)) return;
  if (swipedRecently()) return;
  const back = navigation.type === 'popstate' && (navigation.delta ?? 0) < 0;
  return new Promise<void>((resolve) => {
    const update = async () => {
      resolve();
      await navigation.complete.catch(() => {});
    };
    try {
      active = document.startViewTransition({
        update,
        types: [back ? 'route-back' : 'route-forward'],
      });
    } catch {
      active = document.startViewTransition(update);
    }
    const settle = () => {
      active = null;
    };
    active.ready.catch(() => {});
    active.updateCallbackDone.catch(() => {});
    active.finished.then(settle, settle);
  });
}
