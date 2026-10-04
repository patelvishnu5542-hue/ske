// Page chrome shared by every page: header, mobile menu, floating WhatsApp
// button, toast, lightbox, lead forms and service worker registration.
import { db } from './firebase.js?v=0575f661';
import { icon } from './config.js?v=44d7ffa2';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

const MAP_EMBED_URL = 'https://maps.google.com/maps?q=Waaree%20Solar%20Shree%20Krishna%20Enterprises,%20Gudamalani&z=15&output=embed';

export function initPage() {
  initHeader();
  initDrawer();
  initFloatingWhatsApp();
  initMap();
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  registerServiceWorker();
}

// The Google Maps embed is about 1 MB, so it loads only when a visitor asks for it.
function initMap() {
  const button = document.getElementById('show-map-btn');
  if (!button) return;
  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = MAP_EMBED_URL;
    frame.title = 'Map: Shree Krishna Enterprises, Gudamalani';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.allowFullscreen = true;
    document.getElementById('map-container').replaceChildren(frame);
  });
}

function initHeader() {
  const header = document.getElementById('main-header');
  if (!header) return;
  let lastY = window.scrollY;
  let queued = false;
  const update = () => {
    queued = false;
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 40);
    header.classList.toggle('nav-hidden', y > lastY && y > 80 && !document.body.classList.contains('drawer-open'));
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function initDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const toggle = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('close-drawer');
  if (!drawer || !overlay || !toggle) return;

  const open = () => {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.classList.add('drawer-open');
    drawer.removeAttribute('inert');
    toggle.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => closeBtn?.focus());
  };
  const close = () => {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    drawer.setAttribute('inert', '');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  };

  drawer.setAttribute('inert', '');
  toggle.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function initFloatingWhatsApp() {
  const button = document.getElementById('floating-wa');
  if (!button) return;
  let timer;
  setTimeout(() => button.classList.add('expanded'), 1500);
  window.addEventListener('scroll', () => {
    button.classList.remove('expanded');
    clearTimeout(timer);
    timer = setTimeout(() => button.classList.add('expanded'), 1200);
  }, { passive: true });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered:', err));
  });
}

// Runs fn once the element is close to the viewport, so content (and its
// Firestore reads) below the fold is only fetched for visitors who scroll there.
export function whenVisible(element, fn) {
  if (!element) return;
  if (!('IntersectionObserver' in window)) {
    fn();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      fn();
    }
  }, { rootMargin: '400px 0px' });
  observer.observe(element);
}

let toastTimer;
export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = icon(isError ? 'alert' : 'check-circle');
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);
  toast.classList.toggle('error', isError);
  toast.classList.remove('show');
  void toast.offsetHeight;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Lightbox for gallery and review photos. Each item: { preview, load(), category, caption }.
// The preview shows instantly; the full-size image replaces it once loaded.
const lightbox = { items: [], index: 0, returnFocus: null, bound: false };

export function openLightbox(items, index) {
  const box = document.getElementById('gallery-lightbox');
  if (!box || !items.length) return;
  bindLightbox(box);
  lightbox.items = items;
  lightbox.returnFocus = document.activeElement;
  showLightboxItem(index);
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add('active'));
  document.body.classList.add('lightbox-open');
  box.querySelector('#lightbox-close-btn')?.focus();
}

function closeLightbox() {
  const box = document.getElementById('gallery-lightbox');
  if (!box || box.hidden) return;
  box.classList.remove('active');
  document.body.classList.remove('lightbox-open');
  setTimeout(() => { box.hidden = true; }, 300);
  lightbox.returnFocus?.focus?.();
}

function showLightboxItem(index) {
  const count = lightbox.items.length;
  lightbox.index = (index + count) % count;
  const item = lightbox.items[lightbox.index];
  const img = document.getElementById('lightbox-img');
  img.src = item.preview || '';
  img.alt = item.caption || item.category || 'Project photo';
  document.getElementById('lightbox-cat').textContent = item.category || '';
  document.getElementById('lightbox-desc').textContent = item.caption || '';
  document.getElementById('lightbox-prev-btn').hidden = count < 2;
  document.getElementById('lightbox-next-btn').hidden = count < 2;
  const wanted = lightbox.index;
  item.load?.().then((src) => {
    if (src && lightbox.index === wanted) img.src = src;
  });
}

function bindLightbox(box) {
  if (lightbox.bound) return;
  lightbox.bound = true;
  box.querySelector('#lightbox-close-btn')?.addEventListener('click', closeLightbox);
  box.querySelector('#lightbox-prev-btn')?.addEventListener('click', () => showLightboxItem(lightbox.index - 1));
  box.querySelector('#lightbox-next-btn')?.addEventListener('click', () => showLightboxItem(lightbox.index + 1));
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.classList.contains('lightbox-content')) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightboxItem(lightbox.index - 1);
    if (e.key === 'ArrowRight') showLightboxItem(lightbox.index + 1);
  });
}

// Lead forms write straight to Firestore. firestore.rules enforces the same
// limits server-side; the checks here just give visitors a clear message.
const DAILY_LIMIT = 2;
const LIMIT_KEY = 'ske_submissions';

function recentSubmissions() {
  try {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return JSON.parse(localStorage.getItem(LIMIT_KEY) || '[]').filter((t) => t > dayAgo);
  } catch {
    return [];
  }
}

function recordSubmission() {
  try {
    localStorage.setItem(LIMIT_KEY, JSON.stringify([...recentSubmissions(), Date.now()]));
  } catch {
    // Storage unavailable: nothing to record.
  }
}

export function setupLeadForm(form, { source, buildMessage, successMessage }) {
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Bots fill every field, people never see this one.
    if (form.elements.website?.value) return;

    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const typed = form.elements.message ? form.elements.message.value.trim() : '';
    const message = buildMessage ? buildMessage(typed) : typed;

    if (name.length < 2 || name.length > 80) {
      showToast('Please enter your name.', true);
      return;
    }
    if (!/^[+]?[0-9 ()-]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 10) {
      showToast('Please enter a valid 10-digit phone number.', true);
      return;
    }
    if (recentSubmissions().length >= DAILY_LIMIT) {
      showToast('We already have your request. For anything else, please WhatsApp us.', true);
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      await addDoc(collection(db, 'leads'), {
        name,
        phone,
        message: message.slice(0, 1000),
        source: String(source()).slice(0, 200),
        status: 'new',
        createdAt: serverTimestamp(),
      });
      recordSubmission();
      form.reset();
      showToast(successMessage);
    } catch (err) {
      console.error('Lead not saved:', err);
      showToast('Could not send your request. Please WhatsApp or call us.', true);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}
