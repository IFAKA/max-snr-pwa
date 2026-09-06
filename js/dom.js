export const app = document.querySelector('#app');
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
export const dayNow = () => new Intl.DateTimeFormat('en', {weekday: 'long'}).format(new Date());
export const go = path => location.assign(path);
export const buzz = pattern => navigator.vibrate?.(pattern);
let wakeLock;
export async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch {} }
document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible' && document.body?.dataset.route === 'workout') void keepAwake(); });
