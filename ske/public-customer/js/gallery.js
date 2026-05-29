import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

let galleryItems = [];
let filteredGalleryItems = [];
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
            galleryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem 0;">No projects in the gallery yet.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            galleryItems.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt descending
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
        galleryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red; padding: 3rem 0;">Error loading gallery. Please try again later.</p>';
    }
}

function renderGalleryGrid() {
    const galleryGrid = document.getElementById('gallery-grid-container');
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '';

    if (filteredGalleryItems.length === 0) {
        galleryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem 0;">No projects found in this category.</p>';
        return;
    }

    filteredGalleryItems.forEach((item, index) => {
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

    if (closeBtn) closeBtn.onclick = closeLightbox;

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    });

    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            navigateLightbox(-1);
        };
    }

    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            navigateLightbox(1);
        };
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
    if (filteredGalleryItems.length <= 1) return;
    currentLightboxIndex = (currentLightboxIndex + dir + filteredGalleryItems.length) % filteredGalleryItems.length;
    updateLightboxContent();
}

function updateLightboxContent() {
    const item = filteredGalleryItems[currentLightboxIndex];
    if (!item) return;

    const img = document.getElementById('lightbox-img');
    const cat = document.getElementById('lightbox-cat');
    const desc = document.getElementById('lightbox-desc');
    const prevBtn = document.getElementById('lightbox-prev-btn');
    const nextBtn = document.getElementById('lightbox-next-btn');

    if (img) img.src = item.imageURL;
    if (cat) cat.innerText = item.category || 'Solar Project';
    if (desc) desc.innerText = item.caption || '';

    if (filteredGalleryItems.length <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    } else {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadGallery();
});
