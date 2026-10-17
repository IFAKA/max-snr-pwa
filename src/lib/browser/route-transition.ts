import type { OnNavigate } from '$app/navigation';
import { prefersReducedMotion } from './device.ts';

let active: ViewTransition | null = null;

/**
 * Animates a client navigation with the route-forward/route-back view transitions in app.css.
 * Overlapping navigations (redirects, quick taps) skip the animation instead of interrupting it.
 */
export function routeTransition(navigation: OnNavigate) {
  if (!document.startViewTransition || prefersReducedMotion() || active) return;
  const back = navigation.type === 'popstate' && (navigation.delta ?? 0) < 0;
  const isList = (url?: URL) => url?.searchParams.get('view') === 'exercises';
  const up = isList(navigation.to?.url) && !isList(navigation.from?.url);
  const down = isList(navigation.from?.url) && !isList(navigation.to?.url);
  const type = up ? 'route-up' : down ? 'route-down' : back ? 'route-back' : 'route-forward';
  return new Promise<void>((resolve) => {
    const update = async () => {
      resolve();
      await navigation.complete.catch(() => {});
    };
    try {
      active = document.startViewTransition({
        update,
        types: [type],
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
