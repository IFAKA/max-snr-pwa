export const app = document.querySelector('#app');
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const dayNow = () => new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date());
export const listMarkup = (items, className = '', label = '') =>
  `<ul class="app-list${className ? ` ${className}` : ''}"${label ? ` aria-label="${esc(label)}"` : ''}>${items.join('')}</ul>`;
export const titleMarkup = (text, id, level = 'h1', className = '') =>
  `<${level} id="${esc(id)}" class="app-title${className ? ` ${className}` : ''}" data-title-marquee><span class="title-marquee-track"><span class="title-marquee-text">${esc(text)}</span></span></${level}>`;
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
export const icon = (name, label = '') =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg><span class="sr-only">${esc(label)}</span>`;
export const pageNav = (current) => {
  const labels = { today: 'Home', routine: 'Routine', history: 'History' };
  const currentLabel = labels[current] || 'Home';
  return `<nav class="app-nav" aria-label="Primary"><a class="app-brand" href="/" aria-label="MaxSNR home">MAXSNR</a><span class="app-location" aria-current="page">${currentLabel}</span><details class="app-menu"><summary aria-label="Open navigation">Menu</summary><div class="app-menu-list"><a href="/"${current === 'today' ? ' aria-current="page"' : ''}>Home</a><a href="/routine/"${current === 'routine' ? ' aria-current="page"' : ''}>Routine</a><a href="/history/"${current === 'history' ? ' aria-current="page"' : ''}>History</a></div></details></nav>`;
};
export function bindHoldScroll(root = document) {
  root.querySelectorAll('[data-hold-scroll]').forEach((element) => {
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
      text.style.setProperty(
        '--scroll-distance',
        `${Math.min(0, element.clientWidth - text.scrollWidth)}px`,
      );
      element.classList.add('is-hold-scrolling');
    };
    const schedule = () => {
      timer = setTimeout(start, 1400);
    };
    schedule();
    element.addEventListener('pointerdown', () => {
      clearTimeout(timer);
      timer = setTimeout(start, 450);
    });
    element.addEventListener('pointerup', stop);
    element.addEventListener('pointercancel', stop);
    element.addEventListener('pointerleave', stop);
    element.addEventListener('blur', stop);
  });
  bindMagneticLists(root);
}
import { createMagneticPicker } from '../packages/magnetic-picker/src/magnetic-picker.js';

export function bindMagneticLists(root = document) {
  root.querySelectorAll?.('.app-list').forEach((list) => {
    if (list.dataset.magneticBound) return;
    list.dataset.magneticBound = 'true';
    createMagneticPicker(list, {
      rowSelector: ':scope > li:not([hidden]):not([data-picker-skip])',
      actionSelector: 'a, button, label, [role="button"]',
      activeListClass: 'is-picker-active',
      activeDocumentClass: 'is-picker-active',
      targetRowClass: 'is-picker-target',
      cancelRowClass: 'picker-cancel-row',
      cancelRowAttribute: 'data-picker-cancel-row',
      cancelActionAttribute: 'data-picker-cancel',
      statusClass: 'picker-status',
      statusVisibleClass: 'is-picker-status-visible',
      visuallyHiddenClass: 'sr-only',
      disabled: (list) => !list.querySelector?.('a, button, label, [role="button"]'),
      isSelectable: (action) =>
        !action ||
        (!action.disabled &&
          action.getAttribute('aria-disabled') !== 'true' &&
          !action.classList.contains('is-disabled')),
      onSelect: (_value, { action }) => action.click(),
    });
  });
}
export function bindTitleMarquee(root = document) {
  root.querySelectorAll('[data-title-marquee]').forEach((element) => {
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
    track.addEventListener('animationend', (event) => {
      if (event.animationName !== 'title-marquee') return;
      element.classList.remove('is-title-marquee');
      track.style.removeProperty('--marquee-distance');
    });
    setTimeout(start, 1400);
  });
}
export const buzz = (pattern) => globalThis.navigator?.vibrate?.(pattern);
export async function keepAwake() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible')
      await navigator.wakeLock.request('screen');
  } catch (error) {
    void error;
  }
}
document.addEventListener?.('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.body?.dataset.route === 'workout')
    void keepAwake();
});
