/**
 * ZENFOX | Shopping Bag Logic
 * Integrates with: cart_service.py and cart_route.py
 */

// Note: Matches blueprint prefix (/api/cart) + route path (/api/cart)
const API_BASE = '/api/cart'; 
const container = document.getElementById('cart-container');
const summary = document.getElementById('cart-summary');
const emptyState = document.getElementById('empty-state');
const totalEl = document.getElementById('total-price');
const countHeader = document.getElementById('cart-count-header');
const clearBtn = document.getElementById('clear-btn');

/**
 * Fetch cart data from the server on page load
 */
async function fetchCart() {
    try {
        const response = await fetch(API_BASE);
        const result = await response.json();

        if (result.status === 'success') {
            renderCart(result); // Pass the whole result as it contains total_items
        }
    } catch (err) {
        console.error("Cart retrieval error:", err);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <p class="text-red-500 font-bold uppercase tracking-widest text-xs">
                        Connection Error: Fragrance Server Offline
                    </p>
                </div>`;
        }
    }
}

/**
 * Renders the Cart UI items and summary
 * @param {Object} data - The JSON response from the backend
 */
function renderCart(data) {
    // Handling different response shapes from fetch vs add/remove
    const cartData = data.data || data; 
    const items = cartData.items || [];
    
    // 1. Sync Header Count
    if (countHeader) {
        countHeader.innerText = `${cartData.total_items || 0} Items`;
    }

    // 2. Handle Empty State
    if (items.length === 0) {
        if (container) container.classList.add('hidden');
        if (summary) summary.classList.add('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    // 3. Reveal UI if items exist
    if (emptyState) emptyState.classList.add('hidden');
    if (container) container.classList.remove('hidden');
    if (summary) summary.classList.remove('hidden');
    if (clearBtn) clearBtn.classList.remove('hidden');

    // 4. Build Item List
    container.innerHTML = items.map(item => `
        <div class="bg-white p-6 rounded-[30px] flex items-center gap-6 border border-gray-50 group hover:border-sage transition shadow-sm">
            <div class="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                <img src="${item.image || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80'}" 
                     class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            </div>
            
            <div class="flex-grow">
                <h3 class="serif text-lg text-forest uppercase tracking-tight">${item.product_name}</h3>
                <p class="text-xs text-gray-400 mt-1 italic">$${parseFloat(item.product_price).toFixed(2)} unit</p>
            </div>

            <div class="flex flex-col items-end gap-2">
                <div class="text-[10px] uppercase tracking-widest font-bold text-gray-400">Qty: ${item.quantity}</div>
                <div class="font-bold text-forest">$${parseFloat(item.subtotal).toFixed(2)}</div>
                <button onclick="removeItem(${item.product_id})" 
                        class="text-[9px] uppercase tracking-widest text-red-300 hover:text-red-600 transition font-bold mt-1">
                    Remove
                </button>
            </div>
        </div>
    `).join('');

    // 5. Update Total Price
    if (totalEl) {
        totalEl.innerText = `$${parseFloat(cartData.total_price || 0).toFixed(2)}`;
    }
}

/**
 * Remove Single Item Logic
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
        }
    } catch (err) {
        console.error("Removal failed:", err);
    }
}

/**
 * Clear Entire Cart Logic
 */
async function handleClearCart() {
    if (!confirm("Are you sure you want to empty your bag?")) return;

    try {
        const response = await fetch(`${API_BASE}/clear`, { 
            method: 'POST' 
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            // Reset UI manually to empty state
            renderCart({ items: [], total_items: 0, total_price: 0.0 });
        }
    } catch (err) {
        console.error("Clear failed:", err);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', fetchCart);

if (clearBtn) {
    clearBtn.addEventListener('click', handleClearCart);
}

