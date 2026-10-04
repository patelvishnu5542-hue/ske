// Image handling for the admin panel.
//
// Photos are stored in Firestore (no paid file storage needed) in two sizes:
//   - a small preview ("cover", ~480 px) kept on the product/gallery/slide record,
//     so lists load fast;
//   - the full-size photo in its own /media document, which the website downloads
//     only when it is shown and then caches on the visitor's device for good.
// Media documents are never edited: a replaced photo gets a new document.
import { db } from './firebase.js?v=1608c3ca';
import { collection, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

export const SIZES = {
  product: { full: 1200, thumb: 480 },
  hero: { full: 1600, thumb: 480 },
  gallery: { full: 1600, thumb: 480 },
  review: { thumb: 600 },
};

// Firestore documents are capped at 1 MiB; keep each photo well under it.
const MAX_DATA_URL_LENGTH = 900 * 1024;

let webpSupported;
function outputType() {
  if (webpSupported === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupported ? 'image/webp' : 'image/jpeg';
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',', 2);
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  return new Blob([bytes], { type: header.slice(5, header.indexOf(';')) });
}

// createImageBitmap keeps working while the tab is in the background
// (img.decode() can stall there), so it is preferred.
async function loadBitmap(source) {
  const blob = typeof source === 'string' ? dataUrlToBlob(source) : source;
  if ('createImageBitmap' in window) return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('This file is not a supported image.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Resize so the longest side is at most maxSide, and encode as WebP (JPEG on
// browsers that cannot encode WebP). Returns { data, width, height }.
export async function encodeImage(source, maxSide, quality = 0.8) {
  const bitmap = await loadBitmap(source);
  const srcWidth = bitmap.width;
  const srcHeight = bitmap.height;
  let side = maxSide;
  let q = quality;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const scale = Math.min(1, side / Math.max(srcWidth, srcHeight));
    const width = Math.max(1, Math.round(srcWidth * scale));
    const height = Math.max(1, Math.round(srcHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = canvas.toDataURL(outputType(), q);
    if (data.length <= MAX_DATA_URL_LENGTH) {
      bitmap.close?.();
      return { data, width, height };
    }
    q = Math.max(0.5, q - 0.1);
    side = Math.round(side * 0.85);
  }
  bitmap.close?.();
  throw new Error('This photo is too large to store even after compression.');
}

export async function makeThumb(source, maxSide = 480) {
  return (await encodeImage(source, maxSide, 0.72)).data;
}

// Adds a new /media document to a write batch and returns its id.
export async function addMediaToBatch(batch, source, maxSide) {
  const { data, width, height } = await encodeImage(source, maxSide);
  const ref = doc(collection(db, 'media'));
  batch.set(ref, { data, width, height, createdAt: serverTimestamp() });
  return ref.id;
}

export async function loadMedia(id) {
  const snap = await getDoc(doc(db, 'media', id));
  return snap.exists() ? snap.data().data : '';
}

export function isLegacyImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

// Photos the old admin panel stored inline on the record (before /media existed).
export function legacyImagesOf(record) {
  if (Array.isArray(record.images) && record.images.length) return record.images.filter(isLegacyImage);
  return isLegacyImage(record.imageURL) ? [record.imageURL] : [];
}
