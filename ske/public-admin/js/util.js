// Small helpers for building admin markup safely.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Leads come from the public website, so every value shown here must be escaped.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function safeImageSrc(value) {
  if (typeof value !== 'string') return '';
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  if (/^https:\/\/[^\s"'<>]+$/i.test(value)) return value;
  return '';
}

export function formatINR(amount) {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

export function formatDate(timestamp, withTime = false) {
  if (!timestamp?.toDate) return '—';
  const date = timestamp.toDate();
  return withTime ? date.toLocaleString('en-IN') : date.toLocaleDateString('en-IN');
}

export const newestFirst = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);

export function phoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}
