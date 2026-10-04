// Admin dashboard: products, reviews, leads, hero slides, gallery, backup and
// photo optimisation. Every value read from Firestore is escaped with esc()
// before it is put into HTML: leads are typed by the public.
import { auth, db, usingEmulator } from './firebase.js?v=1608c3ca';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
import {
  collection, doc, getDoc, getDocs, writeBatch, updateDoc, deleteDoc, addDoc,
  serverTimestamp, deleteField,
} from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
import { esc, safeImageSrc, formatINR, formatDate, newestFirst, phoneDigits } from './util.js?v=e836cea1';
import { SIZES, makeThumb, addMediaToBatch, loadMedia, legacyImagesOf, isLegacyImage } from './images.js?v=5018f028';

const state = { products: [], reviews: [], leads: [], slides: [], gallery: [] };
// PM Surya Ghar central subsidy cap for residential rooftop systems.
const CENTRAL_SUBSIDY_MAX = 78000;
const $ = (id) => document.getElementById(id);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.replace(`index.html${location.search}`);
    return;
  }
  let allowed;
  try {
    allowed = (await getDoc(doc(db, 'admins', user.uid))).exists();
  } catch (err) {
    allowed = err.code === 'permission-denied' ? false : null;
  }
  if (allowed === null) {
    showBlockingMessage('Could not reach the database', '<p>Check your internet connection and reload the page.</p>');
    return;
  }
  if (!allowed) {
    showBlockingMessage('This account is not an admin', `
      <p>You are signed in as <strong>${esc(user.email)}</strong>, but this account is not on the admin list.</p>
      <p>The project owner can grant access in the Firebase console: Firestore Database &rarr; collection
      <strong>admins</strong> &rarr; add a document whose ID is this user ID:</p>
      <code>${esc(user.uid)}</code>`);
    return;
  }
  document.body.classList.remove('auth-pending');
  if (usingEmulator) $('emulator-badge').hidden = false;
  loadAll();
});

function showBlockingMessage(title, html) {
  document.body.classList.remove('auth-pending');
  document.body.innerHTML = `
    <div class="access-denied">
      <h1 style="font-size: 1.4rem; margin-bottom: 1rem;">${esc(title)}</h1>
      ${html}
      <button type="button" class="btn btn-primary" id="denied-logout" style="margin-top: 1rem;">Sign out</button>
    </div>`;
  $('denied-logout').addEventListener('click', () => signOut(auth));
}

// ---------- Navigation ----------

const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = $('admin-sidebar-overlay');

function closeSidebar() {
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
}

$('toggle-sidebar').addEventListener('click', () => {
  sidebar.classList.toggle('active');
  sidebarOverlay.classList.toggle('active');
});
sidebarOverlay.addEventListener('click', closeSidebar);
$('logout-btn').addEventListener('click', (e) => {
  e.preventDefault();
  signOut(auth);
});

function showSection(targetId) {
  document.querySelectorAll('.nav-item[data-target]').forEach((nav) => {
    nav.classList.toggle('active', nav.dataset.target === targetId);
  });
  document.querySelectorAll('.dashboard-section').forEach((section) => {
    section.classList.toggle('active', section.id === targetId);
  });
  closeSidebar();
  window.scrollTo({ top: 0 });
}

document.querySelectorAll('.nav-item[data-target], .stat-card[data-target]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(el.dataset.target);
  });
});

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => btn.closest('.modal').classList.remove('active'));
});

// One listener for every table button: <button data-action="..." data-id="...">.
const actions = {};
document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-action]');
  if (button && actions[button.dataset.action]) actions[button.dataset.action](button.dataset.id, button);
});

// ---------- Loading ----------

async function fetchAll(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst);
}

async function loadAll() {
  await Promise.all([loadProducts(), loadReviews(), loadLeads(), loadSlides(), loadGallery()]);
  updateToolsStatus();
}

function fillTable(tbodyId, items, rowHtml, columns, emptyText) {
  $(tbodyId).innerHTML = items.length
    ? items.map(rowHtml).join('')
    : `<tr><td colspan="${columns}" class="muted">${esc(emptyText)}</td></tr>`;
}

async function loadList(key, collectionName, tbodyId, columns, rowHtml, emptyText, statId) {
  $(tbodyId).innerHTML = `<tr><td colspan="${columns}">Loading…</td></tr>`;
  try {
    state[key] = await fetchAll(collectionName);
    fillTable(tbodyId, state[key], rowHtml, columns, emptyText);
    $(statId).textContent = state[key].length;
  } catch (err) {
    console.error(`${collectionName} not loaded:`, err);
    $(tbodyId).innerHTML = `<tr><td colspan="${columns}" style="color: #ef4444;">Could not load. Reload the page.</td></tr>`;
  }
}

function coverOf(record) {
  return safeImageSrc(record.cover || legacyImagesOf(record)[0] || record.image);
}

function statusBadge(active, on = 'Active', off = 'Hidden') {
  return `<span class="badge ${active ? 'badge-success' : 'badge-warning'}">${active ? on : off}</span>`;
}

function thumbCell(record) {
  const src = coverOf(record);
  return `<td data-label="Image">${src ? `<img class="thumb" src="${src}" alt="">` : '<span class="muted">No photo</span>'}</td>`;
}

function actionButtons(...buttons) {
  return `<td data-label="Actions"><div class="table-actions">${buttons.join('')}</div></td>`;
}

function button(action, id, label, style = 'btn-primary') {
  return `<button type="button" class="btn ${style} btn-sm" data-action="${action}" data-id="${esc(id)}">${esc(label)}</button>`;
}

// ---------- Products ----------

const loadProducts = () => loadList('products', 'products', 'products-table-body', 5, productRow, 'No products yet.', 'stat-products');

function productRow(p) {
  const meta = [
    Number(p.capacity) > 0 ? `<div>${esc(p.capacity)} kW</div>` : '',
    p.price ? `<div>Price: ${formatINR(p.price)}</div>` : '',
    p.discountedPrice ? `<div>Discounted: ${formatINR(p.discountedPrice)}</div>` : '',
    p.subsidy ? `<div>Central subsidy: −${formatINR(Math.min(Number(p.subsidy), CENTRAL_SUBSIDY_MAX))}</div>` : '',
    p.stateSubsidy != null ? `<div>State subsidy*: ${Number(p.stateSubsidy) > 0 ? `−${formatINR(p.stateSubsidy)}` : 'none'}</div>` : '',
  ].join('');
  return `
    <tr>
      ${thumbCell(p)}
      <td data-label="Product"><div class="table-cell-details"><strong>${esc(p.name)}</strong>
        <div class="product-prices-meta" style="font-size: 0.8rem; margin-top: 5px; color: var(--text-muted);">${meta}</div></div></td>
      <td data-label="Category">${esc(p.category)}</td>
      <td data-label="Status">${statusBadge(p.isActive)}</td>
      ${actionButtons(button('edit-product', p.id, 'Edit'), button('delete-product', p.id, 'Delete', 'btn-danger'))}
    </tr>`;
}

// Photos in the open product form: { id } for stored media, { source } for new ones.
let productImages = [];
let productMediaBefore = [];

function renderImagePreviews(containerId, images, onRemove) {
  const container = $(containerId);
  container.innerHTML = images.map((img, i) => `
    <div class="image-preview">
      ${img.src ? `<img src="${safeImageSrc(img.src) || (img.src.startsWith('blob:') ? img.src : '')}" alt="">` : '<span class="muted" style="font-size: 10px; padding: 4px;">Loading…</span>'}
      ${i === 0 ? '<span class="first-label">Cover</span>' : ''}
      <button type="button" class="remove-img" data-index="${i}" aria-label="Remove photo">&times;</button>
    </div>`).join('');
  container.querySelectorAll('.remove-img').forEach((btn) => {
    btn.addEventListener('click', () => onRemove(Number(btn.dataset.index)));
  });
}

function renderProductImages() {
  renderImagePreviews('product-images-preview-container', productImages, (i) => {
    productImages.splice(i, 1);
    renderProductImages();
  });
}

function addSpecRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
  row.innerHTML = `
    <input type="text" class="spec-key" placeholder="e.g. Dimensions" maxlength="80" style="flex: 1; padding: 0.4rem 0.6rem; font-size: 0.85rem;" required>
    <input type="text" class="spec-value" placeholder="e.g. 2000 x 1000 mm" maxlength="200" style="flex: 1; padding: 0.4rem 0.6rem; font-size: 0.85rem;" required>
    <button type="button" class="btn btn-danger btn-sm" aria-label="Remove specification">&times;</button>`;
  row.querySelector('.spec-key').value = key;
  row.querySelector('.spec-value').value = value;
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('specs-input-container').append(row);
}
$('add-spec-row-btn').addEventListener('click', () => addSpecRow());

async function openProductModal(id = null) {
  const form = $('product-form');
  form.reset();
  $('product-id').value = id || '';
  $('modal-title').textContent = id ? 'Edit product' : 'Add product';
  $('specs-input-container').innerHTML = '';
  productImages = [];
  productMediaBefore = [];
  const p = id && state.products.find((x) => x.id === id);
  if (p) {
    $('product-name').value = p.name || '';
    $('product-category').value = p.category || 'Solar Panel';
    $('product-description').value = p.description || '';
    $('product-price').value = p.price ?? '';
    $('product-discounted-price').value = p.discountedPrice ?? '';
    $('product-capacity').value = p.capacity ?? '';
    // Older products stored central + state together; the central part is capped.
    $('product-subsidy').value = p.subsidy ? Math.min(Number(p.subsidy), CENTRAL_SUBSIDY_MAX) : '';
    $('product-state-subsidy').value = p.stateSubsidy ?? '';
    $('product-active').checked = p.isActive !== false;
    (p.specifications || []).forEach((s) => addSpecRow(s.key, s.value));
    if (Array.isArray(p.media)) {
      productMediaBefore = [...p.media];
      productImages = p.media.map((mediaId) => ({ id: mediaId, src: '' }));
      productImages.forEach((img) => loadMedia(img.id).then((src) => {
        img.src = src;
        renderProductImages();
      }));
    } else {
      // Old-format photos are converted when the product is saved.
      productImages = legacyImagesOf(p).map((src) => ({ src, source: src }));
    }
  }
  renderProductImages();
  $('product-modal').classList.add('active');
}

$('add-product-btn').addEventListener('click', () => openProductModal());
actions['edit-product'] = (id) => openProductModal(id);

$('product-image-file').addEventListener('change', (e) => {
  for (const file of e.target.files) productImages.push({ src: URL.createObjectURL(file), source: file });
  e.target.value = '';
  renderProductImages();
});

function numberOrNull(id) {
  const value = $(id).value.trim();
  return value === '' ? null : Number(value);
}

$('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = $('save-product-btn');
  const id = $('product-id').value;
  if (productImages.some((img) => img.id && !img.src)) {
    alert('Photos are still loading. Try again in a moment.');
    return;
  }
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  try {
    const batch = writeBatch(db);
    const media = [];
    for (const img of productImages) {
      media.push(img.id || await addMediaToBatch(batch, img.source, SIZES.product.full));
    }
    const first = productImages[0];
    const data = {
      name: $('product-name').value.trim(),
      category: $('product-category').value,
      description: $('product-description').value.trim(),
      price: numberOrNull('product-price'),
      discountedPrice: numberOrNull('product-discounted-price'),
      capacity: numberOrNull('product-capacity'),
      subsidy: numberOrNull('product-subsidy'),
      stateSubsidy: numberOrNull('product-state-subsidy'),
      isActive: $('product-active').checked,
      specifications: [...document.querySelectorAll('.spec-row')]
        .map((row) => ({ key: row.querySelector('.spec-key').value.trim(), value: row.querySelector('.spec-value').value.trim() }))
        .filter((s) => s.key && s.value),
      media,
      cover: first ? await makeThumb(first.source || first.src, SIZES.product.thumb) : '',
      updatedAt: serverTimestamp(),
    };
    if (id) {
      batch.update(doc(db, 'products', id), { ...data, imageURL: deleteField(), images: deleteField() });
      productMediaBefore.filter((m) => !media.includes(m)).forEach((m) => batch.delete(doc(db, 'media', m)));
    } else {
      batch.set(doc(collection(db, 'products')), { ...data, createdAt: serverTimestamp() });
    }
    await batch.commit();
    $('product-modal').classList.remove('active');
    await loadProducts();
    updateToolsStatus();
  } catch (err) {
    console.error(err);
    alert(`Product not saved: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save product';
  }
});

async function deleteWithMedia(collectionName, record) {
  const batch = writeBatch(db);
  batch.delete(doc(db, collectionName, record.id));
  (Array.isArray(record.media) ? record.media : []).forEach((m) => batch.delete(doc(db, 'media', m)));
  await batch.commit();
}

actions['delete-product'] = async (id) => {
  const p = state.products.find((x) => x.id === id);
  if (!p || !confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
  try {
    await deleteWithMedia('products', p);
    await loadProducts();
  } catch (err) {
    console.error(err);
    alert('Product not deleted.');
  }
};

// ---------- Reviews ----------

const loadReviews = () => loadList('reviews', 'reviews', 'reviews-table-body', 5, reviewRow, 'No reviews yet.', 'stat-reviews');

function reviewRow(r) {
  const comment = r.comment || '';
  const shown = r.status === 'approved';
  const photo = coverOf(r);
  return `
    <tr>
      <td data-label="Reviewer"><div class="table-cell-details"><strong>${esc(r.name || 'Anonymous')}</strong>
        ${r.verified ? '<div class="muted" style="font-style: normal;">Verified buyer</div>' : ''}
        ${photo ? `<img class="thumb" src="${photo}" alt="" style="margin-top: 5px;">` : ''}</div></td>
      <td data-label="Rating">${esc(r.rating || 5)}/5</td>
      <td data-label="Comment">${esc(comment.length > 40 ? `${comment.slice(0, 40)}…` : comment)}</td>
      <td data-label="Status">${statusBadge(shown, 'Shown', 'Hidden')}</td>
      ${actionButtons(
        button('toggle-review', r.id, shown ? 'Hide' : 'Show', 'btn-outline'),
        button('delete-review', r.id, 'Delete', 'btn-danger'),
      )}
    </tr>`;
}

actions['toggle-review'] = async (id) => {
  const r = state.reviews.find((x) => x.id === id);
  if (!r) return;
  try {
    await updateDoc(doc(db, 'reviews', id), { status: r.status === 'approved' ? 'hidden' : 'approved' });
    await loadReviews();
  } catch (err) {
    console.error(err);
    alert('Review not updated.');
  }
};

actions['delete-review'] = async (id) => {
  if (!confirm('Delete this review? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'reviews', id));
    await loadReviews();
  } catch (err) {
    console.error(err);
    alert('Review not deleted.');
  }
};

let reviewPhoto = null;

$('add-review-btn').addEventListener('click', () => {
  $('review-form').reset();
  reviewPhoto = null;
  $('review-image-preview-container').hidden = true;
  $('review-modal').classList.add('active');
});

$('review-image-file').addEventListener('change', (e) => {
  reviewPhoto = e.target.files[0] || null;
  $('review-image-preview-container').hidden = !reviewPhoto;
  if (reviewPhoto) $('review-image-preview').src = URL.createObjectURL(reviewPhoto);
});

$('review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = $('save-review-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  try {
    await addDoc(collection(db, 'reviews'), {
      name: $('review-name').value.trim(),
      rating: Number($('review-rating').value),
      comment: $('review-comment').value.trim(),
      verified: $('review-verified').checked,
      image: reviewPhoto ? await makeThumb(reviewPhoto, SIZES.review.thumb) : null,
      status: 'approved',
      createdAt: serverTimestamp(),
    });
    $('review-modal').classList.remove('active');
    await loadReviews();
  } catch (err) {
    console.error(err);
    alert(`Review not saved: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save review';
  }
});

// ---------- Leads ----------

const loadLeads = () => loadList('leads', 'leads', 'leads-table-body', 6, leadRow, 'No enquiries yet.', 'stat-leads');

function leadRow(l) {
  const message = l.message || '';
  return `
    <tr>
      <td data-label="Date">${esc(formatDate(l.createdAt))}</td>
      <td data-label="Name">${esc(l.name || 'Unknown')}</td>
      <td data-label="Phone">${esc(l.phone || '—')}</td>
      <td data-label="Message">${esc(message.length > 30 ? `${message.slice(0, 30)}…` : message)}</td>
      <td data-label="Status">${statusBadge(l.status === 'contacted', 'Contacted', 'New')}</td>
      ${actionButtons(
        button('view-lead', l.id, 'View'),
        l.status !== 'contacted' ? button('contact-lead', l.id, 'Mark contacted', 'btn-success') : '',
        button('delete-lead', l.id, 'Delete', 'btn-danger'),
      )}
    </tr>`;
}

actions['view-lead'] = (id) => {
  const lead = state.leads.find((x) => x.id === id);
  if (!lead) return;
  $('view-lead-name').textContent = lead.name || 'Unknown';
  $('view-lead-phone').textContent = lead.phone || '—';
  $('view-lead-date').textContent = formatDate(lead.createdAt, true);
  $('view-lead-source').textContent = lead.source || 'Website form';
  const status = $('view-lead-status');
  status.className = `badge ${lead.status === 'contacted' ? 'badge-success' : 'badge-warning'}`;
  status.textContent = lead.status === 'contacted' ? 'Contacted' : 'New';
  $('view-lead-message').textContent = lead.message || 'No message.';

  const digits = phoneDigits(lead.phone);
  $('lead-call-btn').hidden = !digits;
  $('lead-whatsapp-btn').hidden = !digits;
  if (digits) {
    $('lead-call-btn').href = `tel:+${digits}`;
    const text = `नमस्ते ${lead.name || ''} जी, श्री कृष्णा एंटरप्राइजेज से। हमें आपकी सोलर की पूछताछ मिली है। बताइए, हम आपकी क्या मदद कर सकते हैं?`;
    $('lead-whatsapp-btn').href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
  $('lead-action-btn').hidden = lead.status === 'contacted';
  $('lead-action-btn').dataset.id = id;
  $('lead-modal').classList.add('active');
};

actions['contact-lead'] = async (id) => {
  try {
    await updateDoc(doc(db, 'leads', id), { status: 'contacted' });
    $('lead-modal').classList.remove('active');
    await loadLeads();
  } catch (err) {
    console.error(err);
    alert('Lead not updated.');
  }
};

actions['delete-lead'] = async (id) => {
  if (!confirm('Delete this enquiry permanently?')) return;
  try {
    await deleteDoc(doc(db, 'leads', id));
    await loadLeads();
  } catch (err) {
    console.error(err);
    alert('Lead not deleted.');
  }
};

// ---------- Hero slides ----------

const loadSlides = () => loadList('slides', 'hero_slides', 'slides-table-body', 4, slideRow, 'No slides: the website shows its built-in photo.', 'stat-slides');

function slideRow(s) {
  return `
    <tr>
      ${thumbCell(s)}
      <td data-label="Title">${s.title ? esc(s.title) : '<span class="muted">No title</span>'}</td>
      <td data-label="Status">${statusBadge(s.isActive)}</td>
      ${actionButtons(button('edit-slide', s.id, 'Edit'), button('delete-slide', s.id, 'Delete', 'btn-danger'))}
    </tr>`;
}

let slidePhoto = null;

function openSlideModal(id = null) {
  $('slide-form').reset();
  $('slide-id').value = id || '';
  $('slide-modal-title').textContent = id ? 'Edit hero slide' : 'Add hero slide';
  slidePhoto = null;
  const s = id && state.slides.find((x) => x.id === id);
  $('slide-active').checked = s ? s.isActive !== false : true;
  $('slide-title').value = s?.title || '';
  const preview = s ? coverOf(s) : '';
  $('slide-image-preview-container').hidden = !preview;
  $('slide-image-preview').src = preview;
  $('slide-modal').classList.add('active');
}

$('add-slide-btn').addEventListener('click', () => openSlideModal());
actions['edit-slide'] = (id) => openSlideModal(id);

$('slide-image-file').addEventListener('change', (e) => {
  slidePhoto = e.target.files[0] || null;
  if (slidePhoto) {
    $('slide-image-preview').src = URL.createObjectURL(slidePhoto);
    $('slide-image-preview-container').hidden = false;
  }
});

// Saves a one-photo record (hero slide or gallery item) with its media document.
async function saveSinglePhotoRecord(collectionName, existing, fields, photo, size) {
  const batch = writeBatch(db);
  const ref = existing ? doc(db, collectionName, existing.id) : doc(collection(db, collectionName));
  const data = { ...fields, updatedAt: serverTimestamp() };
  const legacy = existing ? legacyImagesOf(existing)[0] : null;
  const source = photo || legacy;
  if (source) {
    data.media = [await addMediaToBatch(batch, source, size)];
    data.cover = await makeThumb(source);
    (Array.isArray(existing?.media) ? existing.media : []).forEach((m) => batch.delete(doc(db, 'media', m)));
  }
  if (existing) {
    batch.update(ref, legacy ? { ...data, imageURL: deleteField() } : data);
  } else {
    batch.set(ref, { ...data, createdAt: serverTimestamp() });
  }
  await batch.commit();
}

$('slide-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('slide-id').value;
  const existing = id ? state.slides.find((x) => x.id === id) : null;
  if (!existing && !slidePhoto) {
    alert('Choose a photo for the slide.');
    return;
  }
  const saveBtn = $('save-slide-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  try {
    await saveSinglePhotoRecord('hero_slides', existing, {
      title: $('slide-title').value.trim(),
      isActive: $('slide-active').checked,
    }, slidePhoto, SIZES.hero.full);
    $('slide-modal').classList.remove('active');
    await loadSlides();
    updateToolsStatus();
  } catch (err) {
    console.error(err);
    alert(`Slide not saved: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save slide';
  }
});

actions['delete-slide'] = async (id) => {
  const s = state.slides.find((x) => x.id === id);
  if (!s || !confirm('Delete this slide?')) return;
  try {
    await deleteWithMedia('hero_slides', s);
    await loadSlides();
  } catch (err) {
    console.error(err);
    alert('Slide not deleted.');
  }
};

// ---------- Gallery ----------

const loadGallery = () => loadList('gallery', 'gallery', 'gallery-table-body', 5, galleryRow, 'No gallery photos yet.', 'stat-gallery');

function galleryRow(g) {
  return `
    <tr>
      ${thumbCell(g)}
      <td data-label="Caption">${g.caption ? esc(g.caption) : '<span class="muted">No caption</span>'}</td>
      <td data-label="Category">${esc(g.category)}</td>
      <td data-label="Status">${statusBadge(g.isActive)}</td>
      ${actionButtons(button('edit-gallery', g.id, 'Edit'), button('delete-gallery', g.id, 'Delete', 'btn-danger'))}
    </tr>`;
}

let galleryPhotos = [];

function renderGalleryPhotos() {
  renderImagePreviews('gallery-images-preview-container', galleryPhotos, (i) => {
    galleryPhotos.splice(i, 1);
    renderGalleryPhotos();
  });
}

function openGalleryModal(id = null) {
  $('gallery-form').reset();
  $('gallery-id').value = id || '';
  $('gallery-modal-title').textContent = id ? 'Edit gallery photo' : 'Add gallery photos';
  $('gallery-image-file').multiple = !id;
  $('gallery-image-hint').textContent = id
    ? 'Choose a photo only if you want to replace the current one.'
    : 'Select one or more photos. Each becomes its own gallery item with this caption and category.';
  galleryPhotos = [];
  const g = id && state.gallery.find((x) => x.id === id);
  if (g) {
    $('gallery-caption').value = g.caption || '';
    $('gallery-category').value = g.category || 'Other';
    $('gallery-active').checked = g.isActive !== false;
    const preview = coverOf(g);
    if (preview) galleryPhotos = [{ src: preview, existing: true }];
  }
  renderGalleryPhotos();
  $('gallery-modal').classList.add('active');
}

$('add-gallery-btn').addEventListener('click', () => openGalleryModal());
actions['edit-gallery'] = (id) => openGalleryModal(id);

$('gallery-image-file').addEventListener('change', (e) => {
  const editing = Boolean($('gallery-id').value);
  const added = [...e.target.files].map((file) => ({ src: URL.createObjectURL(file), source: file }));
  galleryPhotos = editing ? added.slice(0, 1) : [...galleryPhotos, ...added];
  e.target.value = '';
  renderGalleryPhotos();
});

$('gallery-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('gallery-id').value;
  const existing = id ? state.gallery.find((x) => x.id === id) : null;
  const newPhotos = galleryPhotos.filter((p) => p.source);
  if (!existing && !newPhotos.length) {
    alert('Choose at least one photo.');
    return;
  }
  const fields = {
    caption: $('gallery-caption').value.trim(),
    category: $('gallery-category').value,
    isActive: $('gallery-active').checked,
  };
  const saveBtn = $('save-gallery-btn');
  saveBtn.disabled = true;
  try {
    if (existing) {
      saveBtn.textContent = 'Saving…';
      await saveSinglePhotoRecord('gallery', existing, fields, newPhotos[0]?.source || null, SIZES.gallery.full);
    } else {
      // One write per photo keeps each request small, even for big uploads.
      for (let i = 0; i < newPhotos.length; i += 1) {
        saveBtn.textContent = `Saving ${i + 1} of ${newPhotos.length}…`;
        await saveSinglePhotoRecord('gallery', null, fields, newPhotos[i].source, SIZES.gallery.full);
      }
    }
    $('gallery-modal').classList.remove('active');
    await loadGallery();
    updateToolsStatus();
  } catch (err) {
    console.error(err);
    alert(`Gallery not saved: ${err.message}`);
    await loadGallery();
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

actions['delete-gallery'] = async (id) => {
  const g = state.gallery.find((x) => x.id === id);
  if (!g || !confirm('Delete this gallery photo?')) return;
  try {
    await deleteWithMedia('gallery', g);
    await loadGallery();
  } catch (err) {
    console.error(err);
    alert('Gallery photo not deleted.');
  }
};

// ---------- Backup and photo optimisation ----------

const BACKUP_COLLECTIONS = ['products', 'hero_slides', 'gallery', 'reviews', 'leads', 'media'];

$('backup-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Preparing backup…';
  try {
    const backup = { exportedAt: new Date().toISOString(), collections: {} };
    for (const name of BACKUP_COLLECTIONS) {
      const snap = await getDocs(collection(db, name));
      backup.collections[name] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    }
    // `this[key]` is the raw value: Firestore timestamps would otherwise be
    // serialised by their own toJSON() as { seconds, nanoseconds }.
    const json = JSON.stringify(backup, function readableDates(key, value) {
      const raw = this[key];
      return raw?.toDate ? raw.toDate().toISOString() : value;
    }, 2);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    link.download = `ske-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  } catch (err) {
    console.error(err);
    alert(`Backup failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download backup';
  }
});

function legacyRecords() {
  const jobs = [];
  state.products.filter((p) => !Array.isArray(p.media) && legacyImagesOf(p).length)
    .forEach((p) => jobs.push({ collectionName: 'products', record: p, size: SIZES.product }));
  state.slides.filter((s) => !Array.isArray(s.media) && legacyImagesOf(s).length)
    .forEach((s) => jobs.push({ collectionName: 'hero_slides', record: s, size: SIZES.hero }));
  state.gallery.filter((g) => !Array.isArray(g.media) && legacyImagesOf(g).length)
    .forEach((g) => jobs.push({ collectionName: 'gallery', record: g, size: SIZES.gallery }));
  state.reviews.filter((r) => isLegacyImage(r.image) && r.image.length > 120 * 1024)
    .forEach((r) => jobs.push({ collectionName: 'reviews', record: r, size: SIZES.review }));
  return jobs;
}

function updateToolsStatus() {
  const pending = legacyRecords().length;
  $('optimize-btn').disabled = pending === 0;
  $('optimize-status').textContent = pending
    ? `${pending} record(s) still store full-size photos inline. Optimising makes the website download far less.`
    : 'All photos use the optimised format.';
}

async function optimiseRecord({ collectionName, record, size }) {
  const ref = doc(db, collectionName, record.id);
  if (collectionName === 'reviews') {
    await updateDoc(ref, { image: await makeThumb(record.image, size.thumb) });
    return;
  }
  const sources = legacyImagesOf(record);
  const batch = writeBatch(db);
  const media = [];
  for (const source of sources) media.push(await addMediaToBatch(batch, source, size.full));
  batch.update(ref, {
    media,
    cover: await makeThumb(sources[0], size.thumb),
    imageURL: deleteField(),
    images: deleteField(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

$('optimize-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const jobs = legacyRecords();
  if (!jobs.length) return;
  if (!confirm(`Convert photos on ${jobs.length} record(s) to the optimised format?\n\nDownload a backup first if you have not already.`)) return;
  btn.disabled = true;
  const status = $('optimize-status');
  let done = 0;
  const failed = [];
  for (const job of jobs) {
    status.textContent = `Optimising ${done + 1} of ${jobs.length}…`;
    try {
      await optimiseRecord(job);
    } catch (err) {
      console.error(err);
      failed.push(`${job.collectionName}/${job.record.id}: ${err.message}`);
    }
    done += 1;
  }
  await loadAll();
  if (failed.length) status.textContent += `\nNot converted:\n${failed.join('\n')}`;
});
