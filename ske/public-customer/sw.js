// Service worker: makes repeat visits load from the device and keeps the site
// usable on a flaky connection.
//
// - Pages: network first (always fresh), cached copy when offline.
// - Versioned files (?v=hash in the URL) and the Firebase SDK: cache first.
//   Their URLs change whenever their content changes, so they never go stale.
// - Firestore traffic is not touched; Firestore keeps its own offline cache.
const VERSION = 'c3b2118a'; // set by tools/stamp_assets.py
const ASSETS = `ske-assets-${VERSION}`;
const PAGES = `ske-pages-${VERSION}`;
const MAX_PAGES = 20;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== ASSETS && key !== PAGES).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (url.origin === self.location.origin && url.searchParams.has('v')) {
    event.respondWith(cacheFirst(request));
  } else if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      await cache.put(request, response.clone());
      trimPages(cache);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true }) || await cache.match('/');
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

// Keep only the most recently visited pages (keys are in insertion order).
async function trimPages(cache) {
  const pages = await cache.keys();
  await Promise.all(pages.slice(0, Math.max(0, pages.length - MAX_PAGES)).map((req) => cache.delete(req)));
}
