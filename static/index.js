/**
 * ZENFOX | Frontend Logic
 * Version: Fixed Product Rendering Logic
 */

const PRODUCT_API = '/api/products';

// Initialize
async function init() {
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
        await fetchFeaturedProducts(productsGrid);
    }
}

// Fetch products from API
async function fetchFeaturedProducts(gridElement) {
    try {
        const response = await fetch(PRODUCT_API);
        const result = await response.json();

        // Ensure we check for the 'success' status and that 'data' exists
        if (result.status === 'success' && Array.isArray(result.data)) {
            renderProducts(result.data, gridElement);
        } else {
            console.error("Failed to retrieve products:", result.message);
        }
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

function renderProducts(products, container) {
    // Clear the container (removes any static placeholders)
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p class="text-center col-span-full text-gray-400">No scents available at the moment.</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <a href="/product?id=${product.id}" class="group block cursor-pointer">
            <div class="relative aspect-[4/5] bg-gray-100 mb-6 overflow-hidden rounded-[40px]">
                <img src="${product.image || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80'}" 
                     alt="${product.name}" 
                     class="w-full h-full object-cover transition duration-700 group-hover:scale-110">
                
                <div class="absolute top-6 left-6 bg-white/80 backdrop-blur-md px-4 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest">
                    ${product.stock > 0 ? 'Limited Edition' : 'Out of Stock'}
                </div>
            </div>
            <div class="flex justify-between items-start px-2">
                <div>
                    <h3 class="text-xl serif uppercase text-forest font-semibold tracking-tighter">${product.name}</h3>
                    <p class="text-gray-400 text-xs mt-1 italic">${product.description || 'Exclusive ZENFOX Scent'}</p>
                </div>
                <span class="font-bold text-forest">$${parseFloat(product.price).toFixed(2)}</span>
            </div>
        </a>
    `).join('');
}

document.addEventListener('DOMContentLoaded', init);
