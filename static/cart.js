/**
 * Zahab Perfumes | Shopping Bag & Logic
 * Handles variants, dynamic shipping calculation, and payment UI.
 */

const API_BASE = '/api/cart';
const DOM = {
    container: document.getElementById('cart-container'),
    summary: document.getElementById('cart-summary'),
    emptyState: document.getElementById('empty-state'),
    subtotalEl: document.getElementById('subtotal-price'),
    shippingEl: document.getElementById('shipping-cost'),
    grandTotalEl: document.getElementById('grand-total'),
    countHeader: document.getElementById('cart-count-header'),
    freeBadge: document.getElementById('free-delivery-badge'),
    options: document.getElementById('cart-options'),
    clearBtn: document.getElementById('clear-btn'),
    checkoutBtn: document.getElementById('checkout-btn')
};

let currentCartData = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchCart();

    // Listener for Shipping Radio Buttons
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (currentCartData) calculateTotals(currentCartData);
        });
    });

    if (DOM.clearBtn) DOM.clearBtn.addEventListener('click', handleClearCart);
    if (DOM.checkoutBtn) DOM.checkoutBtn.addEventListener('click', navigateToCheckout);
});

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
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
            <img src="${item.image || 'https://placehold.co/100'}" class="w-20 h-20 object-cover rounded-xl bg-gray-50">
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-sm uppercase tracking-tight">${item.name}</h3>
                        <span class="inline-block mt-1 px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded uppercase">
                            Size: ${item.size || 'Standard'}
                        </span>
                    </div>
                    <button onclick="removeItem(${item.product_id}, '${item.size}')" class="text-gray-300 hover:text-red-500 transition">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="flex justify-between items-center mt-4">
                    <span class="text-xs font-semibold text-gray-400">Qty: ${item.quantity}</span>
                    <span class="font-bold text-purple-600">${item.subtotal.toFixed(2)} BDT</span>
                </div>
            </div>
        </div>
    `).join('');

    calculateTotals(cartData);
}

function calculateTotals(cartData) {
    const subtotal = parseFloat(cartData.total_price);
    let shippingCharge = 0;

    // Logic: Free delivery if price > 1500 BDT
    if (subtotal > 1500) {
        shippingCharge = 0;
        DOM.freeBadge.classList.remove('hidden');
        DOM.shippingEl.innerHTML = `<span class="line-through text-gray-300 mr-2">${getSelectedShippingValue()} BDT</span> FREE`;
    } else {
        shippingCharge = getSelectedShippingValue();
        DOM.freeBadge.classList.add('hidden');
        DOM.shippingEl.innerText = `${shippingCharge.toFixed(2)} BDT`;
    }

    const grandTotal = subtotal + shippingCharge;

    DOM.subtotalEl.innerText = `${subtotal.toFixed(2)} BDT`;
    DOM.grandTotalEl.innerText = `${grandTotal.toFixed(2)} BDT`;
}

function getSelectedShippingValue() {
    const selected = document.querySelector('input[name="shipping"]:checked');
    return selected ? parseFloat(selected.value) : 60;
}

async function removeItem(productId, size) {
    try {
        const response = await fetch(`${API_BASE}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, size: size })
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
    if (!confirm("Clear your shopping bag?")) return;
    try {
        const response = await fetch(`${API_BASE}/clear`, { method: 'POST' });
        const result = await response.json();
        if (result.status === 'success') {
            fetchCart();
        }
    } catch (err) {
        console.error("Clear failed:", err);
    }
}

function navigateToCheckout() {
    const shipping = subtotal > 1500 ? 0 : getSelectedShippingValue();
    const location = document.querySelector('input[name="shipping"]:checked').parentElement.querySelector('span').innerText;
    
    // You can pass these to your order API or checkout page
    console.log("Proceeding with:", { shipping, location });
    alert("Order placement logic would trigger here.");
}

