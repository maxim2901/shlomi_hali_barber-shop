// ========== FIREBASE CONFIG ==========
// יש להחליף את הערכים למטה בקונפיגורציה האמיתית מ-Firebase Console:
// Project settings → General → Your apps → Web app → Config
//
// 1. צור פרויקט ב-https://console.firebase.google.com
// 2. הפעל Firestore (Production mode)
// 3. הפעל Authentication → Sign-in method → Email/Password
//    צור משתמש יחיד עבור הספר (Authentication → Users → Add user)
// 4. הוסף Web app ועתק את אובייקט firebaseConfig לכאן

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA8A27hvmfFa9FVKa_GS9REumYhtPCo5TM",
    authDomain: "shlomi-hali-barber.firebaseapp.com",
    projectId: "shlomi-hali-barber",
    storageBucket: "shlomi-hali-barber.firebasestorage.app",
    messagingSenderId: "277868526185",
    appId: "1:277868526185:web:8463d9c7fdc152e15b00f8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const FIREBASE_READY = firebaseConfig.apiKey !== "REPLACE_ME";

// חשיפה ל-window כדי ש-JS/index.js (סקריפט קלאסי, לא module) יוכל לבדוק זמינות.
window.__FIREBASE_READY = FIREBASE_READY;

// ========== TELEGRAM ==========
// צור בוט דרך @BotFather בטלגרם וקבל את הטוקן.
// שלח הודעה לבוט → פתח https://api.telegram.org/bot{TOKEN}/getUpdates → העתק chat.id
export const TELEGRAM_BOT_TOKEN = 'REPLACE_WITH_BOT_TOKEN';
export const TELEGRAM_CHAT_ID   = 'REPLACE_WITH_CHAT_ID';
