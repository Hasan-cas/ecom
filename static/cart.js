/**
 * ZENFOX | Shopping Bag Logic
 * Optimized for performance and UI responsiveness.
 */

const API_BASE = '/api/cart'; 
const container = document.getElementById('cart-container');
const summary = document.getElementById('cart-summary');
const emptyState = document.getElementById('empty-state');
const totalEl = document.getElementById('total-price');
const countHeader = document.getElementById('cart-count-header');
const clearBtn = document.getElementById('clear-btn');

/**
 * Event Delegation: Handle removals
 */
if (container) {
    container.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        
        if (removeBtn) {
            const productId = removeBtn.dataset.id;
            
            // UI Feedback: Disable button while processing
            removeBtn.disabled = true;
            removeBtn.innerText = 'Removing...';
            
            await removeItem(productId);
        }
    });
}

/**
 * Fetch cart data from server
 */
async function fetchCart() {
    try {
        const response = await fetch(API_BASE);
        const result = await response.json();
        if (result.status === 'success') {
            renderCart(result.data);
        }
    } catch (err) {
        console.error("Cart retrieval error:", err);
    }
}

/**
 * Update DOM with fresh cart data
 */
function renderCart(cartData) {
    if (!cartData) return;
    const items = cartData.items || [];
    
    // Update header count
    if (countHeader) {
        countHeader.innerText = `${cartData.total_items || 0} Items`;
    }

    // Toggle Empty State vs Cart Content
    const hasItems = items.length > 0;
    
    container?.classList.toggle('hidden', !hasItems);
    summary?.classList.toggle('hidden', !hasItems);
    clearBtn?.classList.toggle('hidden', !hasItems);
    emptyState?.classList.toggle('hidden', hasItems);

    if (!hasItems) return;

    // Render Items
    container.innerHTML = items.map(item => `
        <div class="bg-white p-6 rounded-[30px] flex items-center gap-6 border border-gray-50 group hover:border-sage transition shadow-sm">
            <div class="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                <img src="${item.image || ''}" class="w-full h-full object-cover" alt="${item.product_name}">
            </div>
            <div class="flex-grow">
                <h3 class="serif text-lg text-forest uppercase tracking-tight">${item.product_name}</h3>
                <p class="text-xs text-gray-400 mt-1 italic">$${parseFloat(item.product_price).toFixed(2)} unit</p>
            </div>
            <div class="flex flex-col items-end gap-2">
                <div class="text-[10px] uppercase tracking-widest font-bold text-gray-400">Qty: ${item.quantity}</div>
                <div class="font-bold text-forest">$${parseFloat(item.subtotal).toFixed(2)}</div>
                
                <button type="button" 
                        data-id="${item.product_id}" 
                        class="remove-item-btn text-[9px] uppercase tracking-widest text-red-300 hover:text-red-600 transition font-bold mt-1 disabled:opacity-50">
                    Remove
                </button>
            </div>
        </div>
    `).join('');

    if (totalEl) {
        totalEl.innerText = `$${parseFloat(cartData.total_price || 0).toFixed(2)}`;
    }
}

/**
 * API Call: Remove specific item
 */
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
            console.error("Server Error:", result.message);
            // Re-render to reset button state if removal fails
            fetchCart(); 
        }
    } catch (err) {
        console.error("Network Error:", err);
        fetchCart();
    }
}

/**
 * API Call: Clear entire cart
 */
async function handleClearCart() {
    if (!confirm("Are you sure you want to clear your shopping bag?")) return;
    
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

// Initialization
document.addEventListener('DOMContentLoaded', fetchCart);
clearBtn?.addEventListener('click', handleClearCart);

