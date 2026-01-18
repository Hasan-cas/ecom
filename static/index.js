// product-details.js

/**
 * 1. Extract ID from URL
 * Works for: 127.0.0.1:5000/product?id=1
 */
function getProductIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * 2. Fetch Data from Flask API
 */
async function fetchProduct() {
    const id = getProductIdFromURL();
    
    // If no ID is present in URL, immediately show error
    if (!id) {
        showError();
        return;
    }

    try {
        // Ensure this matches your Flask route @app.route('/api/products/<int:id>')
        const response = await fetch(`/api/products/${id}`);
        const result = await response.json();

        if (response.ok && result.status === 'success' && result.data) {
            renderProduct(result.data);
        } else {
            showError();
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showError();
    }
}

/**
 * 3. Render Product Data to UI
 */
function renderProduct(product) {
    // Hide loader and show content
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('product-view').classList.remove('hidden');

    // Update Text Content
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = `$${parseFloat(product.price).toFixed(2)}`;
    document.getElementById('product-description').textContent = product.description;
    document.getElementById('category-crumb').textContent = product.category || 'Fragrance';
    
    // Update Image
    const imgElement = document.getElementById('product-image');
    imgElement.src = product.image || 'https://placehold.co/600x800?text=No+Image';
    imgElement.alt = product.name;
    
    const stockBadge = document.getElementById('product-stock');
    const btn = document.getElementById('add-to-cart-btn');

    // Stock Logic
    if (product.stock > 0) {
        stockBadge.textContent = `In Stock (${product.stock})`;
        stockBadge.className = "px-3 py-1 text-[9px] uppercase tracking-tighter rounded-full border border-green-800 text-green-800";
        btn.disabled = false;
        btn.onclick = () => addToCart(product.id);
    } else {
        stockBadge.textContent = "Sold Out";
        stockBadge.className = "px-3 py-1 text-[9px] uppercase tracking-tighter rounded-full border border-gray-300 text-gray-400";
        btn.disabled = true;
        btn.textContent = "Out of Stock";
    }
}

/**
 * 4. Add to Cart Logic
 */
async function addToCart(productId) {
    const btn = document.getElementById('add-to-cart-btn');
    const originalText = btn.textContent;
    
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
            // Increment the cart badge visually
            const badge = document.getElementById('cart-count');
            badge.textContent = parseInt(badge.textContent || 0) + 1;
        } else {
            showMessage(result.message || "Could not add to bag", "text-red-700");
        }
    } catch (err) {
        showMessage("Connection Error", "text-red-700");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// --- Helpers ---

function showError() {
    const loading = document.getElementById('loading');
    const errorView = document.getElementById('error-view');
    if (loading) loading.classList.add('hidden');
    if (errorView) errorView.classList.remove('hidden');
}

function showMessage(text, colorClass) {
    const box = document.getElementById('message-box');
    box.textContent = text;
    // Reset classes but keep basic styling
    box.className = `text-center text-[11px] uppercase tracking-widest font-bold mt-4 ${colorClass}`;
    box.classList.remove('hidden');
    
    // Hide message after 3 seconds
    setTimeout(() => {
        box.classList.add('hidden');
    }, 3000);
}

// --- Initialization ---
// Using DOMContentLoaded is safer than window.onload
document.addEventListener('DOMContentLoaded', fetchProduct);
