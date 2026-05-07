# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Hebrew/RTL static marketing site for a barber shop ("שלומי חלי"), with a Firebase-backed booking persistence layer and an admin dashboard. No build step, no package manager, no tests.

## Run / Develop

```bash
npx serve .            # any static server works; site must be served over http(s)
```

Then visit `http://localhost:3000/` (public site) or `/admin.html` (admin dashboard).

**Do not open `index.html` via `file://`** — see "Critical constraint" below.

`SETUP.md` covers Firebase project creation, Firestore rules deployment, and `firebase deploy` for hosting.

## Critical constraint: ES modules + `file://`

The public booking page must remain usable when opened directly from disk (the owner does this regularly). Browsers block ES module imports from `file://` due to CORS. This shaped the architecture:

- **`JS/index.js` is a classic script** (no `type="module"`, no imports). It must stay that way — making it a module breaks every UI feature when served from `file://` (the modal, hamburger, carousel, and the `.reveal` opacity-0 animation classes all silently fail).
- **Firebase persistence lives in an inline `<script type="module">` block at the bottom of `index.html`**, wrapped in `try/catch`. From `file://` the dynamic `import()` throws and is swallowed; from `http(s)://` it loads and wires up Firestore.
- **Decoupling via custom event**: `JS/index.js` dispatches `window.dispatchEvent(new CustomEvent('booking:submit', { detail: {...} }))`. The module block listens for that event and writes to Firestore. Neither side imports the other.

If you add new Firebase-touching code to the public site, follow this same pattern — never convert `JS/index.js` to a module.

`admin.html` has no such constraint (Firebase Auth requires http(s)/localhost anyway), so `JS/admin.js` is a normal ES module with direct imports from `JS/firebase-config.js`.

## Firebase config

`JS/firebase-config.js` ships with `REPLACE_ME` placeholders. The exported `FIREBASE_READY` boolean (`apiKey !== "REPLACE_ME"`) is the single source of truth for "is Firebase actually configured" — both the public-page module block and `admin.js` gate writes/auth on it.

`firestore.rules` allows public `create` on `bookings` and `slots` (with size validation), and restricts `read/update/delete` to authenticated users. The single owner user is created manually in the Firebase Auth console — there is no signup flow.

## Data model

**`bookings/{auto-id}`**
```
{
  firstName, lastName, phone, service, date (YYYY-MM-DD), time (HH:MM),
  notes, price, createdAt: Timestamp, status: 'pending'|'confirmed'|'completed'|'cancelled',
  payment: {
    status: 'unpaid'|'paid',
    method: 'cash'|'bit'|'paybox'|'card'|'transfer'|null,
    amount: number|null,
    paidAt: Timestamp|null
  }
}
```

**`slots/{date}_{time}`** — double-booking lock. Created atomically with `setDoc` on booking submit; deleted on cancel/delete. If the doc already exists, the create fails and the user sees a "slot taken" error.

`SERVICE_PRICE` (in `JS/index.js`) and the `<option>` values in the booking form's service `<select>` must stay in sync. The same labels appear in `METHOD_LABELS` / `STATUS_LABELS` / `PAYMENT_LABELS` in `JS/admin.js` — when adding a service or payment method, update all three places.

## Booking flow

1. Customer fills the form → `JS/index.js` dispatches `booking:submit`
2. Inline module block in `index.html` tries to create the slot lock, then writes the booking as `status: 'pending'`
3. A Telegram notification is sent to the barber (fire-and-forget, does not block the success screen)
4. Customer sees "הבקשה נשלחה" success screen
5. Barber receives a Telegram message with full booking details and two inline buttons: **✅ אשר ושלח WhatsApp** / **❌ דחה ושלח WhatsApp** — each opens a pre-filled `wa.me` link to the customer
6. Barber opens `admin.html` to update booking status; the drawer has the same approve/reject WhatsApp buttons

## Telegram notification

`sendTelegramNotification(data)` is defined in the inline module block in `index.html`. It reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from `JS/firebase-config.js`. The function exits silently if the token is still the placeholder value `'REPLACE_WITH_BOT_TOKEN'`.

The Telegram message uses `parse_mode: 'HTML'` and an `inline_keyboard` with two URL buttons. The button URLs are pre-encoded `wa.me` links with the full approval/rejection message text — identical to what `openWhatsAppApproval` / `openWhatsAppRejection` in `admin.js` produce.

To set up for a new client: barber creates a bot via @BotFather, sends a message to it, fetches `https://api.telegram.org/bot{TOKEN}/getUpdates` to get their `chat.id`, then update both values in `JS/firebase-config.js`.

## Admin dashboard

`admin.html` + `JS/admin.js` + `Style/admin.css`.

- **Real-time listener**: `onSnapshot` on `bookings` ordered by `createdAt desc`. Updates table, KPIs, and FullCalendar simultaneously.
- **Browser notifications**: on login, requests `Notification.permission` (guarded with `typeof Notification !== 'undefined'` — required for iOS Safari). When a new `pending` booking arrives via snapshot (within 2 minutes of `createdAt`), fires `new Notification(...)`. Only works if the admin tab is open; no service worker.
- **Calendar**: FullCalendar 6 (CDN), always rendered below the bookings table. Initialised on first snapshot, refreshed via `calendarInstance.refetchEvents()` on subsequent updates. Event click opens the same drawer as table row click. Colour-coded by status (`STATUS_COLOR` map). On screens ≤700px defaults to `listMonth` view (month grid is unusable on mobile); on desktop defaults to `dayGridMonth`. Month view uses `displayEventTime: false` to show name instead of time in narrow cells. Slot duration is 30 min; events have a computed `end` time so week view renders blocks.
- **Drawer**: displays read-only booking info, then editable booking status, payment details, and a "תגובה ללקוח" section with approve/reject WhatsApp buttons. **The `window.open()` calls in approve/reject handlers must come before any `await`** — see iOS Safari rules below.

## Invoice PDF

`generateInvoice(b)` in `JS/admin.js` builds a full HTML document string and opens it in a new window (`window.open`). The new window auto-triggers `window.print()` on load. The user saves as PDF via the browser print dialog. This avoids html2canvas/jsPDF capture issues with off-screen elements.

The document includes a mandatory disclaimer that it is **not** a legal Israeli tax invoice. When connecting to a certified provider (Greeninvoice, iCount, EZCount), do it from a Cloud Function — never put the API key in client code.

## iOS Safari compatibility rules

Two patterns that work on Android/Chrome but break silently on iOS Safari:

1. **`window.Notification` is undefined** on iOS Safari (non-PWA, < iOS 16.4). Accessing `.permission` on it throws `ReferenceError` and halts the enclosing function. Always guard: `typeof Notification !== 'undefined' && Notification.permission === ...`

2. **`window.open()` after `await` is blocked** by the iOS popup blocker. iOS considers the user gesture "expired" after the first `await`. In any async click handler that opens WhatsApp, call `window.open()` *before* the first `await`, then do the Firestore writes after.

## Styling

Two stylesheets: `Style/style.css` (shared site shell, design tokens) and `Style/admin.css` (dashboard-only). The admin page also pulls `style.css` for shared tokens (`--gold`, `--bg-primary`, etc.). CSS custom properties on `:root` are the gold/black palette source.

`responsive.css` is loaded by `index.html` only (not admin).
