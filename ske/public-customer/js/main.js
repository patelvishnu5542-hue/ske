// Homepage: hero carousel, products, gallery preview, reviews and the quote form.
import { fetchProducts, fetchHeroSlides, fetchReviews, fetchGalleryPage, coverOf, fullImageOf } from './data.js?v=b3a4d33c';
import { esc, priceBlock } from './format.js?v=eca394e6';
import { icon, whatsappLink, WHATSAPP_MESSAGES } from './config.js?v=44d7ffa2';
import { initPage, whenVisible, openLightbox, setupLeadForm } from './ui.js?v=fa831a25';
import { galleryCard, lightboxItem, renderGalleryFilters } from './cards.js?v=9c91a000';

initPage();
loadHero();
loadProducts();
whenVisible(document.getElementById('gallery'), loadGalleryPreview);
whenVisible(document.getElementById('reviews'), loadReviews);
initReviewButtons();
setupLeadForm(document.getElementById('lead-form'), {
  source: () => 'Homepage quote form',
  successMessage: 'Request sent! We will call you back soon.',
});

async function loadProducts() {
  const container = document.getElementById('products-container');
  try {
    const products = await fetchProducts();
    if (!products.length) {
      container.innerHTML = '<p class="empty-state">New products are coming soon. WhatsApp us for current stock and prices.</p>';
      return;
    }
    container.innerHTML = products.map(productCard).join('');
  } catch (err) {
    console.error('Products not loaded:', err);
    container.innerHTML = '<p class="empty-state">Products could not be loaded. Please refresh, or WhatsApp us for prices.</p>';
  }
}

function productCard(product) {
  const name = product.name || 'Solar product';
  const desc = product.description || '';
  const cover = coverOf(product);
  const detailUrl = `product.html?id=${encodeURIComponent(product.id)}`;
  const capacity = Number(product.capacity) > 0
    ? `<span class="capacity-badge">${icon('bolt')} ${esc(product.capacity)} kW system</span>` : '';
  return `
    <article class="card">
      <a class="card-img-wrapper" href="${detailUrl}" tabindex="-1" aria-hidden="true">
        ${cover ? `<img src="${cover}" alt="" class="card-img" loading="lazy" decoding="async" width="480" height="360">` : '<div class="card-img card-img--empty"></div>'}
      </a>
      <div class="card-content">
        <div class="card-badges">
          <span class="badge">${esc(product.category || 'Product')}</span>
          ${capacity}
        </div>
        <h3 class="card-title"><a href="${detailUrl}">${esc(name)}</a></h3>
        <p class="card-text">${esc(desc.length > 100 ? `${desc.slice(0, 100)}…` : desc)}</p>
        ${priceBlock(product)}
        <div class="card-actions">
          <a href="${detailUrl}" class="btn btn-outline">View details</a>
          <a href="${esc(whatsappLink(WHATSAPP_MESSAGES.product(name)))}" class="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} WhatsApp</a>
        </div>
      </div>
    </article>`;
}

async function loadHero() {
  const carousel = document.getElementById('hero-carousel');
  let slides;
  try {
    slides = (await fetchHeroSlides()).filter((slide) => coverOf(slide));
  } catch (err) {
    console.error('Hero slides not loaded:', err);
    return;
  }
  // Keep the built-in photo when nothing is configured.
  if (!slides.length) return;

  const elements = slides.map((slide, i) => {
    const el = document.createElement('div');
    el.className = `hero-carousel-slide${i === 0 ? ' active' : ''}`;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', slide.title || 'Shree Krishna Enterprises');
    return el;
  });
  // Only the first slide's photo is fetched now; the rest load just before they
  // show. The built-in photo stays up until the first one is ready.
  const firstPhoto = await fullImageOf(slides[0], 0);
  if (firstPhoto) {
    elements[0].style.backgroundImage = `url("${firstPhoto}")`;
    elements[0].dataset.loaded = 'full';
  }
  carousel.replaceChildren(...elements);
  if (slides.length > 1) startCarousel(carousel, slides);
}

async function showSlideImage(el, slide) {
  if (el.dataset.loaded) return;
  el.dataset.loaded = 'preview';
  el.style.backgroundImage = `url("${coverOf(slide)}")`;
  const full = await fullImageOf(slide, 0);
  if (full) {
    el.style.backgroundImage = `url("${full}")`;
    el.dataset.loaded = 'full';
  }
}

function startCarousel(carousel, slides) {
  const SLIDE_MS = 4500;
  const elements = [...carousel.children];
  const bar = document.getElementById('carousel-progress');
  const progress = document.querySelector('.carousel-progress-bar-container');
  let current = 0;
  let timer = null;
  let paused = false;

  progress.hidden = false;
  const restartBar = () => {
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetHeight;
    if (!paused) {
      bar.style.transition = `width ${SLIDE_MS}ms linear`;
      bar.style.width = '100%';
    }
  };
  const show = (index) => {
    elements[current].classList.remove('active');
    current = (index + elements.length) % elements.length;
    showSlideImage(elements[current], slides[current]);
    elements[current].classList.add('active');
    // Warm up the following slide so it is ready when its turn comes.
    const next = (current + 1) % elements.length;
    fullImageOf(slides[next], 0);
    restartBar();
  };
  const play = () => {
    clearInterval(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => show(current + 1), SLIDE_MS);
    restartBar();
  };

  let startX = 0;
  let moved = false;
  carousel.addEventListener('pointerdown', (e) => { startX = e.clientX; moved = false; });
  carousel.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) {
      moved = true;
      paused = false;
      progress.classList.remove('paused');
      show(current + (dx < 0 ? 1 : -1));
      play();
    }
  });
  carousel.addEventListener('click', () => {
    if (moved) return;
    paused = !paused;
    progress.classList.toggle('paused', paused);
    if (paused) {
      clearInterval(timer);
      restartBar();
    } else {
      play();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else if (!paused) play();
  });

  fullImageOf(slides[1], 0);
  play();
}

async function loadGalleryPreview() {
  const grid = document.getElementById('gallery-grid-container');
  const filters = document.getElementById('gallery-filters-container');
  let items;
  try {
    ({ items } = await fetchGalleryPage(12));
  } catch (err) {
    console.error('Gallery not loaded:', err);
    grid.innerHTML = '<p class="empty-state">Photos could not be loaded. Please refresh the page.</p>';
    return;
  }
  if (!items.length) {
    grid.innerHTML = '<p class="empty-state">Photos are coming soon.</p>';
    return;
  }
  const render = (filter) => {
    const shown = items.filter((item) => filter === 'all' || item.category === filter).slice(0, 6);
    grid.innerHTML = shown.map(galleryCard).join('');
    grid.querySelectorAll('.gallery-card').forEach((card, i) => {
      card.addEventListener('click', () => openLightbox(shown.map(lightboxItem), i));
    });
  };
  renderGalleryFilters(filters, items, render);
  render('all');
}

async function loadReviews() {
  const section = document.getElementById('reviews');
  const container = document.getElementById('reviews-container');
  let reviews;
  try {
    reviews = await fetchReviews();
  } catch (err) {
    console.error('Reviews not loaded:', err);
    section.hidden = true;
    return;
  }
  // No reviews yet: hide the section instead of showing an empty one.
  if (!reviews.length) {
    section.hidden = true;
    return;
  }
  container.innerHTML = reviews.map(reviewCard).join('');
  container.querySelectorAll('.review-img-container').forEach((button) => {
    const review = reviews[Number(button.dataset.index)];
    button.addEventListener('click', () => openLightbox([{
      preview: coverOf(review),
      category: 'Customer photo',
      caption: review.name ? `Shared by ${review.name}` : '',
    }], 0));
  });
}

function reviewCard(review, index) {
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
  const name = review.name || 'Customer';
  const initials = name.split(/\s+/).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase();
  const photo = coverOf(review);
  return `
    <article class="review-card">
      <div>
        <div class="stars" role="img" aria-label="${rating} out of 5 stars">
          ${Array.from({ length: 5 }, (_, i) => icon(i < rating ? 'star' : 'star-o')).join('')}
        </div>
        <p class="card-text">“${esc(review.comment || '')}”</p>
        ${photo ? `<button type="button" class="review-img-container" data-index="${index}" aria-label="View photo from ${esc(name)}"><img src="${photo}" alt="" loading="lazy" decoding="async"></button>` : ''}
      </div>
      <div class="reviewer-profile">
        <div class="reviewer-avatar" aria-hidden="true">${esc(initials)}</div>
        <div class="reviewer-meta">
          <span class="reviewer-name">${esc(name)}</span>
          ${review.verified ? `<span class="reviewer-designation">${icon('check-circle')} Verified buyer</span>` : ''}
        </div>
      </div>
    </article>`;
}

function initReviewButtons() {
  const container = document.getElementById('reviews-container');
  const step = (dir) => {
    const width = container.querySelector('.review-card')?.offsetWidth || 320;
    container.scrollBy({ left: dir * (width + 12), behavior: 'smooth' });
  };
  document.getElementById('prev-review-btn')?.addEventListener('click', () => step(-1));
  document.getElementById('next-review-btn')?.addEventListener('click', () => step(1));
}
