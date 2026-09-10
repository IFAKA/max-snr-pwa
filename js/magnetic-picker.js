const DEFAULT_HOLD_MS = 400;
const MOVE_TOLERANCE = 24;
const DETENT_DISTANCE = 24;
const HOLD_VIBRATION = 5;
const DETENT_VIBRATION = [20, 30, 20];
const SELECT_VIBRATION = [6, 14, 6];
const STATUS_CLASS = 'picker-status';

export function magneticRawRowIndex(startIndex, deltaY, detentDistance = DETENT_DISTANCE) {
  const distance = Math.max(1, detentDistance || DETENT_DISTANCE);
  return startIndex + Math.round(deltaY / distance);
}

export function magneticPickerIndex(rawIndex, rowCount) {
  if (!rowCount) return -1;
  return Math.max(0, Math.min(rowCount - 1, rawIndex));
}

export function magneticRowIndex(startIndex, deltaY, rowCount, detentDistance) {
  if (!rowCount) return -1;
  return magneticPickerIndex(magneticRawRowIndex(startIndex, deltaY, detentDistance), rowCount);
}

export function magneticPreferredIndex(rawIndex, selectableIndices, rowCount) {
  const index = magneticPickerIndex(rawIndex, rowCount);
  if (index < 0 || !selectableIndices.length) return index;
  return selectableIndices.reduce(
    (nearest, candidate) =>
      Math.abs(candidate - index) < Math.abs(nearest - index) ? candidate : nearest,
    selectableIndices[0],
  );
}

export function magneticEntryIndex(rawIndex, selectableIndices, rowCount, primaryIndices = []) {
  const primarySelectable = primaryIndices.filter((index) => selectableIndices.includes(index));
  if (primarySelectable.length) return primarySelectable[0];
  return magneticPreferredIndex(rawIndex, selectableIndices, rowCount);
}

export function magneticEdgePosition(index, rowCount, overshoot = 0) {
  if (!rowCount) return -1;
  if (index >= 0 && index < rowCount) return index;
  const edge = index < 0 ? 0 : rowCount - 1;
  const distance = overshoot || (index < 0 ? index : index - edge);
  return edge + distance / (Math.abs(distance) + 3);
}

const defaultOptions = {
  rowSelector: ':scope > li:not([hidden])',
  actionSelector: 'a, button, label, [role="button"]',
  primarySelector: '[data-picker-primary]',
  onSelect: () => {},
  onCancel: () => {},
  isSelectable: (action) =>
    !action || (!action.disabled && action.getAttribute('aria-disabled') !== 'true'),
  cancel: true,
  cancelLabel: 'Cancel',
};

function rowsFor(list, selector) {
  return [...list.querySelectorAll(selector)];
}

function actionFor(row, selector) {
  return row.querySelector?.(selector) || null;
}

function scrollSurface(list) {
  let surface = list;
  while (surface && surface !== document.body) {
    if (surface.scrollHeight > surface.clientHeight + 1) return surface;
    surface = surface.parentElement;
  }
  return document.scrollingElement || document.documentElement || list;
}

function nearestRow(rows, y) {
  if (!rows.length) return -1;
  const boxes = rows.map((row) => row.getBoundingClientRect());
  if (y >= boxes[boxes.length - 1].bottom) return rows.length - 1;
  return boxes.reduce(
    (nearest, box, index) => {
      const distance = Math.abs(y - (box.top + box.height / 2));
      return distance < nearest.distance ? { index, distance } : nearest;
    },
    { index: 0, distance: Infinity },
  ).index;
}

function ensureCancelRow(list, label) {
  const existing = list.querySelector?.('[data-picker-cancel-row]');
  if (existing) return existing;
  const row = document.createElement('li');
  row.className = 'picker-cancel-row';
  row.hidden = true;
  row.setAttribute('data-picker-cancel-row', '');
  row.innerHTML = `<button type="button" data-picker-cancel aria-label="${label}"><span>${label}</span></button>`;
  list.append(row);
  return row;
}

function ensureStatus(list) {
  let status = list.querySelector?.(`.${STATUS_CLASS}`);
  if (status) return status;
  status = document.createElement('output');
  status.className = `${STATUS_CLASS} sr-only`;
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  (list.parentElement || list).append(status);
  return status;
}

function describeRow(row, action) {
  return (
    action?.getAttribute('aria-label') ||
    row?.textContent?.trim().replace(/\s+/g, ' ') ||
    'Unavailable item'
  );
}

function bindPickerEvents(list, handlers) {
  const { onPointerDown, onPointerLeave, reset, onClick, onKeyDown } = handlers;
  const onPointerCancel = () => reset(true);
  list.addEventListener('pointerdown', onPointerDown);
  list.addEventListener('pointercancel', onPointerCancel);
  list.addEventListener('pointerleave', onPointerLeave);
  list.addEventListener('blur', reset);
  list.addEventListener('click', onClick, true);
  list.addEventListener('contextmenu', handlers.onContextMenu);
  list.addEventListener('keydown', onKeyDown);
  document.addEventListener?.('keydown', onKeyDown);
  document.addEventListener?.('visibilitychange', reset);
  globalThis.window?.addEventListener?.('blur', reset);
  return () => {
    list.removeEventListener('pointerdown', onPointerDown);
    list.removeEventListener('pointercancel', onPointerCancel);
    list.removeEventListener('pointerleave', onPointerLeave);
    list.removeEventListener('blur', reset);
    list.removeEventListener('click', onClick, true);
    list.removeEventListener('contextmenu', handlers.onContextMenu);
    list.removeEventListener('keydown', onKeyDown);
    document.removeEventListener?.('keydown', onKeyDown);
    document.removeEventListener?.('visibilitychange', reset);
    globalThis.window?.removeEventListener?.('blur', reset);
  };
}

export function createMagneticPicker(list, suppliedOptions = {}) {
  const options = { ...defaultOptions, ...suppliedOptions };
  const status = ensureStatus(list);
  const cancelRow = options.cancel ? ensureCancelRow(list, options.cancelLabel) : null;
  const scrollTarget = scrollSurface(list);
  let timer = null;
  let pointerId = null;
  let startY = 0;
  let startIndex = -1;
  let activeIndex = -1;
  let rows = [];
  let selectableIndices = [];
  let pickerActive = false;
  let suppressClick = false;
  let movedBeforePicker = false;
  let destroyed = false;

  const buzz = (pattern) => globalThis.navigator?.vibrate?.(pattern);
  const clearTimer = () => {
    clearTimeout(timer);
    timer = null;
  };
  const stopDocumentTracking = () => {
    document.removeEventListener?.('pointermove', onPointerMove);
    document.removeEventListener?.('pointerup', onPointerUp);
    document.removeEventListener?.('pointercancel', reset);
  };
  const setActive = (index, vibration = DETENT_VIBRATION) => {
    if (!rows.length) return;
    const nextIndex = index < 0 || index >= rows.length ? -1 : index;
    const changed = nextIndex !== activeIndex;
    if (changed) buzz(vibration);
    rows.forEach((row, rowIndex) => {
      const isTarget = nextIndex >= 0 && rowIndex === nextIndex;
      row.classList.toggle('is-picker-target', isTarget);
      if (isTarget) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    activeIndex = nextIndex;
    const row = rows[activeIndex];
    const action = row && actionFor(row, options.actionSelector);
    status.textContent = `Picker: ${describeRow(row, action)}${
      options.isSelectable(action, row) ? '' : ', unavailable'
    }`;
    row?.scrollIntoView?.({
      block: 'nearest',
      behavior:
        pickerActive || globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
    });
  };
  const reset = (notify = false) => {
    clearTimer();
    stopDocumentTracking();
    if (pointerId !== null) {
      try {
        list.releasePointerCapture?.(pointerId);
      } catch {
        // Pointer capture may already have been released by the browser.
      }
    }
    rows.forEach((row) => {
      row.classList.remove('is-picker-target');
      row.removeAttribute('aria-current');
    });
    cancelRow?.setAttribute('hidden', '');
    list.classList.remove('is-picker-active');
    document.documentElement?.classList.remove('is-picker-active');
    status.classList.remove('is-picker-status-visible');
    list.style.removeProperty('touch-action');
    status.textContent = '';
    pointerId = null;
    activeIndex = -1;
    startIndex = -1;
    rows = [];
    selectableIndices = [];
    pickerActive = false;
    movedBeforePicker = false;
    if (notify) options.onCancel();
  };
  const activate = () => {
    const row = rows[activeIndex];
    if (row?.hasAttribute?.('data-picker-cancel-row')) {
      reset(true);
      return;
    }
    const action = row && actionFor(row, options.actionSelector);
    if (!options.isSelectable(action, row) || !action) {
      suppressClick = true;
      reset();
      return;
    }
    buzz(SELECT_VIBRATION);
    options.onSelect(action, row);
    suppressClick = true;
    reset();
  };
  const enter = () => {
    if (pointerId === null || destroyed) return;
    rows = rowsFor(list, options.rowSelector);
    selectableIndices = rows.reduce((indices, row, index) => {
      const action = actionFor(row, options.actionSelector);
      return options.isSelectable(action, row) ? [...indices, index] : indices;
    }, []);
    if (!selectableIndices.length) {
      reset();
      return;
    }
    cancelRow?.removeAttribute('hidden');
    const primaryIndices = rows.reduce((indices, row, index) => {
      const action = actionFor(row, options.actionSelector);
      return row.matches?.(options.primarySelector) && options.isSelectable(action, row)
        ? [...indices, index]
        : indices;
    }, []);
    startIndex = magneticEntryIndex(
      nearestRow(rows, startY),
      selectableIndices,
      rows.length,
      primaryIndices,
    );
    pickerActive = true;
    list.classList.add('is-picker-active');
    document.documentElement?.classList.add('is-picker-active');
    status.classList.add('is-picker-status-visible');
    list.style.setProperty('touch-action', 'none');
    list.setPointerCapture?.(pointerId);
    setActive(startIndex, HOLD_VIBRATION);
  };
  function onPointerMove(event) {
    if (event.pointerId !== pointerId) return;
    const deltaY = event.clientY - startY;
    if (!pickerActive) {
      if (Math.abs(deltaY) > MOVE_TOLERANCE) {
        clearTimer();
        movedBeforePicker = true;
        event.preventDefault();
        scrollTarget.scrollTop -= event.movementY || 0;
      }
      return;
    }
    event.preventDefault();
    const rawIndex = magneticRawRowIndex(startIndex, deltaY);
    setActive(magneticPreferredIndex(rawIndex, selectableIndices, rows.length));
  }
  function onPointerUp(event) {
    if (event.pointerId !== pointerId) return;
    if (pickerActive) activate();
    else {
      if (movedBeforePicker) suppressClick = true;
      reset();
    }
  }
  function onPointerDown(event) {
    if ((event.pointerType === 'mouse' && event.button !== 0) || pointerId !== null) return;
    rows = rowsFor(list, options.rowSelector);
    if (!rows.length) return;
    suppressClick = false;
    movedBeforePicker = false;
    pointerId = event.pointerId;
    startY = event.clientY;
    document.documentElement?.classList.add('is-picker-active');
    clearTimer();
    document.addEventListener?.('pointermove', onPointerMove, { passive: false });
    document.addEventListener?.('pointerup', onPointerUp);
    document.addEventListener?.('pointercancel', reset);
    timer = setTimeout(enter, DEFAULT_HOLD_MS);
  }
  function onClick(event) {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }
  function onKeyDown(event) {
    if (event.key === 'Escape' && pickerActive) {
      event.preventDefault();
      reset(true);
    }
  }
  const onPointerLeave = (event) => !pickerActive && event.pointerId === pointerId && reset(true);
  const onContextMenu = (event) => pointerId !== null && event.preventDefault();
  const removeListeners = bindPickerEvents(list, {
    onPointerDown,
    onPointerLeave,
    reset,
    onClick,
    onKeyDown,
    onContextMenu,
  });

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      reset();
      removeListeners();
      cancelRow?.remove();
      status.remove();
    },
  };
}
