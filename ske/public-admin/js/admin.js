import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
onAuthStateChanged(auth, (user) => {
 if (!user) {
 window.location.href = "index.html";
 } else {
 initDashboard();
 }
});
document.getElementById('logout-btn').addEventListener('click', () => {
 signOut(auth);
});
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('admin-sidebar-overlay');
const toggleBtn = document.getElementById('toggle-sidebar');
function closeSidebarMobile() {
 if (sidebar && overlay) {
 sidebar.classList.remove('active');
 overlay.classList.remove('active');
 }
}
if (toggleBtn && sidebar && overlay) {
 toggleBtn.addEventListener('click', () => {
 sidebar.classList.toggle('active');
 overlay.classList.toggle('active');
 });
 overlay.addEventListener('click', () => {
 closeSidebarMobile();
 });
}
function navigateToSection(targetId) {
 if (!targetId) return;
 document.querySelectorAll('.nav-item').forEach(nav => {
 if (nav.getAttribute('data-target') === targetId) {
 nav.classList.add('active');
 } else {
 nav.classList.remove('active');
 }
 });
 document.querySelectorAll('.dashboard-section').forEach(sec => {
 if (sec.id === targetId) {
 sec.classList.add('active');
 } else {
 sec.classList.remove('active');
 }
 });
 closeSidebarMobile();
 window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.nav-item').forEach(item => {
 if (item.id === 'logout-btn') return;
 item.addEventListener('click', (e) => {
 e.preventDefault();
 const targetId = item.getAttribute('data-target');
 navigateToSection(targetId);
 });
});
document.querySelectorAll('.stat-card').forEach(card => {
 card.addEventListener('click', () => {
 const targetId = card.getAttribute('data-target');
 navigateToSection(targetId);
 });
});
let productsList = [];
let slidesList = [];
let leadsList = [];
let galleryList = [];
async function initDashboard() {
 await loadProducts();
 await loadReviews();
 await loadLeads();
 await loadSlides();
 await loadGallery();
 updateStats();
}
async function loadProducts() {
 const tbody = document.getElementById('products-table-body');
 tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
 try {
 const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
 const snapshot = await getDocs(q);
 productsList = [];
 tbody.innerHTML = '';
 snapshot.forEach(d => {
 const product = { id: d.id, ...d.data() };
 productsList.push(product);
 const priceHtml = (product.price || product.discountedPrice || product.capacity || product.subsidy) ? `
 <div class="product-prices-meta" style="font-size: 0.8rem; margin-top: 5px; color: var(--text-muted); line-height: 1.5; text-align: inherit;">
 ${product.capacity ? `<span style="background: rgba(52, 183, 241, 0.1); color: #34b7f1; border: 1px solid rgba(52, 183, 241, 0.15); padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; margin-bottom: 4px; display: inline-block;"><i class="fas fa-bolt"></i> ${product.capacity} kW</span>` : ''}
 ${product.price ? `<div>Market Price: <span style="text-decoration: line-through;">₹${product.price.toLocaleString('en-IN')}</span></div>` : ''} 
 ${product.discountedPrice ? `<div>Disc. Price: <span style="color: #25D366; font-weight: bold;">₹${product.discountedPrice.toLocaleString('en-IN')}</span></div>` : ''}
 ${product.subsidy ? `<div>Govt Subsidy: <span style="color: #f59e0b; font-weight: bold;">-₹${parseFloat(product.subsidy).toLocaleString('en-IN')}</span></div>` : ''}
 </div>
 ` : '';
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td data-label="Image"><img src="${product.imageURL}" alt="product" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
 <td data-label="Product">
 <div class="table-cell-details">
 <strong>${product.name}</strong>
 ${priceHtml}
 </div>
 </td>
 <td data-label="Category">${product.category}</td>
 <td data-label="Status"><span class="badge ${product.isActive ? 'badge-success' : 'badge-warning'}">${product.isActive ? 'Active' : 'Inactive'}</span></td>
 <td data-label="Actions">
 <button class="btn btn-primary btn-edit" data-id="${product.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Edit</button>
 <button class="btn btn-danger btn-delete" data-id="${product.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Delete</button>
 </td>
 `;
 tbody.appendChild(tr);
 });
 document.querySelectorAll('.btn-edit').forEach(btn => {
 btn.addEventListener('click', (e) => openModal(e.target.getAttribute('data-id')));
 });
 document.querySelectorAll('.btn-delete').forEach(btn => {
 btn.addEventListener('click', (e) => deleteProduct(e.target.getAttribute('data-id')));
 });
 } catch(err) {
 console.error(err);
 tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading products</td></tr>';
 }
}
function addSpecRow(key = '', value = '') {
 const container = document.getElementById('specs-input-container');
 if (!container) return;
 const div = document.createElement('div');
 div.className = 'spec-row';
 div.style.display = 'flex';
 div.style.gap = '8px';
 div.style.alignItems = 'center';
 div.style.marginBottom = '8px';
 div.innerHTML = `
 <input type="text" class="spec-key" placeholder="Key (e.g. Dimensions)" value="${key}" style="flex: 1; padding: 0.4rem 0.6rem; font-size: 0.85rem;" required>
 <input type="text" class="spec-value" placeholder="Value (e.g. 2000x1000)" value="${value}" style="flex: 1; padding: 0.4rem 0.6rem; font-size: 0.85rem;" required>
 <button type="button" class="btn btn-danger delete-spec-row-btn" style="padding: 0.4rem; font-size: 0.85rem;"><i class="fas fa-trash"></i></button>
 `;
 div.querySelector('.delete-spec-row-btn').addEventListener('click', () => div.remove());
 container.appendChild(div);
}
document.getElementById('add-spec-row-btn')?.addEventListener('click', () => addSpecRow());
let uploadedProductImages = [];

function renderProductPreviews() {
    const container = document.getElementById('product-images-preview-container');
    if (!container) return;
    container.innerHTML = '';
    uploadedProductImages.forEach((imgSrc, idx) => {
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.width = '80px';
        div.style.height = '80px';
        div.style.borderRadius = '8px';
        div.style.overflow = 'hidden';
        div.style.border = '1px solid var(--border-color)';
        div.innerHTML = `
            <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" class="remove-product-img-btn" data-index="${idx}" style="position: absolute; top: 2px; right: 2px; background: rgba(239, 68, 68, 0.85); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
        `;
        div.querySelector('.remove-product-img-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            uploadedProductImages.splice(index, 1);
            renderProductPreviews();
        });
        container.appendChild(div);
    });
    document.getElementById('product-images-json').value = JSON.stringify(uploadedProductImages);
}

const modal = document.getElementById('product-modal');
document.getElementById('add-product-btn').addEventListener('click', () => openModal());
document.getElementById('close-modal-btn').addEventListener('click', () => modal.classList.remove('active'));
document.getElementById('close-lead-modal-btn')?.addEventListener('click', () => {
    document.getElementById('lead-modal').classList.remove('active');
});

function openModal(id = null) {
    const form = document.getElementById('product-form');
    form.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('modal-title').innerText = 'Add Product';
    document.getElementById('product-images-json').value = '[]';
    document.getElementById('product-image-file').value = '';
    document.getElementById('product-images-preview-container').innerHTML = '';
    uploadedProductImages = [];
    document.getElementById('product-price').value = '';
    document.getElementById('product-discounted-price').value = '';
    document.getElementById('product-capacity').value = '';
    document.getElementById('product-subsidy').value = '';
    document.getElementById('specs-input-container').innerHTML = '';
    if (id) {
        const p = productsList.find(x => x.id === id);
        if (p) {
            document.getElementById('modal-title').innerText = 'Edit Product';
            document.getElementById('product-id').value = p.id;
            document.getElementById('product-name').value = p.name;
            document.getElementById('product-category').value = p.category;
            document.getElementById('product-description').value = p.description;
            
            const images = p.images || (p.imageURL ? [p.imageURL] : []);
            uploadedProductImages = [...images];
            renderProductPreviews();
            
            document.getElementById('product-active').checked = p.isActive;
            document.getElementById('product-price').value = p.price || '';
            document.getElementById('product-discounted-price').value = p.discountedPrice || '';
            document.getElementById('product-capacity').value = p.capacity || '';
            document.getElementById('product-subsidy').value = p.subsidy || '';
            const specs = p.specifications || [];
            specs.forEach(spec => addSpecRow(spec.key, spec.value));
        }
    }
    modal.classList.add('active');
}
document.getElementById('product-image-file').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    let filesProcessed = 0;
    files.forEach(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                const MAX_HEIGHT = 1000;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                uploadedProductImages.push(dataUrl);
                filesProcessed++;
                if (filesProcessed === files.length) {
                    renderProductPreviews();
                    document.getElementById('product-image-file').value = '';
                }
            }
        }
    });
});
document.getElementById('product-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const btn = document.getElementById('save-product-btn');
 btn.disabled = true;
 btn.innerText = 'Saving...';
 const id = document.getElementById('product-id').value;
 const priceVal = document.getElementById('product-price').value;
 const discountedPriceVal = document.getElementById('product-discounted-price').value;
 const capacityVal = document.getElementById('product-capacity').value;
 const subsidyVal = document.getElementById('product-subsidy').value;
 const specRows = document.querySelectorAll('.spec-row');
 const specifications = [];
 specRows.forEach(row => {
 const key = row.querySelector('.spec-key').value.trim();
 const value = row.querySelector('.spec-value').value.trim();
 if (key && value) {
 specifications.push({ key, value });
 }
 });
 const data = {
 name: document.getElementById('product-name').value,
 category: document.getElementById('product-category').value,
 description: document.getElementById('product-description').value,
 price: priceVal ? parseFloat(priceVal) : null,
 discountedPrice: discountedPriceVal ? parseFloat(discountedPriceVal) : null,
 capacity: capacityVal ? parseFloat(capacityVal) : null,
 subsidy: subsidyVal ? parseFloat(subsidyVal) : null,
 imageURL: uploadedProductImages[0] || '',
 images: uploadedProductImages,
 isActive: document.getElementById('product-active').checked,
 specifications: specifications
 };
 try {
 if (id) {
 await updateDoc(doc(db, "products", id), data);
 } else {
 data.createdAt = serverTimestamp();
 await addDoc(collection(db, "products"), data);
 }
 modal.classList.remove('active');
 await loadProducts();
 updateStats();
 } catch(err) {
 console.error(err);
 alert('Error saving product');
 } finally {
 btn.disabled = false;
 btn.innerText = 'Save Product';
 }
});
async function deleteProduct(id) {
 if (confirm('Are you sure you want to delete this product?')) {
 try {
 await deleteDoc(doc(db, "products", id));
 await loadProducts();
 updateStats();
 } catch(err) {
 console.error(err);
 alert('Error deleting product');
 }
 }
}
async function loadReviews() {
 const tbody = document.getElementById('reviews-table-body');
 tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
 try {
 const q = query(collection(db, "reviews"));
 const snapshot = await getDocs(q);
 let count = 0;
 tbody.innerHTML = '';
 snapshot.forEach(d => {
 count++;
 const r = { id: d.id, ...d.data() };
 const comment = r.comment || '';
 const imgHtml = r.image ? `<br><img src="${r.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-top: 5px;">` : '';
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td data-label="Reviewer">
 <div class="table-cell-details">
 <strong>${r.name || 'Anonymous'}</strong>
 ${imgHtml}
 </div>
 </td>
 <td data-label="Rating">${r.rating || 5}/5</td>
 <td data-label="Comment">${comment.substring(0,30)}${comment.length > 30 ? '...' : ''}</td>
 <td data-label="Status"><span class="badge ${r.status === 'approved' ? 'badge-success' : 'badge-warning'}">${r.status || 'pending'}</span></td>
 <td data-label="Actions">
 ${r.status === 'pending' ? `<button class="btn btn-primary" onclick="window.updateReview('${r.id}', 'approved')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Approve</button>` : ''}
 <button class="btn btn-danger" onclick="window.deleteReview('${r.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Delete</button>
 </td>
 `;
 tbody.appendChild(tr);
 });
 document.getElementById('stat-reviews').innerText = count;
 } catch(err) {
 console.error(err);
 tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading reviews</td></tr>';
 }
}
window.updateReview = async (id, status) => {
 try {
 await updateDoc(doc(db, "reviews", id), { status });
 loadReviews();
 } catch(err) {
 console.error(err);
 }
};
window.deleteReview = async (id) => {
 if (confirm('Delete review?')) {
 try {
 await deleteDoc(doc(db, "reviews", id));
 loadReviews();
 } catch(err) {
 console.error(err);
 }
 }
};
const reviewModal = document.getElementById('review-modal');
document.getElementById('add-review-btn').addEventListener('click', () => {
 document.getElementById('review-form').reset();
 document.getElementById('review-image').value = '';
 document.getElementById('review-image-file').value = '';
 document.getElementById('review-image-preview-container').style.display = 'none';
 document.getElementById('review-image-preview').src = '';
 reviewModal.classList.add('active');
});
document.getElementById('close-review-modal-btn').addEventListener('click', () => reviewModal.classList.remove('active'));
document.getElementById('review-image-file').addEventListener('change', function(e) {
 const file = e.target.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.readAsDataURL(file);
 reader.onload = function(event) {
 const img = new Image();
 img.src = event.target.result;
 img.onload = function() {
 const canvas = document.createElement('canvas');
 const MAX_WIDTH = 500; 
 const MAX_HEIGHT = 500;
 let width = img.width;
 let height = img.height;
 if (width > height) {
 if (width > MAX_WIDTH) {
 height *= MAX_WIDTH / width;
 width = MAX_WIDTH;
 }
 } else {
 if (height > MAX_HEIGHT) {
 width *= MAX_HEIGHT / height;
 height = MAX_HEIGHT;
 }
 }
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 ctx.drawImage(img, 0, 0, width, height);
 const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
 document.getElementById('review-image').value = dataUrl;
 document.getElementById('review-image-preview-container').style.display = 'block';
 document.getElementById('review-image-preview').src = dataUrl;
 }
 }
});
document.getElementById('review-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const btn = document.getElementById('save-review-btn');
 btn.disabled = true;
 btn.innerText = 'Saving...';
 const data = {
 name: document.getElementById('review-name').value,
 rating: parseInt(document.getElementById('review-rating').value),
 comment: document.getElementById('review-comment').value,
 image: document.getElementById('review-image').value || null,
 status: 'approved', 
 createdAt: serverTimestamp()
 };
 try {
 await addDoc(collection(db, "reviews"), data);
 reviewModal.classList.remove('active');
 await loadReviews();
 } catch(err) {
 console.error(err);
 alert('Error saving review');
 } finally {
 btn.disabled = false;
 btn.innerText = 'Save Review';
 }
});
async function loadLeads() {
 const tbody = document.getElementById('leads-table-body');
 tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
 try {
 const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
 const snapshot = await getDocs(q);
 let count = 0;
 tbody.innerHTML = '';
 leadsList = [];
 snapshot.forEach(d => {
 count++;
 const l = { id: d.id, ...d.data() };
 leadsList.push(l);
 const dateStr = l.createdAt ? new Date(l.createdAt.toDate()).toLocaleDateString() : 'N/A';
 const message = l.message || '';
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td data-label="Date">${dateStr}</td>
 <td data-label="Name">${l.name || 'Unknown'}</td>
 <td data-label="Phone">${l.phone || 'N/A'}</td>
 <td data-label="Message">${message.substring(0,30)}${message.length > 30 ? '...' : ''}</td>
 <td data-label="Status"><span class="badge ${l.status === 'contacted' ? 'badge-success' : 'badge-warning'}">${l.status || 'new'}</span></td>
 <td data-label="Actions">
 <button class="btn btn-primary btn-view-lead" data-id="${l.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 5px;">View</button>
 ${l.status === 'new' ? `<button class="btn btn-success btn-contact-lead" data-id="${l.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Mark Contacted</button>` : ''}
 </td>
 `;
 tbody.appendChild(tr);
 });
 document.querySelectorAll('.btn-view-lead').forEach(btn => {
 btn.addEventListener('click', (e) => {
 const id = e.currentTarget.getAttribute('data-id');
 window.openLeadModal(id);
 });
 });
 document.querySelectorAll('.btn-contact-lead').forEach(btn => {
 btn.addEventListener('click', (e) => {
 const id = e.currentTarget.getAttribute('data-id');
 window.updateLead(id, 'contacted');
 });
 });
 document.getElementById('stat-leads').innerText = count;
 } catch(err) {
 console.error(err);
 tbody.innerHTML = '<tr><td colspan="6" style="color:red;">Error loading leads</td></tr>';
 }
}
window.openLeadModal = (id) => {
 const lead = leadsList.find(item => item.id === id);
 if (!lead) return;
 const dateStr = lead.createdAt ? new Date(lead.createdAt.toDate()).toLocaleString() : 'N/A';
 document.getElementById('view-lead-name').innerText = lead.name || 'Unknown';
 document.getElementById('view-lead-phone').innerText = lead.phone || 'N/A';
 document.getElementById('view-lead-date').innerText = dateStr;
 const statusSpan = document.getElementById('view-lead-status');
 statusSpan.className = `badge ${lead.status === 'contacted' ? 'badge-success' : 'badge-warning'}`;
 statusSpan.innerText = lead.status === 'contacted' ? 'Contacted' : 'New';
 document.getElementById('view-lead-message').innerText = lead.message || 'No message provided.';
 const callBtn = document.getElementById('lead-call-btn');
 if (lead.phone) {
 callBtn.href = `tel:${lead.phone}`;
 callBtn.style.display = 'flex';
 } else {
 callBtn.style.display = 'none';
 }
 const whatsappBtn = document.getElementById('lead-whatsapp-btn');
 if (lead.phone) {
 const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
 const text = encodeURIComponent(`Hello ${lead.name || ''}, this is Shree Krishna Enterprises solar advisor. We received your solar enquiry. How can we help you?`);
 whatsappBtn.href = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${text}`;
 whatsappBtn.style.display = 'flex';
 } else {
 whatsappBtn.style.display = 'none';
 }
 const actionBtn = document.getElementById('lead-action-btn');
 if (lead.status === 'new') {
 actionBtn.style.display = 'inline-block';
 actionBtn.onclick = async () => {
 await window.updateLead(id, 'contacted');
 document.getElementById('lead-modal').classList.remove('active');
 };
 } else {
 actionBtn.style.display = 'none';
 }
 document.getElementById('lead-modal').classList.add('active');
};
window.updateLead = async (id, status) => {
 try {
 await updateDoc(doc(db, "leads", id), { status });
 loadLeads();
 } catch(err) {
 console.error(err);
 }
};
async function loadSlides() {
 const tbody = document.getElementById('slides-table-body');
 if (!tbody) return;
 tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
 try {
 const q = query(collection(db, "hero_slides"), orderBy("createdAt", "desc"));
 const snapshot = await getDocs(q);
 slidesList = [];
 tbody.innerHTML = '';
 snapshot.forEach(d => {
 const slide = { id: d.id, ...d.data() };
 slidesList.push(slide);
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td data-label="Image"><img src="${slide.imageURL}" alt="slide" style="width: 80px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
 <td data-label="Title">${slide.title || '<span style="color:var(--text-muted); font-style:italic;">Default Waaree Solar</span>'}</td>
 <td data-label="Status"><span class="badge ${slide.isActive ? 'badge-success' : 'badge-warning'}">${slide.isActive ? 'Active' : 'Inactive'}</span></td>
 <td data-label="Actions">
 <button class="btn btn-primary btn-edit-slide" data-id="${slide.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Edit</button>
 <button class="btn btn-danger btn-delete-slide" data-id="${slide.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Delete</button>
 </td>
 `;
 tbody.appendChild(tr);
 });
 document.querySelectorAll('.btn-edit-slide').forEach(btn => {
 btn.addEventListener('click', (e) => openSlideModal(e.target.getAttribute('data-id')));
 });
 document.querySelectorAll('.btn-delete-slide').forEach(btn => {
 btn.addEventListener('click', (e) => deleteSlide(e.target.getAttribute('data-id')));
 });
 } catch(err) {
 console.error(err);
 tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Error loading slides</td></tr>';
 }
}
const slideModal = document.getElementById('slide-modal');
if (document.getElementById('add-slide-btn')) {
 document.getElementById('add-slide-btn').addEventListener('click', () => openSlideModal());
}
if (document.getElementById('close-slide-modal-btn')) {
 document.getElementById('close-slide-modal-btn').addEventListener('click', () => slideModal.classList.remove('active'));
}
function openSlideModal(id = null) {
 const form = document.getElementById('slide-form');
 form.reset();
 document.getElementById('slide-id').value = '';
 document.getElementById('slide-modal-title').innerText = 'Add Hero Slide';
 document.getElementById('slide-image').value = '';
 document.getElementById('slide-image-file').value = '';
 document.getElementById('slide-image-preview-container').style.display = 'none';
 document.getElementById('slide-image-preview').src = '';
 if (id) {
 const s = slidesList.find(x => x.id === id);
 if (s) {
 document.getElementById('slide-modal-title').innerText = 'Edit Hero Slide';
 document.getElementById('slide-id').value = s.id;
 document.getElementById('slide-title').value = s.title || '';
 document.getElementById('slide-image').value = s.imageURL || '';
 document.getElementById('slide-active').checked = s.isActive;
 if (s.imageURL) {
 document.getElementById('slide-image-preview-container').style.display = 'block';
 document.getElementById('slide-image-preview').src = s.imageURL;
 }
 }
 }
 slideModal.classList.add('active');
}
if (document.getElementById('slide-image-file')) {
 document.getElementById('slide-image-file').addEventListener('change', function(e) {
 const file = e.target.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.readAsDataURL(file);
 reader.onload = function(event) {
 const img = new Image();
 img.src = event.target.result;
 img.onload = function() {
 const canvas = document.createElement('canvas');
 const MAX_WIDTH = 1920;
 const MAX_HEIGHT = 1080;
 let width = img.width;
 let height = img.height;
 if (width > height) {
 if (width > MAX_WIDTH) {
 height *= MAX_WIDTH / width;
 width = MAX_WIDTH;
 }
 } else {
 if (height > MAX_HEIGHT) {
 width *= MAX_HEIGHT / height;
 height = MAX_HEIGHT;
 }
 }
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 ctx.drawImage(img, 0, 0, width, height);
 const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
 document.getElementById('slide-image').value = dataUrl;
 document.getElementById('slide-image-preview-container').style.display = 'block';
 document.getElementById('slide-image-preview').src = dataUrl;
 }
 }
 });
}
if (document.getElementById('slide-form')) {
 document.getElementById('slide-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const btn = document.getElementById('save-slide-btn');
 btn.disabled = true;
 btn.innerText = 'Saving...';
 const id = document.getElementById('slide-id').value;
 const data = {
 title: document.getElementById('slide-title').value || '',
 imageURL: document.getElementById('slide-image').value,
 isActive: document.getElementById('slide-active').checked
 };
 try {
 if (id) {
 await updateDoc(doc(db, "hero_slides", id), data);
 } else {
 data.createdAt = serverTimestamp();
 await addDoc(collection(db, "hero_slides"), data);
 }
 slideModal.classList.remove('active');
 await loadSlides();
 updateStats();
 } catch(err) {
 console.error(err);
 alert('Error saving hero slide');
 } finally {
 btn.disabled = false;
 btn.innerText = 'Save Slide';
 }
 });
}
async function deleteSlide(id) {
 if (confirm('Are you sure you want to delete this hero slide?')) {
 try {
 await deleteDoc(doc(db, "hero_slides", id));
 await loadSlides();
 updateStats();
 } catch(err) {
 console.error(err);
 alert('Error deleting hero slide');
 }
 }
}
function updateStats() {
 document.getElementById('stat-products').innerText = productsList.length;
 document.getElementById('stat-slides').innerText = slidesList.length;
 const statGallery = document.getElementById('stat-gallery');
 if (statGallery) statGallery.innerText = galleryList.length;
}
async function loadGallery() {
 const tbody = document.getElementById('gallery-table-body');
 if (!tbody) return;
 tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
 try {
 const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
 const snapshot = await getDocs(q);
 galleryList = [];
 tbody.innerHTML = '';
 snapshot.forEach(d => {
 const item = { id: d.id, ...d.data() };
 galleryList.push(item);
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td data-label="Image"><img src="${item.imageURL}" alt="gallery" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
 <td data-label="Caption">${item.caption || '<span style="color:var(--text-muted); font-style:italic;">No caption</span>'}</td>
 <td data-label="Category">${item.category}</td>
 <td data-label="Status"><span class="badge ${item.isActive ? 'badge-success' : 'badge-warning'}">${item.isActive ? 'Active' : 'Inactive'}</span></td>
 <td data-label="Actions">
 <button class="btn btn-primary btn-edit-gallery" data-id="${item.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Edit</button>
 <button class="btn btn-danger btn-delete-gallery" data-id="${item.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Delete</button>
 </td>
 `;
 tbody.appendChild(tr);
 });
 document.querySelectorAll('.btn-edit-gallery').forEach(btn => {
 btn.addEventListener('click', (e) => openGalleryModal(e.target.getAttribute('data-id')));
 });
 document.querySelectorAll('.btn-delete-gallery').forEach(btn => {
 btn.addEventListener('click', (e) => deleteGalleryItem(e.target.getAttribute('data-id')));
 });
 } catch(err) {
 console.error(err);
 tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading gallery</td></tr>';
 }
}
const galleryModal = document.getElementById('gallery-modal');
if (document.getElementById('add-gallery-btn')) {
 document.getElementById('add-gallery-btn').addEventListener('click', () => openGalleryModal());
}
if (document.getElementById('close-gallery-modal-btn')) {
 document.getElementById('close-gallery-modal-btn').addEventListener('click', () => galleryModal.classList.remove('active'));
}
let uploadedGalleryImages = [];

function renderGalleryPreviews() {
    const container = document.getElementById('gallery-images-preview-container');
    if (!container) return;
    container.innerHTML = '';
    uploadedGalleryImages.forEach((imgSrc, idx) => {
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.width = '80px';
        div.style.height = '80px';
        div.style.borderRadius = '8px';
        div.style.overflow = 'hidden';
        div.style.border = '1px solid var(--border-color)';
        div.innerHTML = `
            <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" class="remove-gallery-img-btn" data-index="${idx}" style="position: absolute; top: 2px; right: 2px; background: rgba(239, 68, 68, 0.85); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
        `;
        div.querySelector('.remove-gallery-img-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            uploadedGalleryImages.splice(index, 1);
            renderGalleryPreviews();
        });
        container.appendChild(div);
    });
    document.getElementById('gallery-images-json').value = JSON.stringify(uploadedGalleryImages);
}

function openGalleryModal(id = null) {
  const form = document.getElementById('gallery-form');
  form.reset();
  document.getElementById('gallery-id').value = '';
  document.getElementById('gallery-modal-title').innerText = 'Add Gallery Item';
  document.getElementById('gallery-images-json').value = '[]';
  document.getElementById('gallery-image-file').value = '';
  document.getElementById('gallery-images-preview-container').innerHTML = '';
  uploadedGalleryImages = [];
  if (id) {
    const item = galleryList.find(x => x.id === id);
    if (item) {
      document.getElementById('gallery-modal-title').innerText = 'Edit Gallery Item';
      document.getElementById('gallery-id').value = item.id;
      document.getElementById('gallery-caption').value = item.caption || '';
      document.getElementById('gallery-category').value = item.category || 'Residential Solar';
      document.getElementById('gallery-active').checked = item.isActive;
      if (item.imageURL) {
        uploadedGalleryImages = [item.imageURL];
        renderGalleryPreviews();
      }
    }
  }
  galleryModal.classList.add('active');
}

if (document.getElementById('gallery-image-file')) {
  document.getElementById('gallery-image-file').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    let filesProcessed = 0;
    files.forEach(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                const MAX_HEIGHT = 750;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                uploadedGalleryImages.push(dataUrl);
                filesProcessed++;
                if (filesProcessed === files.length) {
                    renderGalleryPreviews();
                    document.getElementById('gallery-image-file').value = '';
                }
            }
        }
    });
  });
}

if (document.getElementById('gallery-form')) {
  document.getElementById('gallery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (uploadedGalleryImages.length === 0) {
        alert('Please upload at least one image.');
        return;
    }
    const btn = document.getElementById('save-gallery-btn');
    btn.disabled = true;
    btn.innerText = 'Saving...';
    const id = document.getElementById('gallery-id').value;
    const caption = document.getElementById('gallery-caption').value || '';
    const category = document.getElementById('gallery-category').value;
    const isActive = document.getElementById('gallery-active').checked;
    
    try {
        if (id) {
            const data = {
                caption: caption,
                category: category,
                imageURL: uploadedGalleryImages[0],
                isActive: isActive
            };
            await updateDoc(doc(db, "gallery", id), data);
        } else {
            // Upload each image as a separate document in background loop
            for (let i = 0; i < uploadedGalleryImages.length; i++) {
                const data = {
                    caption: caption,
                    category: category,
                    imageURL: uploadedGalleryImages[i],
                    isActive: isActive,
                    createdAt: serverTimestamp()
                };
                await addDoc(collection(db, "gallery"), data);
            }
        }
        galleryModal.classList.remove('active');
        await loadGallery();
        updateStats();
    } catch(err) {
        console.error(err);
        alert('Error saving gallery item(s)');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save Gallery Item';
    }
  });
}
async function deleteGalleryItem(id) {
 if (confirm('Are you sure you want to delete this gallery item?')) {
 try {
 await deleteDoc(doc(db, "gallery", id));
 await loadGallery();
 updateStats();
 } catch(err) {
 console.error(err);
 alert('Error deleting gallery item');
 }
 }
}