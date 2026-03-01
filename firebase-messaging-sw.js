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

// PWA Offline Caching
const CACHE_NAME = 'onyx-v22';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './quotes.json'
];

// Install: cache only static assets (NOT index.html to avoid stale UI)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
// - Navigation requests (index.html / SPA routes): network-first, cache fallback
// - Static assets: cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // SPA navigations
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match('./index.html');
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Cache-first for other requests
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Hintergrund Push-Benachrichtigungen empfangen
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200]
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
