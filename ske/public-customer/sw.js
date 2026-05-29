const CACHE_NAME = 'ske-customer-cache-v1';
const ASSETS = [
 '/',
 '/index.html',
 '/css/style.css',
 '/js/main.js',
 '/js/firebase-config.js',
 '/js/security.js',
 '/icon-192.png',
 '/icon-512.png',
 '/manifest.json'
];
self.addEventListener('install', event => {
 event.waitUntil(
 caches.open(CACHE_NAME).then(cache => {
 console.log('[Service Worker] Caching static assets');
 return cache.addAll(ASSETS);
 }).then(() => self.skipWaiting())
 );
});
self.addEventListener('activate', event => {
 event.waitUntil(
 caches.keys().then(keys => {
 return Promise.all(
 keys.map(key => {
 if (key !== CACHE_NAME) {
 console.log('[Service Worker] Removing old cache:', key);
 return caches.delete(key);
 }
 })
 );
 }).then(() => self.clients.claim())
 );
});
self.addEventListener('fetch', event => {
 if (event.request.method !== 'GET') return;
 const url = new URL(event.request.url);
 if (url.origin !== self.location.origin) {
 return;
 }
 event.respondWith(
 caches.match(event.request).then(cachedResponse => {
 if (cachedResponse) {
 fetch(event.request).then(networkResponse => {
 if (networkResponse.status === 200) {
 caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
 }
 }).catch(() => {});
 return cachedResponse;
 }
 return fetch(event.request).then(networkResponse => {
 if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
 return networkResponse;
 }
 const responseToCache = networkResponse.clone();
 caches.open(CACHE_NAME).then(cache => {
 cache.put(event.request, responseToCache);
 });
 return networkResponse;
 });
 })
 );
});