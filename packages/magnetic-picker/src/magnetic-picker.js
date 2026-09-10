const DEFAULT_HOLD_MS = 400;
const MOVE_TOLERANCE = 24;
const DETENT_DISTANCE = 24;
const ACCELERATION_START_DETENTS = 2;
const ACCELERATION_POWER = 1.35;
const HOLD_VIBRATION = 5;
const DETENT_VIBRATION = [20, 30, 20];
const SELECT_VIBRATION = [6, 14, 6];
const CANCEL_FADE_MS = 420;
const DEFAULT_JOYSTICK_DEAD_ZONE = 10;
const DEFAULT_JOYSTICK_RADIUS = 64;
const DEFAULT_JOYSTICK_MAX_SPEED = 16;
const JOYSTICK_RESPONSE = 30;
const JOYSTICK_MIN_SPEED = 4;
const JOYSTICK_SPEED_EXPONENT = 0.6;

export function magneticJoystickSpeed(
  distanceY,
  detentDistance = DETENT_DISTANCE,
  deadZone = DEFAULT_JOYSTICK_DEAD_ZONE,
  maxSpeed = DEFAULT_JOYSTICK_MAX_SPEED,
  radius = DEFAULT_JOYSTICK_RADIUS,
) {
  const distance = Math.max(1, Number(detentDistance) || DETENT_DISTANCE);
  const numericZone = Number(deadZone);
  const numericCap = Number(maxSpeed);
  const zone = Math.max(0, Number.isFinite(numericZone) ? numericZone : distance);
  const cap = Math.max(0, Number.isFinite(numericCap) ? numericCap : DEFAULT_JOYSTICK_MAX_SPEED);
  const numericRadius = Number(radius);
  const limit = Math.max(zone + 1, Number.isFinite(numericRadius) ? numericRadius : 64);
  const magnitude = Math.min(limit, Math.abs(Number(distanceY) || 0));
  if (magnitude <= zone || cap === 0) return 0;
  const normalized = (magnitude - zone) / (limit - zone);
  const eased = normalized ** JOYSTICK_SPEED_EXPONENT;
  const baseSpeed = Math.min(JOYSTICK_MIN_SPEED, cap);
  return Math.sign(distanceY) * (baseSpeed + (cap - baseSpeed) * eased);
}

export function magneticJoystickVelocity(
  currentVelocity,
  targetVelocity,
  elapsed,
  response = JOYSTICK_RESPONSE,
) {
  const delta = Math.max(0, Math.min(0.1, Number(elapsed) || 0));
  const factor = 1 - Math.exp(-Math.max(0, Number(response) || JOYSTICK_RESPONSE) * delta);
  return currentVelocity + (targetVelocity - currentVelocity) * factor;
}

export function magneticRawRowIndex(startIndex, deltaY, detentDistance = DETENT_DISTANCE) {
  const distance = Math.max(1, detentDistance || DETENT_DISTANCE);
  const detents = deltaY / distance;
  const magnitude = Math.abs(detents);
  const acceleratedMagnitude =
    magnitude <= ACCELERATION_START_DETENTS
      ? magnitude
      : ACCELERATION_START_DETENTS + (magnitude - ACCELERATION_START_DETENTS) ** ACCELERATION_POWER;
  return startIndex + Math.round(Math.sign(detents) * acceleratedMagnitude);
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
  rowSelector: ':scope > [data-picker-item]:not([hidden]):not([data-picker-skip])',
  actionSelector: '[data-picker-action]',
  primarySelector: '[data-picker-primary]',
  onSelect: () => {},
  onCancel: () => {},
  isSelectable: (action) =>
    !action || (!action.disabled && action.getAttribute('aria-disabled') !== 'true'),
  cancel: true,
  cancelLabel: 'Cancel',
  disabled: false,
  holdMs: DEFAULT_HOLD_MS,
  detentDistance: DETENT_DISTANCE,
  joystick: true,
  joystickRadius: DEFAULT_JOYSTICK_RADIUS,
  joystickDeadZone: DEFAULT_JOYSTICK_DEAD_ZONE,
  joystickMaxSpeed: DEFAULT_JOYSTICK_MAX_SPEED,
  activeListClass: 'is-picker-active',
  activeDocumentClass: 'is-picker-active',
  targetRowClass: 'is-picker-target',
  cancelRowClass: 'picker-cancel-row',
  cancelRowAttribute: 'data-picker-cancel-row',
  cancelActionAttribute: 'data-picker-cancel',
  statusClass: 'picker-status',
  statusVisibleClass: 'is-picker-status-visible',
  visuallyHiddenClass: 'sr-only',
  holdingClass: 'is-picker-holding',
};

function rowsFor(list, selector) {
  return [...list.querySelectorAll(selector)];
}

function actionFor(row, selector) {
  return row.querySelector?.(selector) || null;
}

function valueFor(row, action) {
  return row?.getAttribute?.('data-picker-value') ?? action?.getAttribute?.('value') ?? '';
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

function ensureCancelRow(list, label, options) {
  const existing = list.querySelector?.(`[${options.cancelRowAttribute}]`);
  if (existing) return existing;
  const row = document.createElement('li');
  row.className = options.cancelRowClass;
  row.hidden = true;
  row.setAttribute(options.cancelRowAttribute, '');
  const escapedLabel = String(label).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
  row.innerHTML = `<button class="list-link" type="button" ${options.cancelActionAttribute} aria-label="${escapedLabel}"><span>${escapedLabel}</span></button>`;
  list.append(row);
  return row;
}

function ensureStatus(list, options) {
  let status = list.querySelector?.(`.${options.statusClass}`);
  if (status) return status;
  status = document.createElement('output');
  status.className = `${options.statusClass} ${options.visuallyHiddenClass}`;
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

function joystickDisplacement(originX, originY, clientX, clientY, radius) {
  const deltaX = clientX - originX;
  const deltaY = clientY - originY;
  const distance = Math.hypot(deltaX, deltaY);
  if (!distance || distance <= radius) return { x: deltaX, y: deltaY };
  const scale = radius / distance;
  return { x: deltaX * scale, y: deltaY * scale };
}

function bindPickerEvents(list, handlers) {
  const { onPointerDown, onPointerLeave, reset, onClick, onKeyDown } = handlers;
  const { onPointerCancel } = handlers;
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
  const isDisabled = () =>
    typeof options.disabled === 'function' ? options.disabled(list) : options.disabled;
  if (isDisabled()) return { destroy() {} };
  const status = ensureStatus(list, options);
  const cancelRow = options.cancel ? ensureCancelRow(list, options.cancelLabel, options) : null;
  let timer = null;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let joystickY = 0;
  let joystickPosition = 0;
  let joystickVelocity = 0;
  let joystickFrame = null;
  let joystickFrameTime = null;
  let joystickOverlay = null;
  let joystickWell = null;
  let startIndex = -1;
  let activeIndex = -1;
  let rows = [];
  let selectableIndices = [];
  let pickerActive = false;
  let suppressClick = false;
  let movedBeforePicker = false;
  let destroyed = false;
  let cancelHideTimer = null;
  let cancelVisibilityToken = 0;
  const scrollTarget = scrollSurface(list);
  const buzz = (pattern) => globalThis.navigator?.vibrate?.(pattern);
  const clearTimer = () => {
    clearTimeout(timer);
    timer = null;
  };
  const setHolding = (holding) => {
    list.classList.toggle(options.holdingClass, holding);
    if (holding)
      list.style.setProperty('--picker-hold-duration', `${Math.max(0, options.holdMs)}ms`);
    else list.style.removeProperty('--picker-hold-duration');
  };
  const clearCancelHideTimer = () => {
    clearTimeout(cancelHideTimer);
    cancelHideTimer = null;
  };
  const showCancelRow = () => {
    if (!cancelRow) return;
    clearCancelHideTimer();
    const visibilityToken = ++cancelVisibilityToken;
    cancelRow.removeAttribute('hidden');
    cancelRow.classList.remove('is-picker-cancel-hiding');
    cancelRow.classList.remove('is-picker-cancel-visible');
    void cancelRow.offsetWidth;
    const scheduleFrame =
      globalThis.window?.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
    scheduleFrame(() =>
      scheduleFrame(() => {
        if (visibilityToken === cancelVisibilityToken && !destroyed)
          cancelRow.classList.add('is-picker-cancel-visible');
      }),
    );
  };
  const hideCancelRow = () => {
    if (!cancelRow) return;
    clearCancelHideTimer();
    cancelVisibilityToken++;
    cancelRow.classList.remove('is-picker-cancel-visible');
    cancelRow.classList.add('is-picker-cancel-hiding');
    cancelHideTimer = setTimeout(() => {
      cancelRow.setAttribute('hidden', '');
      cancelHideTimer = null;
    }, CANCEL_FADE_MS);
  };
  const stopDocumentTracking = () => {
    document.removeEventListener?.('pointermove', onPointerMove);
    document.removeEventListener?.('pointerup', onPointerUp);
    document.removeEventListener?.('pointercancel', onPointerCancel);
  };
  const cancelJoystick = () => {
    if (joystickFrame !== null) {
      const cancelFrame =
        globalThis.window?.cancelAnimationFrame || globalThis.cancelAnimationFrame;
      if (cancelFrame) cancelFrame.call(globalThis.window, joystickFrame);
      else clearTimeout(joystickFrame);
    }
    joystickFrame = null;
    joystickFrameTime = null;
    joystickVelocity = 0;
  };
  const removeJoystickOverlay = () => {
    joystickOverlay?.remove?.();
    joystickOverlay = null;
    joystickWell = null;
  };
  const updateJoystickOverlay = (clientX, clientY) => {
    if (!joystickWell) return;
    const radius = Math.max(1, Number(options.joystickRadius) || DEFAULT_JOYSTICK_RADIUS);
    const displacement = joystickDisplacement(startX, startY, clientX, clientY, radius);
    joystickWell.style.setProperty('--picker-thumb-x', `${displacement.x}px`);
    joystickWell.style.setProperty('--picker-thumb-y', `${displacement.y}px`);
    joystickY = startY + displacement.y;
  };
  const showJoystickOverlay = () => {
    if (!options.joystick || !document.createElement || !document.body?.append) return;
    const overlay = document.createElement('div');
    const well = document.createElement('div');
    const thumb = document.createElement('div');
    overlay.className = 'picker-joystick-overlay';
    well.className = 'picker-joystick-well';
    thumb.className = 'picker-joystick-thumb';
    overlay.setAttribute('aria-hidden', 'true');
    well.style.setProperty('--picker-joystick-x', `${startX}px`);
    well.style.setProperty('--picker-joystick-y', `${startY}px`);
    well.style.setProperty(
      '--picker-joystick-radius',
      `${Math.max(1, Number(options.joystickRadius) || DEFAULT_JOYSTICK_RADIUS)}px`,
    );
    well.append(thumb);
    overlay.append(well);
    document.body.append(overlay);
    joystickOverlay = overlay;
    joystickWell = well;
    updateJoystickOverlay(startX, startY);
  };
  const requestJoystickFrame = () =>
    globalThis.window?.requestAnimationFrame || globalThis.requestAnimationFrame || null;
  const pickerFrame = (time) => {
    if (!pickerActive || destroyed) return;
    const currentTime = Number.isFinite(time) ? time : Date.now();
    const previousTime = joystickFrameTime ?? currentTime;
    const elapsed = Math.min(0.1, Math.max(0, (currentTime - previousTime) / 1000));
    joystickFrameTime = currentTime;
    const deadZone = options.joystickDeadZone ?? options.detentDistance;
    const speed = magneticJoystickSpeed(
      joystickY - startY,
      options.detentDistance,
      deadZone,
      options.joystickMaxSpeed,
      options.joystickRadius,
    );
    joystickVelocity =
      speed === 0 ? 0 : magneticJoystickVelocity(joystickVelocity, speed, elapsed);
    if (Math.abs(joystickVelocity) > 0.001) {
      joystickPosition = magneticPickerIndex(
        joystickPosition + joystickVelocity * elapsed,
        rows.length,
      );
      const rowHeight = rows[activeIndex]?.getBoundingClientRect?.().height || 50;
      const maxScrollTop = Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
      const currentScrollTop = Number(scrollTarget.scrollTop) || 0;
      const nextScrollTop = Math.max(
        0,
        Math.min(maxScrollTop, currentScrollTop + joystickVelocity * rowHeight * elapsed),
      );
      scrollTarget.scrollTop = nextScrollTop;
      setActive(
        magneticPreferredIndex(Math.round(joystickPosition), selectableIndices, rows.length),
        DETENT_VIBRATION,
        false,
      );
    }
    const scheduleFrame = requestJoystickFrame();
    joystickFrame = scheduleFrame ? scheduleFrame.call(globalThis.window, pickerFrame) : null;
  };
  const startJoystick = () => {
    if (!options.joystick) return;
    const scheduleFrame = requestJoystickFrame();
    if (!scheduleFrame) return;
    cancelJoystick();
    joystickY = startY;
    joystickPosition = activeIndex;
    joystickVelocity = 0;
    joystickFrame = scheduleFrame.call(globalThis.window, pickerFrame);
  };
  const setActive = (index, vibration = DETENT_VIBRATION, ensureVisible = true) => {
    if (!rows.length) return;
    const nextIndex = index < 0 || index >= rows.length ? -1 : index;
    const changed = nextIndex !== activeIndex;
    if (changed) buzz(vibration);
    rows.forEach((row, rowIndex) => {
      const isTarget = nextIndex >= 0 && rowIndex === nextIndex;
      row.classList.toggle(options.targetRowClass, isTarget);
      if (isTarget) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    activeIndex = nextIndex;
    const row = rows[activeIndex];
    const action = row && actionFor(row, options.actionSelector);
    status.textContent = `Picker: ${describeRow(row, action)}${
      options.isSelectable(action, row) ? '' : ', unavailable'
    }`;
    if (ensureVisible)
      row?.scrollIntoView?.({
        block: 'nearest',
        behavior:
          pickerActive ||
          globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
      });
  };
  const reset = (notify = false) => {
    const shouldNotify = notify === true || (Boolean(notify) && pickerActive);
    clearTimer();
    cancelJoystick();
    setHolding(false);
    stopDocumentTracking();
    if (pointerId !== null) {
      try {
        list.releasePointerCapture?.(pointerId);
      } catch {
        // Pointer capture may already have been released by the browser.
      }
    }
    rows.forEach((row) => {
      row.classList.remove(options.targetRowClass);
      row.removeAttribute('aria-current');
    });
    removeJoystickOverlay();
    hideCancelRow();
    list.classList.remove(options.activeListClass);
    document.documentElement?.classList.remove(options.activeDocumentClass);
    status.classList.remove(options.statusVisibleClass);
    list.style.removeProperty('touch-action');
    status.textContent = '';
    pointerId = null;
    startX = 0;
    activeIndex = -1;
    startIndex = -1;
    rows = [];
    selectableIndices = [];
    pickerActive = false;
    movedBeforePicker = false;
    if (shouldNotify) options.onCancel();
  };
  const activate = () => {
    const row = rows[activeIndex];
    if (row?.hasAttribute?.(options.cancelRowAttribute)) {
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
    options.onSelect(valueFor(row, action), { row, action, index: activeIndex });
    suppressClick = true;
    reset();
  };
  const enter = () => {
    if (pointerId === null || destroyed) return;
    setHolding(false);
    showCancelRow();
    rows = rowsFor(list, options.rowSelector);
    selectableIndices = rows.reduce((indices, row, index) => {
      const action = actionFor(row, options.actionSelector);
      return options.isSelectable(action, row) ? [...indices, index] : indices;
    }, []);
    if (!selectableIndices.length) {
      reset();
      return;
    }
    if (startIndex < 0)
      startIndex = magneticEntryIndex(nearestRow(rows, startY), selectableIndices, rows.length);
    pickerActive = true;
    list.classList.add(options.activeListClass);
    document.documentElement?.classList.add(options.activeDocumentClass);
    status.classList.add(options.statusVisibleClass);
    list.style.setProperty('touch-action', 'none');
    list.setPointerCapture?.(pointerId);
    setActive(startIndex, HOLD_VIBRATION);
    showJoystickOverlay();
    startJoystick();
  };
  function onPointerMove(event) {
    if (event.pointerId !== pointerId) return;
    const deltaY = event.clientY - startY;
    if (!pickerActive) {
      if (Math.abs(deltaY) > MOVE_TOLERANCE) {
        clearTimer();
        setHolding(false);
        movedBeforePicker = true;
        event.preventDefault();
        scrollTarget.scrollTop -= event.clientY - lastY;
      }
      lastY = event.clientY;
      return;
    }
    event.preventDefault();
    updateJoystickOverlay(event.clientX ?? startX, event.clientY);
    if (!options.joystick) {
      const rawIndex = magneticRawRowIndex(startIndex, deltaY, options.detentDistance);
      setActive(magneticPreferredIndex(rawIndex, selectableIndices, rows.length));
    }
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
    if (event.pointerType === 'mouse')
      document.documentElement?.classList.remove('is-touch-pointer');
    else document.documentElement?.classList.add('is-touch-pointer');
    rows = rowsFor(list, options.rowSelector);
    if (!rows.length) return;
    suppressClick = false;
    movedBeforePicker = false;
    setHolding(true);
    pointerId = event.pointerId;
    startX = Number.isFinite(event.clientX) ? event.clientX : 0;
    startY = event.clientY;
    lastY = event.clientY;
    list.setPointerCapture?.(pointerId);
    document.documentElement?.classList.add(options.activeDocumentClass);
    selectableIndices = rows.reduce((indices, row, index) => {
      const action = actionFor(row, options.actionSelector);
      return options.isSelectable(action, row) ? [...indices, index] : indices;
    }, []);
    startIndex = magneticEntryIndex(nearestRow(rows, startY), selectableIndices, rows.length);
    clearTimer();
    document.addEventListener?.('pointermove', onPointerMove, { passive: false });
    document.addEventListener?.('pointerup', onPointerUp);
    document.addEventListener?.('pointercancel', onPointerCancel);
    timer = setTimeout(enter, options.holdMs);
  }
  function onPointerCancel(event) {
    if (event.pointerId !== pointerId) return;
    reset(pickerActive);
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
  const onPointerLeave = (event) => {
    if (event.pointerId !== pointerId) return;
    if (!pickerActive) reset();
  };
  const onContextMenu = (event) => pickerActive && event.preventDefault();
  const removeListeners = bindPickerEvents(list, {
    onPointerDown,
    onPointerLeave,
    onPointerCancel,
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
      status.remove();
      if (cancelRow) {
        cancelHideTimer = setTimeout(() => {
          cancelRow.remove();
          cancelHideTimer = null;
        }, CANCEL_FADE_MS);
      }
    },
  };
}
