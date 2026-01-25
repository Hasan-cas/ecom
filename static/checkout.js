/**
 * ZENFOX | Checkout Logic
 * Integrated with order_route.py and order_service.py
 */

const checkoutForm = document.getElementById('checkout-form');
const submitBtn = document.getElementById('submitBtn');
const statusContainer = document.getElementById('statusContainer');
const statusMessage = document.getElementById('statusMessage');

/* ==========================================================================
   Initialization & Safety Check
   ========================================================================== */

/**
 * Checks if the user actually has items in their cart.
 * Prevents access to checkout if the cart is empty.
 */
async function checkCartBeforeCheckout() {
    try {
        const response = await fetch('/api/cart');
        const data = await response.json();
        
        // If cart is empty or data missing, redirect back to the gallery
        if (!data || data.total_items === 0) {
            alert("Your bag is empty. Redirecting to gallery...");
            window.location.href = '/'; 
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
    // Basic phone regex (supports +1-555-555-5555, 5555555555, etc.)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    const phoneError = document.getElementById('phoneError');
    
    // Check if name is long enough
    if (data.customer_name.trim().length < 2) {
        showErrorMessage("Please enter your full name.");
        return false;
    }

    // Validate phone format
    if (!phoneRegex.test(data.phone)) {
        phoneError.classList.remove('hidden');
        return false;
    } else {
        phoneError.classList.add('hidden');
    }

    // Ensure address isn't just whitespace
    if (data.address.trim().length < 10) {
        showErrorMessage("Please provide a complete delivery address.");
        return false;
    }

    return true;
}

/**
 * Main submission handler
 */
async function submitCheckout(event) {
    event.preventDefault();
    
    // Extract data using 'name' attributes from HTML
    const formData = new FormData(checkoutForm);
    const payload = Object.fromEntries(formData.entries());

    // 1. Client-side validation
    if (!validateForm(payload)) return;

    // 2. UI Loading State
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing Order...";
    statusContainer.classList.add('hidden');

    try {
        // 3. API Call to Python Backend (order_route.py)
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            // Success: result.data contains the order object from the backend
            showSuccessMessage(result.data, payload.customer_name);
        } else {
            // Error: show the specific message from the server (e.g., "Out of stock")
            showErrorMessage(result.message || "Something went wrong. Please try again.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Place Order";
        }
    } catch (error) {
        console.error('Checkout Error:', error);
        showErrorMessage("Network error. Please check your connection.");
        submitBtn.disabled = false;
        submitBtn.innerText = "Place Order";
    }
}

/* ==========================================================================
   UI Updates
   ========================================================================== */

function showSuccessMessage(orderData, customerName) {
    // Hide the form and show the success state
    checkoutForm.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    
    statusMessage.className = "p-8 rounded-[40px] bg-sage text-forest text-center";
    statusMessage.innerHTML = `
        <div class="text-4xl mb-4">✨</div>
        <h3 class="serif text-2xl mb-2 font-bold italic">Thank you, ${customerName}!</h3>
        <p class="mb-4 text-gray-700">Your order <strong>#${orderData.id}</strong> has been received and is being prepared.</p>
        <div class="inline-block px-4 py-2 bg-white/50 rounded-full text-[10px] uppercase tracking-widest font-bold">
            Total Charged: $${parseFloat(orderData.total_price).toFixed(2)}
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
    
    // Scroll to the error so the user sees it
    statusContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    checkCartBeforeCheckout();
    
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', submitCheckout);
    }
});

