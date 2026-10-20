import { goto } from '$app/navigation';
import { applyMove, stepsBackTo, stepsBackToToday, type HistoryStack } from './history-stack.ts';

// Finishing a screen goes back to the entry it came from instead of replacing itself with its
// parent, so browser/Android back never walks through duplicate or stale screens afterwards.
const STORAGE_KEY = 'maxsnr-history';
const LEAVING_MS = 1000;

let stack: HistoryStack = { urls: [], index: 0 };
let replacing = false;
let leavingUntil = 0;

function save() {
  globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(stack));
}

/** Starts the record for this document, keeping the one from before a reload when it matches. */
export function startHistory(url: string) {
  try {
    const saved = JSON.parse(globalThis.sessionStorage?.getItem(STORAGE_KEY) ?? 'null');
    if (saved?.urls?.[saved.index] === url) stack = saved;
    else stack = { urls: [url], index: 0 };
  } catch {
    stack = { urls: [url], index: 0 };
  }
  save();
}

/** Called after every navigation (`afterNavigate`). */
export function recordNavigation(type: string, delta: number | undefined, url: string) {
  if (type === 'enter') return;
  stack = applyMove(
    stack,
    type === 'popstate'
      ? { kind: 'pop', delta: delta ?? 0, url }
      : { kind: replacing ? 'replace' : 'push', url },
  );
  replacing = false;
  leavingUntil = 0;
  save();
}

/** Whether the app itself is going back, which the workout's back guard must let through. */
export const leavingProgrammatically = () => performance.now() < leavingUntil;

function goBack(steps: number) {
  leavingUntil = performance.now() + LEAVING_MS;
  history.go(-steps);
  return Promise.resolve();
}

/** Shows `url` in place of the current screen (no new history entry). */
export function replaceUrl(url: string) {
  replacing = true;
  // Navigation uses plain paths; the app is served from the domain root.
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  return goto(url, { replace: true }).finally(() => (replacing = false));
}

/** Returns to `url`: back when it is the previous screen, otherwise in place of this one. */
export function goUp(url: string) {
  const steps = stepsBackTo(stack, url);
  return steps ? goBack(steps) : replaceUrl(url);
}

/**
 * Returns to Today, dropping every screen opened on the way here (routine, workout, …). `before`
 * runs first (e.g. cancelling the workout) and stops the leave when it fails; meanwhile screens
 * see `leavingProgrammatically()` and skip their own redirects.
 */
export async function leaveToToday(before?: () => Promise<unknown>) {
  leavingUntil = performance.now() + LEAVING_MS;
  if (before && !(await before())) {
    leavingUntil = 0;
    return;
  }
  const steps = stepsBackToToday(stack);
  return steps ? goBack(steps) : replaceUrl('/');
}
