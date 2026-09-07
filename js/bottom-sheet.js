const OPEN_CLASS = 'sheet-open';
const ACTIVE_CLASS = 'is-open';
const CLOSING_CLASS = 'is-closing';
const DRAG_CLASS = 'is-dragging';
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.7;

let activeSheet = null;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function focusableElements(sheet) {
  return [...sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.disabled && !element.hasAttribute('hidden'));
}

function restoreFocus(sheet) {
  const trigger = sheet._sheetTrigger;
  sheet._sheetTrigger = null;
  if (trigger?.isConnected) trigger.focus();
}

function unlockBody() {
  document.body.classList.remove(OPEN_CLASS);
}

function finishClose(sheet) {
  if (activeSheet?.sheet !== sheet) return;
  const shouldPopHistory = activeSheet.historyPushed && !activeSheet.historyPopped;
  document.removeEventListener('keydown', handleKeydown);
  sheet.classList.remove(ACTIVE_CLASS, CLOSING_CLASS, DRAG_CLASS);
  sheet.hidden = true;
  sheet.setAttribute('aria-hidden', 'true');
  sheet.style.removeProperty('--sheet-translate');
  const backdrop = document.getElementById(`${sheet.id}-backdrop`);
  if (backdrop) {
    backdrop.hidden = true;
    backdrop.classList.remove(ACTIVE_CLASS, CLOSING_CLASS);
  }
  unlockBody();
  restoreFocus(sheet);
  activeSheet = null;
  if (shouldPopHistory) history.back();
}

function closeActiveSheet(animate = true, fromHistory = false) {
  if (!activeSheet) return;
  activeSheet.historyPopped ||= fromHistory;
  const {sheet, backdrop} = activeSheet;
  sheet.classList.remove(ACTIVE_CLASS, DRAG_CLASS);
  sheet.classList.add(CLOSING_CLASS);
  if (backdrop) {
    backdrop.classList.remove(ACTIVE_CLASS);
    backdrop.classList.add(CLOSING_CLASS);
  }
  if (!animate || prefersReducedMotion()) finishClose(sheet);
  else window.setTimeout(() => finishClose(sheet), 240);
}

function handleKeydown(event) {
  if (!activeSheet) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeActiveSheet();
    return;
  }
  if (event.key !== 'Tab') return;
  const elements = focusableElements(activeSheet.sheet);
  if (!elements.length) {
    event.preventDefault();
    activeSheet.sheet.focus();
    return;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindDrag(sheet) {
  const handle = sheet.querySelector('[data-sheet-handle]');
  if (!handle || handle.dataset.sheetDragBound) return;
  handle.dataset.sheetDragBound = 'true';
  let drag = null;

  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || activeSheet?.sheet !== sheet) return;
    drag = {startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), velocity: 0};
    sheet.classList.add(DRAG_CLASS);
    handle.setPointerCapture?.(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!drag) return;
    const now = performance.now();
    const delta = event.clientY - drag.startY;
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    if (delta > 0) {
      sheet.style.setProperty('--sheet-translate', `${Math.pow(delta, .88)}px`);
    } else {
      sheet.style.setProperty('--sheet-translate', `${delta * .12}px`);
    }
  });
  const endDrag = event => {
    if (!drag) return;
    const delta = event.clientY - drag.startY;
    const shouldClose = delta > DISMISS_DISTANCE || (delta > 35 && drag.velocity > DISMISS_VELOCITY);
    drag = null;
    sheet.classList.remove(DRAG_CLASS);
    sheet.style.removeProperty('--sheet-translate');
    if (shouldClose) closeActiveSheet();
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
}

export function openSheet(id) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  if (activeSheet?.sheet === sheet) return;
  if (activeSheet) closeActiveSheet(false);
  const backdrop = document.getElementById(`${id}-backdrop`);
  activeSheet = {sheet, backdrop};
  const historyState = history.state && typeof history.state === 'object' ? history.state : {};
  history.pushState({...historyState, maxSnrSheet: id}, '', location.href);
  activeSheet.historyPushed = true;
  sheet._sheetTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  sheet.hidden = false;
  sheet.setAttribute('aria-hidden', 'false');
  if (backdrop) {
    backdrop.hidden = false;
    backdrop.classList.remove(CLOSING_CLASS);
  }
  document.body.classList.add(OPEN_CLASS);
  bindDrag(sheet);
  document.addEventListener('keydown', handleKeydown);
  requestAnimationFrame(() => {
    if (activeSheet?.sheet !== sheet) return;
    sheet.classList.add(ACTIVE_CLASS);
    backdrop?.classList.add(ACTIVE_CLASS);
    (focusableElements(sheet)[0] || sheet).focus();
  });
}

export function closeSheet(id) {
  if (activeSheet?.sheet?.id === id) closeActiveSheet();
}

document.addEventListener('click', event => {
  const closeButton = event.target.closest?.('[data-close-sheet]');
  if (closeButton) closeSheet(closeButton.closest('[data-sheet]')?.id);
  const backdrop = event.target.closest?.('[data-sheet-backdrop]');
  if (backdrop && event.target === backdrop) closeSheet(backdrop.dataset.sheetBackdrop);
});

window.addEventListener('popstate', () => {
  if (activeSheet) closeActiveSheet(false, true);
});
