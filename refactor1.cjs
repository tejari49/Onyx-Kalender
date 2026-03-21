const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const appFile = path.join(cwd, 'src', 'App.jsx');
let appCode = fs.readFileSync(appFile, 'utf8');

const fbStartStr = `const customFirebaseConfig = {`;
const fbEndStr = `    const db = getFirestore(app);`;

const fbStart = appCode.indexOf(fbStartStr);
const fbEnd = appCode.indexOf(fbEndStr) + fbEndStr.length;

if (fbStart !== -1 && fbEnd !== -1) {
    let fbCodeRaw = appCode.slice(fbStart, fbEnd);
    
    let fbCodeNew = `import { initializeApp } from "firebase/app";\n`;
    fbCodeNew += `import { getAuth } from "firebase/auth";\n`;
    fbCodeNew += `import { getFirestore } from "firebase/firestore";\n\n`;
    
    fbCodeNew += fbCodeRaw
        .replace(/const customFirebaseConfig/g, 'const customFirebaseConfig')
        .replace(/const firebaseConfig/g, 'export const firebaseConfig')
        .replace(/const APP_ID =/g, 'export const APP_ID =')
        .replace(/const BASE_PATH =/g, 'export const BASE_PATH =')
        .replace(/const FCM_WEB_VAPID_KEY =/g, 'export const FCM_WEB_VAPID_KEY =')
        .replace(/const FCM_WEB_VAPID_KEY_LEGACY =/g, 'export const FCM_WEB_VAPID_KEY_LEGACY =')
        .replace(/const app =/g, 'export const app =')
        .replace(/const auth =/g, 'export const auth =')
        .replace(/const db =/g, 'export const db =');
    
    const utilsDir = path.join(cwd, 'src', 'utils');
    if (!fs.existsSync(utilsDir)) fs.mkdirSync(utilsDir);
    fs.writeFileSync(path.join(utilsDir, 'firebase.js'), fbCodeNew);

    appCode = appCode.slice(0, fbStart) + 
      `import { app, auth, db, APP_ID, BASE_PATH, FCM_WEB_VAPID_KEY, FCM_WEB_VAPID_KEY_LEGACY } from './utils/firebase.js';\n` + 
      appCode.slice(fbEnd);
      
    appCode = appCode.replace(/export \{ app, auth, db, APP_ID, BASE_PATH \};\n/g, '');

    fs.writeFileSync(appFile, appCode);
    console.log("SUCCESS");
} else {
    console.error("FAIL: Could not find block");
    process.exit(1);
}
