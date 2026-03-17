# Onyx Kalender

Onyx Kalender ist eine datenschutzorientierte Kalender‑PWA mit Fokus auf Planung, Zusammenarbeit und persönliche Produktivität. Neben dem klassischen Kalender enthält die App einen geschützten Secret‑Bereich mit Chat, eine Einkaufsliste, eine Stempeluhr, Fokus‑Timer und weitere Alltags‑Tools.

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Hauptfunktionen](#hauptfunktionen)
  - [1) Kalender & Termine](#1-kalender--termine)
  - [2) Dashboard](#2-dashboard)
  - [3) Extras](#3-extras)
  - [4) Einkauf](#4-einkauf)
  - [5) Secret‑Bereich](#5-secretbereich)
  - [6) Profile & Benutzerkonto](#6-profile--benutzerkonto)
  - [7) Push, PWA & Offline-Verhalten](#7-push-pwa--offline-verhalten)
- [Technologie-Stack](#technologie-stack)
- [Projektstruktur](#projektstruktur)
- [Voraussetzungen](#voraussetzungen)
- [Lokale Entwicklung](#lokale-entwicklung)
- [Build & Preview](#build--preview)
- [Firebase Setup](#firebase-setup)
- [Cloud Functions](#cloud-functions)
- [Firestore Sicherheitsregeln](#firestore-sicherheitsregeln)
- [Datenmodell (vereinfacht)](#datenmodell-vereinfacht)
- [Konfiguration](#konfiguration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Bekannte Grenzen](#bekannte-grenzen)

## Überblick

Die App kombiniert mehrere Bereiche in einer einzigen Oberfläche:

- **Mehrere Kalender** (eigene + geteilte Kalender)
- **Terminverwaltung** inkl. Wiederholungen, Erinnerungen, Import/Export, Kommentare, Verlauf
- **Dashboard mit Wetter, Agenda und Tagesfokus**
- **Produktivitäts-Module** (Stempeluhr, Fokusmodus, Ziele, Notizen, Soll/Ist)
- **Einkaufslisten** mit Summen und Ausgabenhistorie
- **Secret Chat** mit PIN-Schutz, Medien und Sprachmemos
- **PWA + Push-Benachrichtigungen** über Firebase Cloud Messaging

## Hauptfunktionen

### 1) Kalender & Termine

- Privater Standardkalender pro Benutzer
- Zusätzliche Kalender anlegen und farblich verwalten
- Freigaben pro Kalender mit Rollen:
  - **read** (nur lesen)
  - **write** (bearbeiten)
- Teilen per öffentlichem Link:
  - Busy-only Ansicht
  - optional voll sichtbare Terminansicht
  - optional Passwort / Ablaufdatum / Widerruf
- Monatsansicht + Agendaansicht
- Termin-Details mit:
  - Titel, Zeit, Datum, Farbe
  - Notizen/Beschreibung
  - Wiederkehrung
  - Kommentare
- Löschen einzelner Vorkommen oder ganzer Serien
- Audit/Verlaufseinträge bei Änderungen
- ICS-Import/Export

### 2) Dashboard

- Tagesübersicht mit wichtigen Terminen
- Wetterkarte inkl. kurzfristiger Hinweise
- Smart-Day-Kompaktanzeige mit nächstem Termin
- „Spruch des Tages“ aus `quotes.json` (mit Fallback-Texten)

### 3) Extras

Die Extras sind als Karten organisiert und per Drag & Drop sortierbar.

- **Stempeluhr**
  - Start/Pause/Weiter/Stopp
  - Sessions bearbeiten und löschen
  - Tätigkeit + Belastungslevel
- **Fokusmodus**
  - Timer-Längen (z. B. 25/50/90 Min.)
  - Verlaufsdaten
- **Tagesziele**
- **Soll-/Ist-Stunden**
- **Schnellnotizen**
- **Wetter-Planer**
- **Wochen-/Leistungsübersicht**

### 4) Einkauf

- Mehrere Einkaufslisten pro Benutzer
- Liste anpinnen
- Positionen mit:
  - Name
  - Menge
  - Preis
  - Erledigt-Status
- Summenberechnung erledigter Positionen
- Kauf-/Zahlungshistorie pro Liste
- Sync über Firestore-Profilfelder

### 5) Secret‑Bereich

- Zugriff über Long-Press-Geste
- Optionaler Secret-PIN-Schutz (4–8 Ziffern)
- 1:1- und Gruppenchat-Strukturen
- Freundesuche über 5-stellige Chat-ID
- Medienversand (Bilder) mit Vollbildanzeige
- Sprachmemos (Audio-Nachrichten)
- Antwort-/Bearbeiten-/Löschen-Funktionen im Chat
- Medien-Galerie mit Bildübersicht
- Privacy-Funktionen wie Panic-/Auto-Panic-Modi

### 6) Profile & Benutzerkonto

- Registrierung, Login, Logout
- Profilname/Display Name
- Freundescode/Chat-ID
- Passwort-Reset
- Web-Push-Token im Profil gespeichert
- **Profilbild hochladen, anzeigen und entfernen**
  - Upload inkl. Komprimierung/Cropping
  - Entfernen löscht alle Avatar-Felder (`avatarBase64`, `avatarThumbBase64`, `avatarFullBase64`)

### 7) Push, PWA & Offline-Verhalten

- Installierbare PWA
- Service Worker mit Push-Handling
- FCM-Vordergrund-/Hintergrundnachrichten
- Dedupe gegen doppelte Benachrichtigungen
- Test-Mechanismus für Push im Backend
- Serverseitige Termin-Reminder per Scheduler-Funktion

## Technologie-Stack

- **Frontend:** React 18 + Vite
- **Styling:** CSS, Tailwind, PostCSS
- **Backend:** Firebase (Auth, Firestore, Messaging)
- **Serverlogik:** Firebase Cloud Functions (Node.js 20)
- **PWA:** Manifest + Service Worker

## Projektstruktur

```text
.
├─ src/
│  ├─ App.jsx
│  ├─ main.jsx
│  └─ styles.css
├─ functions/
│  ├─ index.js
│  ├─ package.json
│  └─ .eslintrc.js
├─ firestore.rules
├─ firebase-messaging-sw.js
├─ package.json
├─ vite.config.js
└─ README.md
```

## Voraussetzungen

- Node.js **20+** (empfohlen)
- npm **9+**
- Firebase CLI (für Deploys)

## Lokale Entwicklung

```bash
npm install
npm run dev
```

App lokal starten und im Browser öffnen (Vite-Ausgabe beachten, meist `http://localhost:5173`).

## Build & Preview

```bash
npm run build
npm run preview
```

## Firebase Setup

1. Firebase-Projekt erstellen/verwenden.
2. Authentifizierung aktivieren (E-Mail/Passwort).
3. Firestore aktivieren.
4. Cloud Messaging (Web Push) konfigurieren.
5. Firestore Rules aus `firestore.rules` deployen:

```bash
firebase deploy --only firestore:rules
```

## Cloud Functions

Im Ordner `functions/`:

```bash
npm install
firebase deploy --only functions
```

Wichtige Funktionen:

- `sendPushTestOnCreate`: sendet einen Server-Test-Push bei neuen `pushTests`-Dokumenten.
- `sendDueEventReminders`: geplanter Job (jede Minute), der fällige Terminerinnerungen versendet.

## Firestore Sicherheitsregeln

`firestore.rules` deckt u. a. ab:

- Profile nur durch eigenen User schreibbar
- Kalender lesbar für Owner oder freigegebene Nutzer
- Kalender schreibbar nur mit Owner-/write-Recht
- Event-Kommentare mit Sender-/Owner-Regeln
- Chats nur für Teilnehmer
- `friendCodes` als immutable Registry
- Public Shares mit Ablauf-/Widerrufslogik

## Datenmodell (vereinfacht)

```text
artifacts/{appId}/
  users/{uid}/events/{eventId}
  users/{uid}/auditLogs/{logId}
  public/data/profiles/{uid}
  public/data/friendCodes/{code}
  public/data/calendars/{calId}
    events/{eventId}
    auditLogs/{logId}
  public/data/chats/{chatId}
    messages/{msgId}
  public/data/shares/{token}
  public/data/pushTests/{id}
```

## Konfiguration

- Firebase Web-Konfig ist im Frontend hinterlegt (kann über `__firebase_config` überschrieben werden).
- `APP_ID` ist per Runtime (`__app_id`) überschreibbar.
- VAPID Key kann über `VITE_FIREBASE_WEB_PUSH_CERTIFICATE_KEY` gesetzt werden.

## Deployment

Typische Optionen:

- Firebase Hosting
- GitHub Pages (Vite-Build als statische Seite)

Bei GitHub Actions auf korrekte Action-Versionen achten (z. B. `actions/deploy-pages@v4`).

## Troubleshooting

### Profilbild kann nicht gelöscht werden

- Das Entfernen löscht drei Felder im Profil: `avatarBase64`, `avatarThumbBase64`, `avatarFullBase64`.
- Wenn der Entfernen-Button deaktiviert wirkt, obwohl ein Bild sichtbar ist, liegt es oft an uneinheitlichen Alt-/Legacy-Datenfeldern.
- Der aktuelle Stand berücksichtigt alle Avatar-Felder bei der Verfügbarkeitsprüfung des Entfernen-Buttons.

### Push kommt nur beim Öffnen der App

- Prüfen, ob Functions deployed sind.
- Prüfen, ob Cloud Scheduler aktiv ist.
- Prüfen, ob ein gültiger FCM-Token im Profil steht.

### Login-/Auth-Probleme nach Projektwechsel

Die App enthält einen Auth-Hardening-Mechanismus, der bei ungültigem Firebase-Cache lokale Auth-Daten bereinigt.

## Bekannte Grenzen

- Kein vollständiges Backend-RBAC außerhalb Firestore Rules.
- Push hängt von Browser-/OS-Einschränkungen ab.
- Einige Features benötigen stabile Echtzeitverbindung (Firestore).
