const PRODUCT_API = '/api/products';
const CART_API = '/api/cart';

const productsGrid = document.getElementById('products-grid');
const cartBadge = document.getElementById('cart-badge');
let cartTotal = 0;

async function init() {
    await fetchCartStatus();
    await fetchFeaturedProducts();
}

async function fetchFeaturedProducts() {
    try {
        const response = await fetch(PRODUCT_API);
        const result = await response.json();
        if (result.status === 'success') {
            renderProducts(result.data);
        }
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

function renderProducts(products) {
    if (!productsGrid) return;

    productsGrid.innerHTML = products.map(product => `
        <div class="group cursor-pointer">
            <div class="relative aspect-[4/5] bg-gray-100 mb-6 overflow-hidden rounded-[40px]">
                <img src="${product.image || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80'}" 
                     alt="${product.name}" 
                     class="w-full h-full object-cover transition duration-700 group-hover:scale-110">
                
                <button onclick="event.stopPropagation(); addToCart(${product.id})" 
                        class="absolute bottom-8 right-8 bg-forest text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-2xl opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition duration-300 z-20">
                    +
                </button>

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
        </div>
    `).join('');
}

async function addToCart(productId) {
    try {
        const response = await fetch(`${CART_API}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            cartTotal = result.data.total_items;
            updateCartUI();
            showToast(`Added to your bag`, "success");
        } else {
            showToast(result.message || "Could not add to cart", "error");
        }
    } catch (error) {
        console.error("Cart error:", error);
        showToast("Server connection error", "error");
    }
}

// FIX: Attach to window so the onclick in the dynamic HTML can find it
window.addToCart = addToCart;

async function fetchCartStatus() {
    try {
        const response = await fetch(CART_API);
        const result = await response.json();
        // FIX: Match the data structure from cart_route.py
        if (result.status === 'success' && result.data) {
            cartTotal = result.data.total_items;
            updateCartUI();
        }
    } catch (error) {
        console.warn("Could not sync cart state.");
    }
}

function updateCartUI() {
    if (cartBadge) {
        cartBadge.innerText = cartTotal;
        const cartIcon = cartBadge.parentElement;
        cartIcon.classList.add('scale-125');
        setTimeout(() => cartIcon.classList.remove('scale-125'), 200);
    }
}

function showToast(msg, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColor = type === "success" ? "bg-forest" : "bg-red-800";
    
    toast.className = `${bgColor} text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl transition-all duration-500 transform translate-y-10 opacity-0`;
    toast.innerText = msg;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);

