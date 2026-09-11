const CACHE_NAME = 'maxsnr-v1';
const PRECACHE_URLS = [
  '/',
  '/routine/',
  '/history/',
  '/workout/',
  '/app.js',
  '/styles.css',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/js/backup.js',
  '/js/constants.js',
  '/js/dom.js',
  '/js/magnetic-picker.js',
  '/js/navigation.js',
  '/js/render-history.js',
  '/js/render-routine.js',
  '/js/render-today.js',
  '/js/render-workout.js',
  '/js/routine-data.js',
  '/js/state.js',
  '/js/storage.js',
  '/js/update-app.js',
  '/js/vendor/canvas-confetti.js',
  '/js/workout.js',
  '/js/workout/metrics.js',
  '/js/workout/progression.js',
  '/js/workout/session.js',
  '/js/workout/task-factory.js',
  '/js/workout/timers.js',
  '/js/render-workout/completion.js',
  '/js/render-workout/lifting.js',
  '/js/render-workout/plank.js',
  '/js/render-workout/rest.js',
  '/js/render-workout/select.js',
  '/js/render-workout/shared.js',
  '/js/render-workout/stretch.js',
  '/js/render-workout/warmup.js',
  '/packages/magnetic-picker/src/magnetic-picker.js',
  '/packages/magnetic-picker/src/magnetic-picker.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('maxsnr-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const shell =
    request.mode === 'navigate'
      ? ['/routine/', '/history/', '/workout/'].find((path) => url.pathname.startsWith(path)) || '/'
      : null;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => (shell ? caches.match(shell) : Response.error()));
    }),
  );
});
