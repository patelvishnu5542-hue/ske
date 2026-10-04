// Reads catalogue content from Firestore with an on-device cache in front.
//
// Cost model (Firestore free tier): every document fetched from the server is a
// billed read plus download. Lists are served from the device cache while they
// are younger than LIST_TTL_MS, and full-size images (the /media collection) are
// immutable, so once a device has one it never downloads it again.
import { db } from './firebase.js?v=0575f661';
import { safeImageSrc } from './format.js?v=eca394e6';
import {
  collection, doc, getDoc, getDocs, getDocFromCache, getDocsFromCache,
  query, where, orderBy, limit, startAfter,
} from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

const LIST_TTL_MS = 10 * 60 * 1000;

function freshUntil(key) {
  try {
    return Number(localStorage.getItem(`ske:fetched:${key}`)) + LIST_TTL_MS;
  } catch {
    return 0;
  }
}

function markFetched(key) {
  try {
    localStorage.setItem(`ske:fetched:${key}`, String(Date.now()));
  } catch {
    // Private mode or storage disabled: the cache simply isn't used.
  }
}

async function cachedQuery(key, q) {
  if (Date.now() < freshUntil(key)) {
    try {
      const snap = await getDocsFromCache(q);
      if (!snap.empty) return snap.docs;
    } catch {
      // Not cached on this device: fall through to the server.
    }
  }
  try {
    const snap = await getDocs(q);
    markFetched(key);
    return snap.docs;
  } catch (err) {
    const snap = await getDocsFromCache(q).catch(() => null);
    if (snap && !snap.empty) return snap.docs;
    throw err;
  }
}

const toItem = (d) => ({ id: d.id, ...d.data() });
const newestFirst = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);

export async function fetchProducts() {
  const q = query(collection(db, 'products'), where('isActive', '==', true));
  return (await cachedQuery('products', q)).map(toItem).sort(newestFirst);
}

export async function fetchProduct(id) {
  const ref = doc(db, 'products', id);
  if (Date.now() < freshUntil('products')) {
    try {
      const cached = await getDocFromCache(ref);
      if (cached.exists()) return toItem(cached);
    } catch {
      // Not cached: read from the server below.
    }
  }
  const snap = await getDoc(ref);
  return snap.exists() ? toItem(snap) : null;
}

export async function fetchHeroSlides() {
  const q = query(collection(db, 'hero_slides'), where('isActive', '==', true));
  return (await cachedQuery('hero_slides', q)).map(toItem).sort(newestFirst);
}

export async function fetchReviews() {
  const q = query(collection(db, 'reviews'), where('status', '==', 'approved'));
  return (await cachedQuery('reviews', q)).map(toItem).sort(newestFirst);
}

// Newest gallery items, a page at a time. Pass the returned cursor to get the
// next page. Hidden items are filtered here so no composite index is needed.
export async function fetchGalleryPage(pageSize, cursor = null) {
  const parts = [collection(db, 'gallery'), orderBy('createdAt', 'desc')];
  if (cursor) parts.push(startAfter(cursor));
  parts.push(limit(pageSize));
  const q = query(...parts);
  const docs = cursor ? (await getDocs(q)).docs : await cachedQuery(`gallery:${pageSize}`, q);
  return {
    items: docs.map(toItem).filter((item) => item.isActive !== false),
    cursor: docs.length === pageSize ? docs[docs.length - 1] : null,
  };
}

const mediaRequests = new Map();

async function fetchMediaDoc(id) {
  const ref = doc(db, 'media', id);
  try {
    const cached = await getDocFromCache(ref);
    if (cached.exists()) return cached.data().data;
  } catch {
    // First time on this device.
  }
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().data : '';
}

function loadMedia(id) {
  if (!mediaRequests.has(id)) {
    mediaRequests.set(id, fetchMediaDoc(id).then(safeImageSrc).catch(() => ''));
  }
  return mediaRequests.get(id);
}

// Small preview stored on the record itself (older records hold the full image).
export function coverOf(item) {
  const legacy = Array.isArray(item.images) ? item.images[0] : item.imageURL;
  return safeImageSrc(item.cover || legacy || item.image);
}

export function mediaCount(item) {
  if (Array.isArray(item.media)) return item.media.length;
  if (Array.isArray(item.images)) return item.images.length;
  return item.imageURL ? 1 : 0;
}

// Full-size image by position, fetched only when it is about to be shown.
export async function fullImageOf(item, index = 0) {
  if (Array.isArray(item.media)) {
    const id = item.media[index];
    return (id && (await loadMedia(id))) || (index === 0 ? coverOf(item) : '');
  }
  const legacy = Array.isArray(item.images) ? item.images : [item.imageURL];
  return safeImageSrc(legacy[index]);
}
