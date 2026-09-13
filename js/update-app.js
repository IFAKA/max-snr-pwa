let registration = null;
let updateInProgress = false;
let reloadAfterActivation = false;
let availabilityCheck = null;

const UPDATE_ICONS = {
  checking: '<circle cx="12" cy="12" r="8"/>',
  current: '<path d="M20 11a8 8 0 1 0 1 4m-1-4v4h-4"/>',
  available: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>',
  success: '<path d="m5 12 4 4L19 6"/>',
  error: '<path d="m6 6 12 12M18 6 6 18"/>',
};

const UPDATE_LABELS = {
  checking: 'Checking for app updates',
  current: 'Check for updates',
  available: 'Install app update',
  success: 'App updated',
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
  if (label) label.textContent = UPDATE_LABELS[state] || UPDATE_LABELS.current;
  button.setAttribute('aria-label', UPDATE_LABELS[state] || UPDATE_LABELS.current);
  button.dataset.updateState = state;
  if (message) announce(message);
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
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  setUpdateState(button, 'checking', 'Checking for updates');
  if (!registration) {
    announce('Updates are unavailable in this browser');
    restoreButton(button);
    return;
  }
  try {
    await registration.update();
    const waiting = await waitForWaitingWorker(registration);
    if (!waiting) {
      setUpdateAvailable(button, false);
      announce('The app is current');
      updateInProgress = false;
      return;
    }
    reloadAfterActivation = true;
    setUpdateState(button, 'checking', 'Installing update');
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => {
      if (reloadAfterActivation) {
        reloadAfterActivation = false;
        announce('Update timed out. Try again when online.');
        restoreButton(button);
      }
    }, 10000);
  } catch {
    announce('Update failed. Check your connection and try again.');
    restoreButton(button);
  }
}

async function refreshUpdateAvailability(button) {
  if (!button || availabilityCheck) return availabilityCheck;
  setUpdateAvailable(button, false);
  availabilityCheck = (async () => {
    if (!registration) return;
    try {
      setUpdateState(button, 'checking', 'Checking for updates');
      const waiting = await registration.update().then(() => waitForWaitingWorker(registration));
      setUpdateAvailable(button, Boolean(waiting));
      if (!waiting) announce('The app is current');
    } catch {
      setUpdateState(button, 'error');
      announce('Updates are unavailable right now');
      setTimeout(() => {
        if (!button.disabled) return;
        setUpdateState(button, 'current');
      }, 4000);
    }
  })().finally(() => {
    availabilityCheck = null;
  });
  return availabilityCheck;
}

export function setServiceWorkerRegistration(value) {
  registration = value;
  bindUpdateButton();
  void refreshUpdateAvailability(document.querySelector('#update-app'));
}

export function bindUpdateButton(root = document) {
  const button = root.querySelector?.('#update-app');
  if (!button) return;
  if (!registration) setUpdateAvailable(button, false);
  if (button.dataset.updateBound) return;
  button.dataset.updateBound = 'true';
  button.addEventListener('click', () => void checkForUpdate(button));
  void refreshUpdateAvailability(button);
}

if (globalThis.navigator?.serviceWorker) {
  globalThis.navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadAfterActivation) return;
    reloadAfterActivation = false;
    const button = document.querySelector('#update-app');
    setUpdateState(button, 'success', 'App updated successfully');
    setTimeout(() => location.reload(), 1200);
  });
}
