/**
 * ZENFOX | Checkout Logic
 * Integrated: bKash info retrieval
 */

const checkoutForm = document.getElementById('checkout-form');
const submitBtn = document.getElementById('submitBtn');
const statusContainer = document.getElementById('statusContainer');
const statusMessage = document.getElementById('statusMessage');

async function checkCartBeforeCheckout() {
    try {
        const response = await fetch('/api/cart');
        const result = await response.json();
        if (!result || !result.data || result.data.total_items === 0) {
            alert("Empty bag!");
            window.location.href = '/'; 
        }
    } catch (err) { console.error(err); }
}

async function submitCheckout(event) {
    if (event) event.preventDefault();
    
    const formData = new FormData(checkoutForm);
    const payload = Object.fromEntries(formData.entries());

    // 1. Retrieve the payment info stored from the Cart page
    payload.payment_number = localStorage.getItem('pending_payment_number');
    payload.transaction_id = localStorage.getItem('pending_transaction_id');

    if (!payload.customer_name || !payload.phone || !payload.address) {
        showErrorMessage("Please fill in all fields.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            localStorage.removeItem('pending_payment_number');
            localStorage.removeItem('pending_transaction_id');
            showSuccessMessage(result.data, payload.customer_name);
        } else {
            showErrorMessage(result.message || "Failed.");
            submitBtn.disabled = false;
        }
    } catch (error) {
        showErrorMessage("Network Error.");
        submitBtn.disabled = false;
    }
}

function showSuccessMessage(orderData, customerName) {
    checkoutForm.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    statusMessage.className = "p-8 rounded-[40px] bg-sage text-forest text-center";
    statusMessage.innerHTML = `
        <div class="text-4xl mb-4">✨</div>
        <h3 class="serif text-2xl mb-2 font-bold italic">Thank you, ${customerName}!</h3>
        <p class="mb-4">Order <strong>#${orderData.order_id}</strong> received.</p>
        <div class="inline-block px-4 py-2 bg-white/50 rounded-full text-[10px] font-bold">
            Total: ৳${parseFloat(orderData.total).toLocaleString()}
        </div>
        <div class="mt-8"><a href="/" class="underline text-xs tracking-widest">BACK TO GALLERY</a></div>
    `;
}

function showErrorMessage(message) {
    statusContainer.classList.remove('hidden');
    statusMessage.className = "p-4 rounded-xl bg-red-50 text-red-700 text-sm";
    statusMessage.innerText = message;
}

document.addEventListener('DOMContentLoaded', () => {
    checkCartBeforeCheckout();
    if (checkoutForm) checkoutForm.addEventListener('submit', submitCheckout);
});

