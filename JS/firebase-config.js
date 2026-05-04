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
    apiKey: "REPLACE_ME",
    authDomain: "REPLACE_ME.firebaseapp.com",
    projectId: "REPLACE_ME",
    storageBucket: "REPLACE_ME.appspot.com",
    messagingSenderId: "REPLACE_ME",
    appId: "REPLACE_ME"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const FIREBASE_READY = firebaseConfig.apiKey !== "REPLACE_ME";

// חשיפה ל-window כדי ש-JS/index.js (סקריפט קלאסי, לא module) יוכל לבדוק זמינות.
window.__FIREBASE_READY = FIREBASE_READY;
