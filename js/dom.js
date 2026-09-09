export const app = document.querySelector('#app');
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
export const dayNow = () => new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
export const listMarkup = (items, className = '', label = '') => `<ul class="app-list${className ? ` ${className}` : ''}"${label ? ` aria-label="${esc(label)}"` : ''}>${items.join('')}</ul>`;
export const titleMarkup = (text, id, level = 'h1', className = '') => `<${level} id="${esc(id)}" class="app-title${className ? ` ${className}` : ''}" data-title-marquee><span class="title-marquee-track"><span class="title-marquee-text">${esc(text)}</span></span></${level}>`;
const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>',
  upload: '<path d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  dash: '<path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
export const icon = (name, label = '') => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg><span class="sr-only">${esc(label)}</span>`;
export const pageNav = current => {
  const labels = {today: 'Home', routine: 'Routine', history: 'History'};
  const currentLabel = labels[current] || 'Home';
  return `<nav class="app-nav" aria-label="Primary"><a class="app-brand" href="/" aria-label="MaxSNR home">MAXSNR</a><span class="app-location" aria-current="page">${currentLabel}</span><details class="app-menu"><summary aria-label="Open navigation">Menu</summary><div class="app-menu-list"><a href="/"${current === 'today' ? ' aria-current="page"' : ''}>Home</a><a href="/routine/"${current === 'routine' ? ' aria-current="page"' : ''}>Routine</a><a href="/history/"${current === 'history' ? ' aria-current="page"' : ''}>History</a></div></details></nav>`;
};
export function bindHoldScroll(root = document) {
  root.querySelectorAll('[data-hold-scroll]').forEach(element => {
    if (element.dataset.holdBound) return;
    element.dataset.holdBound = 'true';
    const text = element.querySelector('.hold-scroll-text') || element;
    let timer;
    const stop = () => {
      clearTimeout(timer);
      element.classList.remove('is-hold-scrolling');
      text.style.removeProperty('--scroll-distance');
    };
    const start = () => {
      if (text.scrollWidth <= element.clientWidth + 1) return;
      text.style.setProperty('--scroll-distance', `${Math.min(0, element.clientWidth - text.scrollWidth)}px`);
      element.classList.add('is-hold-scrolling');
    };
    const schedule = () => { timer = setTimeout(start, 1400); };
    schedule();
    element.addEventListener('pointerdown', () => { clearTimeout(timer); timer = setTimeout(start, 450); });
    element.addEventListener('pointerup', stop);
    element.addEventListener('pointercancel', stop);
    element.addEventListener('pointerleave', stop);
    element.addEventListener('blur', stop);
  });
  bindMagneticLists(root);
}
const MAGNETIC_HOLD_MS = 400;
const MAGNETIC_MOVE_TOLERANCE = 24;
const MAGNETIC_STATUS_CLASS = 'magnetic-list-status';
const MAGNETIC_DETENT_DISTANCE = 24;
const MAGNETIC_HOLD_VIBRATION = 5;
const MAGNETIC_DETENT_VIBRATION = [20, 30, 20];

function buzzAfterPaint(pattern) {
  const schedule = callback => {
    if (globalThis.window?.requestAnimationFrame) {
      globalThis.window.requestAnimationFrame(() => setTimeout(callback, 0));
      return;
    }
    setTimeout(callback, 0);
  };
  schedule(() => buzz(pattern));
}

export function magneticRawRowIndex(startIndex, deltaY, detentDistance = MAGNETIC_DETENT_DISTANCE) {
  const distance = Math.max(1, detentDistance || MAGNETIC_DETENT_DISTANCE);
  return startIndex + Math.round(deltaY / distance);
}

export function magneticRowIndex(startIndex, deltaY, rowCount, detentDistance) {
  if (!rowCount) return -1;
  return Math.max(0, Math.min(rowCount - 1, magneticRawRowIndex(startIndex, deltaY, detentDistance)));
}

export function magneticPickerIndex(rawIndex, rowCount) {
  return rawIndex < 0 || rawIndex >= rowCount ? -1 : rawIndex;
}

export function magneticPreferredIndex(rawIndex, selectableIndices, rowCount) {
  const index = magneticPickerIndex(rawIndex, rowCount);
  if (index < 0 || !selectableIndices.length) return index;
  return selectableIndices.reduce((nearest, candidate) => Math.abs(candidate - index) < Math.abs(nearest - index) ? candidate : nearest, selectableIndices[0]);
}

export function magneticEdgePosition(index, rowCount, overshoot = 0) {
  if (!rowCount) return -1;
  if (index >= 0 && index < rowCount) return index;
  const edge = index < 0 ? 0 : rowCount - 1;
  const distance = overshoot || (index < 0 ? index : index - edge);
  return edge + (distance / (Math.abs(distance) + 3));
}

function listRows(list) {
  return [...list.children].filter(row => row.matches?.('li'));
}

function rowAction(row) {
  return row.querySelector?.('a, button, label, [role="button"]');
}

function enabledAction(row) {
  const action = rowAction(row);
  return action && !action.disabled && action.getAttribute('aria-disabled') !== 'true' && !action.classList.contains('is-disabled')
    ? action
    : null;
}

function nearestRow(rows, y) {
  if (!rows.length) return -1;
  const boxes = rows.map(row => row.getBoundingClientRect());
  if (y >= boxes[boxes.length - 1].bottom) return rows.length - 1;
  return boxes.reduce((nearest, box, index) => {
    const distance = Math.abs(y - (box.top + box.height / 2));
    return distance < nearest.distance ? {index, distance} : nearest;
  }, {index: 0, distance: Infinity}).index;
}

function scrollSurface(list) {
  let surface = list;
  while (surface && surface !== document.body) {
    if (surface.scrollHeight > surface.clientHeight + 1) return surface;
    surface = surface.parentElement;
  }
  return document.scrollingElement || document.documentElement || list;
}

function magneticStatus(list) {
  let status = list.querySelector(`.${MAGNETIC_STATUS_CLASS}`);
  if (status) return status;
  status = document.createElement('output');
  status.className = `${MAGNETIC_STATUS_CLASS} sr-only`;
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  (list.parentElement || list).append(status);
  return status;
}

function describeRow(row) {
  return rowAction(row)?.getAttribute('aria-label') || row.textContent.trim().replace(/\s+/g, ' ') || 'Unavailable item';
}

function pointerOutside(element, event) {
  const box = element.getBoundingClientRect?.();
  return box && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
}

export function bindMagneticLists(root = document) {
  root.querySelectorAll?.('.app-list').forEach(list => {
    if (list.dataset.magneticBound) return;
    list.dataset.magneticBound = 'true';
    const status = magneticStatus(list);
    let timer;
    let pointerId = null;
    let startY = 0;
    let lastY = 0;
    let startIndex = -1;
    let activeIndex = -1;
    let rows = [];
    let selectableIndices = [];
    let pickerActive = false;
    let suppressClick = false;
    let movedBeforePicker = false;
    const scrollTarget = scrollSurface(list);

    const clearTimer = () => { clearTimeout(timer); timer = null; };
    const stopDocumentTracking = () => {
      document.removeEventListener?.('pointermove', onPointerMove);
      document.removeEventListener?.('pointerup', onPointerUp);
      document.removeEventListener?.('pointercancel', cancel);
    };
    const startDocumentTracking = () => {
      document.addEventListener?.('pointermove', onPointerMove, {passive: false});
      document.addEventListener?.('pointerup', onPointerUp);
      document.addEventListener?.('pointercancel', cancel);
    };
    const setActive = (index, vibration = MAGNETIC_DETENT_VIBRATION, deferVibration = false) => {
      if (!rows.length) return;
      const nextIndex = index < 0 || index >= rows.length ? -1 : index;
      const changed = nextIndex !== activeIndex;
      rows.forEach((row, rowIndex) => {
        const isTarget = nextIndex >= 0 && rowIndex === nextIndex;
        row.classList.toggle('is-magnetic-target', isTarget);
        if (isTarget) row.setAttribute('aria-current', 'true');
        else row.removeAttribute('aria-current');
      });
      activeIndex = nextIndex;
      if (changed) {
        if (deferVibration) buzzAfterPaint(vibration);
        else buzz(vibration);
      }
      if (activeIndex < 0) {
        status.textContent = 'Picker cancelled — release to cancel';
        return;
      }
      const row = rows[activeIndex];
      status.textContent = `Picker: ${describeRow(row)}${enabledAction(row) ? '' : ', unavailable'}`;
      row.scrollIntoView?.({block: 'nearest', behavior: globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    };
    const reset = () => {
      clearTimer();
      stopDocumentTracking();
      if (pointerId !== null) {
        try { list.releasePointerCapture?.(pointerId); } catch {}
      }
      rows.forEach(row => {
        row.classList.remove('is-magnetic-target');
        row.removeAttribute('aria-current');
      });
      list.classList.remove('is-magnetic-picker');
      document.documentElement?.classList.remove('is-magnetic-picker-active');
      status.classList.remove('is-magnetic-status-visible');
      list.style.removeProperty('touch-action');
      status.textContent = '';
      pointerId = null;
      activeIndex = -1;
      startIndex = -1;
      rows = [];
      selectableIndices = [];
      pickerActive = false;
      movedBeforePicker = false;
    };
    const cancel = () => { reset(); };
    const activate = () => {
      const action = rows[activeIndex] && enabledAction(rows[activeIndex]);
      if (!action) {
        suppressClick = true;
        reset();
        return;
      }
      buzz([6, 14, 6]);
      action.click();
      suppressClick = true;
      reset();
    };
    const enter = () => {
      if (pointerId === null) return;
      rows = listRows(list);
      if (!rows.length) return reset();
      selectableIndices = rows.reduce((indices, row, index) => enabledAction(row) ? [...indices, index] : indices, []);
      startIndex = magneticPreferredIndex(nearestRow(rows, startY), selectableIndices, rows.length);
      pickerActive = true;
      list.classList.add('is-magnetic-picker');
      document.documentElement?.classList.add('is-magnetic-picker-active');
      status.classList.add('is-magnetic-status-visible');
      list.style.setProperty('touch-action', 'none');
      list.setPointerCapture?.(pointerId);
      setActive(startIndex, MAGNETIC_HOLD_VIBRATION, true);
    };
    const onPointerDown = event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (pointerId !== null) return;
      rows = listRows(list);
      if (!rows.length) return;
      suppressClick = false;
      movedBeforePicker = false;
      pointerId = event.pointerId;
      startY = lastY = event.clientY;
      document.documentElement?.classList.add('is-magnetic-picker-active');
      clearTimer();
      startDocumentTracking();
      timer = setTimeout(enter, MAGNETIC_HOLD_MS);
    };
    const onPointerMove = event => {
      if (event.pointerId !== pointerId) return;
      const previousY = lastY;
      lastY = event.clientY;
      if (!pickerActive) {
        if (Math.abs(lastY - startY) > MAGNETIC_MOVE_TOLERANCE) {
          clearTimer();
          movedBeforePicker = true;
          event.preventDefault();
          scrollTarget.scrollTop += previousY - lastY;
        }
        return;
      }
      event.preventDefault();
      const rawIndex = magneticRawRowIndex(startIndex, lastY - startY);
      const nextIndex = magneticPreferredIndex(rawIndex, selectableIndices, rows.length);
      setActive(nextIndex);
    };
    const onPointerUp = event => {
      if (event.pointerId !== pointerId) return;
      const outside = pointerOutside(list, event);
      if (pickerActive && !outside) activate();
      else {
        if (movedBeforePicker) suppressClick = true;
        reset();
      }
    };
    const onClick = event => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    list.addEventListener('pointerdown', onPointerDown);
    list.addEventListener('pointercancel', cancel);
    list.addEventListener('pointerleave', event => { if (!pickerActive && event.pointerId === pointerId) cancel(); });
    list.addEventListener('blur', cancel);
    list.addEventListener('click', onClick, true);
    list.addEventListener('keydown', event => { if (event.key === 'Escape' && pickerActive) { event.preventDefault(); cancel(); } });
    document.addEventListener?.('keydown', event => { if (event.key === 'Escape' && pickerActive) { event.preventDefault(); cancel(); } });
    document.addEventListener?.('visibilitychange', cancel);
    globalThis.window?.addEventListener?.('blur', cancel);
  });
}
export function bindTitleMarquee(root = document) {
  root.querySelectorAll('[data-title-marquee]').forEach(element => {
    if (element.dataset.marqueeBound) return;
    element.dataset.marqueeBound = 'true';
    const text = element.querySelector('.title-marquee-text') || element;
    const track = element.querySelector('.title-marquee-track') || element;
    const start = () => {
      const textWidth = text.getBoundingClientRect().width;
      if (textWidth <= element.clientWidth + 1) return;
      const distance = Math.min(0, element.clientWidth - textWidth);
      track.style.setProperty('--marquee-distance', `${distance}px`);
      element.classList.add('is-title-marquee');
    };
    track.addEventListener('animationend', event => {
      if (event.animationName !== 'title-marquee') return;
      element.classList.remove('is-title-marquee');
      track.style.removeProperty('--marquee-distance');
    });
    setTimeout(start, 1400);
  });
}
export const buzz = pattern => globalThis.navigator?.vibrate?.(pattern);
let wakeLock;
export async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch {} }
document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible' && document.body?.dataset.route === 'workout') void keepAwake(); });
