const CACHE_NAME = 'maxsnr-v13';
const PRECACHE = ['/', '/routine/', '/history/', '/workout/', '/styles.css', '/manifest.webmanifest', '/app.js', '/js/backup.js', '/js/constants.js', '/js/dom.js', '/js/render-history.js', '/js/render-routine.js', '/js/render-today.js', '/js/render-workout.js', '/js/render-workout/completion.js', '/js/render-workout/lifting.js', '/js/render-workout/plank.js', '/js/render-workout/rest.js', '/js/render-workout/select.js', '/js/render-workout/shared.js', '/js/render-workout/stretch.js', '/js/render-workout/warmup.js', '/js/routine-data.js', '/js/routine-view.js', '/js/state.js', '/js/storage.js', '/js/workout.js', '/js/workout/metrics.js', '/js/workout/progression.js', '/js/workout/session.js', '/js/workout/task-factory.js', '/js/workout/timers.js'];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('maxsnr-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('/'))));
});
