# Onyx Kalender

Onyx Kalender ist eine dunkle Kalender- und Organisations-App mit Fokus auf Alltag, Arbeit, Wetter, Privatsphäre und schneller Bedienung.

## Hauptfunktionen

### Konto & Profil
- Registrierung mit Name, E-Mail und Passwort
- persönlicher Alias / Anzeigename
- 5-stellige Chat-/Kontakt-ID
- Profildaten mit lokaler Absicherung
- Alias bleibt nach Reload erhalten

### Kalender
- privater Standardkalender
- eigene benutzerdefinierte Kalender
- geteilter Kalender-Support
- Tages-, Wochen- und Monatslogik
- wiederkehrende Termine
- Erinnerungen mit Standard- oder benutzerdefiniertem Vorlauf
- Agenda für heute
- schneller Termin-Export

### Dashboard / Startseite
- Smart-Day-Karte mit nächstem Termin
- Anzeige „heute noch frei“
- kompakte Termin-Vorschau
- Wetter-Badge direkt auf der Startseite
- Spruch des Tages
- Tageszusammenfassung mit freien Zeitfenstern

### Wetter
- aktuelle Wetterdaten über Open-Meteo
- Tagesprognose
- 4-Stunden-Wetterlogik für praktische Hinweise
- kontextbezogene Hinweise wie:
  - Schirm mitnehmen
  - Jacke sinnvoll
  - trocken bis Uhrzeit X
  - Regen ab Uhrzeit X
  - windig bis Uhrzeit X
- natürlichere Texte wie morgens, über Mittag, am Nachmittag, am Abend
- Wetter-Badge auf Dashboard und im Wetter-Modal

### Secret Chat
- separater Secret Chat
- Secret-Chat-PIN
- Panic Mode zum sofortigen Verstecken
- optionales Auto-Hide / Auto-Panic beim Verlassen
- reduzierte Sichtbarkeit von Secret-Chat-Benachrichtigungen

### Arbeit / Stempelung
- in Einstellungen aktivierbar/deaktivierbar
- Start / Pause / Weiter / Stopp auf der Startseite
- Abschlussdialog beim Stoppen
- Tätigkeit über Dropdown oder freie Eingabe
- Belastungslevel: leicht / mittel / schwer
- laufender Timer
- Pausenzeit getrennt von Arbeitszeit
- Heute-, Wochen- und Monatsübersicht
- letzte Sessions direkt im Dashboard
- Sessions bleiben lokal gespeichert
- lokale Daten werden mit Remote-Daten zusammengeführt
- Wiederaufnahme einer laufenden Stempelung nach Reload

### Stempelungs-Reports
- Wochenrapport als CSV-Export
- Monatsrapport als CSV-Export
- Summen und Session-Anzahl im Dashboard
- Belastungsübersicht nach Level

### Stempelungs-Verwaltung
- Session bearbeiten
- Session löschen
- manuelle Korrektur von Start- und Endzeit
- nachträgliches Ändern von Tätigkeit und Level

### Einstellungen
- Workclock / Stempelung aktivieren
- Tätigkeitsliste für Dropdown pflegen
- optionale Privatsphäre-Funktionen für Secret Chat
- diverse App- und Profiloptionen

### Technik
- React + Vite
- Firebase Auth
- Firestore
- lokale Fallback-Speicherung via LocalStorage
- PWA / Service Worker Unterstützung
- dunkles UI für Mobile und Desktop

## Hinweise
- Einige Funktionen speichern lokal und spiegeln zusätzlich nach Firestore.
- Wenn Firestore-Regeln oder Netzwerke kurzfristig blockieren, bleiben lokale Daten erhalten.
- Browser-Fehler aus Erweiterungen wie `webpage_content_reporter.js` stammen normalerweise nicht aus der App selbst.

## Empfohlene nächste Ausbauten
- PDF-Export für Rapporte
- Fingerprint / Face-ID für Secret Chat
- Selbstlöschende Secret-Chat-Nachrichten
- noch feinere Arbeitsauswertungen nach Tätigkeit
