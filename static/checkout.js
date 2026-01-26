/**
 * ZENFOX | Checkout Logic
 * Synchronized with Order Model (order_id, total)
 */

const checkoutForm = document.getElementById('checkout-form');
const submitBtn = document.getElementById('submitBtn');
const statusContainer = document.getElementById('statusContainer');
const statusMessage = document.getElementById('statusMessage');

/**
 * Safety Check: Ensure cart isn't empty on load
 */
async function checkCartBeforeCheckout() {
    try {
        const response = await fetch('/api/cart');
        const result = await response.json();
        
        // Match the nesting of your cart_route.py build_cart_response
        if (!result || !result.data || result.data.total_items === 0) {
            alert("Your bag is empty. Redirecting to gallery...");
            window.location.href = '/'; 
        }
    } catch (err) {
        console.error("Cart validation failed:", err);
    }
}

/**
 * Handle Order Submission
 */
async function submitCheckout(event) {
    if (event) event.preventDefault();
    
    const formData = new FormData(checkoutForm);
    const payload = Object.fromEntries(formData.entries());

    // Basic Client-side Validation
    if (!payload.customer_name || !payload.phone || !payload.address) {
        showErrorMessage("Please fill in all required fields.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing Order...";

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            // result.data is the order.to_dict() from the server
            showSuccessMessage(result.data, payload.customer_name);
        } else {
            showErrorMessage(result.message || "Checkout failed. Please try again.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Place Order";
        }
    } catch (error) {
        showErrorMessage("Network error. Please check your connection.");
        submitBtn.disabled = false;
        submitBtn.innerText = "Place Order";
    }
}

function showSuccessMessage(orderData, customerName) {
    checkoutForm.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    
    statusMessage.className = "p-8 rounded-[40px] bg-sage text-forest text-center";
    statusMessage.innerHTML = `
        <div class="text-4xl mb-4">✨</div>
        <h3 class="serif text-2xl mb-2 font-bold italic">Thank you, ${customerName}!</h3>
        <p class="mb-4 text-gray-700">Your order <strong>#${orderData.order_id}</strong> has been received.</p>
        <div class="inline-block px-4 py-2 bg-white/50 rounded-full text-[10px] uppercase tracking-widest font-bold">
            Total Charged: $${parseFloat(orderData.total).toFixed(2)}
        </div>
        <div class="mt-8">
            <a href="/" class="text-xs underline uppercase tracking-widest hover:text-black transition-colors">
                Back to Gallery
            </a>
        </div>
    `;
}

function showErrorMessage(message) {
    statusContainer.classList.remove('hidden');
    statusMessage.className = "p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm";
    statusMessage.innerText = message;
    statusContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkCartBeforeCheckout();
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', submitCheckout);
    }
});

