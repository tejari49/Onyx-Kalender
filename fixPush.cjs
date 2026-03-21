const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8').replace(/\r\n/g, '\n');

// Fix 1: The fast-return blocking everything
const bugStr = `if (!isStandaloneNow()) return;`;
const fixStr = `if (!isStandaloneNow() && !forcePrompt) { console.log('[Push] Not standalone, skipping auto-prompt'); return; }`;

if (appCode.indexOf(bugStr) !== -1) {
    appCode = appCode.replace(bugStr, fixStr);
    console.log("FIXED_STANDALONE_BUG");
} else {
    console.log("STANDALONE_BUG_NOT_FOUND");
}

// Fix 2: The UI button also has a strict check!
// "if (!isStandaloneNow()) { showToast... return; }"
const uiBugStr = `if (!isStandaloneNow()) {
      showToast(isIosUA ? 'iPhone/iPad: Teilen → „Zum Home-Bildschirm“ installieren, dann Benachrichtigungen aktivieren.' : 'Bitte als PWA installieren, dann Benachrichtigungen aktivieren.');
      return;
    }`;

if (appCode.indexOf('if (!isStandaloneNow()) {\n      showToast') !== -1) {
    // Just remove the UI block completely, or replace with a warning instead of a hard return.
    appCode = appCode.replace(/if \(!isStandaloneNow\(\)\) \{[\s\S]*?return;\s*\}/, `if (!isStandaloneNow() && isIosUA) {
      showToast('iPhone/iPad benötigt ggf. PWA-Installation für Push.');
      // Continue anyway for macOS Safari 16+ which supports web push without PWA
    }`);
    console.log("FIXED_UI_BUTTON_BUG");
} else {
    // try looser matching
    const uiBugIdx = appCode.indexOf('Bitte als PWA installieren');
    if (uiBugIdx !== -1) {
        let blockStart = appCode.lastIndexOf('if (!isStandaloneNow()) {', uiBugIdx);
        let blockEnd = appCode.indexOf('return;', uiBugIdx) + 7;
        let block = appCode.slice(blockStart, blockEnd + 1);
        if (block.includes('return;')) {
           appCode = appCode.replace(block, `if (!isStandaloneNow() && isIosUA) { showToast('iPhone/iPad benötigt ggf. PWA-Installation für Push.'); }`);
           console.log("FIXED_UI_BUTTON_BUG_LOOSE");
        }
    } else {
        console.log("UI_BUTTON_BUG_NOT_FOUND");
    }
}

// Check imports
if (appCode.indexOf('getMessaging') === -1) {
    const importFirebase = `import { getMessaging, getToken } from 'firebase/messaging';`;
    const target = `import { db, auth, APP_ID } from './utils/firebase.js';`;
    if (appCode.indexOf(target) !== -1) {
        appCode = appCode.replace(target, target + '\n' + importFirebase);
        console.log("ADDED_MESSAGING_IMPORTS");
    }
}

fs.writeFileSync(appFile, appCode);
