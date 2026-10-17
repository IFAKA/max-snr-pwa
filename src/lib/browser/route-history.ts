import { parentRouteUrl, routeName } from './routes.ts';

const SESSION_KEY = 'maxsnr-session';
const MAX_DEPTH = 4;

/** Ancestors of a URL from Today down to its direct parent, e.g. exercises → [/, /routine/, day]. */
export function ancestorUrls(url: URL, hasActiveWorkout: boolean) {
  const chain: string[] = [];
  let current = url;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const route = routeName(current.pathname);
    if (route === 'today') break;
    const parent = parentRouteUrl(route, current.searchParams, hasActiveWorkout);
    chain.unshift(parent);
    if (parent === '/') break;
    current = new URL(parent, url.origin);
  }
  return chain;
}

/**
 * When the app opens directly on a detail screen (a fresh tab or an installed-app launch), returns
 * the screens to insert behind it so browser/Android back unwinds detail → parent → Today.
 */
export function deepLinkAncestors(url: URL, hasActiveWorkout: boolean, referrer: string) {
  const storage = globalThis.sessionStorage;
  if (storage?.getItem(SESSION_KEY)) return [];
  storage?.setItem(SESSION_KEY, '1');
  const chain = ancestorUrls(url, hasActiveWorkout);
  const from = referrer ? new URL(referrer) : null;
  const parent = chain.at(-1);
  if (from?.origin === url.origin && `${from.pathname}${from.search}` === parent) return [];
  return chain;
}
