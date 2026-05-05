import { db, auth, FIREBASE_READY } from './firebase-config.js';
import {
    collection, query, orderBy, onSnapshot,
    doc, updateDoc, deleteDoc, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

// ========== CONSTANTS ==========
const BUSINESS = {
    name: 'שלומי חלי',
    tagline: 'מספרת גברים פרימיום',
    address: 'עמוס 22, נשר',
    phone: '052-8173190',
};

const STATUS_LABELS = {
    pending:   'ממתין',
    confirmed: 'מאושר',
    completed: 'הסתיים',
    cancelled: 'בוטל',
};
const PAYMENT_LABELS = {
    paid:   'שולם',
    unpaid: 'לא שולם',
};
const METHOD_LABELS = {
    cash:     'מזומן',
    bit:      'ביט',
    paybox:   'PayBox',
    card:     'כרטיס אשראי',
    transfer: 'העברה בנקאית',
};
const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

// ========== DOM ==========
const loginScreen = document.getElementById('loginScreen');
const dashboard   = document.getElementById('dashboard');
const loginForm   = document.getElementById('loginForm');
const loginError  = document.getElementById('loginError');
const logoutBtn   = document.getElementById('logoutBtn');
const adminUserEl = document.getElementById('adminUser');

const filterSearch  = document.getElementById('filterSearch');
const filterStatus  = document.getElementById('filterStatus');
const filterPayment = document.getElementById('filterPayment');

const bookingsBody = document.getElementById('bookingsBody');
const drawer       = document.getElementById('drawer');
const drawerBody   = document.getElementById('drawerBody');
const saveBtn      = document.getElementById('saveBtn');
const deleteBtn    = document.getElementById('deleteBtn');
const invoiceBtn   = document.getElementById('invoiceBtn');

const payStatus  = document.getElementById('pay-status');
const payMethod  = document.getElementById('pay-method');
const payAmount  = document.getElementById('pay-amount');
const payDate    = document.getElementById('pay-date');
const bkStatusEl = document.getElementById('bk-status');

const toast    = document.getElementById('toast');
const invTpl   = document.getElementById('invoiceTemplate');

const kpiToday    = document.getElementById('kpiToday');
const kpiUnpaid   = document.getElementById('kpiUnpaid');
const kpiRevenue  = document.getElementById('kpiRevenue');
const kpiTotal    = document.getElementById('kpiTotal');

let allBookings = [];
let unsubBookings = null;
let currentBookingId = null;

// ========== HELPERS ==========
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.hidden = true; }, 300);
    }, 2400);
}

function fmtDateHE(yyyymmdd) {
    if (!yyyymmdd) return '-';
    const [y, m, d] = yyyymmdd.split('-');
    return `${d}/${m}/${y}`;
}
function dowOf(yyyymmdd) {
    const [y, m, d] = yyyymmdd.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
}
function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

// ========== AUTH ==========
if (!FIREBASE_READY) {
    showFirebaseNotReady();
} else {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginScreen.hidden = true;
            dashboard.hidden = false;
            adminUserEl.textContent = user.email;
            startListening();
        } else {
            loginScreen.hidden = false;
            dashboard.hidden = true;
            stopListening();
        }
    });
}

function showFirebaseNotReady() {
    loginScreen.hidden = false;
    loginError.hidden = false;
    loginError.textContent = 'Firebase לא מוגדר. עדכן את JS/firebase-config.js לפני השימוש.';
    loginForm.querySelectorAll('input, button').forEach(el => el.disabled = true);
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const email = document.getElementById('lg-email').value.trim();
    const password = document.getElementById('lg-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        loginError.hidden = false;
        loginError.textContent = friendlyAuthError(err.code);
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

function friendlyAuthError(code) {
    switch (code) {
        case 'auth/invalid-email':       return 'כתובת אימייל לא תקינה';
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':      return 'אימייל או סיסמה שגויים';
        case 'auth/too-many-requests':   return 'יותר מדי ניסיונות, נסה שוב מאוחר יותר';
        default: return 'שגיאת התחברות. נסה שוב.';
    }
}

// ========== FIRESTORE LISTENER ==========
function startListening() {
    if (unsubBookings) return;
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    unsubBookings = onSnapshot(q, (snap) => {
        allBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderBookings();
        renderKpis();
    }, (err) => {
        console.error('Snapshot error:', err);
        bookingsBody.innerHTML = `<tr><td colspan="9" class="empty-row">שגיאה בטעינת תורים. בדוק את הרשאות Firestore.</td></tr>`;
    });
}
function stopListening() {
    if (unsubBookings) { unsubBookings(); unsubBookings = null; }
    allBookings = [];
}

// ========== RENDERING ==========
function renderKpis() {
    const today = todayISO();
    const todayCount = allBookings.filter(b => b.date === today && b.status !== 'cancelled').length;
    const unpaid = allBookings.filter(b => b.payment?.status === 'unpaid' && b.status !== 'cancelled').length;

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const revenue = allBookings
        .filter(b => b.payment?.status === 'paid' && b.date?.startsWith(ym))
        .reduce((sum, b) => sum + (Number(b.payment?.amount) || 0), 0);

    kpiToday.textContent = todayCount;
    kpiUnpaid.textContent = unpaid;
    kpiRevenue.textContent = revenue;
    const uniqueClients = new Set(allBookings.map(b => b.phone)).size;
    kpiTotal.textContent = uniqueClients;
}

function renderBookings() {
    const search = filterSearch.value.trim().toLowerCase();
    const status = filterStatus.value;
    const pay    = filterPayment.value;

    const filtered = allBookings.filter(b => {
        if (status && b.status !== status) return false;
        if (pay && b.payment?.status !== pay) return false;
        if (search) {
            const haystack = `${b.firstName} ${b.lastName} ${b.phone}`.toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        bookingsBody.innerHTML = `<tr><td colspan="9" class="empty-row">אין תורים להצגה</td></tr>`;
        return;
    }

    bookingsBody.innerHTML = filtered.map(b => {
        const status = b.status || 'pending';
        const payS   = b.payment?.status || 'unpaid';
        const amount = b.payment?.amount ?? b.price ?? '-';
        return `
            <tr data-id="${b.id}">
                <td>${fmtDateHE(b.date)}</td>
                <td>${escapeHtml(b.time)}</td>
                <td>${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)}</td>
                <td>${escapeHtml(b.phone)}</td>
                <td>${escapeHtml(b.service)}</td>
                <td>${amount}${amount !== '-' ? ' ₪' : ''}</td>
                <td><span class="badge-pill badge-${status}">${STATUS_LABELS[status]}</span></td>
                <td><span class="badge-pill badge-${payS}">${PAYMENT_LABELS[payS]}</span></td>
                <td><button class="row-action">פתח</button></td>
            </tr>
        `;
    }).join('');

    bookingsBody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => openDrawer(tr.dataset.id));
    });
}

filterSearch.addEventListener('input', renderBookings);
filterStatus.addEventListener('change', renderBookings);
filterPayment.addEventListener('change', renderBookings);

// ========== DRAWER ==========
function openDrawer(id) {
    const b = allBookings.find(x => x.id === id);
    if (!b) return;
    currentBookingId = id;

    drawerBody.innerHTML = `
        <div><strong>שם:</strong> ${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)}</div>
        <div><strong>טלפון:</strong> <a href="tel:${escapeHtml(b.phone)}" style="color:var(--gold)">${escapeHtml(b.phone)}</a></div>
        <div><strong>שירות:</strong> ${escapeHtml(b.service)}</div>
        <div><strong>תאריך:</strong> ${fmtDateHE(b.date)} (יום ${DAY_NAMES[dowOf(b.date)]})</div>
        <div><strong>שעה:</strong> ${escapeHtml(b.time)}</div>
        ${b.notes ? `<div><strong>הערות:</strong> ${escapeHtml(b.notes)}</div>` : ''}
        <div><strong>מחיר רשמי:</strong> ${b.price ?? '-'} ₪</div>
    `;

    bkStatusEl.value = b.status || 'pending';
    payStatus.value  = b.payment?.status || 'unpaid';
    payMethod.value  = b.payment?.method || '';
    payAmount.value  = b.payment?.amount ?? b.price ?? '';

    if (b.payment?.paidAt?.toDate) {
        const dt = b.payment.paidAt.toDate();
        payDate.value = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    } else {
        payDate.value = '';
    }

    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    currentBookingId = null;
}

drawer.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', closeDrawer));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) closeDrawer();
});

// Auto-fill paid date when status flips to "paid"
payStatus.addEventListener('change', () => {
    if (payStatus.value === 'paid' && !payDate.value) {
        payDate.value = todayISO();
    }
});

// Releasing the slot lock when a booking is removed/cancelled — see firestore.rules
// `slots/{slotId}` collection. Best-effort: tolerate missing slots silently.
async function releaseSlot(booking) {
    if (!booking?.date || !booking?.time) return;
    try {
        await deleteDoc(doc(db, 'slots', `${booking.date}_${booking.time}`));
    } catch (err) {
        console.warn('Slot release failed (already gone?):', err.message);
    }
}

saveBtn.addEventListener('click', async () => {
    if (!currentBookingId) return;
    const booking = allBookings.find(x => x.id === currentBookingId);
    const wasCancelled = booking?.status === 'cancelled';
    const nowCancelled = bkStatusEl.value === 'cancelled';
    const updates = {
        status: bkStatusEl.value,
        payment: {
            status: payStatus.value,
            method: payMethod.value || null,
            amount: payAmount.value ? Number(payAmount.value) : null,
            paidAt: payDate.value ? Timestamp.fromDate(new Date(payDate.value)) : null,
        },
    };
    try {
        await updateDoc(doc(db, 'bookings', currentBookingId), updates);
        if (nowCancelled && !wasCancelled) {
            await releaseSlot(booking);
        }
        showToast('נשמר בהצלחה');
        closeDrawer();
    } catch (err) {
        console.error(err);
        showToast('שגיאת שמירה', true);
    }
});

deleteBtn.addEventListener('click', async () => {
    if (!currentBookingId) return;
    if (!confirm('למחוק את התור הזה? פעולה לא הפיכה.')) return;
    const booking = allBookings.find(x => x.id === currentBookingId);
    try {
        await deleteDoc(doc(db, 'bookings', currentBookingId));
        await releaseSlot(booking);
        showToast('התור נמחק');
        closeDrawer();
    } catch (err) {
        console.error(err);
        showToast('שגיאת מחיקה', true);
    }
});

// ========== INVOICE PDF ==========
invoiceBtn.addEventListener('click', () => {
    if (!currentBookingId) return;
    const b = allBookings.find(x => x.id === currentBookingId);
    if (!b) return;
    generateInvoice(b);
});

function generateInvoice(b) {
    const invoiceNum = `${(b.date || todayISO()).replaceAll('-','')}-${b.id.substring(0,4).toUpperCase()}`;
    const issuedAt = new Date();
    const issuedHE = `${String(issuedAt.getDate()).padStart(2,'0')}/${String(issuedAt.getMonth()+1).padStart(2,'0')}/${issuedAt.getFullYear()}`;

    const amount = b.payment?.amount ?? b.price ?? 0;
    const method = b.payment?.method ? METHOD_LABELS[b.payment.method] : '—';
    const payS   = b.payment?.status === 'paid' ? 'שולם' : 'טרם שולם';
    const paidAt = b.payment?.paidAt?.toDate
        ? `${String(b.payment.paidAt.toDate().getDate()).padStart(2,'0')}/${String(b.payment.paidAt.toDate().getMonth()+1).padStart(2,'0')}/${b.payment.paidAt.toDate().getFullYear()}`
        : '—';

    invTpl.innerHTML = `
        <div class="inv-header">
            <div class="inv-brand">
                <h1>${BUSINESS.name}</h1>
                <p>${BUSINESS.tagline}</p>
                <p>${BUSINESS.address}</p>
                <p>${BUSINESS.phone}</p>
            </div>
            <div class="inv-meta">
                <h2>קבלה / סיכום שירות</h2>
                <p><strong>מס׳ מסמך:</strong> ${invoiceNum}</p>
                <p><strong>הופק בתאריך:</strong> ${issuedHE}</p>
            </div>
        </div>

        <div class="inv-section-title">פרטי הלקוח</div>
        <div class="inv-customer">
            <p><strong>שם:</strong> ${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)}</p>
            <p><strong>טלפון:</strong> ${escapeHtml(b.phone)}</p>
        </div>

        <div class="inv-section-title">פירוט השירות</div>
        <table>
            <thead>
                <tr>
                    <th>תיאור</th>
                    <th>תאריך</th>
                    <th>שעה</th>
                    <th>סכום</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${escapeHtml(b.service)}</td>
                    <td>${fmtDateHE(b.date)}</td>
                    <td>${escapeHtml(b.time)}</td>
                    <td>${amount} ₪</td>
                </tr>
            </tbody>
        </table>

        <div class="inv-total">
            סה"כ לתשלום: <span>${amount} ₪</span>
        </div>

        <div class="inv-payment">
            <div><strong>סטטוס:</strong> ${payS}</div>
            <div><strong>אמצעי תשלום:</strong> ${method}</div>
            <div><strong>תאריך תשלום:</strong> ${paidAt}</div>
        </div>

        <div class="inv-disclaimer">
            <strong>הערה חשובה:</strong> מסמך זה הוא סיכום שירות לצורכי תיעוד פנימי בלבד.
            אינו מהווה חשבונית מס רשמית כנדרש על פי דין. חשבונית מס תופק בנפרד באמצעות תוכנת חשבוניות מאושרת.
        </div>

        <div class="inv-footer">
            ${BUSINESS.name} · ${BUSINESS.address} · ${BUSINESS.phone}
        </div>
    `;

    invTpl.hidden = false;

    const filename = `invoice-${b.date}-${b.firstName}-${b.lastName}.pdf`;
    const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.97 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    setTimeout(() => {
        html2pdf().set(opt).from(invTpl).save().then(() => {
            invTpl.hidden = true;
            showToast('החשבונית הופקה');
        }).catch((err) => {
            console.error(err);
            invTpl.hidden = true;
            showToast('שגיאה ביצירת PDF', true);
        });
    }, 300);
}
