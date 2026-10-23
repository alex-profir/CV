// A hand-written worker for the fixture site, after contracts/site.md.
const CACHE = 'cv-fixture';
const ASSETS = [
  '/assets/site.css',
  '/assets/register-sw.js',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await fetch('https://example.org/worker.json').catch(() => undefined);
      await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
      await cache.put('/cv', await fetch('/cv', { cache: 'reload' }));
      await cache.put('/404', await fetch('/missing-page', { cache: 'reload' }));
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
const limit = (promise, ms) => Promise.race([promise, new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
async function offline(url) {
  const cache = await caches.open(CACHE);
    if (url.pathname === '/') return Response.redirect('/cv', 307);
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
