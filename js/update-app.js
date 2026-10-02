import { iconPaths } from './icons.js';

let registration = null;
let updateInProgress = false;
let reloadAfterActivation = false;
const LOADING_MIN_VISIBLE_MS = 1200;
const SUCCESS_VISIBLE_MS = 1400;

const UPDATE_ICONS = {
  checking: iconPaths('loader'),
  current: iconPaths('refresh'),
  available: iconPaths('download'),
  success: iconPaths('check'),
  updated: iconPaths('check'),
  error: iconPaths('x'),
};

const UPDATE_LABELS = {
  checking: 'Checking for app updates',
  current: 'Check for updates',
  available: 'Install app update',
  success: 'Up to date',
  updated: 'Updated',
  error: 'App update failed',
};

function announce(message) {
  const status = document.querySelector('#app-update-status');
  if (status) status.textContent = message;
}

function setUpdateState(button, state, message = '') {
  if (!button) return;
  const svg = button.querySelector('svg');
  const label = button.querySelector('.app-update-label');
  if (svg) svg.innerHTML = UPDATE_ICONS[state] || UPDATE_ICONS.current;
  if (state !== 'checking') {
    if (label) label.textContent = UPDATE_LABELS[state] || UPDATE_LABELS.current;
    button.setAttribute('aria-label', UPDATE_LABELS[state] || UPDATE_LABELS.current);
  }
  button.dataset.updateState = state;
  if (message) announce(message);
}

function startLoadingState(button, message) {
  const label = button.querySelector('.app-update-label');
  const currentLabel = label?.textContent || UPDATE_LABELS.current;
  const originalLabel =
    button.dataset.updateState === 'checking'
      ? button.dataset.loadingLabel || currentLabel
      : currentLabel;
  button.dataset.loadingLabel = originalLabel;
  delete button.dataset.loadingStartedAt;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  if (label) label.textContent = originalLabel;
  button.setAttribute('aria-label', originalLabel);
  setUpdateState(button, 'checking');
  button.dataset.loadingStartedAt = String(performance.now());
  announce(message);
  return {
    finish: () => {
      const loadingStartedAt = Number(button.dataset.loadingStartedAt);
      const visibleFor = Number.isFinite(loadingStartedAt)
        ? performance.now() - loadingStartedAt
        : 0;
      return new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, LOADING_MIN_VISIBLE_MS - visibleFor)),
      );
    },
  };
}

function restoreButton(button) {
  updateInProgress = false;
  if (button) {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    setUpdateState(button, 'error');
    setTimeout(() => {
      if (button.dataset.updateState === 'error') setUpdateState(button, 'current');
    }, 4000);
  }
}

function setUpdateAvailable(button, available) {
  if (!button) return;
  button.disabled = false;
  button.removeAttribute('aria-busy');
  setUpdateState(button, available ? 'available' : 'current');
}

function waitForWaitingWorker(currentRegistration) {
  if (currentRegistration.waiting) return Promise.resolve(currentRegistration.waiting);
  return new Promise((resolve) => {
    const installing = currentRegistration.installing;
    if (!installing) return resolve(null);
    const timeout = setTimeout(() => resolve(currentRegistration.waiting), 10000);
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') {
        clearTimeout(timeout);
        resolve(currentRegistration.waiting);
      }
    });
  });
}

async function checkForUpdate(button) {
  if (updateInProgress) return;
  updateInProgress = true;
  const loading = startLoadingState(button, 'Checking for updates…');
  if (!registration) {
    announce('Updates are unavailable in this browser');
    await loading.finish();
    restoreButton(button);
    return;
  }
  try {
    await registration.update();
    const waiting = await waitForWaitingWorker(registration);
    await loading.finish();
    if (!waiting) {
      button.disabled = true;
      button.removeAttribute('aria-busy');
      setUpdateState(button, 'success', "You're up to date.");
      updateInProgress = false;
      setTimeout(() => {
        if (button.dataset.updateState !== 'success') return;
        setUpdateAvailable(button, false);
      }, SUCCESS_VISIBLE_MS);
      return;
    }
    reloadAfterActivation = true;
    startLoadingState(button, 'Installing update…');
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => {
      if (reloadAfterActivation) {
        reloadAfterActivation = false;
        announce('Update timed out. Try again when online.');
        restoreButton(button);
      }
    }, 10000);
  } catch {
    await loading.finish();
    announce('Update failed. Check your connection and try again.');
    restoreButton(button);
  }
}

export function setServiceWorkerRegistration(value) {
  registration = value;
  bindUpdateButton();
}

export function bindUpdateButton(root = document) {
  const button = root.querySelector?.('#update-app');
  if (!button) return;
  if (!registration) setUpdateAvailable(button, false);
  if (button.dataset.updateBound) return;
  button.dataset.updateBound = 'true';
  button.addEventListener('click', () => void checkForUpdate(button));
}

if (globalThis.navigator?.serviceWorker) {
  globalThis.navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadAfterActivation) return;
    reloadAfterActivation = false;
    const button = document.querySelector('#update-app');
    setUpdateState(button, 'updated', 'App updated successfully');
    setTimeout(() => location.reload(), 1200);
  });
}
