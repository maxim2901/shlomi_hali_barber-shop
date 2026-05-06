// ========== CONFIG ==========
const BARBER_PHONE_INTL = '972528173190'; // for wa.me link
const BARBER_PHONE_LOCAL = '052-8173190';

// Opening hours: [openHour, closeHour] in 24h. null = closed.
// Index = JS day (0=Sunday ... 6=Saturday)
const HOURS = {
    0: [9, 20],
    1: [9, 20],
    2: [9, 20],
    3: [9, 22],
    4: [9, 22],
    5: [8, 14],
    6: null, // closed
};
const SLOT_MINUTES = 30;

// ========== NAVBAR SCROLL + PROGRESS BAR ==========
const navbar = document.getElementById('navbar');
const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
    if (window.scrollY > 60) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
});

// ========== HAMBURGER MENU ==========
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// ========== SCROLL REVEAL ==========
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });

reveals.forEach(el => observer.observe(el));

// ========== COUNTER ANIMATION ==========
const counters = document.querySelectorAll('.counter');
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.target);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const duration = 1600;
        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const value = target * eased;
            el.textContent = value.toFixed(decimals) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
    });
}, { threshold: 0.5 });

counters.forEach(c => counterObserver.observe(c));

// ========== TILT EFFECT (3D card hover) ==========
document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotX = ((y - cy) / cy) * -6;
        const rotY = ((x - cx) / cx) * 6;
        card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// ========== GALLERY LIGHTBOX ==========
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');

// Listen on the whole gallery-item, not the img — the overlay div sits on top
// of the img and would swallow the click event.
document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
        const img = item.querySelector('img');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('active');
        document.body.classList.add('modal-open');
    });
});

const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.classList.remove('modal-open');
};

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLightbox();
});

// ========== REVIEWS CAROUSEL ==========
const reviewCards = document.querySelectorAll('.review-card');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dotsContainer = document.getElementById('carouselDots');
let currentReview = 0;
let autoRotateTimer;

reviewCards.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.classList.add('dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToReview(i));
    dotsContainer.appendChild(dot);
});
const dots = dotsContainer.querySelectorAll('.dot');

function goToReview(index) {
    reviewCards[currentReview].classList.remove('active');
    dots[currentReview].classList.remove('active');
    currentReview = (index + reviewCards.length) % reviewCards.length;
    reviewCards[currentReview].classList.add('active');
    dots[currentReview].classList.add('active');
    resetAutoRotate();
}

prevBtn.addEventListener('click', () => goToReview(currentReview - 1));
nextBtn.addEventListener('click', () => goToReview(currentReview + 1));

function startAutoRotate() {
    autoRotateTimer = setInterval(() => goToReview(currentReview + 1), 5000);
}
function resetAutoRotate() {
    clearInterval(autoRotateTimer);
    startAutoRotate();
}
startAutoRotate();

// ========== HIGHLIGHT TODAY IN HOURS TABLE ==========
const today = new Date().getDay();
const todayRow = document.querySelector(`.hours-table tr[data-day="${today}"]`);
if (todayRow) todayRow.classList.add('today');

// ========== BOOKING MODAL ==========
const bookingModal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');
const modalFormBody = document.getElementById('modalForm');
const modalSuccessBody = document.getElementById('modalSuccess');
const successSummary = document.getElementById('successSummary');
const dateInput = document.getElementById('bk-date');
const timeSelect = document.getElementById('bk-time');
const dateHint = document.getElementById('dateHint');
const serviceSelect = document.getElementById('bk-service');

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Set min date to today
function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
dateInput.min = todayISO();

// Open modal
function openBookingModal(service) {
    if (service) serviceSelect.value = service;
    bookingModal.classList.add('active');
    bookingModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modalFormBody.hidden = false;
    modalSuccessBody.hidden = true;
}

// Close modal
function closeBookingModal() {
    bookingModal.classList.remove('active');
    bookingModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    bookingForm.reset();
    timeSelect.innerHTML = '<option value="">בחר תאריך תחילה...</option>';
    timeSelect.disabled = true;
    dateHint.textContent = '';
    dateHint.classList.remove('error');
    document.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('error'));
}

// All "book" buttons
document.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => openBookingModal(btn.dataset.service));
});

// Close handlers
bookingModal.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', closeBookingModal);
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal.classList.contains('active')) closeBookingModal();
});

// Generate time slots for selected date
dateInput.addEventListener('change', () => {
    const value = dateInput.value;
    timeSelect.innerHTML = '';
    dateHint.classList.remove('error');

    if (!value) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">בחר תאריך תחילה...</option>';
        return;
    }

    // Parse as local date (avoid timezone shift)
    const [y, m, d] = value.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    const dow = selected.getDay();
    const hours = HOURS[dow];

    if (!hours) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">המספרה סגורה ביום זה</option>';
        dateHint.textContent = `יום ${DAY_NAMES[dow]} – המספרה סגורה. בחר יום אחר.`;
        dateHint.classList.add('error');
        return;
    }

    const [openH, closeH] = hours;
    const slots = [];

    // Skip past slots if booking for today
    const isToday = value === todayISO();
    const now = new Date();
    const minMinutes = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : 0;

    for (let mins = openH * 60; mins + SLOT_MINUTES <= closeH * 60; mins += SLOT_MINUTES) {
        if (mins < minMinutes) continue;
        const h = String(Math.floor(mins / 60)).padStart(2, '0');
        const min = String(mins % 60).padStart(2, '0');
        slots.push(`${h}:${min}`);
    }

    if (slots.length === 0) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">אין שעות פנויות היום – נסה תאריך אחר</option>';
        dateHint.textContent = 'אין שעות פנויות לתאריך זה.';
        dateHint.classList.add('error');
        return;
    }

    timeSelect.disabled = false;
    timeSelect.innerHTML = '<option value="">בחר שעה...</option>' +
        slots.map(s => `<option value="${s}">${s}</option>`).join('');
    dateHint.textContent = `יום ${DAY_NAMES[dow]} – שעות פעילות ${String(openH).padStart(2,'0')}:00 – ${String(closeH).padStart(2,'0')}:00`;

    // Tell the Firebase module to fetch already-booked slots for this date.
    selectedDateForSlots = value;
    window.dispatchEvent(new CustomEvent('booking:date-selected', { detail: { date: value } }));
});

// Track the date we're currently expecting slot-fetch results for, so a slow
// response for a previous date doesn't mutate a newer dropdown.
let selectedDateForSlots = null;

window.addEventListener('booking:slots-loaded', (e) => {
    const { date, takenTimes } = e.detail || {};
    if (date !== selectedDateForSlots) return;
    if (!Array.isArray(takenTimes) || takenTimes.length === 0) return;
    const taken = new Set(takenTimes);
    Array.from(timeSelect.options).forEach(opt => {
        if (opt.value && taken.has(opt.value)) opt.remove();
    });
    if (taken.has(timeSelect.value)) timeSelect.value = '';
    // Count real slot options (skip the placeholder with empty value).
    const remaining = Array.from(timeSelect.options).filter(o => o.value).length;
    if (remaining === 0) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">כל השעות לתאריך זה תפוסות</option>';
        dateHint.textContent = 'כל השעות בתאריך זה כבר תפוסות. נסה תאריך אחר.';
        dateHint.classList.add('error');
    }
});

// Service price lookup (used when persisting booking)
const SERVICE_PRICE = {
    'תספורת גבר': 70,
    'תספורת + עיצוב זקן': 70,
    'עיצוב זקן + מסגרת': 30,
};

// Submit handler
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields = ['bk-service', 'bk-firstname', 'bk-lastname', 'bk-phone', 'bk-date', 'bk-time'];
    let firstInvalid = null;
    fields.forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('error');
        if (!el.value || (el.validity && !el.validity.valid)) {
            el.classList.add('error');
            if (!firstInvalid) firstInvalid = el;
        }
    });
    if (firstInvalid) {
        firstInvalid.focus();
        return;
    }

    const data = new FormData(bookingForm);
    const service = data.get('service');
    const firstName = data.get('firstName').trim();
    const lastName = data.get('lastName').trim();
    const phone = data.get('phone').trim();
    const date = data.get('date');
    const time = data.get('time');
    const notes = data.get('notes').trim();

    // Format date for display (DD/MM/YYYY)
    const [y, m, d] = date.split('-');
    const dateDisplay = `${d}/${m}/${y}`;
    const dow = new Date(+y, +m - 1, +d).getDay();

    // Notify Firebase module (defined in index.html). No-op if running from file://
    // When Firebase is ready we wait for booking:result so we can detect a slot
    // collision (someone else just booked the same time) and abort before WhatsApp opens.
    const firebaseReady = !!window.__FIREBASE_READY;
    let resultPromise = Promise.resolve({ ok: true, skipped: true });
    if (firebaseReady) {
        resultPromise = new Promise((resolve) => {
            const handler = (ev) => resolve(ev.detail || { ok: false, reason: 'no-detail' });
            window.addEventListener('booking:result', handler, { once: true });
            // Network-failure safety net: don't block the user forever.
            setTimeout(() => {
                window.removeEventListener('booking:result', handler);
                resolve({ ok: true, timedOut: true });
            }, 8000);
        });
    }

    window.dispatchEvent(new CustomEvent('booking:submit', {
        detail: {
            firstName, lastName, phone, service, date, time, notes,
            price: SERVICE_PRICE[service] ?? null,
        }
    }));

    const result = await resultPromise;
    if (!result.ok && result.reason === 'slot-taken') {
        timeSelect.classList.add('error');
        dateHint.textContent = 'השעה הזו כבר נתפסה. אנא בחר שעה אחרת.';
        dateHint.classList.add('error');
        // Refresh the dropdown so the just-taken slot disappears.
        dateInput.dispatchEvent(new Event('change'));
        timeSelect.focus();
        return;
    }

    // Show success state
    successSummary.innerHTML = `
        <strong>שירות:</strong> ${service}<br>
        <strong>תאריך ושעה:</strong> ${dateDisplay} בשעה ${time}<br>
        <strong>שם:</strong> ${firstName} ${lastName}<br>
        <strong>טלפון:</strong> ${phone}
        ${notes ? `<br><strong>הערות:</strong> ${notes}` : ''}
    `;
    modalFormBody.hidden = true;
    modalSuccessBody.hidden = false;
    modalSuccessBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Clear error state on input
document.querySelectorAll('#bookingForm input, #bookingForm select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('error'));
    el.addEventListener('change', () => el.classList.remove('error'));
});

// ========== BUTTON RIPPLE ==========
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.left = `${e.clientX - rect.left - 50}px`;
        ripple.style.top  = `${e.clientY - rect.top  - 50}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });
});
