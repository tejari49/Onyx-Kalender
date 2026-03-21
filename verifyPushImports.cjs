const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8');

let changed = false;

// 1. Check if firebase imports have FCM_WEB_VAPID_KEY
if (appCode.indexOf('FCM_WEB_VAPID_KEY') !== -1 && !appCode.match(/import\s*\{[^}]*FCM_WEB_VAPID_KEY[^}]*\}\s*from\s*['"]\.\/utils\/firebase(\.js)?['"]/)) {
    console.log("Adding FCM_WEB_VAPID_KEY to firebase imports");
    appCode = appCode.replace(/import\s*\{([^}]*db[^}]*)\}\s*from\s*['"]\.\/utils\/firebase(\.js)?['"];/, (match, group1) => {
        return \`import { \${group1.trim()}, FCM_WEB_VAPID_KEY, FCM_WEB_VAPID_KEY_LEGACY } from './utils/firebase.js';\`;
    });
    changed = true;
}

// 2. Add firebase/messaging imports if missing
if (appCode.indexOf('getMessaging(') !== -1 || appCode.indexOf('getToken(') !== -1 || appCode.indexOf('getMessagingSafe') !== -1) {
    if (!appCode.includes('firebase/messaging')) {
        console.log("Adding firebase/messaging imports");
        appCode = \`import { getMessaging, getToken } from 'firebase/messaging';\n\` + appCode;
        changed = true;
    }
}

// 3. Make sure getMessagingSafe is defined if it's missing!
if (appCode.indexOf('getMessagingSafe') !== -1 && appCode.indexOf('const getMessagingSafe') === -1 && appCode.indexOf('function getMessagingSafe') === -1) {
    console.log("Injecting missing getMessagingSafe function");
    const funcDef = \`
const getMessagingSafe = async () => {
    try {
        const { getMessaging, isSupported } = await import('firebase/messaging');
        const supported = await isSupported();
        if (supported) {
            const { app } = await import('./utils/firebase.js');
            return getMessaging(app);
        }
        console.warn('FCM is not supported on this browser (e.g. Brave/iOS without PWA).');
        return null;
    } catch (e) {
        console.warn('Error importing/initializing messaging:', e);
        return null;
    }
};
\`;
    const target = 'const AmoledCalendarApp = () => {';
    if (appCode.indexOf(target) !== -1) {
        appCode = appCode.replace(target, funcDef + '\\n' + target);
        changed = true;
    }
}

if (changed) {
    fs.writeFileSync(appFile, appCode);
    console.log("FIXED_IMPORTS");
} else {
    console.log("IMPORTS_OK");
}
