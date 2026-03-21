@echo off
git checkout --ours src/App.jsx
git checkout --ours src/main.jsx
git checkout --ours src/utils/firebase.js
git checkout --ours firestore.rules
git checkout --ours public/firebase-messaging-sw.js
git add -A
git commit -m "feat: Premium Themes, Glassmorphism, Booking, Refactoring"
git push origin main
echo DONE
