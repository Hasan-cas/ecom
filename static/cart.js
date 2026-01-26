/**
 * ZENFOX | Shopping Bag Logic
 * Refactored for event-driven architecture and production reliability.
 */

// Configuration & Selectors
const API_BASE = '/api/cart'; 
const DOM = {
    container: document.getElementById('cart-container'),
    summary: document.getElementById('cart-summary'),
    emptyState: document.getElementById('empty-state'),
    totalEl: document.getElementById('total-price'),
    countHeader: document.getElementById('cart-count-header'),
    clearBtn: document.getElementById('clear-btn'),
    checkoutBtn: document.getElementById('checkout-btn') // Replaces onclick
};

/**
 * 1. INITIALIZATION & GLOBAL LISTENERS
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initial data fetch
    fetchCart();

    // Listener for Checkout Button
    if (DOM.checkoutBtn) {
        DOM.checkoutBtn.addEventListener('click', navigateToCheckout);
    }

    // Listener for Clear Cart Button
    if (DOM.clearBtn) {
        DOM.clearBtn.addEventListener('click', handleClearCart);
    }

    // Global "Enter" key listener for the Cart Page
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Only proceed if the checkout button is visible (cart not empty)
            if (DOM.summary && !DOM.summary.classList.contains('hidden')) {
                navigateToCheckout();
            }
        }
    });

    // Event Delegation for "Remove Item" buttons
    // This works even when items are re-rendered dynamically
    if (DOM.container) {
        DOM.container.addEventListener('click', async (e) => {
            const removeBtn = e.target.closest('.remove-item-btn');
            if (removeBtn) {
                const productId = removeBtn.dataset.id;
                
                // UI Feedback: Visual disabling
                removeBtn.disabled = true;
                removeBtn.innerHTML = '<span class="animate-pulse">Removing...</span>';
                
                await removeItem(productId);
            }
        });
    }
});

/**
 * 2. CORE LOGIC FUNCTIONS
 */

async function fetchCart() {
    try {
        const response = await fetch(API_BASE);
        const result = await response.json();
        
        // Backend structure: { status: "success", data: { items: [], total_price: 0 } }
        if (result.status === 'success') {
            renderCart(result.data);
        }
    } catch (err) {
        console.error("Cart retrieval error:", err);
    }
}

function renderCart(cartData) {
    if (!cartData) return;
    const items = cartData.items || [];
    
    // Update Header Count
    if (DOM.countHeader) {
        DOM.countHeader.innerText = `(${cartData.total_items || 0})`;
    }

    // Toggle Empty State vs Summary
    if (items.length === 0) {
        DOM.container.innerHTML = '';
        DOM.summary.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
        return;
    }

    DOM.emptyState.classList.add('hidden');
    DOM.summary.classList.remove('hidden');

    // Render Items
    DOM.container.innerHTML = items.map(item => `
        <div class="flex items-center justify-between p-6 bg-white rounded-[30px] mb-4 border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center space-x-6">
                <div class="w-20 h-20 bg-sage rounded-2xl overflow-hidden">
                    <img src="${item.image || '/static/placeholder.jpg'}" alt="${item.product_name}" class="w-full h-full object-cover">
                </div>
                <div>
                    <h3 class="serif text-lg text-forest">${item.product_name}</h3>
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Qty: ${item.quantity} • $${item.product_price.toFixed(2)}</p>
                </div>
            </div>
            <div class="text-right flex flex-col items-end space-y-2">
                <span class="text-sm font-bold text-forest">$${item.subtotal.toFixed(2)}</span>
                <button data-id="${item.product_id}" class="remove-item-btn text-[9px] uppercase tracking-[0.2em] text-red-400 hover:text-red-600 font-bold transition-colors">
                    Remove Item
                </button>
            </div>
        </div>
    `).join('');

    // Update Grand Total
    if (DOM.totalEl) {
        DOM.totalEl.innerText = `$${parseFloat(cartData.total_price || 0).toFixed(2)}`;
    }
}

async function removeItem(productId) {
    try {
        const response = await fetch(`${API_BASE}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            renderCart(result.data);
        } else {
            console.error("Removal Error:", result.message);
            fetchCart(); // Reset UI on error
        }
    } catch (err) {
        console.error("Network Error:", err);
        fetchCart();
    }
}

async function handleClearCart() {
    if (!confirm("Clear your entire shopping bag?")) return;
    
    try {
        const response = await fetch(`${API_BASE}/clear`, { method: 'POST' });
        const result = await response.json();
        if (result.status === 'success') {
            renderCart({ items: [], total_items: 0, total_price: 0.0 });
        }
    } catch (err) {
        console.error("Clear failed:", err);
    }
}

function navigateToCheckout() {
    // Standardizing the navigation logic
    window.location.href = '/checkout';
}

