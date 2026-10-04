// Markup builders shared by the homepage and the full gallery page.
import { coverOf, fullImageOf } from './data.js?v=b3a4d33c';
import { esc } from './format.js?v=eca394e6';

const CATEGORY_LABELS = {
  'Residential Solar': 'Residential',
  'Commercial Solar': 'Commercial',
  'Industrial Solar': 'Industrial',
};

const categoryLabel = (category) => CATEGORY_LABELS[category] || category;

// Filter buttons for the categories that actually have photos. With only one
// category there is nothing to filter, so the row stays hidden.
export function renderGalleryFilters(container, items, onChange, selected = 'all') {
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))];
  container.hidden = categories.length < 2;
  if (container.hidden) return;
  const current = categories.includes(selected) ? selected : 'all';
  container.innerHTML = ['all', ...categories].map((value) => `
    <button type="button" class="gallery-filter-btn" data-filter="${esc(value)}" aria-pressed="${value === current}">
      ${value === 'all' ? 'All' : esc(categoryLabel(value))}</button>`).join('');
  container.querySelectorAll('.gallery-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.gallery-filter-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      onChange(btn.dataset.filter);
    });
  });
}

export function galleryCard(item) {
  const caption = item.caption?.trim() || 'Shree Krishna Enterprises';
  return `
    <button type="button" class="gallery-card" aria-label="View photo: ${esc(caption)}">
      <img src="${coverOf(item)}" alt="" loading="lazy" decoding="async" width="480" height="360">
      <span class="gallery-card-overlay">
        ${item.category && item.category !== 'Other' ? `<span class="gallery-card-cat">${esc(categoryLabel(item.category))}</span>` : ''}
        <span class="gallery-card-title">${esc(caption)}</span>
      </span>
    </button>`;
}

export function lightboxItem(item) {
  return {
    preview: coverOf(item),
    load: () => fullImageOf(item, 0),
    category: item.category && item.category !== 'Other' ? categoryLabel(item.category) : '',
    caption: item.caption?.trim() || '',
  };
}
