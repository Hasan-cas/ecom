/**
 * ZENFOX | Checkout Logic
 * Integrated with order_service.py
 */

const checkoutForm = document.getElementById('checkout-form');
const submitBtn = document.getElementById('submitBtn');
const statusContainer = document.getElementById('statusContainer');
const statusMessage = document.getElementById('statusMessage');

/* ==========================================================================
   Initialization & Safety Check (Fix Point 4)
   ========================================================================== */

/**
 * Checks if the user actually has items to buy.
 * Prevents "Ghost Checkouts" on empty carts.
 */
async function checkCartBeforeCheckout() {
    try {
        const response = await fetch('/api/cart');
        const data = await response.json();
        
        // If total_items is 0 or data is missing, redirect to home
        if (!data || data.total_items === 0) {
            alert("Your bag is empty. Redirecting to gallery...");
            window.location.href = 'index.html'; 
        }
    } catch (err) {
        console.error("Cart validation failed:", err);
    }
}

/* ==========================================================================
   Form Handling & Validation
   ========================================================================== */

/**
 * Client-side validation for phone and required fields
 */
function validateForm(data) {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    const phoneValid = phoneRegex.test(data.phone);
    
    const phoneError = document.getElementById('phoneError');
    if (phoneError) phoneError.classList.toggle('hidden', phoneValid);
    
    if (!data.customer_name || !data.address || !phoneValid) {
        return false;
    }
    return true;
}

/**
 * Main submission handler
 */
async function submitCheckout(event) {
    event.preventDefault();
    
    // Extract data from form
    const formData = new FormData(checkoutForm);
    const payload = Object.fromEntries(formData.entries());

    // 1. Client-side validation check
    if (!validateForm(payload)) return;

    // 2. Set UI loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";
    }
    statusContainer.classList.add('hidden');

    try {
        // 3. Send request to backend
        const response = await fetch('/api/orders/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            // SUCCESS
            showSuccessMessage(result, payload.customer_name);
        } else {
            // FIX POINT 5: Capture Backend errors (e.g. "Insufficient Stock")
            showErrorMessage(result.message || "Checkout failed. Please try again.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Place Order";
            }
        }
    } catch (error) {
        console.error('Network Error:', error);
        showErrorMessage("Network failure. Please check your connection.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Place Order";
        }
    }
}

/* ==========================================================================
   UI Updates
   ========================================================================== */

function showSuccessMessage(data, name) {
    checkoutForm.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    
    statusMessage.className = "p-8 rounded-[40px] bg-sage text-forest text-center";
    statusMessage.innerHTML = `
        <div class="text-4xl mb-4">✨</div>
        <h3 class="serif text-2xl mb-2">Thank you, ${name}!</h3>
        <p class="mb-4">Your order <strong>#${data.order_id}</strong> has been placed.</p>
        <div class="text-[10px] uppercase tracking-widest font-bold">Total Charged: $${parseFloat(data.total).toFixed(2)}</div>
        <button onclick="window.location.href='index.html'" class="mt-8 text-xs underline uppercase tracking-widest hover:text-forest">Back to Gallery</button>
    `;
}

function showErrorMessage(message) {
    statusContainer.classList.remove('hidden');
    statusMessage.className = "p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm";
    statusMessage.innerText = message;
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

document.addEventListener('DOMContentLoaded', checkCartBeforeCheckout);
checkoutForm.addEventListener('submit', submitCheckout);

