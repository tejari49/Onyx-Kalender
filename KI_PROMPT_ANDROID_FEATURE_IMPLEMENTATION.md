# KI-Prompt: Onyx-Kalender Features in native Android APK implementieren

> **Verwendung:** Diesen kompletten Text als Prompt an eine KI (Claude, GPT-4, Gemini, etc.) geben.
> Die KI bekommt zusätzlich Zugriff auf das Android-Studio-Projekt der „Gruppen Kalender"-App.
> Features werden **strikt in der angegebenen Reihenfolge** umgesetzt — eines nach dem anderen.

---

## ROLLE & AUFGABE

Du bist ein erfahrener Senior Android Engineer mit Schwerpunkt **Kotlin + Jetpack Compose + Firebase**. Deine Aufgabe ist es, eine bestehende native Android-App namens „Gruppen Kalender" (Package `com.rai.onyx`, MainActivity in `com.example.gruppenkalender`) **um Features zu erweitern**, die aktuell nur in der React-Web-Variante „Onyx-Kalender" existieren.

**Wichtige Regeln:**
1. **Eines nach dem anderen**: Implementiere immer nur **EIN Feature pro Schritt**. Erst nach Bestätigung (Build grün, manueller Test) gehst du zum nächsten.
2. **Keine Breaking Changes**: Bestehende Features (Login, Gruppen, Friends, Chat, Reminders) müssen weiter funktionieren.
3. **Konsistenz**: Nutze die bestehende Architektur — `data/model`, `data/repository`, `viewmodel`, `ui/screen`, `ui/component`, `util`.
4. **Kotlin Idioms**: `sealed class`, `data class`, `Flow`, `StateFlow`, `viewModelScope`, `suspend fun`, `Result<T>`.
5. **UI**: Material 3, Compose, **Dark-Theme als Standard** (analog zum Web).
6. **Firebase**: Firestore + Storage über die existierenden Module (`FirebaseModule`, `FirebaseModule.Collections`).
7. **Lokale Persistenz**: Wenn die Web-App lokal speichert, nutze hier **DataStore** (preferences) statt SharedPreferences.
8. **Tests**: Pro Feature mindestens ein Unit-Test für ViewModel/Repository und ein Compose-UI-Test für den Hauptscreen.
9. **Commit-Disziplin**: Pro Feature ein Commit mit klarer Message, z. B. `feat(extras): add focus mode pomodoro timer`.

**Sprache**: UI-Strings in **Deutsch** (passt zur bestehenden App). Code-Kommentare auf Englisch.

---

## 1. AUSGANGSLAGE: Was die APK bereits hat

### Tech-Stack
- Native Android, **Kotlin + Jetpack Compose**
- Material 3 (`androidx.compose.material3`)
- Navigation Compose (`AppNavigationKt`, `Routes`, `BottomTab`)
- Firebase Auth (Google Sign-In via Credential Manager)
- Firestore + FCM
- AlarmManager für Reminder

### Vorhandene Pakete & Klassen
```
com.example.gruppenkalender/
├── MainActivity
├── GruppenKalenderApp                 # Application class
├── data/
│   ├── firebase/
│   │   ├── FcmService                 # Push handling
│   │   ├── FirebaseModule             # Firestore/Storage singletons
│   │   │   └── Collections            # Collection name constants
│   │   └── GoogleAuthClient
│   ├── model/
│   │   ├── CalendarModel, CalendarType
│   │   ├── EventModel, EventStatus, EventRequestModel
│   │   ├── ChatMessage, ChatMessageType, Conversation
│   │   ├── FriendshipModel, RequestStatus
│   │   ├── GroupModel, GroupInvitationModel
│   │   ├── NotificationModel, NotificationType
│   │   └── UserModel
│   ├── reminder/
│   │   ├── EventReminderReceiver      # AlarmManager BroadcastReceiver
│   │   └── EventReminderScheduler
│   └── repository/
│       ├── AuthRepository
│       ├── CalendarRepository
│       ├── ChatRepository
│       ├── EventRequestRepository
│       ├── FriendshipRepository
│       ├── GroupInvitationRepository
│       ├── GroupRepository
│       ├── NotificationRepository
│       └── UserRepository
├── navigation/
│   ├── AppNavigationKt
│   ├── BottomTab                       # enum für Tabs
│   └── Routes                          # alle Routes
├── ui/
│   ├── component/
│   │   ├── AppComponentsKt             # AppCard, PrimaryButton, SectionTitle, StatusBadge, EmptyState, ErrorBox, LoadingBox
│   │   ├── DateTimeFieldsKt            # DatePickerField, TimePickerField
│   │   ├── MonthCalendarKt
│   │   └── NotificationPermissionRequest
│   ├── screen/
│   │   ├── LoginScreen
│   │   ├── HomeScreen
│   │   ├── CalendarListScreen, CalendarDetailScreen
│   │   ├── EventFormScreen, EventDetailScreen
│   │   ├── GroupListScreen, GroupDetailScreen
│   │   ├── ChatListScreen, ChatConversationScreen
│   │   ├── RequestsScreen
│   │   └── ProfileSettingsScreen
│   └── theme/
│       ├── ColorKt, ThemeKt, TypeKt
└── util/
    ├── ChatCodeGenerator
    ├── DateFilter, DateRange, DateUtils, MonthDay
    ├── FingerprintGenerator
    └── UiState                          # sealed class Success/Error/Loading
```

### Berechtigungen im Manifest
```
INTERNET
POST_NOTIFICATIONS
SCHEDULE_EXACT_ALARM
WAKE_LOCK
ACCESS_NETWORK_STATE
com.google.android.c2dm.permission.RECEIVE
```

### Firebase-Konfiguration
- Projekt: `kalender-rai` (Storage: `onyx-kalender.firebasestorage.app`)
- WICHTIG: Bestehende `google-services.json` **NICHT überschreiben**.

---

## 2. ZIEL: 18 Features in dieser exakten Reihenfolge

Implementiere die Features **strikt sequenziell**. Jeder Schritt baut auf vorherigen auf.

### REIHENFOLGE (Abhängigkeitsbasiert)

| # | Feature | Aufwand | Abhängigkeit |
|---|---|---|---|
| 1 | **Theme-System erweitern** (9 Themes) | S | — |
| 2 | **Kalender-Farben** | S | #1 |
| 3 | **Erweiterte Event-Felder** (Status/Priorität/Energy/Type/Location/VideoLink) | S | — |
| 4 | **Recurring Events (RRULE)** | M | #3 |
| 5 | **ICS Import / Export** | M | #4 |
| 6 | **Geteilte Kalender (Permissions read/write)** | M | — |
| 7 | **Audit-Log / Verlauf** | S | #6 |
| 8 | **Spruch des Tages (Dashboard)** | XS | — |
| 9 | **Wetter-Karte + Smart Badge** (Open-Meteo) | M | — |
| 10 | **Tagesagenda auf Home** | S | — |
| 11 | **Extras-Modul Foundation** (Tab, leere Hülle, sortierbar) | M | — |
| 12 | **Schnellnotizen (Extras)** | S | #11 |
| 13 | **Tagesziele (Extras)** | S | #11 |
| 14 | **Fokusmodus / Pomodoro (Extras)** | M | #11 |
| 15 | **Stempeluhr / Workclock (Extras + CSV-Export)** | L | #11 |
| 16 | **Smart Day Karte (Extras + Home-Variante)** | M | #10, #11 |
| 17 | **Wochenübersicht (Extras)** | M | #11, #15 |
| 18 | **Wetter-Planer (Extras)** | S | #9, #11 |
| 19 | **Einkaufslisten (Shopping)** | M | — |
| 20 | **Public Share Links** (Termine extern) | M | #3 |
| 21 | **Polls in Events** (yes/maybe/no) | M | #3 |
| 22 | **Booking-Link / Guest Booking Hub** | L | #20 |
| 23 | **Secret Chat mit PIN** | L | bestehender Chat |
| 24 | **Panic Mode (Secret Chat)** | S | #23 |
| 25 | **Voice-Nachrichten (Secret Chat)** | M | #23 |
| 26 | **Medien-Galerie (Secret Chat)** | M | #23 |

---

## 3. DETAIL-SPEZIFIKATIONEN je Feature

### FEATURE #1 — Theme-System erweitern

**Ziel:** 5 Dark- + 4 Light-Themes auswählbar in `ProfileSettingsScreen`.

**Themes:**
- Dark: `obsidian` (Standard, aktuelles Theme), `deepblack`, `midnight`, `gold`, `emerald`
- Light: `paper-light`, `sand-light`, `rose-light`, `sky-light`

**Umsetzung:**
1. In `ui/theme/ColorKt`: pro Theme einen `ColorScheme` definieren (Material 3).
2. In `ui/theme/ThemeKt`: `enum class AppTheme(val id: String, val isDark: Boolean)`.
3. Neue Datei `data/datastore/ThemePreferences.kt` (DataStore) mit `themeId: Flow<String>`.
4. `MainActivity` liest Theme aus DataStore und wendet `AppTheme` in `setContent { ... }` an.
5. In `ProfileSettingsScreen`: Grid mit Theme-Vorschau-Karten, Klick speichert in DataStore.
6. **Bonus:** Theme wird zusätzlich im Firestore-Profil (`appThemeDark`, `appThemeLight`) gespiegelt.

**Acceptance Criteria:**
- App-Neustart behält gewähltes Theme.
- Wechsel zwischen Dark/Light verändert Material-ColorScheme.
- Geteilte Felder synchen über Geräte.

---

### FEATURE #2 — Kalender-Farben

**Ziel:** Jeder `CalendarModel` hat ein `color: String` (Hex, z. B. `#7C3AED`).

**Umsetzung:**
1. `CalendarModel` erweitern: `val color: String = "#7C3AED"`.
2. `CalendarRepository.createCalendar` und `.updateCalendar` Color-Param aufnehmen.
3. In `CalendarListScreen`: Farbpunkt vor Kalendername.
4. In `MonthCalendar` + `EventDetailScreen`: Event nutzt Calendar-Color als Akzent.
5. Neuer `ColorPickerDialog` in `ui/component/` (Compose, 12 vordefinierte Farben + Custom-Hex-Input).

---

### FEATURE #3 — Erweiterte Event-Felder

**Ziel:** Events bekommen die Web-Felder.

**Umsetzung — `EventModel` erweitern:**
```kotlin
data class EventModel(
    // bestehende Felder ...
    val type: String = "Privat",          // "Arbeit" | "Privat" | "Projekt" | "Booking"
    val priority: String = "B",           // "A" | "B" | "C"
    val energyLevel: String = "medium",   // "high" | "medium" | "light"
    val location: String = "",
    val videoLink: String = "",
    val durationMinutes: Int = 60,
    val checklistPrep: List<String> = emptyList(),
    val checklistDo: List<String> = emptyList(),
    val checklistFollowup: List<String> = emptyList(),
    val pinned: Boolean = false,
    val reminderMinutes: Int? = null,     // null=keine, 0=bei Start, 5/15/30/60/1440
    val reminderSound: String = "system", // "system" | "silent"
)
```

**UI:**
- `EventFormScreen` erweitern: Dropdowns für Type/Priority/Energy, Textfelder für Location/VideoLink, Slider/Stepper für Dauer, Liste mit `+ Punkt`-Buttons für Checklisten.
- `EventDetailScreen` zeigt alle Felder, Checklisten mit Checkboxen (live update via Repository).
- `EventReminderScheduler` nutzt `reminderMinutes` statt fixer Werte.

---

### FEATURE #4 — Recurring Events (RRULE)

**Ziel:** Tägliche, wöchentliche, monatliche Wiederholungen.

**Umsetzung:**
1. Neues Modell:
   ```kotlin
   data class RecurrenceRule(
       val freq: Freq = Freq.NONE,        // NONE/DAILY/WEEKLY/MONTHLY
       val interval: Int = 1,
       val byWeekDay: List<Int> = emptyList(), // 1..7 (Mo=1)
       val until: Long? = null,            // epoch ms
       val count: Int? = null,
       val exceptions: List<String> = emptyList() // dates "yyyy-MM-dd" die ausgelassen werden
   )
   enum class Freq { NONE, DAILY, WEEKLY, MONTHLY }
   ```
2. `EventModel` bekommt `val recurrence: RecurrenceRule = RecurrenceRule()`.
3. Neue Util `util/RecurrenceExpander.kt` mit `fun expandOccurrences(event: EventModel, range: DateRange): List<EventOccurrence>`.
4. `CalendarRepository.getEventsForCalendars` ruft Expander auf, gibt aufgelöste Occurrences zurück.
5. UI in `EventFormScreen`: Dropdown „Wiederholt sich" + Interval-Input + Wochentag-Chips bei WEEKLY + Until-DatePicker.
6. **Wichtig:** Beim Bearbeiten einer Instanz Dialog: „Nur diese Instanz" / „Alle ab heute" / „Alle".

---

### FEATURE #5 — ICS Import / Export

**Ziel:** `.ics`-Dateien lesen/schreiben.

**Umsetzung:**
1. Library: `com.github.mangstadt:biweekly:0.6.8` (Gradle-Dep).
2. Neue Util `util/IcsService.kt`:
   - `fun exportEvents(events: List<EventModel>): String`
   - `fun importEvents(ics: String, targetCalendarId: String): List<EventModel>`
3. Export-Button im `CalendarDetailScreen` → SAF (`ActivityResultContracts.CreateDocument("text/calendar")`).
4. Import-Button → SAF (`OpenDocument(arrayOf("text/calendar"))`).
5. Import-Dialog mit Vorschau + Bestätigung vor Schreiben.

---

### FEATURE #6 — Geteilte Kalender (Permissions)

**Ziel:** `sharedWith: Map<String, String>` (uid → "read" | "write").

**Umsetzung:**
1. `CalendarModel` erweitern: `val sharedWith: Map<String, String> = emptyMap()`, `val busyOnly: Boolean = false`.
2. **Firestore Rules** aktualisieren (User darf lesen wenn owner oder uid in sharedWith).
3. `CalendarRepository.getPrivateCalendars` + neue `getSharedCalendars(uid)`.
4. UI „Teilen…"-Button in `CalendarDetailScreen` → Bottom-Sheet mit Friends-Liste, je Friend Toggle (read/write/keine).
5. `busyOnly`: Wenn aktiv, zeigt Receiver nur „Belegt" ohne Titel/Details.
6. Bestehende Calendar-Repository-Methoden auf neue Rechte-Logik anpassen (write erfordert ownerId == uid ODER sharedWith[uid] == "write").

---

### FEATURE #7 — Audit-Log / Verlauf

**Ziel:** Aktionen pro Kalender protokollieren.

**Umsetzung:**
1. Neues Modell `AuditEntry(uid, action, target, timestamp, meta)`.
2. Subcollection `calendars/{calId}/audit/{autoId}`.
3. Repository wrappt jede mutierende Methode mit Audit-Write.
4. Neuer Screen `CalendarAuditScreen` → Liste chronologisch absteigend, mit Filter (Aktion/User).
5. Eintrag im Settings-Menü „Audit & Verlauf".

---

### FEATURE #8 — Spruch des Tages

**Ziel:** Karte auf `HomeScreen` mit täglich wechselndem Spruch.

**Umsetzung:**
1. Asset `assets/quotes.json` aus dem Web-Repo (`quotes.json`) ins Android-Projekt kopieren.
2. `util/QuoteService.kt`: lädt Quotes, gibt mit `LocalDate.now().toEpochDay() % size` deterministisch den Spruch des Tages.
3. Compose-Card `DailyQuoteCard` in `ui/component/`.
4. Auf `HomeScreen` über Agenda einbinden.

---

### FEATURE #9 — Wetter-Karte + Smart Weather Badge

**Ziel:** Aktuelles Wetter + Hinweise wie „Regen ab 14:20".

**Umsetzung:**
1. **Permission**: `ACCESS_COARSE_LOCATION` (optional auf Stadt-Auswahl, Default Zürich).
2. API: **Open-Meteo** (kein Key nötig): `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current_weather=true&hourly=temperature_2m,precipitation,windspeed_10m,weathercode&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=auto`.
3. Retrofit + Moshi für API. Neuer `data/remote/WeatherApi.kt` + `WeatherRepository`.
4. `util/WeatherBadge.kt`: berechnet aus 4-Stunden-Vorschau Badge-Text:
   - „Regen ab HH:mm" (precipitation > 0.3 mm im Fenster)
   - „Windig bis HH:mm" (wind > 25 km/h)
   - „Trocken bis HH:mm" (sonst)
5. Compose-Card `WeatherCard` auf `HomeScreen`. Symbol per Weather-Code-Mapping.
6. Stadt-Wahl im Settings.

---

### FEATURE #10 — Tagesagenda auf Home

**Ziel:** Liste der heutigen Termine kompakt auf `HomeScreen`.

**Umsetzung:**
1. Neuer ViewModel-Slice in `HomeViewModel` (falls noch nicht existiert: anlegen).
2. Methode in `CalendarRepository.getEventsForToday(uid)`.
3. Compose-Card `TodayAgendaCard`: zeigt max. 5 Items, „Alle ansehen" → Calendar-Tab.
4. Empty-State: „Heute frei — genieß den Tag."

---

### FEATURE #11 — Extras-Modul Foundation

**Ziel:** Neuer Tab + Architektur für die kommenden 7 Karten.

**Umsetzung:**
1. `BottomTab` um `EXTRAS` ergänzen.
2. `Routes`: `route_extras`.
3. Neuer Screen `ExtrasScreen` in `ui/screen/extras/`.
4. Sealed class `ExtrasCard` mit Subtypen: `Workclock`, `Goals`, `SollIst`, `Notes`, `Weather`, `Focus`, `WeekOverview`, `SmartDay`.
5. **DataStore-Key** `extras_order` (`List<String>`).
6. **Compose LazyColumn** mit **Reorderable** (Library: `sh.calvin.reorderable:reorderable:2.x` oder eigene Drag-Logik).
7. Settings-Toggles pro Karte (an/aus) → Karte wird ein-/ausgeblendet.
8. **Karten sind zunächst leer (Platzhalter)** — Inhalt kommt in den nächsten Features.

---

### FEATURE #12 — Schnellnotizen

**Ziel:** Karte mit `TextField`, lokal speichern + Firestore-Mirror.

**Umsetzung:**
1. `data/repository/QuickNotesRepository`: liest/schreibt `profiles/{uid}.quickNotes: String`.
2. DataStore-Cache für offline.
3. Compose-Card `QuickNotesCard` mit Auto-Save-Debounce (500 ms).

---

### FEATURE #13 — Tagesziele

**Ziel:** Checkbox-Liste Ziele heute.

**Umsetzung:**
1. Modell `DailyGoal(id, text, done, date)`.
2. Storage: `profiles/{uid}/dailyGoals/{autoId}`.
3. Repository mit `observeForDate(date): Flow<List<DailyGoal>>`.
4. Compose-Card `DailyGoalsCard`: Liste + Inline-Add-Field + Checkbox toggelt `done`.

---

### FEATURE #14 — Fokusmodus (Pomodoro)

**Ziel:** Timer 25/50/90 Min + lokale Historie.

**Umsetzung:**
1. Modell `FocusSession(id, startedAt, durationMin, completed)`.
2. ForegroundService `FocusTimerService` (optional, sonst Notifications + WakeLock).
3. Notification mit Countdown (`setUsesChronometer`).
4. Storage lokal (Room oder DataStore-JSON).
5. UI-Karte mit großem Timer-Ring, Start/Pause/Stopp, Tageshistorie.

---

### FEATURE #15 — Stempeluhr (Workclock)

**Ziel:** Vollwertige Zeiterfassung.

**Funktionen:**
- Start / Pause / Weiter / Stopp
- Tätigkeits-Dropdown (User-definierbar, default ["Allgemein","Meetings","Fokus","Admin"])
- Belastung: `leicht` / `mittel` / `schwer`
- Ansichten: Heute / Woche / Monat
- Sessions bearbeiten / löschen
- Manuelle Zeitkorrektur (Dauer überschreiben)
- CSV-Export Woche/Monat

**Umsetzung:**
1. Modell `WorkSession(id, uid, activity, startedAt, pausedAt, stoppedAt, durationMs, stress)`.
2. Lokal: **Room-Datenbank** `app_db` mit `WorkSessionDao`.
3. Remote-Mirror in Firestore: `profiles/{uid}/workSessions/{id}`.
4. **ForegroundService** für laufende Session mit Persistent-Notification.
5. CSV-Export via `MediaStore.Downloads` (Spalten: Datum, Start, Stopp, Dauer, Tätigkeit, Belastung).
6. UI-Karte mit aktueller Session + Wochen-Statistik.
7. Detail-Screen `WorkclockDetailScreen` mit Tabs Heute/Woche/Monat + Session-Liste.

---

### FEATURE #16 — Smart Day Karte

**Ziel:** Übersicht „nächster Termin + Countdown + freie Slots + Wetter".

**Umsetzung:**
1. ViewModel kombiniert: nächster Event (`CalendarRepository`), Wetter-Badge (#9), berechnete freie Slots zwischen heutigen Events.
2. Compose-Card `SmartDayCard` mit großem Countdown (`HH:mm:ss`-Format via `Flow.tickerFlow(1s)`).
3. Section „Freie Zeit heute" Chips: `09:00–10:30`, `13:00–14:00` …
4. Settings-Toggles: „Auf Home" + „In Extras".

---

### FEATURE #17 — Wochenübersicht

**Ziel:** Karte mit aggregierten Wochenmetriken.

**Umsetzung:**
1. ViewModel berechnet: Anzahl Termine, Arbeitsstunden (aus #15), Belastungsverteilung (Tortenstrich), freie Stunden.
2. Compose mit horizontalen Bars (Belastung leicht/mittel/schwer).

---

### FEATURE #18 — Wetter-Planer

**Ziel:** Kleidungs-Tipp + Schirm + Trockenfenster für heute/morgen.

**Umsetzung:**
1. Aus 24h-Vorschau (#9) Regel-Engine `WeatherAdvisor.kt`:
   - Temp < 5°C → „Warme Jacke"
   - 5–15°C → „Übergangsjacke"
   - Niederschlag-Wahrscheinlichkeit > 60% in 4h → „Schirm mitnehmen"
   - Längstes regenfreies Fenster ermitteln → „Trocken von HH:mm bis HH:mm"
2. Compose-Karte mit Icons (Lucide-Compose oder Material Icons).

---

### FEATURE #19 — Einkaufslisten (Shopping)

**Ziel:** Eigener Bottom-Tab `SHOPPING` mit mehreren Listen.

**Umsetzung:**
1. Modelle:
   ```kotlin
   data class ShoppingList(val id: String, val title: String, val store: String, val createdAt: Long)
   data class ShoppingItem(val id: String, val name: String, val qty: Double, val price: Double, val bought: Boolean)
   ```
2. Storage: `profiles/{uid}/shoppingLists/{listId}` mit Subcollection `items/{itemId}` ODER `items` als Array (analog zum Web).
3. Repository mit `observeLists`, `addList`, `addItem`, `toggleBought`, `removeItem`.
4. UI: Master-Detail (Tablet) bzw. List + Detail-Screen (Phone).
5. Detail-Screen zeigt Items, gekaufte durchgestrichen, **Summe der gekauften Posten** unten.

---

### FEATURE #20 — Public Share Links

**Ziel:** Einzeltermin extern teilbar.

**Umsetzung:**
1. Subcollection `publicShares/{token}` (Top-Level) mit `{eventRef, ownerUid, passcodeHash, expiresAt}`.
2. Token: 12 Zeichen base32, Passcode optional 4-stellig (PIN).
3. Share-Sheet erzeugt Deep-Link `https://onyx-kalender.web.app/#/share/<token>?k=<key>` und teilt via `Intent.ACTION_SEND`.
4. **Firestore Rules**: `publicShares/{token}` von außen lesbar nur mit korrektem Token (über Cloud Function als Proxy, oder Rules mit `request.auth == null`-Sonderpfad).

---

### FEATURE #21 — Polls in Events

**Ziel:** Gruppentermine mit Yes/Maybe/No-Abstimmung.

**Umsetzung:**
1. `EventModel` bekommt `val poll: PollData? = null`.
2. `PollData(state: String, votes: Map<String, String>, version: Int = 2, voteMode: String = "matrix")`.
3. `EventRequestRepository` erweitern: `voteOnEvent(eventId, uid, vote)`.
4. UI im `EventDetailScreen` für Gruppen-Events: 3 Buttons (Ja/Vielleicht/Nein) + Counts + Avatar-Strip.

---

### FEATURE #22 — Booking-Link / Guest Booking Hub

**Ziel:** Öffentlicher Buchungskalender für Gäste.

**Umsetzung:**
1. Pro User ein `bookingProfile` in `profiles/{uid}.bookingProfile`:
   ```kotlin
   data class BookingProfile(
       val isActive: Boolean,
       val slug: String,                  // URL-Fragment
       val title: String,
       val description: String,
       val slotMinutes: Int,
       val workdayStart: String,         // "09:00"
       val workdayEnd: String,           // "18:00"
       val workdays: List<Int>,          // 1..7
       val bufferMinutes: Int,
       val maxAdvanceDays: Int
   )
   ```
2. Settings-Screen `BookingSettingsScreen`.
3. **Cloud Function** (separate Datei, kein Android-Code): `bookingCreate(slug, when, name, email)` schreibt Event in Owner-Kalender und sendet FCM.
4. Im Android-Screen: Liste eingegangener Buchungen + Slot-Generator.
5. Booking-Termine bekommen `type = "Booking"` und ggf. Color-Hint.

---

### FEATURE #23 — Secret Chat mit PIN

**Ziel:** PIN-geschützter Bereich, getrennt vom Standard-Chat.

**Umsetzung:**
1. **PIN-Setup-Screen** (4–6 Ziffern). PIN-Hash (BCrypt) in `profiles/{uid}.secretPinHash`.
2. **PIN-Unlock-Screen** vor `SecretChatScreen`.
3. Subcollection `profiles/{uid}/secretConversations/{convId}` + Messages.
4. **Keine OS-Notifications** für Secret-Chats (FCM-Filter).
5. **Bottom-Tab** `SECRET` (nur sichtbar wenn PIN gesetzt).
6. Re-Lock nach Konfigurations-Timeout (30s/2min/5min, in Settings wählbar).

---

### FEATURE #24 — Panic Mode

**Ziel:** Sofort-Verstecken bei App-Wechsel.

**Umsetzung:**
1. `MainActivity.onPause()` setzt `secretUnlocked = false` (wenn Auto-Panic aktiv).
2. Setting „Auto-Panic on background" (Toggle).
3. Discrete: `FLAG_SECURE` auf Secret-Screens (verhindert Screenshots + Recents-Thumbnail).
4. Panic-Button-Icon (Bomb) in Toolbar des Secret-Bereichs.

---

### FEATURE #25 — Voice-Nachrichten

**Ziel:** Aufnahme + Wiedergabe von Sprachnachrichten im (Secret-)Chat.

**Umsetzung:**
1. Permission `RECORD_AUDIO`.
2. `MediaRecorder` mit:
   - `OutputFormat.WEBM`/`MPEG_4`
   - `AudioEncoder.OPUS` (API 29+, sonst AAC)
   - 1 Channel, 44.1 kHz
   - Aktiviere Noise-/Echo-Suppression über `AudioEffect.AudioManager`.
3. Upload via **Firebase Storage** `chat_voice/{convId}/{msgId}.webm`.
4. ChatMessage-Typ erweitern: `VOICE` + `voiceUrl`, `durationMs`.
5. Compose-Bubble: Play/Pause + Waveform-Vorschau (z. B. `compose-audiowave`).

---

### FEATURE #26 — Medien-Galerie

**Ziel:** Alle Bilder/Voice pro Chat in Galerie-Ansicht.

**Umsetzung:**
1. Neuer Screen `ChatMediaScreen` mit Tabs Bilder / Sprache.
2. Grid 3 Spalten für Thumbnails.
3. Fullscreen-Viewer mit Pinch-Zoom (`androidx.compose.foundation.gestures.transformable`).
4. Aufruf aus Chat-Toolbar (Icon: Image/Grid).

---

## 4. WORKFLOW PRO FEATURE

Für **jedes** Feature in der Reihenfolge:

```
1. Branch: feat/onyx-<feature-id>-<kurzname>
2. Erkläre kurz dein Vorgehen (max. 5 Bulletpoints).
3. Implementiere:
   - Modelle (data/model)
   - Repository (data/repository)
   - ViewModel (viewmodel/)
   - Screen / Component (ui/screen | ui/component)
   - Strings (res/values/strings.xml + values-de/)
   - Falls neue Permissions / Manifest-Einträge → AndroidManifest.xml
4. Schreibe Unit-Tests (mind. 1 für Repo, 1 für ViewModel).
5. Schreibe Compose-Test für Hauptscreen.
6. Lass das Projekt bauen (./gradlew assembleDebug + testDebugUnitTest).
7. Wenn grün → Commit + kurzes Changelog-Statement.
8. WARTE auf Bestätigung „weiter mit nächstem Feature".
```

---

## 5. ALLGEMEINE DESIGN-REGELN

### UI
- **Spacing**: 8 / 12 / 16 / 24 dp.
- **Karten**: Rounded 16 dp, leichte 1 dp Border in `MaterialTheme.colorScheme.outlineVariant`.
- **Typography**: Material 3 Defaults (`titleLarge`, `bodyMedium`, `labelSmall`).
- **Icons**: Material Symbols Outlined.
- **Animationen**: dezent (`tween(200)`), keine Bouncer.
- **Dark First**: Standardtheme bleibt `obsidian` (sehr dunkles Anthrazit).

### State-Management
- ViewModels nutzen `StateFlow<UiState<T>>` (siehe `util/UiState`).
- Side-Effects (Toasts, Navigation) via `Channel<UiEvent>` → `Flow`.

### Firestore
- **Lazy loads** mit `limit(50)` + Pagination.
- **Listen** mit `snapshotListener` als `callbackFlow`.
- **Schreibvorgänge** über `Result<T>`-Rückgabe.
- **Niemals** synchrone Calls auf Main-Thread.

### Error-Handling
- Repos fangen Exceptions ab und mappen zu `Result.failure(throwable)`.
- ViewModel zeigt menschenlesbare Meldung (deutsch).
- Niemals reine Stacktraces im UI.

### Sicherheit
- Sensitive Felder (PIN-Hash, Secret-Inhalte) **nie** in Logcat.
- DataStore-Inhalte für Secret-Bereich: `EncryptedSharedPreferences` oder Tink-Aead.

---

## 6. AKZEPTANZ-CHECKLISTE (pro Feature)

Vor dem Commit:
- [ ] Feature funktioniert auf Android 8 (API 26) bis Android 14 (API 34).
- [ ] Hochformat + Querformat ohne Layout-Brüche.
- [ ] Light- und Dark-Theme getestet.
- [ ] Deutsch-Strings vollständig (keine Englisch-Reste in UI).
- [ ] Offline-Fall (kein Netz) liefert klare Fehlermeldung.
- [ ] Login-Status-Check (nicht eingeloggt → Login-Redirect).
- [ ] Keine Crashes in `adb logcat` während 5 min Nutzung.
- [ ] Tests `./gradlew testDebugUnitTest` grün.
- [ ] `./gradlew assembleDebug` baut ohne Warnings (oder erklärte Warnings).
- [ ] Bestehende Features (Login/Gruppen/Friends/Chat/Reminders) funktionieren weiter.

---

## 7. KOMMUNIKATION

Bei jeder Antwort:
1. **Status**: „Beginne Feature #N — <Name>" / „Feature #N fertig, committed als <sha>".
2. **Plan** (vor Implementierung): Bulletpoints, max. 5.
3. **Diff-Summary** (nach Implementierung): Liste neuer/geänderter Dateien, kurze Beschreibung der Logik.
4. **Open Questions**: Falls eine Spezifikation unklar ist → fragen, **nicht raten**.

**Niemals** mehrere Features in einem Schritt zusammenführen, auch wenn klein.

---

## 8. NICHT-ZIEL (NIE TUN)

- Bestehende Web-App ändern.
- `google-services.json` verändern oder Firebase-Projekt wechseln.
- Native Codebase auf Capacitor/React umstellen.
- Eigene Backend-Server-Endpoints einführen ohne Rückfrage.
- AndroidX-Libraries downgraden.
- Crashes durch Ungültig-Casting verstecken (`as?` mit lautlosem Fallback).
- Material 2 Komponenten nutzen (Projekt ist M3).
- Auf Hauptthread blockieren (`runBlocking` in Repos).

---

## 9. START

Sobald du diesen Prompt verstanden hast:
1. Antworte mit **„Verstanden — beginne mit Feature #1 (Theme-System)"**.
2. Lies das bestehende Android-Studio-Projekt ein (vor allem `ui/theme/ColorKt`, `ui/theme/ThemeKt`).
3. Stelle Rückfragen, falls bestehende Code-Struktur abweicht.
4. Implementiere Feature #1 vollständig.
5. **STOP** — warte auf „weiter".

---

## ANHANG A — Firestore-Pfade-Übersicht (Soll-Zustand nach allen Features)

```
profiles/{uid}
  ├ alias, fingerprint, chatCode
  ├ presenceStatus, presenceLastSeen
  ├ fcmToken, fcmTokenWeb
  ├ appThemeDark, appThemeLight
  ├ extrasOrder (List<String>)
  ├ quickNotes (String)
  ├ secretPinHash, secretLockTimeoutSec
  ├ bookingProfile (Object)
  └ subcollections:
       ├ dailyGoals/{id}
       ├ workSessions/{id}
       ├ shoppingLists/{id}
       │    └ items[]
       └ secretConversations/{convId}
            └ messages/{msgId}

calendars/{calId}
  ├ ownerId, name, color, busyOnly
  ├ sharedWith: { uid: "read"|"write" }
  └ subcollections:
       ├ events/{eventId}
       │    └ poll, checklists, recurrence …
       └ audit/{entryId}

publicShares/{token}
  └ { eventRef, ownerUid, passcodeHash, expiresAt }

groups/{groupId}                 # bestehend
conversations/{convId}           # bestehend (Standard-Chat)
friendships/{fsId}               # bestehend
notifications/{noteId}           # bestehend
eventRequests/{reqId}            # bestehend
groupInvitations/{invId}         # bestehend
```

---

## ANHANG B — Gradle-Dependencies (zu ergänzen)

```kotlin
// app/build.gradle.kts
dependencies {
    // bestehende ...

    // NEU für Features #4 (Recurrence)
    implementation("org.dmfs:lib-recur:0.16.1")

    // NEU für Feature #5 (ICS)
    implementation("com.github.mangstadt:biweekly:0.6.8")

    // NEU für Feature #9 (Weather)
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")

    // NEU für Feature #11 (Drag-Reorder)
    implementation("sh.calvin.reorderable:reorderable:2.4.0")

    // NEU für Feature #15 (Workclock - Room)
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // NEU für Feature #23 (PIN-Hash)
    implementation("at.favre.lib:bcrypt:0.10.2")

    // NEU für Feature #24 (Secret-Encryption)
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // NEU für Feature #25 (Voice / Audio-Waveform)
    implementation("com.linc:amplituda:2.2.2")

    // DataStore (Theme + Extras Order)
    implementation("androidx.datastore:datastore-preferences:1.1.1")
}
```

---

## ANHANG C — Glossar

| Begriff | Bedeutung |
|---|---|
| **Onyx** | Web-App-Name (React/Vite) |
| **APK** | Native Android-App `com.rai.onyx` / `com.example.gruppenkalender` |
| **APP_ID** | Firebase-App-ID (`onyx-pwa-live` im Web) |
| **DEFAULT_EXTRAS_ORDER** | `['workclock', 'goals', 'sollist', 'notes', 'weather']` |
| **POLL_STATE** | `yes` / `maybe` / `no` |
| **Magic-Key** | Optionaler Passcode bei Public Share Links |
| **Secret-Bereich** | PIN-geschützter Chat-Bereich |
| **Stempeluhr / Workclock** | Zeiterfassungs-Modul |
| **Smart Day** | Tagesübersicht mit Countdown |

---

*Ende des Prompts. Übergib diesen Text 1:1 an die Implementierungs-KI zusammen mit Zugriff auf das Android-Studio-Projekt.*
