// Pure helpers shared by the page scripts: HTML escaping, safe image sources,
// prices and the rooftop subsidy estimate.
import { SUBSIDY } from './config.js?v=44d7ffa2';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Every database value placed into HTML must go through esc().
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// Only inline images and https URLs may be used as image sources.
export function safeImageSrc(value) {
  if (typeof value !== 'string') return '';
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  if (/^https:\/\/[^\s"'<>]+$/i.test(value)) return value;
  return '';
}

export function formatINR(amount) {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

// Central subsidy (PM Surya Ghar): an amount entered in the admin panel wins,
// otherwise it is calculated from the system size. Never above the scheme cap.
export function centralSubsidyFor(product) {
  const entered = Number(product.subsidy);
  if (entered > 0) return Math.min(entered, SUBSIDY.centralMax);
  const kw = Number(product.capacity);
  if (!(kw > 0)) return 0;
  return Math.min(SUBSIDY.centralMax,
    Math.round(Math.min(kw, 2) * 30000 + Math.max(0, Math.min(kw, 3) - 2) * 18000));
}

// Rajasthan state top-up, only for products that get the central subsidy.
// Not every household is eligible, so it is always marked with an asterisk.
export function stateSubsidyFor(product) {
  if (centralSubsidyFor(product) <= 0) return 0;
  if (product.stateSubsidy !== undefined && product.stateSubsidy !== null) {
    return Math.max(0, Number(product.stateSubsidy) || 0);
  }
  return SUBSIDY.stateDefault;
}

export function priceBlock(product, { large = false } = {}) {
  const price = Number(product.price) || 0;
  const discounted = Number(product.discountedPrice) || 0;
  if (!price && !discounted) return '';

  const base = discounted || price;
  const central = centralSubsidyFor(product);
  const state = stateSubsidyFor(product);
  const size = large ? ' price--large' : '';
  const strike = discounted && price > discounted ? `<s class="price__was">${formatINR(price)}</s>` : '';

  if (central <= 0) {
    return `
    <div class="price${size}">
      <div class="price__main">
        <span class="price__value">${formatINR(base)}</span> ${strike}
      </div>
    </div>`;
  }
  const star = state > 0 ? '<sup class="price__star">*</sup>' : '';
  return `
    <div class="price${size}">
      <div class="price__main">
        <span class="price__value">${formatINR(Math.max(0, base - central - state))}${star}</span>
        <span class="price__tag">After subsidy</span>
      </div>
      <dl class="price__details">
        <div><dt>Price</dt><dd>${formatINR(base)} ${strike}</dd></div>
        <div class="price__subsidy"><dt>Central subsidy</dt><dd>−${formatINR(central)}</dd></div>
        ${state > 0 ? `<div class="price__subsidy"><dt>Rajasthan subsidy*</dt><dd>−${formatINR(state)}</dd></div>` : ''}
      </dl>
      ${state > 0 ? `<p class="price__note">*State subsidy only for eligible households. Without it: ${formatINR(Math.max(0, base - central))}.</p>` : ''}
    </div>`;
}
