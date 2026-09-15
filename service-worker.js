// Each installation owns its full module graph and its own path-scoped cache.
const CACHE_PREFIX = `my-fit-plan-${encodeURIComponent(new URL(self.registration.scope).pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}v50-20260914`;
const CORE_SHELL = [
  './', './index.html', './styles.css', './design-v5.css', './manifest.webmanifest',
  './js/app.js', './js/hud.js', './js/storage.js', './js/utils.js', './js/ui.js',
  './js/theme.js', './js/pending-input.js', './js/cloud.js', './js/cloud-config.js',
  './js/exercises.js', './js/exercises-extra.js', './js/premium-data.js',
  './js/real-motion-bundle-v323a.js', './js/media-bundle-pro-v3222.js', './js/search.js', './js/visuals.js',
  './js/photo-progress.js', './js/plans.js', './js/stats.js', './js/coach.js', './js/adaptive.js',
  './js/session-selector.js', './js/premium.js', './js/beta.js', './js/legal.js', './js/beta-pilot.js',
  './js/billing.js', './js/billing-config.js', './js/billing-management.js',
  './js/exercise-intelligence.js', './js/progression-engine.js', './js/calendar-planner.js'
];
const OPTIONAL_SHELL = ['./icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Fail the installation if any imported module is missing. Keep the previous worker active.
    await cache.addAll(CORE_SHELL.map((url) => new Request(url, { cache: 'reload' })));
    await Promise.allSettled(OPTIONAL_SHELL.map((url) => cache.add(url)));
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
async function cachedResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request, { ignoreSearch: true });
}
async function networkFirst(request) {
  try {
    const response = await fetch(new Request(request, { cache: 'no-store' }));
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    }
    return await cachedResponse(request) || response;
  } catch {
    const cached = await cachedResponse(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await cachedResponse(new Request(new URL('./index.html', self.registration.scope)));
      if (fallback) return fallback;
    }
    return new Response('No disponible sin conexión', { status: 504 });
  }
}
async function cacheFirst(request) {
  const cached = await cachedResponse(request);
  return cached || networkFirst(request);
}
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) return;
  if (request.destination === 'video' || request.headers.has('range')) return;
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/beta-config.json') || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (['script', 'style'].includes(request.destination) && url.searchParams.get('v') && url.searchParams.get('v') !== '50') {
    // A newer index must not receive modules from this worker's older build.
    event.respondWith(fetch(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)))));
  }
});
