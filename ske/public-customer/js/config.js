// Business details used by the scripts. The static HTML pages repeat the
// phone/WhatsApp number in their links: search for 919829545113 when changing it.
export const SITE = {
  name: 'Shree Krishna Enterprises',
  // wa.me format: country code + number, digits only (no "+", spaces or dashes).
  whatsapp: '919829545113',
  phone: '+919829545113',
};

// Rooftop solar subsidies for residential systems.
// Central (PM Surya Ghar): ₹30,000/kW up to 2 kW, ₹18,000 for the 3rd kW, max ₹78,000.
// Rajasthan state top-up: not every household qualifies, so it is always shown
// with an asterisk. A product can override it in the admin panel (0 = none).
export const SUBSIDY = {
  centralMax: 78000,
  stateDefault: 17000,
};

// Versioned by tools/stamp_assets.py so browsers can cache it for a year.
export const ICON_SPRITE = 'img/icons.svg?v=28bdd682';

// Pre-filled WhatsApp messages (Hindi). The static HTML pages repeat the general
// message URL-encoded in their links: update both when changing it.
export const WHATSAPP_MESSAGES = {
  general: 'नमस्ते श्री कृष्णा एंटरप्राइजेज, मैंने आपकी वेबसाइट देखी। मुझे सोलर सिस्टम लगवाना है, कृपया कीमत और सब्सिडी की जानकारी दें।',
  product: (name) => `नमस्ते श्री कृष्णा एंटरप्राइजेज, मुझे आपकी वेबसाइट पर ${String(name).trim()} के बारे में जानकारी चाहिए। कृपया कीमत और सब्सिडी की जानकारी दें।`,
};

export function whatsappLink(message) {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${SITE.whatsapp}${text}`;
}

export function icon(name, className = '') {
  return `<svg class="icon ${className}" aria-hidden="true" focusable="false"><use href="${ICON_SPRITE}#${name}"></use></svg>`;
}
