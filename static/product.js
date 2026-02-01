/**
 * Markazus Sunnah | Product Detail Logic (Production Ready)
 * Version: 2.3.0 (Added Image Gallery Support)
 */

let currentProduct = null;
let currentSelectedSize = "";

// DOM Elements
const elements = {
    name: document.getElementById('product-name'),
    price: document.getElementById('product-price'),
    description: document.getElementById('product-description'),
    image: document.getElementById('product-image'),
    gallery: document.getElementById('image-gallery'), // New: Gallery Container
    sizeContainer: document.getElementById('size-container'),
    stockPill: document.getElementById('stock-pill'),
    quantity: document.getElementById('quantity'),
    addToCartBtn: document.getElementById('addToCart'),
    buyNowBtn: document.getElementById('buyNow'),
    messageBox: document.getElementById('message-box'),
    accordionGroup: document.getElementById('accordion-group')
};

// 1. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    fetchProduct();
    setupEventListeners();
});

// 2. FETCH DATA
async function fetchProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return;

    try {
        const response = await fetch(`/api/products/${id}`);
        const result = await response.json();
        if (result.status === 'success' && result.data) {
            currentProduct = result.data;
            renderProduct(currentProduct);
        }
    } catch (error) {
        console.error("Load Error:", error);
    }
}

// 3. EVENT LISTENERS
function setupEventListeners() {
    // Drawer/Accordion Logic
    if (elements.accordionGroup) {
        elements.accordionGroup.addEventListener('click', (e) => {
            const header = e.target.closest('.accordion-header');
            if (!header) return;

            const item = header.parentElement;
            const isActive = item.classList.contains('active');

            document.querySelectorAll('.accordion-item').forEach(el => {
                el.classList.remove('active');
            });

            if (!isActive) item.classList.add('active');
        });
    }

    // Volume Selection
    elements.sizeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.size-option');
        if (!btn) return;

        document.querySelectorAll('.size-option').forEach(el => el.classList.remove('active', 'border-black'));
        btn.classList.add('active', 'border-black');

        const variant = {
            size: btn.getAttribute('data-size'),
            price: btn.getAttribute('data-price'),
            stock: btn.getAttribute('data-stock')
        };
        updateVariantDisplay(variant);
    });

    // Gallery Switching (Event Delegation)
    if (elements.gallery) {
        elements.gallery.addEventListener('click', (e) => {
            const thumb = e.target.closest('.gallery-thumb');
            if (!thumb) return;

            // Update main image
            elements.image.src = thumb.getAttribute('data-src');

            // Update active state UI
            document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('thumb-active'));
            thumb.classList.add('thumb-active');
        });
    }

    // Quantity Buttons
    document.getElementById('increase').addEventListener('click', () => {
        elements.quantity.value = parseInt(elements.quantity.value) + 1;
    });

    document.getElementById('decrease').addEventListener('click', () => {
        const val = parseInt(elements.quantity.value);
        if (val > 1) elements.quantity.value = val - 1;
    });

    // Cart Actions
    elements.addToCartBtn.addEventListener('click', () => addToBag(false));
    elements.buyNowBtn.addEventListener('click', () => addToBag(true));
}

// 4. RENDERING & UI UPDATES
function renderProduct(product) {
    elements.name.textContent = product.name;
    elements.description.textContent = product.description;
    elements.image.src = product.image || 'https://placehold.co/600x800?text=No+Image';

    // Render Gallery
    renderGallery(product);

    let variants = [];
    if (Array.isArray(product.variants)) {
        variants = product.variants;
    } else if (typeof product.variants === 'string' && product.variants.trim() !== "") {
        variants = product.variants.split(',').map(s => ({ 
            size: s.trim(), 
            price: product.price, 
            stock: product.stock 
        }));
    }

    if (variants.length > 0) {
        elements.sizeContainer.innerHTML = variants.map((v, index) => `
            <button data-size="${v.size}" data-price="${v.price}" data-stock="${v.stock}"
                    class="size-option px-8 py-3 border-2 border-gray-100 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all hover:border-black ${index === 0 ? 'active border-black' : ''}">
                ${v.size}
            </button>
        `).join('');
        updateVariantDisplay(variants[0]);
    }
}

function renderGallery(product) {
    if (!elements.gallery) return;
    
    // Combine main image and gallery images
    const images = [product.image, ...(product.gallery || [])].filter(src => src);

    if (images.length <= 1) {
        elements.gallery.innerHTML = "";
        return;
    }

    elements.gallery.innerHTML = images.map((src, i) => `
        <div class="gallery-thumb aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all opacity-60 hover:opacity-100 ${i === 0 ? 'thumb-active' : 'border-transparent'}" 
             data-src="${src}">
            <img src="${src}" class="w-full h-full object-cover">
        </div>
    `).join('');
}

function updateVariantDisplay(variant) {
    if (!variant) return;
    currentSelectedSize = variant.size;
    elements.price.textContent = `BDT ${parseFloat(variant.price).toLocaleString()}`;

    const isAvailable = parseInt(variant.stock) > 0;
    elements.stockPill.textContent = isAvailable ? "In Stock" : "Out of Stock";
    elements.stockPill.className = `px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isAvailable ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-red-500 text-red-600 bg-red-50'}`;
    
    elements.addToCartBtn.disabled = !isAvailable;
    elements.buyNowBtn.disabled = !isAvailable;
    elements.addToCartBtn.textContent = isAvailable ? "Add to Cart" : "Sold Out";
}

// 5. API ACTIONS
async function addToBag(redirect) {
    if (!currentProduct) return;
    const btn = redirect ? elements.buyNowBtn : elements.addToCartBtn;
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                product_id: currentProduct.id, 
                quantity: parseInt(elements.quantity.value),
                size: currentSelectedSize 
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            showMessage("Added to Bag", "bg-black");
            if (redirect) window.location.href = '/cart';
        }
    } catch (err) {
        showMessage("Connection Error", "bg-red-600");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function showMessage(text, bgColor) {
    elements.messageBox.textContent = text;
    elements.messageBox.className = `fixed top-6 right-6 z-[100] px-8 py-4 rounded-full shadow-2xl font-bold uppercase tracking-widest text-[10px] text-white transition-all duration-300 show ${bgColor}`;
    elements.messageBox.classList.remove('hidden');
    setTimeout(() => {
        elements.messageBox.classList.remove('show');
        setTimeout(() => elements.messageBox.classList.add('hidden'), 400);
    }, 3000);
}

