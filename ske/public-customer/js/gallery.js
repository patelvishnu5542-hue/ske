// Full gallery page: category filters and "load more" paging.
import { fetchGalleryPage } from './data.js?v=b3a4d33c';
import { galleryCard, lightboxItem, renderGalleryFilters } from './cards.js?v=9c91a000';
import { initPage, openLightbox } from './ui.js?v=fa831a25';

const PAGE_SIZE = 24;
const grid = document.getElementById('gallery-grid-container');
const moreButton = document.getElementById('gallery-load-more');
const items = [];
let cursor = null;
let filter = 'all';

const filters = document.getElementById('gallery-filters-container');

initPage();
moreButton.addEventListener('click', loadPage);
loadPage();

async function loadPage() {
  moreButton.disabled = true;
  try {
    const page = await fetchGalleryPage(PAGE_SIZE, cursor);
    items.push(...page.items);
    cursor = page.cursor;
    renderGalleryFilters(filters, items, (value) => {
      filter = value;
      render();
    }, filter);
    render();
  } catch (err) {
    console.error('Gallery not loaded:', err);
    grid.innerHTML = '<p class="empty-state">Photos could not be loaded. Please refresh the page.</p>';
  } finally {
    moreButton.disabled = false;
    moreButton.hidden = !cursor;
  }
}

function render() {
  const shown = items.filter((item) => filter === 'all' || item.category === filter);
  if (!shown.length) {
    grid.innerHTML = `<p class="empty-state">${items.length ? 'No photos in this category yet.' : 'Photos are coming soon.'}</p>`;
    return;
  }
  grid.innerHTML = shown.map(galleryCard).join('');
  grid.querySelectorAll('.gallery-card').forEach((card, i) => {
    card.addEventListener('click', () => openLightbox(shown.map(lightboxItem), i));
  });
}
