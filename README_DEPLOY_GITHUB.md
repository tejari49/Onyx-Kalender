# GitHub-Deploy fuer dieses Projekt

Dieses Repository ist fuer zwei automatische Deployments vorbereitet:

## 1) Frontend nach GitHub Pages
Datei: `.github/workflows/Page.yml`

- baut die Vite-App bei Push auf `main`
- deployed den Inhalt von `dist/` nach GitHub Pages
- laeuft nicht bei reinen Backend-Aenderungen

## 2) Firebase Backend
Datei: `.github/workflows/firebase-backend-deploy.yml`

- deployed **Cloud Functions** und **Firestore Rules**
- verwendet die Default-Project-ID aus `.firebaserc`
- fuer dieses Projekt ist die Project-ID bereits gesetzt auf:
  - `kalender-rai`

## Einziger noetiger GitHub-Secret
Lege im GitHub-Repository unter **Settings > Secrets and variables > Actions** diesen Secret an:

- `FIREBASE_SERVICE_ACCOUNT`

Inhalt des Secrets:
- der **komplette JSON-Inhalt** deines Firebase Service Accounts
- nicht die E-Mail-Adresse alleine

## Empfohlene GitHub-Einstellungen
- Standard-Branch: `main`
- unter **Pages** als Source: **GitHub Actions**

## Wichtige Hinweise
- Die Service-Account-JSON darf **nie** ins Repository committed werden.
- `.gitignore` blockiert typische Firebase-Admin-SDK-Dateien bereits.
- Das Backend-Deployment nutzt bewusst **kein** Root-`npm ci`, weil fuer Functions und Rules nur der Functions-Ordner benoetigt wird.
- Die Project-ID ist bereits fest ueber `.firebaserc` eingebunden. Ein zusaetzlicher `FIREBASE_PROJECT_ID`-Secret ist nicht noetig.
