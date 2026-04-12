#!/usr/bin/env bash
set -euo pipefail

ZIP_NAME="${1:-onyx-kalender-android-studio.zip}"

npm run build

if [ ! -d android ]; then
  npx cap add android
else
  npx cap sync android
fi

zip -r "$ZIP_NAME" \
  android \
  capacitor.config.json \
  package.json \
  package-lock.json \
  src \
  public \
  index.html \
  vite.config.js

echo "ZIP erstellt: $ZIP_NAME"
