# Onyx Kalender — Feature-Übersicht (GitHub)

> Vollständige Funktionsübersicht des Web-Repos `Onyx-Kalender`
> Stand: Juni 2026 · Tech-Stack: React 18 + Vite + Capacitor + Firebase + Tailwind

---

## 1. Technischer Steckbrief

| Bereich | Wert |
|---|---|
| App-ID (Capacitor) | `de.onyx.kalender` |
| App-Name | Onyx Kalender |
| Frontend | React 18, Vite 5, Tailwind 3 |
| Native-Wrapper | Capacitor 8 (Android) |
| Backend | Firebase Auth + Firestore + FCM |
| Cloud Functions | `functions/index.js` (europe-west6, Node) |
| Hosting | Firebase Hosting (Projekt `kalender-rai`) |
| Icons | `lucide-react` |
| PWA | Service Worker, Manifest, Maskable Icons |

---

## 2. Hauptmodule (Navigation)

Die App ist in **6 Hauptansichten** unterteilt (Bottom-Bar + Sidebar):

| ID | Name | Beschreibung |
|---|---|---|
| `dashboard` | Dashboard / Home | Wetter, Spruch, Agenda, Smart-Day, Stempeluhr |
| `calendar` | Kalender | Tages-/Wochen-/Monatsansicht, Events |
| `extras` | Extras | Drag-&-Drop-Karten (Stempeluhr, Notizen, Goals…) |
| `shopping` | Einkauf | Einkaufslisten verwalten |
| `secret_chat` | Secret Chat | PIN-geschützter Bereich |
| `settings` | Einstellungen | Account, Kalender, Push, Themes, Booking, Public Links, ICS, Audit |

---

## 3. Kalender-Funktionen

### Kalender-Verwaltung
- **Privater Standard-Kalender** (`default`)
- **Mehrere eigene Kalender** anlegen
- **Farben pro Kalender** (frei wählbar)
- **Owner-Konzept** (`ownerId`)
- **Geteilte Kalender** mit `sharedWith.{uid}: 'read' | 'write'`
- **Busy-only Modus** (zeigt nur „belegt", keine Inhalte)
- **Public-Link-Freigabe** mit Token + optionalem Passcode (Magic-Key)

### Termine
- Titel, Datum, Uhrzeit (Beginn + Dauer in Minuten)
- **Wiederkehrende Termine** (RRULE: NONE/DAILY/WEEKLY/MONTHLY)
- **Ausnahme-Instanzen** (einzelne Wiederholung bearbeitbar)
- Typ: `Arbeit` / `Privat` / `Projekt` / `Booking`
- **Status**: `planned` / `in_progress` / `done` / `blocked`
- **Priorität**: A / B / C
- **Energy-Level**: high / medium / light
- **Checklisten** (Prep / Do / Followup)
- **Beschreibung, Ort, Video-Link**
- **Erinnerungen** (none / 0 / 5 / 15 / 30 / 60 / 1d, System-/Stiller-/Standard-Ton)
- **Push-Ziel** (web / android / both)
- **Pin-Funktion** für wichtige Termine
- **ICS-Download** pro Termin

### Tagesansicht
- Agenda (chronologisch)
- Feed (mit Kontext-Hinweisen)
- Freie Zeitfenster sichtbar
- Wetter-Hinweis pro Tag

### Polls / Abstimmungen
- Termine können **Abstimmungen** enthalten (`POLL_STATE: yes/maybe/no`)
- Matrix-Mode (Mehrere Optionen) ab Version 2
- Status: `open` / `closed`
- Auswertung mit Counts

### ICS Import / Export
- `exportICS(true)` → Alle Termine
- `exportICS(false)` → Nur heute
- Import via File-Input (`.ics`)

### Audit / Verlauf
- Aktionsprotokoll pro Kalender
- „Wer hat was wann geändert"

### Work-Templates (vordefiniert)
- Kundenmeeting (60 min, Prio A, high energy)
- Angebot erstellen (90 min, Prio A, high energy)
- Wartung (120 min, Prio B, medium energy)
- Monatsabschluss (180 min, Prio A, medium energy)

### Time-Block-Presets
- Fokusblock (08:00, 120 min)
- Meetingblock (10:30, 90 min)
- Adminblock (14:00, 60 min)
- Pufferblock (16:00, 60 min)

---

## 4. Dashboard / Home

| Karte | Beschreibung |
|---|---|
| **Wetter-Karte** | Aktuelles Wetter + 4h-Hinweise |
| **Smart Weather Badge** | „Regen ab 14:20", „Windig bis 16:00", „Trocken bis 18:00" |
| **Spruch des Tages** | `quotes.json` (~7 KB Sprüche-Sammlung) |
| **Heute-Agenda** | Termine von heute kompakt |
| **Smart-Day-Karte** (optional, kompakt) | Nächster Termin + Countdown |
| **Stempeluhr-Karte** (optional, kompakt) | Aktive Session |

---

## 5. Extras-Bereich

Eigener Bereich (Sidebar + Bottom-Bar). Karten sind **per Drag & Drop sortierbar**.

Standard-Reihenfolge (`DEFAULT_EXTRAS_ORDER`):
```
['workclock', 'goals', 'sollist', 'notes', 'weather']
```

### Smart Day
- Nächster Termin (Titel + Uhrzeit)
- Countdown bis Termin
- Freie Zeitfenster des Tages
- Wetter-Hinweis

### Stempeluhr (Workclock)
- **Start / Pause / Weiter / Stopp**
- **Tätigkeits-Dropdown** (mehrere Tätigkeiten)
- **Belastungslevel**: leicht / mittel / schwer
- **Ansichten**: Heute / Woche / Monat
- **CSV-Export**: Wochenrapport + Monatsrapport
- **Letzte Sessions** mit Bearbeiten/Löschen
- **Manuelle Zeitkorrektur**
- **Lokale Persistenz** + Remote-Fallback (Firebase)

### Fokusmodus (Pomodoro)
- **25 / 50 / 90 Minuten** vordefiniert
- Pause / Weiter / Speichern
- **Lokale Historie**

### Wochenübersicht
- Termine der Woche
- Arbeitszeit gesamt
- Freie Fenster
- Belastungsübersicht

### Schnellnotizen
- Lokal gespeichert
- **Firebase-Sync** (geräteübergreifend)

### Wetter-Planer
- Kleidung-Empfehlung
- Schirm Ja/Nein
- Trockenfenster-Berechnung

### Tagesziele
- Checkbox-Liste
- Sync über Firebase

### Soll-/Ist-Stunden
- Wochenziel definierbar
- Vergleich Soll vs. Ist

---

## 6. Einkauf (Shopping Lists)

- **Mehrere Listen pro Benutzer**
- Pro Liste: Titel, Store (Geschäft optional)
- Pro Artikel: Name, **Menge**, **Preis**
- **Gekauft markieren** → Durchstreichen
- **Automatische Summe** für bereits gekaufte Positionen
- **Schnellzufügen** (Quick-Item-Input)
- Storage-Key: `onyx_shopping_lists_{uid}`
- Lokal + Firebase-Profil-Mirror

---

## 7. Secret Bereich

### Secret Chat
- **PIN-geschützter Zugang**
- 1-on-1 Konversationen
- Text + Bilder + **Voice-Nachrichten**
- **Medien-Galerie** mit allen Bildern als Miniaturen
- **Vollbild-Image-Viewer**
- Echter **Gesamt-Nachrichtenzähler** pro Chat
- **Typing-Indicator**

### Voice-Nachrichten
- Optimierter MediaRecorder
- **Opus/WebM bevorzugt** (Fallback auf andere Codecs)
- 1 Kanal (Mono)
- Echo-Suppression aktiv
- Noise-Suppression aktiv
- Stabil gegen Stottern

### Panic Mode
- 💣 Sofort-Verstecken (`hideSecretChatNow`)
- **Auto-Panic bei App-Wechsel** (visibility change)
- Diskrete Benachrichtigungen (keine OS-Notifications für Secret-Chat-Messages)

---

## 8. Booking-Link / Guest Booking Hub

Komponente: `BookingHostManager` (ab Zeile 13717 in `App.jsx`)

- Öffentlicher **Gäste-Terminkalender**
- Aktivierbar / Deaktivierbar
- Konfigurierbares **Booking-Profil**
- Gäste können Termine direkt buchen
- Termin-Typ: `Booking`

---

## 9. Public Share Links

- **Token-basierte Freigabe** einzelner Termine
- Optional mit **Passcode (Magic-Key)**
- Hash-Routing: `#/share/<token>?k=<magicKey>`
- Empfänger sehen Termin ohne Login
- **ICS-Download** für Empfänger

---

## 10. Push & Benachrichtigungen

### Web (PWA)
- `firebase-messaging-sw.js` (Service Worker)
- **Raw Push Fallback** (zusätzlich zu `onBackgroundMessage`)
- **Dedupe-System** gegen doppelte Notifications
- **Notification Actions**: „Öffnen" und „OK"
- **requireInteraction** für wichtige Erinnerungen
- Monochromes `badge-icon.png`
- Periodisches FCM-Token-Refresh in App.jsx
- Service-Worker-Update via `SKIP_WAITING`

### Native (Android via Capacitor)
- FCM-Token-Sync ins Profil
- Push-Ziel pro Termin konfigurierbar (web / android / both)

### Cloud Functions (`functions/index.js`)
- `onSchedule` für regelmäßige Reminder-Auslieferung
- `onDocumentCreated` für reaktive Pushes
- Region: `europe-west6`
- 90-Sekunden-Lookahead für Erinnerungen

---

## 11. Themes & Design

### Dark Themes
- `obsidian` (Standard)
- `deepblack`
- `midnight`
- `gold`
- `emerald`

### Light Themes
- `paper-light`
- `sand-light`
- `rose-light`
- `sky-light`

### Custom
- Eigene Hintergründe pro Theme-Modus
- Mode-Switch hell/dunkel (`uiTheme`)
- Theme-Felder im Profil: `appThemeLight`, `appThemeDark`, `appBgLight`, `appBgDark`

---

## 12. Account & Sicherheit

- **Permanenter Alias** speicherbar
- **Passwort ändern**
- **Reset-Mail** anfordern
- Datenschutz-Sektion
- **Single-Device-Session** (siehe `SINGLE_DEVICE_SESSION_HINWEIS.txt`)
- **Exclusive Session** (Doc-ID `current`) verhindert Mehrfach-Logins
- Presence-System (`presenceStatus`, `presenceLastSeen`, `presenceLastSeenIso`)

---

## 13. Einstellungen — Akkordeon-Struktur

Settings sind in **suchbare Akkordeon-Sektionen** unterteilt:

| ID | Bereich | Inhalt |
|---|---|---|
| `account` | Account & Sicherheit | Profil, Passwort, Datenschutz |
| `calendars` | Kalender & Freigaben | Farben, Schichtpläne, Teilen |
| `notifications` | Benachrichtigungen & Tester | Push, Erinnerungen, Diagnose |
| `design` | Design & Themes | App-Theme, Hintergrund, Blur |
| `booking` | Booking-Link | Gäste-Terminkalender |
| `links` | Public Links | Busy-only Links, Passcode, Ablauf |
| `ics` | Import/Export | ICS Export und Import |
| `audit` | Audit & Verlauf | Aktionsprotokoll |

Jede Sektion hat Such-Keywords für die Suchleiste.

---

## 14. Daten-Modell (Firestore-Pfade)

```
artifacts/{APP_ID}/public/data/profiles/{uid}
  ├ alias
  ├ presenceStatus, presenceLastSeen, presenceLastSeenIso
  ├ fcmToken, fcmTokenWeb, fcmTokensWeb[]
  ├ appThemeLight, appThemeDark, appBgLight, appBgDark
  ├ extrasSlotOrder
  ├ shoppingLists (gespiegelt)
  ├ quickNotes (gespiegelt)
  ├ dailyGoals (gespiegelt)
  └ weeklyTargetHours

calendars/{calId}
  ├ ownerId
  ├ name, color
  ├ sharedWith: { uid: 'read' | 'write' }
  ├ busyOnly: boolean
  └ events/{eventId}
       ├ title, date, time, durationMinutes
       ├ type, status, priority, energyLevel
       ├ desc, location, videoLink
       ├ recurrence: { freq, interval, … }
       ├ reminders[]
       ├ checklistPrep[], checklistDo[], checklistFollowup[]
       └ poll: { state, version, voteMode, votes }
```

---

## 15. Repo-Struktur

```
Onyx-Kalender/
├── App.jsx                         # 12.693 Zeilen (Haupt-App, root)
├── src/
│   ├── App.jsx                     # 14.000 Zeilen (aktuelle Version)
│   ├── BookingApp.jsx              # Booking-Modul
│   ├── main.jsx
│   ├── components/
│   │   ├── ErrorBoundary.jsx
│   │   ├── ImageViewer.jsx
│   │   ├── ShareEventModal.jsx
│   │   └── ShiftSelectionModal.jsx
│   ├── utils/
│   │   ├── firebase.js
│   │   └── helpers.js              # Shopping/Extras-Helper
│   ├── styles.css
│   └── themes.css
├── functions/
│   └── index.js                    # 377 Zeilen Cloud Functions
├── public/
├── firebase-messaging-sw.js
├── manifest.json
├── quotes.json                     # Sprüche-Datenbank
├── firestore.rules                 # Sicherheitsregeln
├── capacitor.config.json
└── package.json
```

---

## 16. Wichtige Hinweise (aus den `*_HINWEIS.txt`-Dateien)

| Datei | Thema |
|---|---|
| `ACCORDION_SETTINGS_FIX_HINWEIS.txt` | Settings-Akkordeon-Verhalten |
| `BOOKING_PUSH_FIX_HINWEIS.txt` | Push für Booking-Termine |
| `DEPLOY_KURZANLEITUNG.txt` | Schnell-Deploy |
| `DEPLOY_SECRET_CHECKLIST.txt` | Secret-Bereich Deploy-Checks |
| `FIRESTORE_RULES_SHARING.txt` | Firestore-Rules für geteilte Kalender |
| `REPAIR_HINWEIS_SECRET_CHAT*.txt` | Secret-Chat Bugfixes |
| `SETTINGS_INPUT_FIX_HINWEIS.txt` | Settings-Eingabefelder Fix |
| `SINGLE_DEVICE_SESSION_HINWEIS.txt` | Single-Device-Session |

---

## 17. Berechtigungen (Android via Capacitor)

Aus Web-Manifest abgeleitet:
- INTERNET
- POST_NOTIFICATIONS (Android 13+)
- WAKE_LOCK (für Hintergrund-Reminder)
- ACCESS_NETWORK_STATE
- Camera + Microphone (für Voice/Bild im Secret Chat)

---

## 18. Build & Deploy

```bash
# Dev-Server
npm run dev

# Web-Build
npm run build

# Android-Sync (Capacitor)
npm run android:sync

# Android-Studio öffnen
npm run android:open

# Android-Studio ZIP erstellen
npm run android:zip
```

GitHub-Actions:
- `.github/workflows/firebase-backend-deploy.yml` — Functions-Deploy
- `.github/workflows/Page.yml` — Hosting-Deploy

---

## 19. Feature-Matrix (Schnellübersicht)

| Kategorie | Anzahl Features |
|---|---|
| Kalender-Funktionen | 15+ |
| Dashboard-Karten | 6 |
| Extras-Module | 9 |
| Shopping-Funktionen | 6 |
| Secret-Bereich | 7 |
| Booking-System | 5 |
| Themes | 9 (5 dark + 4 light) |
| Settings-Sektionen | 8 |

**Gesamt: ca. 65+ unterschiedliche User-Features**

---

*Diese Übersicht dient als Grundlage für Feature-Vergleich, Roadmap-Planung und Migrations-Entscheidungen.*
