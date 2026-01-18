// product.js

// 1. Get ID from URL
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
            // Check cart status on load to show/hide checkout button
            updateCheckoutButtonVisibility();
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
            // Update nav badge count
            badge.textContent = result.data.total_items || (parseInt(badge.textContent) + 1);
            // Show checkout button after adding item
            updateCheckoutButtonVisibility();
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

// 5. NEW: Checkout Button Logic
async function updateCheckoutButtonVisibility() {
    const checkoutBtn = document.getElementById('proceed-to-checkout-btn');
    try {
        const response = await fetch('/api/cart');
        const result = await response.json();
        
        // If cart has items, show the button
        if (result.status === 'success' && result.data.total_items > 0) {
            checkoutBtn.classList.remove('hidden');
        } else {
            checkoutBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error checking cart status:", error);
        checkoutBtn.classList.add('hidden');
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
