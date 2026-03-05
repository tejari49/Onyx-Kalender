# Onyx Kalender (PWA) 🗓️⚡

Onyx ist ein **AMOLED‑optimierter Kalender als PWA** (Vite + React + Firebase). Das Repo ist so ausgelegt, dass es **auf GitHub Pages** sauber als Single‑Page‑App läuft – inkl. **Service Worker** und **Firebase Cloud Messaging**.

> **Wichtig (Deployment‑Namespace):** Alle Daten liegen unter `artifacts/{APP_ID}/…` in Firestore. Default: `APP_ID = onyx-pwa-live`.

---

## Features (Kurzüberblick)

### Kalender
- Private Events pro User (`users/{uid}/events`)
- Geteilte Kalender (Owner + `sharedWith` Rollen `read|write`)
- Mehrfach‑Auswahl: mehrere Kalender gleichzeitig „overlay“ anzeigen
- Wiederholungen (daily/weekly/monthly) + Overrides + ExDates
- Kommentare pro Event (privat + shared)

### Abstimmungen / Terminfindung
- Polls im Event (Abstimmung) inkl. Auto‑Finalize (serverseitig via **oxynoti**)

### Privacy‑Sharing 🔒
- Öffentliche **Busy‑Only** Links (extern nur Zeitblöcke, keine Titel/Orte)
- Temporäre Links (Expiry)
- Optionaler Passcode
- Audit Log („wer hat wann was geändert?“)

### Profil / Account
- Anzeige‑Name + Alias (Username)
- Passwort ändern (Firebase Email/Password; Reauth wird abgefangen)

### Notifications
- Lokaler Test (OS Notification)
- Server Test (via `pushTests` → oxynoti sendet)
- Chat/Inbox‑Push kann „stealth“ sein (z.B. nur Titel)

---

## Tech Stack
- **React 18** + **Vite 5**
- **Firebase Web SDK** (Auth, Firestore, Messaging)
- **TailwindCSS** lokal (PostCSS)
- Optional: HEIC Support (`heic2any`)

---

## Projektstruktur

- `src/App.jsx` – Hauptlogik (UI + Firestore + Messaging)
- `src/main.jsx` – React Entry
- `public/manifest.json` – PWA Manifest
- `public/firebase-messaging-sw.js` – **Service Worker** (Caching + FCM Background)
- `vite.config.js` – GitHub Pages Base‑Path
- `FIRESTORE_RULES_*.txt` – Rules‑Snippets (Sharing / Event Threads)

> **Hinweis:** Für den Build ist **immer** die Datei in `public/firebase-messaging-sw.js` relevant.

---

## Voraussetzungen
- Node.js **>= 18** (empfohlen 20)

---

## Lokal starten

```bash
npm ci
npm run dev
```

- Dev Server: `http://localhost:5173`

---

## Production Build

```bash
npm run build
npm run preview
```

- Output: `dist/`

---

## Firebase Setup (Pflicht)

### 1) Firebase Projekt
1. Firebase Console → Projekt erstellen
2. **Authentication** aktivieren (mindestens Email/Password)
3. **Firestore** aktivieren

### 2) Web App anlegen
Firebase Console → Project settings → “Your apps” → Web App
- Die Web‑Config wird im Code genutzt (`src/App.jsx` → `customFirebaseConfig`).

> Optional: Du kannst auch eine globale Variable `__firebase_config` (JSON‑String) injecten.

### 3) Cloud Messaging (Web Push)
- FCM ist Teil von Firebase.
- Für Web Push brauchst du eine VAPID‑Key Konfiguration im Frontend (falls ihr sie nutzt).

**Token Storage:**
- Onyx speichert den Web‑Token im Profil:
  - `artifacts/{APP_ID}/public/data/profiles/{uid}.fcmTokenWeb`

---

## APP_ID / Multi‑Environment

Default:
- `APP_ID = onyx-pwa-live`

Wenn du pro Umgebung trennen willst (dev/stage/prod), kannst du `__app_id` global setzen.
Beispiel (in `index.html`, **vor** dem Vite module script):

```html
<script>
  window.__app_id = 'onyx-prod';
</script>
```

---

## GitHub Pages Deployment

### 1) Base Path
In `vite.config.js` steht:
- `base: '/Onyx-Kalender/'`

Wenn dein Repo anders heißt, musst du anpassen:
- `vite.config.js` → `base`
- `manifest.json` → `start_url` + `scope` (falls gesetzt)

### 2) Pages aktivieren
Repo → Settings → Pages
- Source: **GitHub Actions**

### 3) Deploy
- Push auf `main` → Actions Workflow baut + deployed.

---

## Firestore Datenmodell (wichtig)

### Profiles
`artifacts/{APP_ID}/public/data/profiles/{uid}`
- `displayName` (sichtbarer Name)
- `username` / `usernameLower` (Alias)
- `fcmTokenWeb` (PWA Push Token)
- `defaultReminderMinutes`
- `defaultCalendarColor`
- `notificationSoundMode` (z.B. `silent`)
- `mutedChatIds` (Array von chatIds, die keinen Push bekommen)

### Private Events
`artifacts/{APP_ID}/users/{uid}/events/{eventId}`

### Shared Calendars
`artifacts/{APP_ID}/public/data/calendars/{calId}`
- `ownerId`
- `name`
- `color`
- `sharedWith`: Map `{ uid: 'read'|'write' }`

Events:
`artifacts/{APP_ID}/public/data/calendars/{calId}/events/{eventId}`
- `title`, `date` (`YYYY-MM-DD`), `time` (`HH:MM` oder Range)
- `durationMinutes`, `location`, `desc`
- `recurrence`, `exDates`, `overrides`
- `poll` (Abstimmung)

### Public Links (Busy‑Only / Event Sharing)
`artifacts/{APP_ID}/public/data/shares/{token}`
- `kind`: `calendar|event`
- `mode`: z.B. `busy` (busy-only) oder `full`
- `calId`, `calName`
- `expiresAtMs`, `revokedAtMs`
- Passcode: `passcodeSalt`, `passcodeHash`
- Calendar busy-only: `busyBlocks: [{startMs,endMs}]` + Range

### Audit Logs
- User‑Audit: `artifacts/{APP_ID}/users/{uid}/auditLogs/{id}`
- Calendar‑Audit: `artifacts/{APP_ID}/public/data/calendars/{calId}/auditLogs/{id}`

### Push Tests (Server Test)
`artifacts/{APP_ID}/public/data/pushTests/{id}`
- `uid`, `status: pending|sending|sent|error`, `lastError`, `createdAtMs`

---

## Notifications (Praxis)

### Wie Push technisch funktioniert
- Onyx (Client) speichert den Token in `profiles/{uid}.fcmTokenWeb`.
- **oxynoti** liest Profile & sendet FCM‑Pushes (data‑only) an diese Tokens.
- Der Service Worker (`public/firebase-messaging-sw.js`) rendert die OS‑Notification.

### Sound / Ton
- PWA kann keinen Custom‑Sound setzen.
- Ton kommt über das **System** (Android Notification Channel / iOS system settings).

### Debug Checkliste
1. In Onyx: Permission = `granted`
2. In Firestore: Profil hat `fcmTokenWeb`
3. oxynoti `/status`: `appId` passt, `lastTickAt` aktualisiert
4. Firestore Rules erlauben `pushTests:create` (für Server‑Test)

---

## Troubleshooting

### “Nur Toast, keine OS‑Notification”
- Permission nicht granted → Token fehlt
- Service Worker nicht „controlling“ → PWA neu starten / SW unregister
- Android: Benachrichtigungen für die PWA/Chrome App stumm

### “Server Test bleibt pending”
- Firestore Rules blocken `public/data/pushTests` (permission‑denied)
- oxynoti hört auf falschem `APP_ID`
- Render schläft → Keep‑Alive Ping auf `/healthz`

---

## Security Notes
- Public Links: in Rules **nur `get` erlauben**, kein `list`.
- Tokens dürfen nur vom jeweiligen User geschrieben werden.
- Service Account Secrets **niemals** im Frontend.

---

## Lizenz / Betrieb
Interne App. Für produktiven Betrieb empfiehlt sich:
- Monitoring auf `oxynoti /healthz`
- Backups / Exporte (Firestore)
