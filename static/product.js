// product-details.js

// 1. Get ID from URL: 127.0.0.1:5000/product.html?id=2
function getProductIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 2. Fetch data from Flask API
async function fetchProduct() {
    const id = getProductIdFromURL();
    if (!id) {
        showError();
        return;
    }

    try {
        const response = await fetch(`/api/products/${id}`);
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            renderProduct(result.data);
        } else {
            showError();
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showError();
    }
}

// 3. Render Data to DOM
function renderProduct(product) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('product-view').classList.remove('hidden');

    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = `$${parseFloat(product.price).toFixed(2)}`;
    document.getElementById('product-description').textContent = product.description;
    document.getElementById('product-image').src = product.image || 'https://placehold.co/600x800?text=No+Image';
    
    const stockBadge = document.getElementById('product-stock');
    const btn = document.getElementById('add-to-cart-btn');

    if (product.stock > 0) {
        stockBadge.textContent = `In Stock (${product.stock})`;
        stockBadge.className = "px-3 py-1 text-[9px] uppercase tracking-tighter rounded-full border border-green-800 text-green-800";
        btn.onclick = () => addToCart(product.id);
    } else {
        stockBadge.textContent = "Sold Out";
        stockBadge.className = "px-3 py-1 text-[9px] uppercase tracking-tighter rounded-full border border-gray-300 text-gray-400";
        btn.disabled = true;
        btn.textContent = "Out of Stock";
    }
}

// 4. Add to Cart Logic
async function addToCart(productId) {
    const btn = document.getElementById('add-to-cart-btn');
    btn.disabled = true;
    btn.textContent = "Adding...";

    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("Added to bag", "text-green-700");
            const badge = document.getElementById('cart-count');
            badge.textContent = parseInt(badge.textContent) + 1;
        } else {
            showMessage(result.message || "Error", "text-red-700");
        }
    } catch (err) {
        showMessage("Connection Error", "text-red-700");
    } finally {
        btn.disabled = false;
        btn.textContent = "Add to Bag";
    }
}

// Helpers
function showError() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error-view');
    if(loadingEl) loadingEl.classList.add('hidden');
    if(errorEl) errorEl.classList.remove('hidden');
}

function showMessage(text, colorClass) {
    const box = document.getElementById('message-box');
    box.textContent = text;
    box.className = `text-center text-[11px] uppercase tracking-widest font-bold mt-4 ${colorClass}`;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 3000);
}

// Initialize
window.onload = fetchProduct;
