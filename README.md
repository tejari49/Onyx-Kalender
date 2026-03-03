# Onyx Kalender (PWA) 🗓️🖤

**Onyx** ist ein AMOLED‑optimierter Kalender als **Progressive Web App (PWA)** mit:
- **Privaten Terminen** (pro User)
- **Geteilten Kalendern** (Owner + Mitglieder mit Rechten)
- **Chat** (DM/Gruppe)
- **Termin = Kommentar‑Thread** (Mini‑Chat pro Event)
- **Termin‑Vorschläge + Abstimmung** (Poll) inkl. **Auto‑Finalisierung** über den `oxynoti` Worker
- **Push Notifications** (Web) über Firebase Cloud Messaging (FCM)

> Dieses Repo ist **bewusst build‑frei**: die App läuft als **statische Website** über `index.html` (React via Import Map / ESM).

---

## Quick Start (lokal)

Da ES‑Modules genutzt werden, bitte mit lokalem Webserver starten (nicht per `file://`):

```bash
python -m http.server 5173
```

Dann öffnen:

- `http://localhost:5173/`  
  oder bei GitHub Pages/Subfolder entsprechend: `http://localhost:5173/<ordner>/`

---

## Deployment (GitHub Pages)

1. Repo → **Settings → Pages**
2. Source: Branch `main` (oder `master`) / Root
3. Speichern  
4. Auf der Pages‑URL öffnen (HTTPS ist Pflicht für Service Worker/Push)

**Hinweis Cache Busting:** In `index.html` sind Asset‑Links mit `?v=...` versehen (z.B. `manifest.json?v=26`). Bei Deployments die Version erhöhen, wenn Browser zu aggressiv cached.

---

## Konfiguration

### 1) Firebase Projekt
In der Firebase Console:
1. **Authentication** → Email/Password aktivieren
2. **Firestore Database** aktivieren
3. **Cloud Messaging** (für Web Push): Web Push certificates (VAPID) generieren

### 2) Firebase Config
In `index.html` gibt es:

- `customFirebaseConfig` (Fallback für GitHub Pages)
- optional: Hosting kann `__firebase_config` injizieren

Wenn du dein eigenes Firebase Projekt verwendest, ersetze:

- `customFirebaseConfig` Werte
- optional: `APP_ID` (siehe unten)
- **VAPID Key** (siehe Push)

### 3) APP_ID (wichtig)
In `index.html`:

```js
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'onyx-pwa-live';
```

`APP_ID` ist ein Namespace für Firestore‑Pfade und muss **mit dem Backend Worker (`oxynoti`) übereinstimmen**.

Beispiel:
- Frontend: `APP_ID = onyx-pwa-live`
- oxynoti Render env: `APP_ID=onyx-pwa-live`

### 4) Push (FCM Web)
Für Web Push wird ein VAPID Key verwendet:

```js
getToken(messaging, { vapidKey: '...'})
```

➡️ Den VAPID Key bekommst du in Firebase Console → Cloud Messaging → Web Push certificates.

Die App speichert das Token hier:
- `artifacts/{APP_ID}/public/data/profiles/{uid}` → `fcmTokenWeb`

Der Worker `oxynoti` nutzt dieses Token zum Senden der Push Notifications.

---

## Datenmodell (Firestore)

### Profiles (User‑Profil + Push Token)
- `artifacts/{APP_ID}/public/data/profiles/{uid}`
  - `displayName` / `username`
  - `friendCode` (5‑stellig, für Chat)
  - `defaultReminderMinutes`
  - `fcmTokenWeb` (Web Push Token)

### Private Events
- `artifacts/{APP_ID}/users/{uid}/events/{eventId}`

### Shared Calendars
- `artifacts/{APP_ID}/public/data/calendars/{calId}`
  - `ownerId`
  - `sharedWith` (Map: `{ uid: 'read'|'write' }`)
- `artifacts/{APP_ID}/public/data/calendars/{calId}/events/{eventId}`

### Chat
- `artifacts/{APP_ID}/public/data/chats/{chatId}`
- `artifacts/{APP_ID}/public/data/chats/{chatId}/messages/{msgId}`

### Event: Kommentare (Mini‑Chat pro Termin) 💬
Unter dem jeweiligen Event‑Dokument:
- `.../events/{eventId}/comments/{commentId}`

Beispiel:
- Privates Event: `artifacts/{APP_ID}/users/{uid}/events/{eventId}/comments`
- Shared Event: `artifacts/{APP_ID}/public/data/calendars/{calId}/events/{eventId}/comments`

### Event: Abstimmung (Termin‑Vorschläge) 🗳️
Im Event‑Dokument im Feld `poll`:

```json
poll: {
  status: "open" | "closed",
  createdAt: 1700000000000,
  createdBy: "<uid>",
  voterIds: ["<uid1>", "<uid2>"],
  options: [{ id:"opt_...", date:"YYYY-MM-DD", time:"HH:MM" }],
  votes: { "<uid>": "opt_..." },
  winnerOptionId: "opt_...",
  closedAt: 1700000000000,
  autoFinalized: true
}
```

**Auto‑Finalize:** `oxynoti` prüft server‑side jede Minute: wenn alle `voterIds` abgestimmt haben, wird der Gewinner in den Termin übernommen (`date`/`time`) und `poll.status` auf `closed` gesetzt.

---

## Features: Bedienung

### Quick Add
Im Termin‑Dialog (Event erstellen/bearbeiten) oben:
- `morgen 18:30 Zahnarzt 45min @Zürich`
- `mo 08:00 Gym 60min`
- `12.03. 14:00 Coiffeur 1h`

### Termin‑Kommentare (Mini‑Chat)
1. Termin öffnen
2. Tab **„Kommentare“**
3. Nachricht senden (live)

### Termin‑Abstimmung
1. Termin öffnen → Tab **„Abstimmung“**
2. 2–3 Vorschläge eintragen → **„Senden“**
3. Teilnehmer voten
4. Gewinner wird:
   - manuell über **„Gewinner übernehmen“** gesetzt oder
   - automatisch server‑side durch `oxynoti` finalized

---

## Firestore Security Rules (Baseline)

Die Regeln hängen von deinen Anforderungen ab. Als grobe Basis:
- nur angemeldete Nutzer
- private Events nur Owner
- shared calendars nur Mitglieder
- chat nur Mitglieder
- comments/poll nur Mitglieder (write‑Rechte)

> Wenn du willst, passe ich dir Rules **1:1 passend zu deinem genauen Rechte‑Modell** an.

---

## Troubleshooting

- **Push geht nicht:** HTTPS nötig + Notification Permission + VAPID Key korrekt + `firebase-messaging-sw.js` erreichbar.
- **Worker sendet nichts:** `APP_ID` muss matchen + Service Account Secret korrekt + Render läuft `/healthz`.
- **Änderungen nicht sichtbar:** Cache bust in Links (`?v=...`) erhöhen oder PWA neu installieren.

---

## Backend Worker
Siehe separates Repo: **oxynoti** (Node + firebase-admin) für:
- Push für Chat
- Kalender‑Reminder
- Poll Auto‑Finalize
