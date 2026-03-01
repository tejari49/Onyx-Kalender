importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDkdRI4tNh5fe-dyBBGDlGgIiT7vHmoFvg",
  authDomain: "kalender-rai.firebaseapp.com",
  projectId: "kalender-rai",
  storageBucket: "kalender-rai.firebasestorage.app",
  messagingSenderId: "407396898664",
  appId: "1:407396898664:web:3fafd51433481e7bb668dd"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/**
 * Offline cache (safe):
 * - Network-first for navigations (index.html), updates cache when online
 * - Cache-first for static assets
 */
const CACHE_NAME = 'onyx-v10';
const STATIC_ASSETS = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache static assets (NOT index.html to avoid stale app shell)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Cleanup old caches
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isNav = req.mode === 'navigate' || (req.destination === 'document');
  const isIndex = url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');

  if (isNav || isIndex) {
    // Network-first for app shell
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        // Store a copy under index.html for offline fallback
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match('./index.html');
        return cached || caches.match('./');
      }
    })());
    return;
  }

  // Cache-first for static assets, fallback to network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return resp;
    }))
  );
});

// Background push notifications
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload?.notification?.title || 'Onyx';
  const notificationOptions = {
    body: payload?.notification?.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200]
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
