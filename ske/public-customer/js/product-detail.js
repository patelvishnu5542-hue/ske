// Product page: photos, price with subsidy, specifications and callback form.
import { fetchProduct, coverOf, fullImageOf, mediaCount } from './data.js?v=b3a4d33c';
import { esc, priceBlock, centralSubsidyFor, stateSubsidyFor, formatINR } from './format.js?v=eca394e6';
import { icon, whatsappLink, WHATSAPP_MESSAGES } from './config.js?v=44d7ffa2';
import { initPage, setupLeadForm } from './ui.js?v=fa831a25';

const productId = new URLSearchParams(location.search).get('id');
let product = null;

initPage();
setupLeadForm(document.getElementById('product-lead-form'), {
  source: () => `Product page: ${product?.name || productId}`,
  buildMessage: () => `Callback request: interested in "${product?.name || 'a product'}" (ID: ${productId})`,
  successMessage: 'Callback requested! We will call you soon.',
});
load();

async function load() {
  if (!productId) {
    showNotFound();
    return;
  }
  try {
    product = await fetchProduct(productId);
  } catch (err) {
    console.error('Product not loaded:', err);
    document.getElementById('detail-info-container').innerHTML =
      '<p class="empty-state">This product could not be loaded. Please refresh the page.</p>';
    return;
  }
  if (!product || product.isActive === false) {
    showNotFound();
    return;
  }
  document.title = `${product.name || 'Product'} | Shree Krishna Enterprises`;
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', (product.description || '').slice(0, 160));
  renderInfo();
  renderSpecs();
  renderGallery();
}

function showNotFound() {
  document.title = 'Product not found | Shree Krishna Enterprises';
  document.getElementById('detail-image-container').innerHTML = '';
  document.getElementById('detail-info-container').innerHTML = `
    <h1 class="product-name-title">Product not found</h1>
    <p class="product-desc-text">This product may have been removed. See all products on our homepage, or ask us on WhatsApp.</p>
    <a href="index.html#products" class="btn btn-outline">View all products</a>`;
  document.querySelector('.specs-section')?.setAttribute('hidden', '');
}

function renderInfo() {
  const name = product.name || 'Solar product';
  const central = centralSubsidyFor(product);
  const state = stateSubsidyFor(product);
  const capacity = Number(product.capacity) > 0
    ? `<span class="capacity-badge capacity-badge--large">${icon('bolt')} ${esc(product.capacity)} kW system</span>` : '';
  const subsidyNote = central > 0 && (product.price || product.discountedPrice) ? `
    <div class="subsidy-info-box">
      <div class="subsidy-info-title">${icon('info')} Rooftop solar subsidy</div>
      <div class="subsidy-info-desc">
        <p><strong>PM Surya Ghar Muft Bijli Yojana:</strong> central subsidy of ${formatINR(central)} for this system,
          paid directly to your bank account.</p>
        ${state > 0 ? `<p><strong>Rajasthan state subsidy*:</strong> an extra ${formatINR(state)} for eligible households.</p>
        <p class="subsidy-info-small">*Not every household qualifies for the state subsidy. We check your eligibility
          and help with both applications.</p>` : '<p>We help you with the subsidy application.</p>'}
      </div>
    </div>` : '';

  document.getElementById('detail-info-container').innerHTML = `
    <div class="card-badges">
      <span class="product-category-badge">${esc(product.category || 'Waaree Solar')}</span>
      ${capacity}
    </div>
    <h1 class="product-name-title">${esc(name)}</h1>
    <p class="product-desc-text">${esc(product.description || '')}</p>
    ${priceBlock(product, { large: true })}
    ${subsidyNote}
    <div class="detail-actions">
      <a href="#product-lead-form" class="btn btn-outline">Request callback</a>
      <a href="${esc(whatsappLink(WHATSAPP_MESSAGES.product(name)))}" class="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Ask on WhatsApp</a>
    </div>`;
}

function renderSpecs() {
  const body = document.getElementById('specs-table-body');
  const specs = Array.isArray(product.specifications) ? product.specifications : [];
  body.innerHTML = specs.length
    ? specs.map((spec) => `<tr><th scope="row" class="specs-key">${esc(spec.key)}</th><td class="specs-val">${esc(spec.value)}</td></tr>`).join('')
    : '<tr><td colspan="2" class="specs-empty">Ask us on WhatsApp for the full datasheet.</td></tr>';
}

function renderGallery() {
  const stage = document.getElementById('detail-image-container');
  const strip = document.getElementById('detail-thumbnails-container');
  const total = Math.max(1, mediaCount(product));
  const name = product.name || 'Solar product';
  let current = 0;
  let timer = null;

  const preview = coverOf(product);
  stage.innerHTML = `
    <img id="main-product-img" src="${preview}" alt="${esc(name)}" decoding="async" width="600" height="450">
    ${total > 1 ? `
      <button type="button" class="showcase-arrow prev" aria-label="Previous photo">${icon('chevron-left')}</button>
      <button type="button" class="showcase-arrow next" aria-label="Next photo">${icon('chevron-right')}</button>` : ''}`;
  const main = document.getElementById('main-product-img');
  if (!preview) main.hidden = true;

  const show = async (index) => {
    current = (index + total) % total;
    const wanted = current;
    strip.querySelectorAll('.thumbnail-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === current);
      btn.setAttribute('aria-current', String(i === current));
    });
    const src = await fullImageOf(product, wanted);
    if (src && current === wanted) {
      main.src = src;
      main.hidden = false;
    }
  };
  const restart = () => {
    clearInterval(timer);
    if (total > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = setInterval(() => show(current + 1), 5000);
    }
  };

  show(0);
  if (total < 2) return;

  stage.querySelector('.prev').addEventListener('click', () => { show(current - 1); restart(); });
  stage.querySelector('.next').addEventListener('click', () => { show(current + 1); restart(); });
  strip.innerHTML = Array.from({ length: total }, (_, i) =>
    `<button type="button" class="thumbnail-btn${i === 0 ? ' active' : ''}" aria-label="Photo ${i + 1}">${i + 1}</button>`).join('');
  strip.querySelectorAll('.thumbnail-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => { show(i); restart(); });
  });
  // Fill the thumbnail buttons with photos once they are loaded.
  for (let i = 0; i < total; i += 1) {
    fullImageOf(product, i).then((src) => {
      if (src) strip.children[i].innerHTML = `<img src="${src}" alt="" decoding="async">`;
    });
  }
  restart();
}
