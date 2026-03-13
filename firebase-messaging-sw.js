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

const CACHE_NAME = 'onyx-v42';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './badge-icon.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './quotes.json'
];

const RECENT_NOTIFICATIONS = new Map();
const RECENT_TTL_MS = 15000;
let QUOTES_CACHE = null;

function cleanupRecentNotifications() {
  const now = Date.now();
  for (const [key, ts] of RECENT_NOTIFICATIONS.entries()) {
    if ((now - ts) > RECENT_TTL_MS) RECENT_NOTIFICATIONS.delete(key);
  }
}

function markNotificationSeen(key) {
  cleanupRecentNotifications();
  RECENT_NOTIFICATIONS.set(String(key), Date.now());
}

function hasSeenNotification(key) {
  cleanupRecentNotifications();
  const ts = RECENT_NOTIFICATIONS.get(String(key));
  return !!ts && ((Date.now() - ts) <= RECENT_TTL_MS);
}

async function loadQuotes() {
  if (Array.isArray(QUOTES_CACHE) && QUOTES_CACHE.length) return QUOTES_CACHE;
  try {
    const res = await fetch('./quotes.json', { cache: 'no-store' });
    const data = await res.json();
    const list = Array.isArray(data) ? data : (Array.isArray(data?.quotes) ? data.quotes : []);
    QUOTES_CACHE = list.map((q) => String(q || '').trim()).filter(Boolean);
    return QUOTES_CACHE;
  } catch (_) {
    QUOTES_CACHE = [];
    return QUOTES_CACHE;
  }
}

async function pickNeutralQuote() {
  const quotes = await loadQuotes();
  if (!Array.isArray(quotes) || quotes.length === 0) return 'Alles im Blick.';
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function extractPayload(rawPayload = {}) {
  const data = rawPayload?.data || {};
  const notification = rawPayload?.notification || {};
  const kind = String(data.kind || '');
  const chatId = String(data.chatId || '');
  const title = kind === 'chat'
    ? 'Kalender Aktuell'
    : String(data.title || notification.title || 'Onyx');
  const body = kind === 'chat'
    ? ''
    : String(data.body || notification.body || 'Kalender aktuell');
  let tag = String(data.tag || '');
  if (!tag) {
    if (kind === 'chat' && chatId) tag = `chat_${chatId}`;
    else if (kind) tag = `onyx_${kind}`;
    else tag = 'onyx_generic';
  }
  const silentRaw = String((data.silent ?? data.sound) || '').toLowerCase();
  const silent = silentRaw === '1' || silentRaw === 'true' || silentRaw === 'silent';
  return {
    title,
    body,
    tag,
    kind,
    chatId,
    calendarId: String(data.calendarId || ''),
    eventId: String(data.eventId || ''),
    occurrenceDate: String(data.occurrenceDate || ''),
    silent,
    requireInteraction: ['reminder', 'event', 'deadline'].includes(kind),
    dedupeKey: String(data.tag || tag || `${title}|${body}|${kind}|${chatId}`)
  };
}

async function broadcastPushReceived(meta) {
  try {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      client.postMessage({ type: 'PUSH_RECEIVED', at: Date.now(), title: meta?.title || '' });
    }
  } catch (_) {}
}

async function showOnyxNotification(rawPayload = {}, source = 'unknown') {
  const meta = extractPayload(rawPayload);
  if (meta.kind === 'chat') {
    meta.title = 'Kalender Aktuell';
    meta.body = await pickNeutralQuote();
  }
  if (hasSeenNotification(meta.dedupeKey)) return;
  markNotificationSeen(meta.dedupeKey);
  const options = {
    body: meta.body,
    icon: './icon-192.png',
    badge: './badge-icon.png',
    tag: meta.tag,
    renotify: true,
    silent: meta.silent,
    requireInteraction: meta.requireInteraction,
    vibrate: meta.silent ? undefined : [200, 100, 200, 100, 300],
    actions: [
      { action: 'open', title: 'Öffnen' },
      { action: 'dismiss', title: 'OK' }
    ],
    data: {
      source,
      kind: meta.kind,
      chatId: meta.chatId,
      calendarId: meta.calendarId,
      eventId: meta.eventId,
      occurrenceDate: meta.occurrenceDate,
      tag: meta.tag
    }
  };
  await broadcastPushReceived(meta);
  return self.registration.showNotification(meta.title, options);
}

self.addEventListener('message', (event) => {
  try {
    if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting();
  } catch (_) {}
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(STATIC_ASSETS.map((u) => cache.add(u)));
    } catch (_) {}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('firebaseapp.com') || url.hostname.endsWith('firebaseio.com')) {
    event.respondWith(fetch(req));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await caches.match('./index.html');
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});

messaging.onBackgroundMessage((payload) => showOnyxNotification(payload, 'firebase-onBackgroundMessage'));

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    try {
      let payload = {};
      try {
        payload = event.data ? event.data.json() : {};
      } catch (_) {
        const text = event.data ? await event.data.text() : '';
        payload = { data: { body: text || 'Kalender aktuell' } };
      }
      await showOnyxNotification(payload, 'raw-push-fallback');
    } catch (_) {}
  })());
});

self.addEventListener('notificationclick', (event) => {
  try {
    if (event.action === 'dismiss') {
      event.notification.close();
      return;
    }
    event.notification.close();
    event.waitUntil((async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })());
  } catch (_) {}
});
