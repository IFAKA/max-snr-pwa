export const app = document.querySelector('#app');
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
export const dayNow = () => new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
export const go = path => location.assign(path);
const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>',
  upload: '<path d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16"/>',
  arrowLeft: '<path d="m15 18-6-6 6-6M9 12h11"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
};
export const icon = (name, label = '') => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg><span class="sr-only">${esc(label)}</span>`;
export const pageNav = current => `<nav class="app-nav" aria-label="Primary"><a class="icon-button${current === 'today' ? ' is-current' : ''}" href="/" aria-label="Today">${icon('home', 'Today')}</a><a class="icon-button${current === 'routine' ? ' is-current' : ''}" href="/routine/" aria-label="Routine">${icon('calendar', 'Routine')}</a><a class="icon-button${current === 'history' ? ' is-current' : ''}" href="/history/" aria-label="History">${icon('history', 'History')}</a></nav>`;
export const buzz = pattern => navigator.vibrate?.(pattern);
let wakeLock;
export async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch {} }
document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible' && document.body?.dataset.route === 'workout') void keepAwake(); });
