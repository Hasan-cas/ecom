// products.js

// --- State Management ---
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 20;

// DOM Elements
const grid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const paginationContainer = document.getElementById('pagination');
const categoryFilters = document.getElementById('category-filters');

// --- Data Fetching ---
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const result = await res.json();
        if (result.status === 'success') {
            allProducts = result.data;
            applyFilters(); // Initial render
        }
    } catch (err) {
        if (grid) {
            grid.innerHTML = `<p class="col-span-full text-center py-20 text-red-500">Failed to load products.</p>`;
        }
    }
}

// --- Logic: Filtering & Sorting ---
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const activeBtn = document.querySelector('.active-filter');
    const activeCategory = activeBtn ? activeBtn.dataset.category : 'all';
    const sortBy = sortSelect.value;

    // 1. Filter
    filteredProducts = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) || 
                             (p.description && p.description.toLowerCase().includes(searchTerm));
        const matchesCategory = activeCategory === 'all' || (p.category && p.category === activeCategory);
        return matchesSearch && matchesCategory;
    });

    // 2. Sort
    if (sortBy === 'price-low') filteredProducts.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') filteredProducts.sort((a, b) => b.price - a.price);
    if (sortBy === 'newest') filteredProducts.sort((a, b) => b.id - a.id); // Assuming higher ID is newer

    currentPage = 1; 
    renderGrid();
}

// --- Rendering ---
function renderGrid() {
    if (!grid) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredProducts.slice(start, end);

    if (pageItems.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center py-20 text-gray-400">No matching scents found.</p>`;
        paginationContainer.innerHTML = '';
        return;
    }

    grid.innerHTML = pageItems.map(p => `
        <div class="group">
            <a href="/product?id=${p.id}" class="block overflow-hidden rounded-[30px] bg-gray-50 aspect-[4/5] mb-6">
                <img src="${p.image || 'https://via.placeholder.com/400x500'}" 
                     class="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition duration-700">
            </a>
            <div class="px-2">
                <h3 class="serif text-lg text-forest mb-1">${p.name}</h3>
                <p class="text-gray-400 text-[10px] uppercase tracking-widest mb-3">${p.category || 'Luxury Fragrance'}</p>
                <p class="font-semibold">$${parseFloat(p.price).toFixed(2)}</p>
            </div>
        </div>
    `).join('');

    renderPagination();
}

function renderPagination() {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button onclick="changePage(${i})" 
                class="w-10 h-10 rounded-full border ${i === currentPage ? 'bg-forest text-white border-forest' : 'border-gray-200 text-gray-500'} text-xs font-bold transition">
                ${i}
            </button>`;
    }
    paginationContainer.innerHTML = html;
}

// Exposed globally for the onclick attribute in HTML
window.changePage = function(page) {
    currentPage = page;
    renderGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- Event Listeners ---
if (searchInput) searchInput.addEventListener('input', applyFilters);
if (sortSelect) sortSelect.addEventListener('change', applyFilters);

if (categoryFilters) {
    categoryFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active-filter'));
            e.target.classList.add('active-filter');
            applyFilters();
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', loadProducts);
