const CACHE_NAME = 'onyx-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Installation: Cache Dateien
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch: Aus dem Cache laden, wenn offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache Treffer - Antwort zurückgeben
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Update: Alten Cache löschen
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
