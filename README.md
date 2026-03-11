# Onyx Kalender

Onyx Kalender ist eine moderne, dunkle Kalender‑PWA mit Fokus auf Terminplanung, Produktivität und private Kommunikation. Die App kombiniert klassische Kalenderfunktionen mit Extras wie Stempeluhr, Smart Day, Fokusmodus, Einkaufslisten, Wetter-Hinweisen und einem geschützten Secret‑Bereich.

## Inhaltsverzeichnis

- [Funktionsumfang](#funktionsumfang)
- [Technologie-Stack](#technologie-stack)
- [Projektstruktur](#projektstruktur)
- [Voraussetzungen](#voraussetzungen)
- [Installation & lokaler Start](#installation--lokaler-start)
- [Build & Preview](#build--preview)
- [Firebase-Setup](#firebase-setup)
- [Cloud Functions](#cloud-functions)
- [PWA, Push & Service Worker](#pwa-push--service-worker)
- [Deployment](#deployment)
- [Firestore Rules Hinweise](#firestore-rules-hinweise)
- [Troubleshooting](#troubleshooting)
- [Roadmap-Ideen](#roadmap-ideen)
- [Lizenz](#lizenz)

## Funktionsumfang

### Kalender

- Privater Standardkalender
- Zusätzliche eigene Kalender
- Farben, Freigaben, Busy-only und Public Links
- Tagesansicht mit Agenda und Feed
- Wiederkehrende Termine
- Audit-/Verlaufsfunktionen
- ICS Import/Export

### Dashboard / Startseite

- Wetterkarte mit 4h-Hinweisen
- Smarte Wetter-Badges (z. B. „Regen ab xx:xx“)
- Spruch des Tages
- Agenda für heute
- Optional kompakte Smart-Day-Karte
- Optional kompakte Stempeluhr-Karte

### Extras

- Smart Day (nächster Termin, Countdown, freie Zeitfenster, Wetterhinweis)
- Stempeluhr (Start/Pause/Weiter/Stopp, Tätigkeiten, Belastungslevel)
- Fokusmodus (25/50/90 Minuten inkl. Historie)
- Wochenübersicht (Termine, Arbeitszeit, Belastung)
- Schnellnotizen
- Wetter-Planer
- Tagesziele & Soll-/Ist-Stunden
- Drag-&-Drop Sortierung der Extras-Karten

### Einkauf

- Eigene Einkaufs-Ansicht
- Mehrere Einkaufslisten pro Benutzer
- Artikel als gekauft markieren
- Menge und Preis pro Artikel
- Automatische Summen für gekaufte Positionen
- Lokal + Firebase-Profil Sync

### Secret-Bereich

- Secret Chat mit PIN
- Panic Mode / optional Auto-Panic
- Diskrete Benachrichtigungen
- Medien-Galerie und Vollbild-Viewer
- Voice-Nachrichten

## Technologie-Stack

- **Frontend:** React 18 + Vite
- **Styling:** CSS + Tailwind/PostCSS Tooling
- **Backend-Dienste:** Firebase (Auth, Firestore, Cloud Messaging)
- **Push / Backend-Logik:** Firebase Cloud Functions (Node.js 20)
- **PWA:** Service Worker + Manifest

## Projektstruktur

```text
.
├─ App.jsx                        # Hauptanwendung (UI + Logik)
├─ main.jsx                       # React-Einstiegspunkt
├─ firebase-messaging-sw.js       # Service Worker für Push/PWA
├─ index.html                     # App-Shell
├─ package.json                   # Frontend-Skripte und Dependencies
├─ functions/
│  ├─ index.js                    # Firebase Cloud Function(s)
│  └─ package.json                # Functions Abhängigkeiten/Skripte
├─ FIRESTORE_RULES_SHARING.txt    # Beispielregeln für Public Sharing
└─ FIRESTORE_RULES_EVENT_THREADS.txt # Beispielregeln für Event Threads/Polls
```

## Voraussetzungen

- **Node.js 20+** (empfohlen, passend zu Functions Engine)
- **npm 9+**
- Optional für Deployment: **Firebase CLI**

## Installation & lokaler Start

```bash
npm install
npm run dev
```

Danach ist die App standardmäßig unter der von Vite ausgegebenen lokalen URL erreichbar.

## Build & Preview

```bash
npm run build
npm run preview
```

Hinweis: `vite.config.js` nutzt aktuell `base: '/Onyx-Kalender/'`. Für andere Hosting-Pfade muss dieser Wert ggf. angepasst werden.

## Firebase-Setup

Die App enthält aktuell eine direkte Firebase-Konfiguration im Frontend und im Service Worker. Für produktive Setups empfiehlt sich mittelfristig ein Wechsel auf Umgebungsvariablen (z. B. `VITE_...`).

Wichtige genutzte Firebase-Bereiche:

- Authentication
- Firestore (`artifacts/{APP_ID}/public/data/...`)
- Cloud Messaging (Web Push)

## Cloud Functions

Im Ordner `functions/` ist eine Function enthalten, die beim Erstellen eines Testdokuments einen Push-Testversand auslöst.

### Lokal (Emulator)

```bash
cd functions
npm install
npm run serve
```

### Deploy

```bash
cd functions
npm run deploy
```

⚠️ Vor produktivem Einsatz `APP_LINK` in `functions/index.js` auf die echte App-URL setzen.

## PWA, Push & Service Worker

- Service Worker Registrierung erfolgt im `index.html`
- Push-Handling und Notification-Fallbacks liegen in `firebase-messaging-sw.js`
- `manifest.json` wird über den Base-Pfad eingebunden

Wenn Push-Benachrichtigungen nicht zugestellt werden, prüfe:

1. Browser-Berechtigungen für Notifications
2. Vorhandenes `fcmTokenWeb` im Benutzerprofil
3. Firestore-Regeln für Test-/Push-Pfade
4. Blocker (Adblock/Shield), die Firestore oder Messaging blockieren

## Deployment

Typischer Frontend-Flow:

```bash
npm run build
```

Das Ergebnis liegt im Ordner `dist/` und kann z. B. auf statischem Hosting (Firebase Hosting, Netlify, Vercel, GitHub Pages) ausgeliefert werden.

Bei GitHub Pages ist der gesetzte Base-Pfad `/Onyx-Kalender/` bereits passend.

## Firestore Rules Hinweise

Im Repository liegen zusätzliche Regel-Beispiele:

- `FIRESTORE_RULES_SHARING.txt` (Public/Busy-only Shares)
- `FIRESTORE_RULES_EVENT_THREADS.txt` (Kommentare/Polls pro Termin)

Diese Dateien sind **Snippets** und sollten in ein bestehendes, sicheres Gesamt-Regelwerk integriert werden.

## Troubleshooting

- **Leerer/defekter Screen:** Browser-Konsole öffnen, Hard-Reload durchführen, Service Worker aktualisieren.
- **Push-Test schlägt fehl:** `APP_LINK`, FCM-Token und Firestore-Rechte prüfen.
- **Daten inkonsistent zwischen Geräten:** Prüfen, ob Benutzer eingeloggt ist und Profil-Sync erfolgreich läuft.
- **Routing/Assets auf Hosting kaputt:** `base`-Pfad in `vite.config.js` mit Hosting-Pfad abgleichen.

## Roadmap-Ideen

- Umstellung auf `.env`/`VITE_...` Konfiguration
- Modul-Aufteilung von `App.jsx` in Feature-Bereiche
- Automatisierte Tests (Unit + E2E)
- CI/CD Pipeline für Build + Deploy + Lint
- Internationalisierung (i18n)

## Lizenz

Aktuell ist keine explizite Lizenzdatei vorhanden. Falls das Projekt öffentlich verteilt wird, sollte eine passende Lizenz (z. B. MIT) ergänzt werden.
