import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
const imageContainer = document.getElementById('detail-image-container');
const infoContainer = document.getElementById('detail-info-container');
const specsTableBody = document.getElementById('specs-table-body');
const leadForm = document.getElementById('product-lead-form');
let currentProduct = null;
let productId = null;
window.addEventListener('DOMContentLoaded', async () => {
 const urlParams = new URLSearchParams(window.location.search);
 productId = urlParams.get('id');
 if (!productId) {
 window.location.href = "index.html";
 return;
 }
 await fetchProductDetails(productId);
});
async function fetchProductDetails(id) {
 try {
 const docRef = doc(db, "products", id);
 const docSnap = await getDoc(docRef);
 if (!docSnap.exists()) {
 console.error("Product does not exist");
 window.location.href = "index.html";
 return;
 }
 currentProduct = docSnap.data();
 renderProductImage();
 renderProductInfo();
 renderSpecifications();
 } catch (error) {
 console.error("Error loading product details:", error);
 infoContainer.innerHTML = '<p style="color: red;">Error loading product details. Please refresh the page.</p>';
 }
}
function renderProductImage() {
  if (!imageContainer) return;
  const thumbnailsContainer = document.getElementById('detail-thumbnails-container');
  const images = currentProduct.images || (currentProduct.imageURL ? [currentProduct.imageURL] : []);
  
  if (images.length === 0) {
    imageContainer.innerHTML = `
      <img src="https://via.placeholder.com/600x450?text=Waaree+Solar" alt="${currentProduct.name || 'Solar Panel'}" loading="lazy">
    `;
    if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
    return;
  }
  
  let currentImgIndex = 0;
  
  // Set main display
  let arrowsHtml = '';
  if (images.length > 1) {
    arrowsHtml = `
      <button class="showcase-arrow prev" id="showcase-prev" aria-label="Previous Image"><i class="fas fa-chevron-left"></i></button>
      <button class="showcase-arrow next" id="showcase-next" aria-label="Next Image"><i class="fas fa-chevron-right"></i></button>
    `;
  }
  
  imageContainer.innerHTML = `
    <img id="main-product-img" src="${images[0]}" alt="${currentProduct.name || 'Solar Panel'}" loading="lazy">
    ${arrowsHtml}
  `;
  
  let autoplayTimer = null;

  function startAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
    if (images.length > 1) {
      autoplayTimer = setInterval(() => {
        currentImgIndex = (currentImgIndex + 1) % images.length;
        updateActiveImage();
      }, 4000);
    }
  }

  function resetAutoplay() {
    startAutoplay();
  }

  // Populate thumbnails
  if (thumbnailsContainer) {
    thumbnailsContainer.innerHTML = '';
    if (images.length > 1) {
      images.forEach((imgSrc, idx) => {
        const btn = document.createElement('button');
        btn.className = `thumbnail-btn ${idx === 0 ? 'active' : ''}`;
        btn.setAttribute('data-index', idx);
        btn.innerHTML = `<img src="${imgSrc}" alt="thumbnail ${idx + 1}">`;
        btn.addEventListener('click', () => {
          currentImgIndex = idx;
          updateActiveImage();
          resetAutoplay();
        });
        thumbnailsContainer.appendChild(btn);
      });
    }
  }
  
  function updateActiveImage() {
    const mainImg = document.getElementById('main-product-img');
    if (mainImg) mainImg.src = images[currentImgIndex];
    
    // Update active thumbnail
    const thumbBtns = document.querySelectorAll('.thumbnail-btn');
    thumbBtns.forEach((btn, idx) => {
      if (idx === currentImgIndex) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  if (images.length > 1) {
    const prevBtn = document.getElementById('showcase-prev');
    const nextBtn = document.getElementById('showcase-next');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIndex = (currentImgIndex - 1 + images.length) % images.length;
        updateActiveImage();
        resetAutoplay();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIndex = (currentImgIndex + 1) % images.length;
        updateActiveImage();
        resetAutoplay();
      });
    }

    // Start autoplay initially
    startAutoplay();
  }
}
function renderProductInfo() {
 if (!infoContainer) return;
 const desc = currentProduct.description || '';
 let calculatedSubsidy = null;
 if (currentProduct.capacity) {
 if (currentProduct.subsidy) {
 calculatedSubsidy = parseFloat(currentProduct.subsidy) || 0;
 } else {
 const cap = parseFloat(currentProduct.capacity);
 if (cap <= 1) {
 calculatedSubsidy = cap * 30000;
 } else if (cap <= 2) {
 calculatedSubsidy = cap * 30000;
 } else {
 calculatedSubsidy = Math.min(cap * 30000, 78000);
 if (calculatedSubsidy < 78000 && cap >= 3) {
 calculatedSubsidy = 78000;
 }
 }
 }
 } else if (currentProduct.subsidy) {
 calculatedSubsidy = parseFloat(currentProduct.subsidy) || null;
 }
 const capacityBadge = currentProduct.capacity ? `
 <span style="background-color: rgba(0, 250, 154, 0.15); color: #047857; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
 <i class="fas fa-bolt"></i> ${currentProduct.capacity} kW System
 </span>
 ` : '';
 let priceHtml = '';
 if (currentProduct.price || currentProduct.discountedPrice) {
 const basePrice = currentProduct.discountedPrice || currentProduct.price || 0;
 const originalPriceText = currentProduct.price ? `₹${currentProduct.price.toLocaleString('en-IN')}` : '';
 const discountedPriceText = currentProduct.discountedPrice ? `₹${currentProduct.discountedPrice.toLocaleString('en-IN')}` : '';
 if (calculatedSubsidy && calculatedSubsidy > 0) {
 const effectivePriceText = `₹${Math.max(0, basePrice - calculatedSubsidy).toLocaleString('en-IN')}`;
 priceHtml = `
 <div class="product-price-section" style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; margin-top: 1rem; width: 100%;">
 <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 0.5rem;">
 <span style="font-size: 2rem; font-weight: 800; color: #047857;">${effectivePriceText}</span>
 <span style="font-size: 0.8rem; color: #d97706; background-color: #fef3c7; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Effective Price</span>
 </div>
 <div style="font-size: 0.9rem; color: var(--text-light); line-height: 1.6; border-top: 1px dashed var(--border-color); padding-top: 0.75rem; margin-top: 0.75rem;">
 ${currentProduct.discountedPrice ? `<div>Market Price: <span style="font-weight: 600; color: var(--text-dark);">${discountedPriceText}</span> ${currentProduct.price ? `<span style="text-decoration: line-through; font-size: 0.8rem; color: var(--text-light);">${originalPriceText}</span>` : ''}</div>` : `<div>Market Price: <span style="font-weight: 600; color: var(--text-dark);">${originalPriceText}</span></div>`}
 <div style="color: #d97706; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
 <i class="fas fa-gift"></i> Government Subsidy: -₹${calculatedSubsidy.toLocaleString('en-IN')}
 </div>
 </div>
 </div>
 `;
 } else {
 priceHtml = `
 <div class="product-price-section" style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; margin-top: 1rem; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
 ${currentProduct.discountedPrice ? `<span style="font-size: 2rem; font-weight: 800; color: #047857;">₹${currentProduct.discountedPrice.toLocaleString('en-IN')}</span>` : ''}
 ${currentProduct.price ? `<span style="text-decoration: line-through; color: var(--text-light); font-size: 1.1rem;">₹${currentProduct.price.toLocaleString('en-IN')}</span>` : ''}
 </div>
 `;
 }
 }
 infoContainer.innerHTML = `
 <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;">
 <span class="product-category-badge">${currentProduct.category || 'Waaree Solar'}</span>
 ${capacityBadge}
 </div>
 <h1 class="product-name-title">${currentProduct.name || 'Solar Product'}</h1>
 <p class="product-desc-text">${desc}</p>
 ${priceHtml}
 ${calculatedSubsidy && calculatedSubsidy > 0 ? `
 <div class="subsidy-info-box">
 <div class="subsidy-info-title">
 <i class="fas fa-info-circle"></i> PM Surya Ghar Muft Bijli Yojana
 </div>
 <div class="subsidy-info-desc">
 This system qualifies for direct-to-bank Government solar subsidy capped at ₹${calculatedSubsidy.toLocaleString('en-IN')} for residential solar rooftop installations. Contact our team to complete your subsidy applications.
 </div>
 </div>
 ` : ''}
 <div style="display: flex; gap: 12px; margin-top: 1.5rem; width: 100%;">
 <a href="#product-lead-form" class="btn btn-outline" style="flex: 1; padding: 0.9rem; text-align: center;">Request Callback</a>
 <a href="https://wa.me/+919829545113?text=Hi,%20I'm%20interested%20in%20the%20product%20${encodeURIComponent(currentProduct.name)}" 
 target="_blank" class="btn btn-accent" 
 style="flex: 1; padding: 0.9rem; background-color: #25D366; color: white; border-color: #25D366; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
 <i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i> Inquiry on WhatsApp
 </a>
 </div>
 `;
}
function renderSpecifications() {
 if (!specsTableBody) return;
 specsTableBody.innerHTML = '';
 const specs = currentProduct.specifications || [];
 if (specs.length === 0) {
 specsTableBody.innerHTML = `
 <tr>
 <td colspan="2" style="text-align: center; color: var(--text-muted); padding: 2rem;">
 No technical specifications listed for this product.
 </td>
 </tr>
 `;
 return;
 }
 specs.forEach(spec => {
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td class="specs-key">${spec.key}</td>
 <td class="specs-val">${spec.value}</td>
 `;
 specsTableBody.appendChild(tr);
 });
}
function showToast(message, isError = false) {
 const toast = document.getElementById('toast');
 if (!toast) return;
 if (isError) {
 toast.innerHTML = `<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> ${message}`;
 toast.classList.add('error');
 } else {
 toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--primary-color);"></i> ${message}`;
 toast.classList.remove('error');
 }
 toast.classList.remove('show');
 toast.offsetHeight;
 toast.classList.add('show');
 setTimeout(() => {
 toast.classList.remove('show');
 toast.classList.remove('error');
 }, 3000);
}
function checkRateLimit() {
 const limit = 2; 
 const hours = 24; 
 const now = Date.now();
 let submissions = JSON.parse(localStorage.getItem('ske_submissions') || '[]');
 const cutOff = now - (hours * 60 * 60 * 1000);
 submissions = submissions.filter(time => time > cutOff);
 localStorage.setItem('ske_submissions', JSON.stringify(submissions));
 return {
 isBlocked: submissions.length >= limit
 };
}
function recordSubmission() {
 let submissions = JSON.parse(localStorage.getItem('ske_submissions') || '[]');
 submissions.push(Date.now());
 localStorage.setItem('ske_submissions', JSON.stringify(submissions));
}
if (leadForm) {
 leadForm.addEventListener('submit', async (e) => {
 e.preventDefault();
 const rateLimit = checkRateLimit();
 if (rateLimit.isBlocked) {
 showToast("Daily limit of 2 requests reached! Please use WhatsApp.", true);
 return;
 }
 const submitBtn = document.getElementById('submit-btn');
 const originalText = submitBtn.innerText;
 submitBtn.innerText = 'Submitting...';
 submitBtn.disabled = true;
 try {
 const name = document.getElementById('lead-name').value;
 const phone = document.getElementById('lead-phone').value;
 const productName = currentProduct ? currentProduct.name : 'Unknown Product';
 const message = `Callback request: Interested in product "${productName}" (ID: ${productId})`;
 await addDoc(collection(db, "leads"), {
 name,
 phone,
 message,
 status: "new",
 createdAt: serverTimestamp()
 });
 recordSubmission();
 showToast("Callback requested successfully!");
 leadForm.reset();
 } catch (error) {
 console.error("Error adding callback lead: ", error);
 showToast("Failed to request callback. Please try WhatsApp.", true);
 } finally {
 submitBtn.innerText = originalText;
 submitBtn.disabled = false;
 }
 });
}