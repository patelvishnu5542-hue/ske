import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
async function loadProducts() {
 const productsContainer = document.getElementById('products-container');
 try {
 const q = query(collection(db, "products"), where("isActive", "==", true));
 const querySnapshot = await getDocs(q);
 productsContainer.innerHTML = ''; 
 if (querySnapshot.empty) {
 productsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No products available at the moment.</p>';
 return;
 }
 querySnapshot.forEach((doc) => {
 const product = doc.data();
 const desc = product.description || '';
 let calculatedSubsidy = null;
 if (product.capacity) {
 if (product.subsidy) {
 calculatedSubsidy = parseFloat(product.subsidy) || 0;
 } else {
 const cap = parseFloat(product.capacity);
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
 } else if (product.subsidy) {
 calculatedSubsidy = parseFloat(product.subsidy) || null;
 }
 const capacityBadge = product.capacity ? `
 <span style="background-color: rgba(0, 250, 154, 0.15); color: #047857; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem;">
 <i class="fas fa-bolt"></i> ${product.capacity} kW System
 </span>
 ` : '';
 let priceHtml = '';
 if (product.price || product.discountedPrice) {
 const basePrice = product.discountedPrice || product.price || 0;
 const originalPriceText = product.price ? `₹${product.price.toLocaleString('en-IN')}` : '';
 const discountedPriceText = product.discountedPrice ? `₹${product.discountedPrice.toLocaleString('en-IN')}` : '';
 if (calculatedSubsidy && calculatedSubsidy > 0) {
 const effectivePriceText = `₹${Math.max(0, basePrice - calculatedSubsidy).toLocaleString('en-IN')}`;
 priceHtml = `
 <div class="product-price-section" style="margin-bottom: 0.6rem; width: 100%;">
 <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 0.25rem;">
 <span style="font-size: 1.35rem; font-weight: 800; color: #047857;">${effectivePriceText}</span>
 <span style="font-size: 0.7rem; color: #d97706; background-color: #fef3c7; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Effective Price</span>
 </div>
 <div style="font-size: 0.8rem; color: var(--text-light); line-height: 1.45; border-top: 1px dashed var(--border-color); padding-top: 0.35rem; margin-top: 0.35rem;">
 ${product.discountedPrice ? `<div>Market Price: <span style="font-weight: 600; color: var(--text-dark);">${discountedPriceText}</span> ${product.price ? `<span style="text-decoration: line-through; font-size: 0.75rem; color: var(--text-light);">${originalPriceText}</span>` : ''}</div>` : `<div>Market Price: <span style="font-weight: 600; color: var(--text-dark);">${originalPriceText}</span></div>`}
 <div style="color: #d97706; font-weight: 600; display: flex; align-items: center; gap: 4px;">
 <i class="fas fa-gift"></i> Govt. Subsidy: -₹${calculatedSubsidy.toLocaleString('en-IN')}
 </div>
 </div>
 </div>
 `;
 } else {
 priceHtml = `
 <div class="product-price-section" style="margin-bottom: 0.6rem; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
 ${product.discountedPrice ? `<span style="font-size: 1.35rem; font-weight: 700; color: #047857;">₹${product.discountedPrice.toLocaleString('en-IN')}</span>` : ''}
 ${product.price ? `<span style="text-decoration: line-through; color: var(--text-light); font-size: 0.9rem;">₹${product.price.toLocaleString('en-IN')}</span>` : ''}
 </div>
 `;
 }
 }
 const productHtml = `
 <div class="card">
 <div class="card-img-wrapper">
 <img src="${product.imageURL || 'https://via.placeholder.com/400x300?text=Waaree+Solar'}" alt="${product.name}" class="card-img" loading="lazy">
 </div>
 <div class="card-content">
 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 5px;">
 <span class="badge" style="margin-bottom: 0;">${product.category || 'Product'}</span>
 ${capacityBadge}
 </div>
 <h3 class="card-title" style="margin-top: 0.25rem;">${product.name || 'Untitled Product'}</h3>
 <p class="card-text">${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}</p>
 ${priceHtml}
 <div style="display: flex; gap: 8px; margin-top: auto; width: 100%;">
 <a href="product.html?id=${doc.id}" class="btn btn-outline" style="flex: 1; padding: 0.65rem 0.5rem; font-size: 0.85rem; text-align: center;">View Details</a>
 <a href="https://wa.me/+919829545113?text=Hi,%20I'm%20interested%20in%20${encodeURIComponent(product.name)}" target="_blank" class="btn btn-accent" style="flex: 1; padding: 0.65rem 0.5rem; font-size: 0.85rem; background-color: #25D366; color: white; border-color: #25D366; text-align: center;"><i class="fab fa-whatsapp"></i> WhatsApp</a>
 </div>
 </div>
 </div>
 `;
 productsContainer.innerHTML += productHtml;
 });
 } catch (error) {
 console.error("Error loading products:", error);
 productsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Error loading products.</p>';
 }
}
window.openReviewImageLightbox = function(imgSrc, reviewerName) {
  const lightbox = document.getElementById('gallery-lightbox');
  if (!lightbox) return;
  const img = document.getElementById('lightbox-img');
  const cat = document.getElementById('lightbox-cat');
  const desc = document.getElementById('lightbox-desc');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');
  if (img) img.src = imgSrc;
  if (cat) cat.innerText = "Customer Review Photo";
  if (desc) desc.innerText = `Uploaded by ${reviewerName}`;
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';
  
  lightbox.style.display = 'flex';
  setTimeout(() => {
    lightbox.classList.add('active');
  }, 10);
  document.body.style.overflow = 'hidden';
};

async function loadReviews() {
  const reviewsContainer = document.getElementById('reviews-container');
  try {
    const q = query(collection(db, "reviews"), where("status", "==", "approved"));
    const querySnapshot = await getDocs(q);
    reviewsContainer.innerHTML = ''; 
    if (querySnapshot.empty) {
      reviewsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No reviews yet.</p>';
      return;
    }
    querySnapshot.forEach((doc) => {
      const review = doc.data();
      const rating = review.rating || 5;
      const comment = review.comment || '';
      let stars = '';
      for(let i=0; i<5; i++) {
        if(i < rating) {
          stars += '<i class="fas fa-star"></i>';
        } else {
          stars += '<i class="far fa-star"></i>';
        }
      }
      const reviewImgHtml = review.image ? `
      <div class="review-img-container" onclick="window.openReviewImageLightbox('${review.image}', '${(review.name || 'Anonymous').replace(/'/g, "\\'")}')">
        <img src="${review.image}" alt="Review image by ${review.name || 'Anonymous'}" loading="lazy">
      </div>
      ` : '';
      const reviewerInitials = (review.name || 'A').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const reviewHtml = `
      <div class="review-card">
        <div>
          <div class="stars">${stars}</div>
          <p class="card-text">"${comment}"</p>
          ${reviewImgHtml}
        </div>
        <div class="reviewer-profile">
          <div class="reviewer-avatar">${reviewerInitials}</div>
          <div class="reviewer-meta">
            <span class="reviewer-name">${review.name || 'Anonymous'}</span>
            <span class="reviewer-designation"><i class="fas fa-check-circle"></i> Verified Buyer</span>
          </div>
        </div>
      </div>
      `;
      reviewsContainer.innerHTML += reviewHtml;
    });
  } catch (error) {
    console.error("Error loading reviews:", error);
    reviewsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Error loading reviews.</p>';
  }
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
document.getElementById('lead-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const rateLimit = checkRateLimit();
 if (rateLimit.isBlocked) {
 showToast("Daily limit of 2 requests reached! Please use WhatsApp.", true);
 return;
 }
 const submitBtn = document.getElementById('submit-btn');
 const originalText = submitBtn.innerText;
 submitBtn.innerText = 'Sending...';
 submitBtn.disabled = true;
 try {
 const name = document.getElementById('lead-name').value;
 const phone = document.getElementById('lead-phone').value;
 const message = document.getElementById('lead-message').value;
 await addDoc(collection(db, "leads"), {
 name,
 phone,
 message,
 status: "new",
 createdAt: serverTimestamp()
 });
 recordSubmission();
 showToast("Request sent successfully!");
 document.getElementById('lead-form').reset();
 } catch (error) {
 console.error("Error adding document: ", error);
 showToast("Failed to send enquiry. Please try WhatsApp.", true);
 } finally {
 submitBtn.innerText = originalText;
 submitBtn.disabled = false;
 }
});
async function loadHeroSlides() {
 const carousel = document.getElementById('hero-carousel');
 if (!carousel) return;
 try {
 const q = query(collection(db, "hero_slides"), where("isActive", "==", true));
 const querySnapshot = await getDocs(q);
 if (querySnapshot.empty) return;
 carousel.innerHTML = ''; 
 const slides = [];
 querySnapshot.forEach((doc) => {
 slides.push({ id: doc.id, ...doc.data() });
 });
 slides.sort((a, b) => {
 const timeA = a.createdAt?.seconds || 0;
 const timeB = b.createdAt?.seconds || 0;
 return timeB - timeA;
 });
 let index = 0;
 slides.forEach((slide) => {
 const slideDiv = document.createElement('div');
 slideDiv.className = `hero-carousel-slide ${index === 0 ? 'active' : ''}`;
 if (index === 0) {
 slideDiv.style.backgroundImage = `url('${slide.imageURL}')`;
 } else {
 slideDiv.setAttribute('data-src', slide.imageURL);
 }
 carousel.appendChild(slideDiv);
 index++;
 });
 const progressContainer = document.querySelector('.carousel-progress-bar-container');
 if (progressContainer) {
 progressContainer.style.display = index > 1 ? 'block' : 'none';
 }
 if (index > 1) {
 startHeroCarousel();
 }
 } catch (err) {
 console.error("Error loading hero slides:", err);
 }
}
function startHeroCarousel() {
 const carousel = document.getElementById('hero-carousel');
 if (!carousel) return;
 let current = 0;
 let autoplayInterval;
 let isAutoplayPaused = false;
 const SLIDE_DURATION = 3500; 
 function resetAndStartProgressBar() {
 const bar = document.getElementById('carousel-progress');
 if (!bar) return;
 bar.style.transition = 'none';
 bar.style.width = '0%';
 bar.offsetHeight;
 if (!isAutoplayPaused) {
 bar.style.transition = `width ${SLIDE_DURATION}ms linear`;
 bar.style.width = '100%';
 }
 }
 function showSlide(index) {
 const slides = document.querySelectorAll('.hero-carousel-slide');
 if (slides.length <= 1) return;
 slides[current].classList.remove('active');
 current = (index + slides.length) % slides.length;
 const nextSlide = slides[current];
 if (nextSlide.hasAttribute('data-src')) {
 nextSlide.style.backgroundImage = `url('${nextSlide.getAttribute('data-src')}')`;
 nextSlide.removeAttribute('data-src');
 }
 nextSlide.classList.add('active');
 resetAndStartProgressBar();
 }
 function nextSlide() {
 showSlide(current + 1);
 }
 function prevSlide() {
 showSlide(current - 1);
 }
 function startAutoplay() {
 clearInterval(autoplayInterval);
 autoplayInterval = setInterval(() => {
 if (!isAutoplayPaused) {
 nextSlide();
 }
 }, SLIDE_DURATION);
 resetAndStartProgressBar();
 }
 startAutoplay();
 carousel.addEventListener('click', (e) => {
 if (Math.abs(startX - endX) > 10) return;
 isAutoplayPaused = !isAutoplayPaused;
 const progressContainer = document.querySelector('.carousel-progress-bar-container');
 const bar = document.getElementById('carousel-progress');
 if (isAutoplayPaused) {
 clearInterval(autoplayInterval);
 if (bar) {
 bar.style.transition = 'none';
 bar.style.width = '0%';
 }
 if (progressContainer) {
 progressContainer.style.opacity = '0.35';
 }
 } else {
 if (progressContainer) {
 progressContainer.style.opacity = '1';
 }
 resetAndStartProgressBar();
 startAutoplay();
 }
 });
 let startX = 0;
 let endX = 0;
 carousel.addEventListener('touchstart', (e) => {
 startX = e.touches[0].clientX;
 endX = startX;
 }, { passive: true });
 carousel.addEventListener('touchmove', (e) => {
 endX = e.touches[0].clientX;
 }, { passive: true });
 carousel.addEventListener('touchend', () => {
 handleSwipe();
 });
 carousel.addEventListener('mousedown', (e) => {
 startX = e.clientX;
 endX = startX;
 const onMouseMove = (moveEvent) => {
 endX = moveEvent.clientX;
 };
 const onMouseUp = () => {
 window.removeEventListener('mousemove', onMouseMove);
 window.removeEventListener('mouseup', onMouseUp);
 handleSwipe();
 };
 window.addEventListener('mousemove', onMouseMove);
 window.addEventListener('mouseup', onMouseUp);
 });
 function handleSwipe() {
 const threshold = 40; 
 const diff = startX - endX;
 if (Math.abs(diff) > threshold) {
 if (isAutoplayPaused) {
 isAutoplayPaused = false;
 const progressContainer = document.querySelector('.carousel-progress-bar-container');
 if (progressContainer) progressContainer.style.opacity = '1';
 }
 if (diff > 0) {
 nextSlide();
 } else {
 prevSlide();
 }
 startAutoplay();
 }
 }
}
let galleryItems = [];
let filteredGalleryItems = [];
let lightboxItems = [];
let currentLightboxIndex = 0;
async function loadGallery() {
 const galleryGrid = document.getElementById('gallery-grid-container');
 if (!galleryGrid) return;
 try {
 const q = query(collection(db, "gallery"), where("isActive", "==", true));
 const querySnapshot = await getDocs(q);
 galleryGrid.innerHTML = ''; 
 galleryItems = [];
 if (querySnapshot.empty) {
 galleryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No projects in gallery yet.</p>';
 return;
 }
 querySnapshot.forEach((doc) => {
 galleryItems.push({ id: doc.id, ...doc.data() });
 });
 galleryItems.sort((a, b) => {
 const timeA = a.createdAt?.seconds || 0;
 const timeB = b.createdAt?.seconds || 0;
 return timeB - timeA;
 });
 filteredGalleryItems = [...galleryItems];
 renderGalleryGrid();
 setupGalleryFilters();
 setupLightbox();
 } catch (error) {
 console.error("Error loading gallery:", error);
 galleryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Error loading gallery.</p>';
 }
}
function renderGalleryGrid() {
 const galleryGrid = document.getElementById('gallery-grid-container');
 if (!galleryGrid) return;
 galleryGrid.innerHTML = '';
 lightboxItems = filteredGalleryItems.slice(0, 6);
 lightboxItems.forEach((item, index) => {
 const card = document.createElement('div');
 card.className = 'gallery-card';
 card.setAttribute('data-index', index);
 card.innerHTML = `
 <img src="${item.imageURL || 'https://via.placeholder.com/400x300?text=Waaree+Solar'}" alt="${item.caption || 'Waaree Solar Panel Installation'}" loading="lazy">
 <div class="gallery-card-overlay">
 <span class="gallery-card-cat">${item.category || 'Solar Project'}</span>
 <h3 class="gallery-card-title">${item.caption || 'Solar Panel Installation'}</h3>
 </div>
 `;
 card.addEventListener('click', () => openLightbox(index));
 galleryGrid.appendChild(card);
 });
}
function setupGalleryFilters() {
 const filterContainer = document.getElementById('gallery-filters-container');
 if (!filterContainer) return;
 const filterBtns = filterContainer.querySelectorAll('.gallery-filter-btn');
 filterBtns.forEach(btn => {
 btn.addEventListener('click', (e) => {
 filterBtns.forEach(b => b.classList.remove('active'));
 btn.classList.add('active');
 const filter = btn.getAttribute('data-filter');
 if (filter === 'all') {
 filteredGalleryItems = [...galleryItems];
 } else {
 filteredGalleryItems = galleryItems.filter(item => item.category === filter);
 }
 renderGalleryGrid();
 });
 });
}
function setupLightbox() {
 const lightbox = document.getElementById('gallery-lightbox');
 const closeBtn = document.getElementById('lightbox-close-btn');
 const prevBtn = document.getElementById('lightbox-prev-btn');
 const nextBtn = document.getElementById('lightbox-next-btn');
 if (!lightbox) return;
 if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
 lightbox.addEventListener('click', (e) => {
 if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
 closeLightbox();
 }
 });
 if (prevBtn) {
 prevBtn.addEventListener('click', (e) => {
 e.stopPropagation();
 navigateLightbox(-1);
 });
 }
 if (nextBtn) {
 nextBtn.addEventListener('click', (e) => {
 e.stopPropagation();
 navigateLightbox(1);
 });
 }
 document.addEventListener('keydown', (e) => {
 if (!lightbox.classList.contains('active')) return;
 if (e.key === 'Escape') closeLightbox();
 if (e.key === 'ArrowLeft') navigateLightbox(-1);
 if (e.key === 'ArrowRight') navigateLightbox(1);
 });
}
function openLightbox(index) {
 const lightbox = document.getElementById('gallery-lightbox');
 if (!lightbox) return;
 currentLightboxIndex = index;
 updateLightboxContent();
 lightbox.style.display = 'flex';
 setTimeout(() => {
 lightbox.classList.add('active');
 }, 10);
 document.body.style.overflow = 'hidden';
}
function closeLightbox() {
 const lightbox = document.getElementById('gallery-lightbox');
 if (!lightbox) return;
 lightbox.classList.remove('active');
 setTimeout(() => {
 lightbox.style.display = 'none';
 }, 400);
 document.body.style.overflow = '';
}
function navigateLightbox(dir) {
 if (lightboxItems.length <= 1) return;
 currentLightboxIndex = (currentLightboxIndex + dir + lightboxItems.length) % lightboxItems.length;
 updateLightboxContent();
}
function updateLightboxContent() {
 const item = lightboxItems[currentLightboxIndex];
 if (!item) return;
 const img = document.getElementById('lightbox-img');
 const cat = document.getElementById('lightbox-cat');
 const desc = document.getElementById('lightbox-desc');
 const prevBtn = document.getElementById('lightbox-prev-btn');
 const nextBtn = document.getElementById('lightbox-next-btn');
 if (img) img.src = item.imageURL;
 if (cat) cat.innerText = item.category || 'Solar Project';
 if (desc) desc.innerText = item.caption || '';
 if (lightboxItems.length <= 1) {
 if (prevBtn) prevBtn.style.display = 'none';
 if (nextBtn) nextBtn.style.display = 'none';
 } else {
 if (prevBtn) prevBtn.style.display = 'flex';
 if (nextBtn) nextBtn.style.display = 'flex';
 }
}
window.addEventListener('DOMContentLoaded', () => {
 loadHeroSlides();
 loadProducts();
 loadReviews();
 loadGallery();
 const header = document.querySelector('header');
 const heroSection = document.querySelector('.hero-slider-section');
 function handleHeaderScroll() {
 if (!header || !heroSection) return;
 const heroHeight = heroSection.offsetHeight;
 if (window.scrollY > (heroHeight - 60)) {
 header.classList.add('scrolled');
 } else {
 header.classList.remove('scrolled');
 }
 }
 window.addEventListener('scroll', handleHeaderScroll, { passive: true });
 handleHeaderScroll();
 const prevBtn = document.getElementById('prev-review-btn');
 const nextBtn = document.getElementById('next-review-btn');
 const reviewsContainer = document.getElementById('reviews-container');
 if (prevBtn && nextBtn && reviewsContainer) {
 prevBtn.addEventListener('click', () => {
 const cardWidth = reviewsContainer.querySelector('.review-card')?.offsetWidth || 350;
 reviewsContainer.scrollBy({ left: -(cardWidth + 12), behavior: 'smooth' });
 });
 nextBtn.addEventListener('click', () => {
 const cardWidth = reviewsContainer.querySelector('.review-card')?.offsetWidth || 350;
 reviewsContainer.scrollBy({ left: (cardWidth + 12), behavior: 'smooth' });
 });
 }
 const floatingWA = document.getElementById('floating-wa');
 if (floatingWA) {
 let scrollTimeout;
 setTimeout(() => {
 floatingWA.classList.add('expanded');
 }, 1500);
 window.addEventListener('scroll', () => {
 floatingWA.classList.remove('expanded');
 clearTimeout(scrollTimeout);
 scrollTimeout = setTimeout(() => {
 floatingWA.classList.add('expanded');
 }, 1200);
 }, { passive: true });
 }
});