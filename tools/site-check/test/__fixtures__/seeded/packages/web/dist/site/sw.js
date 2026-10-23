// A hand-written worker for the seeded fixture site, after contracts/site.md,
// with two seeded faults: it doesn't store the not-found page, and offline it
// answers the site root with a network error instead of the redirect.
const CACHE = 'cv-fixture';
const ASSETS = [
  '/assets/site.css',
  '/assets/register-sw.js',
  '/assets/enhance.js',
  '/assets/space-grotesk-latin.woff2',
  '/assets/schibsted-grotesk-latin.woff2',
  '/assets/jetbrains-mono-latin.woff2',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
      await cache.put('/cv', await fetch('/cv', { cache: 'reload' }));
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
const limit = (promise, ms) => Promise.race([promise, new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
async function offline(url) {
  const cache = await caches.open(CACHE);
  if (url.pathname === '/') return Response.error();
  if (url.pathname === '/cv' || url.pathname === '/cv/') return (await cache.match('/cv')) ?? Response.error();
  return (await cache.match('/404')) ?? Response.error();
}
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(limit(fetch(request), 3000).catch(() => offline(url)));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
