const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8');

let changed = false;

// Provide getMessagingSafe globally if not present
if (appCode.indexOf('const getMessagingSafe') === -1 && appCode.indexOf('function getMessagingSafe') === -1) {
    const safeFunc = `
const getMessagingSafe = async () => {
    try {
        const { getMessaging, isSupported } = await import('firebase/messaging');
        const supported = await isSupported();
        if (supported) {
            const fb = await import('./utils/firebase.js');
            return getMessaging(fb.app);
        }
        console.warn('FCM is not supported on this browser.');
        return null;
    } catch (e) {
        console.warn('Error with messaging:', e);
        return null;
    }
};
const FCM_WEB_VAPID_KEY = 'BLif9DBsVeYOPqRfhhBZsftnDbJvWfbfVrkjf14s7HsygsnYh4yfIKOr30oM58jIakPKBDu0arXj5oEZWhWG-E0';
const FCM_WEB_VAPID_KEY_LEGACY = 'BKwrZYTIUNm4rIcYhwED39WT0elWB8774ObVEKrJWhRlglke_ti9Vx3PTGcHjQZJ34HJw0xRK18oO14jZBI2rJI';
`;
    // Insert after the main React imports
    const insertPoint = appCode.indexOf('const AmoledCalendarApp = () => {');
    if (insertPoint !== -1) {
        appCode = appCode.slice(0, insertPoint) + safeFunc + '\\n' + appCode.slice(insertPoint);
        changed = true;
    }
}

// Add getToken to imports
if (appCode.indexOf('firebase/messaging') === -1) {
    const importStr = `import { getToken } from 'firebase/messaging';\n`;
    appCode = importStr + appCode;
    changed = true;
}

if (changed) {
    fs.writeFileSync(appFile, appCode);
    console.log("FIXED_IMPORTS_SUCCESS");
} else {
    console.log("ALREADY_OK");
}
