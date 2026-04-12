# Android Studio Export (Capacitor)

> Hinweis: In diesem Repository wird **kein** `android/`-Ordner eingecheckt,
> weil die PR-Umgebung binäre Dateien ablehnt.
> Das Android-Projekt wird lokal erzeugt.

## 1) Android-Projekt lokal erzeugen

```bash
npm install
npm run build
npx cap add android
npx cap sync android
```

Oder alles in einem Schritt inkl. ZIP:

```bash
npm run android:zip
```

## 2) In Android Studio öffnen

- Android Studio starten
- **Open** auswählen
- Den lokal erzeugten Ordner `android/` öffnen

## 3) APK bauen

In Android Studio:

- **Build > Build Bundle(s) / APK(s) > Build APK(s)**

oder über Terminal:

```bash
cd android
./gradlew assembleDebug
```

Die Debug-APK liegt anschließend unter:

`android/app/build/outputs/apk/debug/app-debug.apk`

## 4) ZIP für GitHub erstellen

Vom Repository-Root:

```bash
npm run android:zip
```

Die ZIP (`onyx-kalender-android-studio.zip`) wird lokal erzeugt und kann danach als Release-Asset hochgeladen werden.

## Wichtig: PWA bleibt erhalten

Ja, die bestehende Onyx-PWA bleibt vollständig erhalten.

- Das Web-Projekt (`src/`, `public/`, `vite`, `manifest.json`) bleibt weiterhin die Hauptbasis.
- Capacitor nutzt den Build-Output aus `dist/` und ergänzt lokal den nativen Android-Wrapper in `android/`.
- Du kannst parallel als PWA **und** als Android-App weiterentwickeln.
