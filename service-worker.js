const CACHE_NAME = 'my-fit-plan-v37-20260806-1';
const APP_SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './assets/exercises/barbell-bench-press-start.svg', './assets/exercises/barbell-bench-press-end.svg',
  './assets/anatomy/bench-press-front.svg', './assets/anatomy/bench-press-back.svg',
  './js/app.js', './js/hud.js', './js/exercises.js', './js/exercises-extra.js', './js/premium-data.js',
  './js/real-motion-bundle-v323a.js', './js/media-bundle-pro-v3222.js', './js/search.js', './js/visuals.js',
  './js/photo-progress.js', './js/plans.js', './js/storage.js', './js/stats.js', './js/coach.js', './js/adaptive.js',
  './js/session-selector.js', './js/exercise-intelligence.js', './js/progression-engine.js', './js/calendar-planner.js',
  './js/ui.js', './js/utils.js'
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

async function networkFirst(request) {
  try {
    const response = await fetch(new Request(request, { cache: 'no-store' }));
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match('./index.html');
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.destination === 'video' || request.headers.has('range')) return;
  if (request.mode === 'navigate' || ['script','style','document'].includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') event.waitUntil(caches.delete(CACHE_NAME));
});
