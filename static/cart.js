/**
 * Markazus Sunnah | Shopping Bag & Logic
 * Handles variants, dynamic shipping calculation, and refined UI.
 */

const API_BASE = '/api/cart';
const DOM = {
    container: document.getElementById('cart-container'),
    summary: document.getElementById('cart-summary'),
    emptyState: document.getElementById('empty-state'),
    subtotalEl: document.getElementById('subtotal-price'),
    shippingEl: document.getElementById('shipping-cost'),
    discountRow: document.getElementById('discount-row'),
    discountEl: document.getElementById('discount-amount'),
    grandTotalEl: document.getElementById('grand-total'),
    countHeader: document.getElementById('cart-count-header'),
    freeBadge: document.getElementById('free-delivery-badge'),
    options: document.getElementById('cart-options'),
    clearBtn: document.getElementById('clear-btn'),
    checkoutBtn: document.getElementById('checkout-btn')
};

let currentCartData = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await fetchCart();

    // Event Delegation for Drawer Toggles
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.drawer-toggle-btn');
        if (toggleBtn) {
            const item = toggleBtn.closest('.drawer-item');
            item.classList.toggle('active');
        }
    });

    // Event Delegation for Remove Buttons in Cart
    if (DOM.container) {
        DOM.container.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-item-btn');
            if (removeBtn) {
                const id = removeBtn.getAttribute('data-id');
                const size = removeBtn.getAttribute('data-size');
                removeItem(id, size);
            }
        });
    }

    // Shipping selection change
    document.querySelectorAll('.shipping-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            if (currentCartData) calculateTotals(currentCartData);
        });
    });

    if (DOM.clearBtn) {
        DOM.clearBtn.addEventListener('click', handleClearCart);
    }

    if (DOM.checkoutBtn) {
        DOM.checkoutBtn.addEventListener('click', navigateToCheckout);
    }
}

async function fetchCart() {
    try {
        const response = await fetch(API_BASE);
        const result = await response.json();
        if (result.status === 'success') {
            currentCartData = result.data;
            renderCart(result.data);
        }
    } catch (err) {
        console.error("Cart fetch failed:", err);
    }
}

function renderCart(cartData) {
    if (!cartData.items || cartData.items.length === 0) {
        DOM.container.innerHTML = '';
        DOM.emptyState.classList.remove('hidden');
        DOM.summary.classList.add('hidden');
        DOM.options.classList.add('hidden');
        DOM.countHeader.innerText = "0 Items";
        return;
    }

    DOM.emptyState.classList.add('hidden');
    DOM.summary.classList.remove('hidden');
    DOM.options.classList.remove('hidden');
    DOM.countHeader.innerText = `${cartData.total_items} Items`;

    // Render items - each size variant appears as a separate card
    DOM.container.innerHTML = cartData.items.map(item => `
        <div class="cart-card bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-6 shadow-sm">
            <div class="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-50">
                <img src="${item.image || 'https://placehold.co/150'}" class="w-full h-full object-cover">
            </div>
            
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="heading-font font-bold text-sm uppercase tracking-tight text-gray-900">${item.product_name || item.name}</h3>
                        <div class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full bg-khaki/40 text-gray-700 text-[9px] font-bold uppercase tracking-wider border border-khaki/50">
                            Size: ${item.size || 'Standard'}
                        </div>
                    </div>
                    <button class="remove-item-btn text-gray-300 hover:text-red-500 transition-colors p-1" 
                            data-id="${item.product_id}" data-size="${item.size || ''}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div class="flex justify-between items-end mt-4">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Quantity</span>
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-bold text-gray-900">${item.quantity}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subtotal</span>
                        <span class="font-black heading-font text-black text-lg">৳${item.subtotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    calculateTotals(cartData);
}

function calculateTotals(cartData) {
    const subtotal = parseFloat(cartData.total_price);
    const selectedShippingValue = getSelectedShippingValue();
    
    let discount = 0;
    let finalTotal = subtotal + selectedShippingValue;

    // Logic: Free delivery if subtotal > 1500 BDT
    if (subtotal > 1500) {
        discount = selectedShippingValue;
        finalTotal = subtotal; // effective shipping becomes 0
        
        DOM.freeBadge.classList.remove('hidden');
        DOM.discountRow.classList.remove('hidden');
        DOM.discountEl.innerText = `-৳${selectedShippingValue.toFixed(2)}`;
        DOM.shippingEl.classList.add('text-gray-400', 'line-through');
    } else {
        DOM.freeBadge.classList.add('hidden');
        DOM.discountRow.classList.add('hidden');
        DOM.shippingEl.classList.remove('text-gray-400', 'line-through');
    }

    DOM.subtotalEl.innerText = `৳${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    DOM.shippingEl.innerText = `৳${selectedShippingValue.toFixed(2)}`;
    DOM.grandTotalEl.innerText = `৳${finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

function getSelectedShippingValue() {
    const selected = document.querySelector('input[name="shipping"]:checked');
    return selected ? parseFloat(selected.value) : 60;
}

async function removeItem(productId, size) {
    try {
        const response = await fetch(`${API_BASE}/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId, 
                size: size
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            currentCartData = result.data;
            renderCart(result.data);
        }
    } catch (err) {
        console.error("Remove failed:", err);
    }
}

async function handleClearCart() {
    if (!confirm("Are you sure you want to clear your shopping bag?")) return;
    try {
        const response = await fetch(`${API_BASE}/clear`, {
            method: 'POST'
        });
        const result = await response.json();
        if (result.status === 'success') {
            fetchCart();
        }
    } catch (err) {
        console.error("Clear failed:", err);
    }
}

function navigateToCheckout() {
    if (!currentCartData || currentCartData.items.length === 0) return;

    const subtotal = parseFloat(currentCartData.total_price);
    const shippingValue = getSelectedShippingValue();
    const isFree = subtotal > 1500;
    
    const locationRadio = document.querySelector('input[name="shipping"]:checked');
    const locationName = locationRadio ? locationRadio.closest('label').querySelector('span').innerText : "Inside Dhaka";

    const finalSummary = {
        subtotal: subtotal,
        shipping: isFree ? 0 : shippingValue,
        actual_shipping: shippingValue,
        location: locationName,
        total: isFree ? subtotal : subtotal + shippingValue
    };

    console.log("Finalized Order Summary:", finalSummary);

    // 1. Show the message
    alert(`Order of ৳${finalSummary.total.toLocaleString()} placed successfully! Redirecting to checkout...`);

    // 2. Wait 3 seconds (3000ms) then redirect
    setTimeout(() => {
        window.location.href = '/checkout';
    }, 3000);
}



