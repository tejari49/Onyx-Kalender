# Onyx Kalender

Onyx ist eine dunkle Kalender-PWA mit Fokus auf Terminplanung, geteilte Kalender, Wetter-Hinweise, Secret-Bereich und produktive Extras.

## Hauptfunktionen

### Kalender
- privater Standard-Kalender
- eigene zusätzliche Kalender
- Farben, Teilen, Busy-only, Public Links
- Tagesansicht mit Agenda und Feed
- wiederkehrende Termine
- Audit / Verlauf
- ICS Import / Export

### Dashboard / Startseite
- Wetterkarte mit 4h-Hinweisen
- Smartes Wetter-Badge wie `Regen ab xx:xx`, `Windig bis xx:xx`, `Trocken bis xx:xx`
- Spruch des Tages
- Agenda für heute
- optionale kompakte Smart-Day-Karte
- optionale kompakte Stempeluhr-Karte

### Extras
- eigener Extras-Bereich in Sidebar und Bottom-Bar
- Smart Day
  - nächster Termin
  - Countdown bis zum Termin
  - freie Zeitfenster
  - Wetter-Hinweis
- Stempeluhr
  - Start / Pause / Weiter / Stopp
  - Tätigkeits-Dropdown
  - Belastungslevel leicht / mittel / schwer
  - Heute / Woche / Monat
  - Wochenrapport CSV
  - Monatsrapport CSV
  - letzte Sessions
  - Session bearbeiten / löschen
  - manuelle Zeitkorrektur
  - lokale Persistenz mit Remote-Fallback
- Fokusmodus
  - 25 / 50 / 90 Minuten
  - Pause / Weiter / Speichern
  - lokale Historie
- Wochenübersicht
  - Termine der Woche
  - Arbeitszeit
  - freies Fenster
  - Belastungsübersicht
- Schnellnotizen
  - lokal gespeichert
- Wetter-Planer
  - Kleidung / Schirm / Trockenfenster

### Einstellungen
- Extras ein-/ausblendbar
- Smart Day in Extras ein-/aus
- Smart Day auf Home ein-/aus
- Stempeluhr auf Home ein-/aus
- Fokusmodus ein-/aus
- Wochenübersicht ein-/aus
- Schnellnotizen ein-/aus
- Wetter-Planer ein-/aus
- Push & Erinnerungen weiterhin vorhanden, jetzt unter Extras zusammengefasst

### Secret Bereich
- Secret Chat mit PIN
- Panic Mode
- Auto-Panic bei App-Wechsel optional
- diskrete Benachrichtigungen für Secret Chat

### Account
- Alias dauerhaft speicherbar
- Passwort ändern / Reset-Mail
- Datenschutz & Profilbereich

## Technische Hinweise
- Firebase Auth + Firestore
- lokale Fallbacks für sensible Bereiche wie Workclock
- PWA mit Service Worker
- Vite + React

### Präsenz / „zuletzt online“ in Firebase finden

- **In der Firebase Console:**  
  Gehe zu **Firestore Database → Data → `artifacts/{APP_ID}/public/data/profiles/{uid}`**.
- Dort schreibt die App diese Felder:
  - `presenceStatus` (`online` / `offline`)
  - `presenceLastSeen` (Unix-Zeitstempel in Millisekunden)
  - `presenceLastSeenIso` (ISO-Datum/Uhrzeit, z. B. `2026-04-06T12:34:56.789Z`)
- In der UI wird „online“ aus `presenceStatus === 'online'` plus einem Frische-Fenster auf Basis von `presenceLastSeen` berechnet.
- Hinweis: **Authentication → Users → Last sign-in** ist nur der letzte Login, nicht die laufende Präsenz.

## Bedienidee
- Home bleibt bewusst kompakt
- Extras bündelt produktive Werkzeuge
- Einstellungen schalten Extras und Home-Karten granular an oder aus


## Extras (neu erweitert)

- Frei sortierbare Extras-Karten per Drag & Drop
- Smart Day im Extras-Bereich
- Stempeluhr im Extras-Bereich
- Fokusmodus
- Wochenübersicht
- Freie Zeitfenster des Tages
- Soll-/Ist-Stunden mit Wochenziel
- Tagesziele mit Häkchen
- Schnellnotizen mit Firebase-Sync
- Wetter-Planer

### Sync über Geräte

Die folgenden Extras-Daten werden jetzt im Firebase-Profil mitgespeichert und stehen nach dem Login auf mehreren Geräten zur Verfügung:

- Schnellnotizen
- Tagesziele
- Wochenziel für Soll-/Ist-Stunden
- Reihenfolge der Extras-Karten


## Neu in diesem Stand

### Plus-Menü
- **Neu erstellen** mit Auswahl zwischen **Termin** und **Einkaufsliste**.

### Einkaufslisten
- eigene Ansicht **Einkauf**
- mehrere Listen pro Benutzer
- Artikel können direkt als **gekauft** markiert und dadurch durchgestrichen werden
- pro Artikel sind **Menge** und **Preis** möglich
- automatische Summe für bereits gekaufte Positionen
- Listen werden lokal gespeichert und zusätzlich im Firebase-Profil gespiegelt, damit dieselben Daten auf mehreren Geräten verfügbar sind

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
