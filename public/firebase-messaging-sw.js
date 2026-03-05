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
const CACHE_NAME = 'onyx-v33';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './quotes.json'
];

// Install: cache only static assets (NOT index.html to avoid stale UI)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const results = await Promise.allSettled(STATIC_ASSETS.map((u) => cache.add(u)));
      results.forEach(() => {});
    } catch (_) {}
  })());
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
  const url = new URL(req.url);

  // NEVER cache Firebase/Google API calls (needed for real-time listeners)
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('firebaseapp.com') || url.hostname.endsWith('firebaseio.com')) {
    event.respondWith(fetch(req));
    return;
  }

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
// Hintergrund Push-Benachrichtigungen empfangen
messaging.onBackgroundMessage(function(payload) {
  // Always render via the Service Worker for reliability across Android PWAs + GitHub Pages subpaths.

  const data = (payload && payload.data) ? payload.data : {};
  const __kind = (data && data.kind) ? String(data.kind) : '';
  const notificationTitle = (__kind === 'chat')
    ? 'Kalender Aktuell 🔏'
    : ((data && data.title) ? data.title : ((payload && payload.notification && payload.notification.title) ? payload.notification.title : 'Onyx'));
  const rawBody = (data && data.body) ? data.body : ((payload && payload.notification && payload.notification.body) ? payload.notification.body : 'Kalender aktuell');

  // Tag: group notifications (chat per chatId), but still allow renotify
  let __tag = (data && data.tag) ? String(data.tag) : '';
  const __chatId = (data && data.chatId) ? String(data.chatId) : '';
  if (!__tag) {
    if (__kind === 'chat' && __chatId) __tag = `chat_${__chatId}`;
    else if (__kind === 'test') __tag = `onyx_test_${Date.now()}`;
    else __tag = 'onyx';
  }

  // In einer PWA ist kein Custom-Sound möglich. Wir unterstützen nur: Systemton oder stumm.
  const silent = String((data && (data.silent ?? data.sound)) || '').toLowerCase() === '1' || String((data && (data.silent ?? data.sound)) || '').toLowerCase() === 'silent';

  const notificationOptions = {
    body: (rawBody ? String(rawBody).trim() : 'Kalender aktuell'),
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: __tag,
    renotify: true,
    silent: silent,
    ...(silent ? {} : { vibrate: [200, 100, 200] }),
    data: {
      kind: (data && data.kind) ? data.kind : '',
      chatId: (data && data.chatId) ? data.chatId : '',
      calendarId: (data && data.calendarId) ? data.calendarId : '',
      eventId: (data && data.eventId) ? data.eventId : '',
      occurrenceDate: (data && data.occurrenceDate) ? data.occurrenceDate : ''
    }
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});


// Notification click: focus existing window or open app
self.addEventListener('notificationclick', (event) => {
  try {
    event.notification.close();
    event.waitUntil((async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })());
  } catch (e) {}
});
