// "Check for Updates": finds a waiting service worker and activates it. App files are served
// cache-first from /sw.js, so this is how a new deploy reaches an installed app.
export type UpdateStatus = 'current' | 'checking' | 'available' | 'success' | 'updated' | 'error';

export const UPDATE_LABELS: Record<UpdateStatus, string> = {
  checking: 'Checking for app updates',
  current: 'Check for Updates',
  available: 'Install App Update',
  success: 'Up to Date',
  updated: 'Updated',
  error: 'App Update Failed',
};

export const UPDATE_ICONS: Record<UpdateStatus, string> = {
  checking: 'loader',
  current: 'refresh',
  available: 'download',
  success: 'check',
  updated: 'check',
  error: 'x',
};

const LOADING_MIN_VISIBLE_MS = 500;
const SUCCESS_VISIBLE_MS = 1400;
const ACTIVATION_TIMEOUT_MS = 10000;

let registration: ServiceWorkerRegistration | null = null;
let reloadAfterActivation = false;
let status = $state<UpdateStatus>('current');
let label = $state(UPDATE_LABELS.current);
let message = $state('');

export const appUpdate = {
  get status() {
    return status;
  },
  get label() {
    return label;
  },
  get message() {
    return message;
  },
  get busy() {
    return status === 'checking';
  },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setStatus(next: UpdateStatus, announcement = '') {
  status = next;
  if (next !== 'checking') label = UPDATE_LABELS[next];
  if (announcement) message = announcement;
}

function fail(announcement: string) {
  setStatus('error', announcement);
  setTimeout(() => {
    if (status === 'error') setStatus('current');
  }, 4000);
}

function waitForWaitingWorker(current: ServiceWorkerRegistration) {
  if (current.waiting) return Promise.resolve(current.waiting);
  return new Promise<ServiceWorker | null>((resolve) => {
    const installing = current.installing;
    if (!installing) return resolve(null);
    const timeout = setTimeout(() => resolve(current.waiting), ACTIVATION_TIMEOUT_MS);
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') {
        clearTimeout(timeout);
        resolve(current.waiting);
      }
    });
  });
}

async function withMinimumDuration<T>(task: Promise<T>) {
  const started = performance.now();
  const result = await task;
  await wait(Math.max(0, LOADING_MIN_VISIBLE_MS - (performance.now() - started)));
  return result;
}

export async function checkForUpdate() {
  if (status === 'checking') return;
  setStatus('checking', 'Checking for updates…');
  if (!registration) {
    await wait(LOADING_MIN_VISIBLE_MS);
    return fail('Updates are unavailable in this browser');
  }
  const current = registration;
  try {
    const waiting = await withMinimumDuration(
      current.update().then(() => waitForWaitingWorker(current)),
    );
    if (!waiting) {
      setStatus('success', "You're up to date.");
      setTimeout(() => {
        if (status === 'success') setStatus('current');
      }, SUCCESS_VISIBLE_MS);
      return;
    }
    reloadAfterActivation = true;
    setStatus('checking', 'Installing update…');
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => {
      if (!reloadAfterActivation) return;
      reloadAfterActivation = false;
      fail('Update timed out. Try again when online.');
    }, ACTIVATION_TIMEOUT_MS);
  } catch {
    fail('Update failed. Check your connection and try again.');
  }
}

function watch(next: ServiceWorkerRegistration) {
  registration = next;
  if (next.waiting) setStatus('available');
  next.addEventListener('updatefound', () => {
    const installing = next.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed' && next.waiting && status === 'current')
        setStatus('available');
    });
  });
}

export function registerServiceWorker() {
  const container = globalThis.navigator?.serviceWorker;
  if (!container || location.protocol === 'file:') return;
  container.addEventListener('controllerchange', () => {
    if (!reloadAfterActivation) return;
    reloadAfterActivation = false;
    setStatus('updated', 'App updated successfully');
    setTimeout(() => location.reload(), 1200);
  });
  void container
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(watch)
    .catch(() => {});
}
