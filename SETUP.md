# הוראות הגדרה - שלומי חלי

## סקירה

האתר כולל כעת:
- דף ראשי ([index.html](index.html))
- דשבורד ניהול ב-[admin.html](admin.html) - מוגן בהתחברות
- שמירת תורים ב-Firestore
- הפקת חשבוניות PDF

---

## 1. הקמת פרויקט Firebase (חד-פעמי)

1. פותחים את https://console.firebase.google.com ויוצרים פרויקט חדש (לדוגמה: `shlomi-hali-barbershop`).
2. במסך הפרויקט: **Build → Firestore Database → Create database** במצב **Production**, אזור `eur3` או `us-central`.
3. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
4. **Authentication → Users → Add user** - יוצרים משתמש יחיד (אימייל וסיסמה) בשבילך כספר. רק עם המשתמש הזה תוכל להתחבר ל-`/admin.html`.
5. **Project settings (⚙️) → General → Your apps → Add app → Web (</>)** - נותנים שם לאפליקציה. Firebase יציג אובייקט `firebaseConfig`.
6. מעתיקים את התוכן של `firebaseConfig` ומדביקים ב-[JS/firebase-config.js](JS/firebase-config.js) במקום שורות `REPLACE_ME`.

## 2. העלאת חוקי האבטחה

הקובץ [firestore.rules](firestore.rules) מוכן. כדי להעלות אותו:

**אופציה א' (מהקונסולה - הכי פשוט):**
- Firestore → Rules → להעתיק את התוכן של `firestore.rules` ולשמור (Publish).

**אופציה ב' (CLI):**
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # לבחור את הפרויקט הקיים
firebase deploy --only firestore:rules
```

---

## 3. הרצה מקומית

⚠️ **חשוב**: Firebase ES Modules **לא** עובדים מ-`file://` - חייבים לשרת את התיקייה דרך HTTP.

```bash
# אופציה 1 - npx (אם מותקן Node.js)
npx serve .

# אופציה 2 - Python
python -m http.server 8000

# אופציה 3 - VS Code: Live Server extension
```

נכנסים ל-`http://localhost:3000` (או הפורט המודפס) ולא לקובץ ישירות.

---

## 4. בדיקות

1. **טופס הזמנה**: למלא טופס באתר → ב-Firebase Console → Firestore → קולקציית `bookings` נוצרה ובה התור.
2. **התראה**: וואצאפ נפתח עם הודעה מוכנה (ללא שינוי מהשיטה הקיימת).
3. **התחברות לניהול**: `/admin.html` → התחברות עם המשתמש שיצרת בסעיף 1.4.
4. **עריכה**: לחיצה על שורה בטבלה → פתיחת drawer → עדכון סטטוס תשלום ושמירה.
5. **חשבונית**: drawer → "הפק חשבונית" → קובץ PDF יורד לדפדפן עם עברית תקינה.

---

## 5. פריסה לפרודקשן (אופציונלי)

הדרך הפשוטה ביותר היא Firebase Hosting:

```bash
firebase init hosting
# Public directory: . (נקודה - השורש)
# Single-page app: No
# GitHub auto-deploy: לבחירתך

firebase deploy --only hosting
```

תקבל URL כמו `https://shlomi-hali-barbershop.web.app`.

---

## הערות חשובות

### חוק החשבוניות (ישראל, 2024)
המסמך שמופק כיום הוא **קבלה לתיעוד פנימי בלבד**, לא חשבונית מס חוקית.
מעבר ל-API מאושר (Greeninvoice / iCount / EZCount) ידרוש:
- פתיחת חשבון בשירות
- קבלת מפתח API
- החלפת `generateInvoice()` ב-[JS/admin.js](JS/admin.js) בקריאת API
- **חובה לעבור Cloud Function** - אסור לשמור מפתח API בצד הלקוח

### העברה ל-WhatsApp Cloud API (אם בעתיד)
1. פתיחת Meta Business Account
2. יצירת WhatsApp Business App
3. אימות מספר טלפון
4. אישור Message Templates
5. כתיבת Cloud Function ב-`functions/index.js` שתישלח אוטומטית ב-`onCreate` של `bookings`

עלות: חינמי עד ~1000 שיחות/חודש. עיכוב יישום: ~2 ימים מתחילת התהליך.

### עלויות Firebase (מצב נוכחי)
תוכנית Spark (חינמית) בשפע: 50K reads/day, 20K writes/day, 1GiB storage.
מתאים לכל המספרות עד אלפי תורים/חודש.
