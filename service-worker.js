const CACHE_NAME = 'my-fit-plan-v34c2-20260727-1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/exercises/barbell-bench-press-start.svg',
  './assets/exercises/barbell-bench-press-end.svg',
  './assets/anatomy/bench-press-front.svg',
  './assets/anatomy/bench-press-back.svg',
  './js/app.js',
  './js/exercises.js',
  './js/exercises-extra.js',
  './js/premium-data.js',
  './js/real-motion-bundle-v323a.js',
  './js/media-bundle-pro-v3222.js',
  './js/search.js',
  './js/visuals.js',
  './js/photo-progress.js',
  './js/plans.js',
  './js/storage.js',
  './js/stats.js',
  './js/coach.js',
  './js/adaptive.js',
  './js/session-selector.js',
  './js/ui.js',
  './js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.destination === 'video' || event.request.headers.has('range')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
