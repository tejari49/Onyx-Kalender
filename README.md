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

### Extras
- Smart Day
- Stempeluhr
- Fokusmodus
- Wochenübersicht
- Freie Zeitfenster
- Tagesziele
- Soll-/Ist-Stunden
- Schnellnotizen
- Wetter-Planer
- Karten in Extras per Drag & Drop sortierbar

### Benachrichtigungen / PWA
- überarbeiteter `firebase-messaging-sw.js`
- **Raw Push Fallback** zusätzlich zu Firebase `onBackgroundMessage`
- Dedupe-System gegen doppelte Notifications
- neues `badge-icon.png` für Android-Badge / Statusleisten-Symbol
- `requireInteraction` für wichtige Erinnerungen
- Notification Actions: **Öffnen** und **OK**
- periodisches FCM-Token-Refresh in `App.jsx`
- Service-Worker-Update-Check mit `SKIP_WAITING`
- Manifest um monochromes Badge-Icon ergänzt

- Secret Chat: Medien-Galerie mit allen Bildern als Miniaturen, Vollbild-Viewer und echtem Gesamt-Nachrichtenzähler pro Chat.
- Voice-Nachrichten: Recorder mit stabileren Audio-Parametern (Opus/WebM bevorzugt, 1 Kanal, Echo-/Noise-Suppression) gegen stotternde Aufnahmen.

### GitHub Pages CI Hinweis
- Falls der Deploy-Job mit `Unable to resolve action actions/deploy-pages@v5` fehlschlägt, verwende in `.github/workflows/Page.yml` die gültige Version `actions/deploy-pages@v4`.
