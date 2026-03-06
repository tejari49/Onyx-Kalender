# Onyx Kalender

Onyx ist eine dunkle Kalender-PWA für Termine, Freigaben, Wetter-Hinweise und produktive Werkzeuge. Der Bereich **Extras** bündelt zusätzliche Funktionen, damit die Startseite kompakt bleibt.

## Hauptfunktionen

### Kalender
- privater Standard-Kalender
- eigene zusätzliche Kalender
- Kalender teilen
- Busy-only Freigaben und Public Links
- Tagesansicht mit Agenda und Feed
- wiederkehrende Termine
- Audit / Verlauf
- ICS Import / Export

### Dashboard / Startseite
- Wetterkarte mit 4h-Hinweisen
- Wetter-Badges wie `☔ Regen ab xx:xx`, `🌬️ Windig bis xx:xx`, `☀️ Trocken bis xx:xx`
- Spruch des Tages
- Agenda für heute
- optionale kompakte Smart-Day-Karte
- optionale kompakte Stempeluhr-Karte

### Extras
Der neue Bereich **Extras** ist in Sidebar und Bottom Bar verfügbar.

#### Smart Day
- nächster Termin
- Countdown bis zum Termin
- freie Zeitfenster
- kompakter Wetter-Hinweis
- Tagesstatus für heute

#### Stempeluhr
- aktivierbar / deaktivierbar in den Einstellungen
- Start / Pause / Weiter / Stopp
- Tätigkeits-Dropdown
- Belastungslevel: leicht / mittel / schwer
- Heute / Woche / Monat
- Wochenrapport als CSV
- Monatsrapport als CSV
- letzte Sessions
- Session bearbeiten / löschen
- manuelle Zeitkorrektur für Start und Ende
- lokale Persistenz mit Firestore-Fallback

#### Fokusmodus
- 25 / 50 / 90 Minuten
- Pause / Weiter / Speichern
- lokale Historie
- heutige Fokuszeit

#### Wochenübersicht
- Termine der Woche
- Arbeitszeit der Woche
- freie Zeitfenster
- Belastungsübersicht

#### Schnellnotizen
- lokale Notizen
- direkt in Extras nutzbar

#### Wetter-Planer
- 4h-Tendenz
- Regenschirm-/Jacken-Hinweise
- Trockenfenster / Regenfenster
- einfache Tagesempfehlung

### Einstellungen
- Extras global ein-/ausblendbar
- Smart Day in Extras ein-/aus
- Smart Day auf Home ein-/aus
- Stempeluhr auf Home ein-/aus
- Fokusmodus ein-/aus
- Wochenübersicht ein-/aus
- Schnellnotizen ein-/aus
- Wetter-Planer ein-/aus

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

## UX-Konzept
- Home bleibt bewusst kompakt
- Extras bündelt produktive Werkzeuge
- Einstellungen schalten Extras und Home-Karten granular an oder aus
