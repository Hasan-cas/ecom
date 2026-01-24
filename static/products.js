let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 12;
let searchTimeout;

const grid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const parentContainer = document.getElementById('parent-filter-container');
const subArea = document.getElementById('sub-filter-area');

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const result = await res.json();
        if (result.status === 'success') {
            allProducts = result.data;
            console.log("Products loaded:", allProducts);
            
            renderParents();
            applyFilters();
        }
    } catch (err) {
        console.error("Fetch error:", err);
        grid.innerHTML = `<p class="col-span-full text-center py-20">Error loading products.</p>`;
    }
}

function renderParents() {
    const parents = [...new Set(allProducts
        .map(p => p.category ? p.category.split('-')[0].trim() : null)
        .filter(Boolean)
    )].sort();

    console.log("Parent categories found:", parents);
    
    parentContainer.innerHTML = parents.map(cat => `
        <button class="parent-btn px-6 py-2 rounded-full border border-gray-200 text-[10px] font-bold uppercase tracking-widest transition" data-parent="${cat.toLowerCase()}">${cat}</button>
    `).join('');
}

function renderSubCategories(parentVal) {
    const subs = [...new Set(allProducts
        .filter(p => {
            const cat = p.category ? p.category.toLowerCase().trim() : "";
            const parentLower = parentVal.toLowerCase();
            return cat.startsWith(parentLower + '-');
        })
        .map(p => {
            const parts = p.category.split('-');
            return parts.length > 1 ? parts[1].trim() : null;
        })
    )].filter(Boolean).sort();

    console.log(`Sub-categories for ${parentVal}:`, subs);

    if (subs.length > 0) {
        subArea.classList.remove('hidden');
        subArea.className = "no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-4 w-full";
        
        subArea.innerHTML = subs.map(s => `
            <button class="sub-btn whitespace-nowrap px-4 py-1 rounded-full bg-gray-100 text-[10px] font-bold uppercase transition flex-shrink-0" data-sub="${parentVal.toLowerCase()}-${s.toLowerCase()}">${s}</button>
        `).join('');
    } else {
        subArea.classList.add('hidden');
        subArea.innerHTML = '';
    }
}

// EVENT DELEGATION - Click on parent buttons
parentContainer.addEventListener('click', (e) => {
    if (!e.target.classList.contains('parent-btn')) return;
    
    const parentVal = e.target.dataset.parent;
    const isActive = e.target.classList.contains('active-filter');
    
    // Reset all parent buttons
    document.querySelectorAll('.parent-btn').forEach(btn => btn.classList.remove('active-filter'));
    
    if (isActive) {
        subArea.classList.add('hidden');
        subArea.innerHTML = '';
        applyFilters();
        return;
    }

    // Activate the clicked parent
    e.target.classList.add('active-filter');
    renderSubCategories(parentVal);
    applyFilters();
});

// EVENT DELEGATION - Click on sub buttons
subArea.addEventListener('click', (e) => {
    if (!e.target.classList.contains('sub-btn')) return;
    
    const subVal = e.target.dataset.sub;
    const wasActive = e.target.classList.contains('active-filter');
    
    // Reset all sub buttons
    document.querySelectorAll('.sub-btn').forEach(btn => btn.classList.remove('active-filter'));
    
    if (!wasActive) {
        e.target.classList.add('active-filter');
    }
    
    console.log("Active sub-category:", subVal);
    applyFilters();
});

function applyFilters() {
    const search = searchInput.value.toLowerCase();
    const activeParent = document.querySelector('.parent-btn.active-filter')?.dataset.parent;
    const activeSub = document.querySelector('.sub-btn.active-filter')?.dataset.sub;
    const sort = sortSelect.value;

    console.log("Filtering with - Parent:", activeParent, "Sub:", activeSub);

    filteredProducts = allProducts.filter(p => {
        const pCat = p.category ? p.category.toLowerCase().trim() : "";
        const matchesSearch = p.name.toLowerCase().includes(search);
        
        let matchesCategory = true;
        
        if (activeSub) {
            matchesCategory = (pCat === activeSub);
        } else if (activeParent) {
            matchesCategory = (pCat === activeParent || pCat.startsWith(activeParent + '-'));
        }

        return matchesSearch && matchesCategory;
    });

    console.log("Filtered products count:", filteredProducts.length);

    if (sort === 'price-low') filteredProducts.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') filteredProducts.sort((a, b) => b.price - a.price);
    else filteredProducts.sort((a, b) => b.id - a.id);

    currentPage = 1;
    renderGrid();
}

function renderGrid() {
    if (!grid) return;
    const start = (currentPage - 1) * itemsPerPage;
    const items = filteredProducts.slice(start, start + itemsPerPage);

    grid.innerHTML = items.length ? items.map(p => `
        <a href="/product?id=${p.id}" class="group cursor-pointer no-underline text-gray-900">
            <div class="overflow-hidden rounded-[30px] bg-gray-50 aspect-[4/5] mb-4 group-hover:scale-105 transition duration-500">
                <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover">
            </div>
            <h3 class="serif text-lg">${p.name}</h3>
            <p class="text-[10px] text-gray-400 uppercase mb-2">${p.category.replace('-', ' ')}</p>
            <p class="font-bold">$${p.price}</p>
        </a>
    `).join('') : `<p class="col-span-full text-center py-20 text-gray-400">No products found matching your criteria.</p>`;
    
    renderPagination();
}

function renderPagination() {
    const pages = Math.ceil(filteredProducts.length / itemsPerPage);
    const container = document.getElementById('pagination');
    if (pages <= 1) { container.innerHTML = ''; return; }
    
    let html = '';
    for (let i = 1; i <= pages; i++) {
        html += `<button onclick="changePage(${i})" 
            class="w-10 h-10 rounded-full border transition ${i === currentPage ? 'active-filter' : 'hover:bg-gray-100 border-gray-200'}">
            ${i}
        </button>`;
    }
    container.innerHTML = html;
}

function resetFilters() {
    searchInput.value = '';
    document.querySelectorAll('.parent-btn, .sub-btn').forEach(b => b.classList.remove('active-filter'));
    subArea.classList.add('hidden');
    subArea.innerHTML = '';
    applyFilters();
}

window.resetFilters = resetFilters;

// Reset button event listener
document.addEventListener('click', (e) => {
    if (e.target.textContent === '×' && e.target.tagName === 'BUTTON') {
        resetFilters();
    }
});

window.changePage = (p) => { 
    currentPage = p; 
    renderGrid(); 
    window.scrollTo({top: 0, behavior: 'smooth'}); 
};

searchInput.addEventListener('input', () => { 
    clearTimeout(searchTimeout); 
    searchTimeout = setTimeout(applyFilters, 300); 
});

sortSelect.addEventListener('change', applyFilters);
document.addEventListener('DOMContentLoaded', loadProducts);
