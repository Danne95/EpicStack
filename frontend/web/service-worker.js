// Build prepends __VERSION and __PRECACHE. Cache names are isolated by Pages project scope.
const scope = self.registration.scope;
const prefix = `epicstack:${scope}:`;
const cacheName = `${prefix}${self.__VERSION}`;
const urls = self.__PRECACHE.map((file) => new URL(file, scope).href);
const indexUrl = new URL('index.html', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      try {
        await cache.addAll(urls.map((url) => new Request(url, { cache: 'reload' })));
      } catch (error) {
        await caches.delete(cacheName);
        throw error;
      }
      // Deliberately no skipWaiting: open games retain a consistent release.
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(prefix) && name !== cacheName)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const key = request.mode === 'navigate' ? indexUrl : request.url;
  if (!urls.includes(key)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(key)) ?? fetch(request);
    })(),
  );
});
