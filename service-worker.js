const CACHE_PREFIX = 'my-fit-plan-';
const CACHE_NAME = 'my-fit-plan-v46-beta-pilot-20260809-1';

const CORE_SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/hud.js', './js/storage.js', './js/utils.js', './js/ui.js', './js/cloud.js', './js/cloud-config.js'
];

const OPTIONAL_SHELL = [
  './icons/icon-192.png', './icons/icon-512.png',
  './assets/exercises/barbell-bench-press-start.svg', './assets/exercises/barbell-bench-press-end.svg',
  './assets/anatomy/bench-press-front.svg', './assets/anatomy/bench-press-back.svg',
  './js/exercises.js', './js/exercises-extra.js', './js/premium-data.js',
  './js/real-motion-bundle-v323a.js', './js/media-bundle-pro-v3222.js', './js/search.js', './js/visuals.js',
  './js/photo-progress.js', './js/plans.js', './js/stats.js', './js/coach.js', './js/adaptive.js',
  './js/session-selector.js', './js/premium.js', './js/beta.js', './js/legal.js', './js/beta-pilot.js', './js/billing.js', './js/billing-config.js', './js/billing-management.js', './js/exercise-intelligence.js', './js/progression-engine.js', './js/calendar-planner.js'
];

const APP_SHELL = [...CORE_SHELL, ...OPTIONAL_SHELL];

async function addOptionalResources(cache) {
  await Promise.allSettled(OPTIONAL_SHELL.map(async (url) => {
    const request = new Request(url, { cache: 'reload' });
    const response = await fetch(request);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    await cache.put(request, response);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_SHELL);
    await addOptionalResources(cache);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function cachedResponse(request) {
  return caches.match(request, { ignoreSearch: true });
}

async function networkFirst(request) {
  try {
    const response = await fetch(new Request(request, { cache: 'no-store' }));
    if (response?.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
      return response;
    }
    const cached = await cachedResponse(request);
    if (cached) return cached;
    return response;
  } catch {
    const cached = await cachedResponse(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match('./index.html');
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  const cached = await cachedResponse(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.destination === 'video' || request.headers.has('range')) return;
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/beta-config.json')) {
    event.respondWith(networkFirst(new Request(request, { cache: 'no-store' })));
    return;
  }
  if (request.mode === 'navigate' || ['script', 'style', 'document'].includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key))
    )));
  }
});
