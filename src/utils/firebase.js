import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const customFirebaseConfig = {
      apiKey: "AIzaSyDkdRI4tNh5fe-dyBBGDlGgIiT7vHmoFvg",
      authDomain: "kalender-rai.firebaseapp.com",
      projectId: "kalender-rai",
      storageBucket: "kalender-rai.firebasestorage.app",
      messagingSenderId: "407396898664",
      appId: "1:407396898664:web:3fafd51433481e7bb668dd"
    };

    export const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : customFirebaseConfig;
    export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'onyx-pwa-live';
    export const BASE_PATH = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/Onyx-Kalender/';
export const FCM_WEB_VAPID_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_WEB_PUSH_CERTIFICATE_KEY)
  ? String(import.meta.env.VITE_FIREBASE_WEB_PUSH_CERTIFICATE_KEY)
  : 'BLif9DBsVeYOPqRfhhBZsftnDbJvWfbfVrkjf14s7HsygsnYh4yfIKOr30oM58jIakPKBDu0arXj5oEZWhWG-E0';
export const FCM_WEB_VAPID_KEY_LEGACY = 'BKwrZYTIUNm4rIcYhwED39WT0elWB8774ObVEKrJWhRlglke_ti9Vx3PTGcHjQZJ34HJw0xRK18oO14jZBI2rJI';

    export const app = initializeApp(firebaseConfig);
    export const auth = getAuth(app);
    export const db = getFirestore(app);