export const HAPTICS = {
  setLogged: [25, 45, 25],
  timerDone: [35, 70],
  restDone: [35, 65, 35],
} as const;

export const buzz = (pattern: readonly number[]) => globalThis.navigator?.vibrate?.([...pattern]);

export const prefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

let wakeLock: WakeLockSentinel | null = null;
let wanted = false;

async function acquire() {
  try {
    if (!wanted || wakeLock || document.visibilityState !== 'visible') return;
    if (!('wakeLock' in navigator)) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

/** Keeps the screen on while a workout screen is showing. */
export async function keepAwake() {
  wanted = true;
  await acquire();
}

export async function releaseWakeLock() {
  wanted = false;
  const current = wakeLock;
  wakeLock = null;
  try {
    await current?.release();
  } catch {
    // The lock may already be released by the browser.
  }
}

globalThis.document?.addEventListener?.('visibilitychange', () => void acquire());
globalThis.window?.addEventListener?.('pagehide', () => void releaseWakeLock());
