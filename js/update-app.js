let registration = null;
let updateInProgress = false;
let reloadAfterActivation = false;

function announce(message) {
  const status = document.querySelector('#app-update-status');
  if (status) status.textContent = message;
}

function restoreButton(button) {
  updateInProgress = false;
  if (button) {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
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
  announce('Checking for updates');
  if (!registration) {
    announce('Updates are unavailable in this browser');
    restoreButton(button);
    return;
  }
  try {
    await registration.update();
    const waiting = await waitForWaitingWorker(registration);
    if (!waiting) {
      announce('The app is current');
      setTimeout(() => {
        if (document.visibilityState === 'visible') location.reload();
      }, 500);
      return;
    }
    reloadAfterActivation = true;
    announce('Installing update');
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

export function setServiceWorkerRegistration(value) {
  registration = value;
  bindUpdateButton();
}

export function bindUpdateButton(root = document) {
  const button = root.querySelector?.('#update-app');
  if (!button || button.dataset.updateBound) return;
  button.dataset.updateBound = 'true';
  button.addEventListener('click', () => void checkForUpdate(button));
}

if (globalThis.navigator?.serviceWorker) {
  globalThis.navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadAfterActivation) return;
    reloadAfterActivation = false;
    location.reload();
  });
}
