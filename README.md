# Onyx Kalender — Vite Build 🗓️⚡

Dieses Repo ist die **Production‑fähige Vite Version** deiner Onyx PWA:
- ✅ kein Tailwind CDN (Tailwind lokal via PostCSS)
- ✅ kein In‑Browser Babel (Build via Vite/React)
- ✅ GitHub Pages Deployment via Actions (`.github/workflows/pages.yml`)
- ✅ PWA Assets + `firebase-messaging-sw.js` liegen in `/public`

## Voraussetzungen
- Node.js **>= 18** (empfohlen 20)

## Lokal starten
```bash
npm ci
npm run dev
```

## Production Build
```bash
npm run build
npm run preview
```

Output liegt in `dist/`.

## GitHub Pages
1) Repo → Settings → Pages
2) Source: **GitHub Actions**
3) Push auf `main` → Workflow baut + deployed automatisch.

## Firebase / APP_ID
Die Firebase Config + APP_ID sind weiterhin **im Code** (wie vorher).
Wenn du auf ENV umstellen willst (VITE_FIREBASE_*), sag kurz – ich mache dir das clean. ✅
