/**
 * Markazus Shunnah | Checkout Logic
 */

const checkoutForm = document.getElementById('checkout-form');
const submitBtn = document.getElementById('submitBtn');
const statusContainer = document.getElementById('statusContainer');
const statusMessage = document.getElementById('statusMessage');

async function submitCheckout(event) {
    if (event) event.preventDefault();
    
    const formData = new FormData(checkoutForm);
    const payload = Object.fromEntries(formData.entries());

    // Add bKash data from localStorage
    payload.payment_number = localStorage.getItem('pending_payment_number');
    payload.transaction_id = localStorage.getItem('pending_transaction_id');

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing Order...";

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === 'success') {
            localStorage.clear(); // Clear payment info after success
            showSuccessMessage(result.data, payload.customer_name);
        } else {
            showErrorMessage(result.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Place Order";
        }
    } catch (err) {
        showErrorMessage("Connection error. Please try again.");
        submitBtn.disabled = false;
    }
}

function showSuccessMessage(orderData, customerName) {
    checkoutForm.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    
    // Now including the item variants in the summary
    const itemsList = orderData.items.map(item => 
        `<li>${item.product_name} (${item.size}) x${item.quantity}</li>`
    ).join('');

    statusMessage.innerHTML = `
        <h3 class="text-2xl font-bold">Success, ${customerName}!</h3>
        <p>Order <strong>#${orderData.order_id}</strong> is confirmed.</p>
        <ul class="text-left my-4 text-sm">${itemsList}</ul>
        <div class="font-bold">Total: $${parseFloat(orderData.total).toFixed(2)}</div>
        <a href="/" class="block mt-6 underline">Return Home</a>
    `;
}

function showErrorMessage(message) {
    statusContainer.classList.remove('hidden');
    statusMessage.innerText = message;
    statusMessage.classList.add('text-red-600');
}

if(checkoutForm) checkoutForm.addEventListener('submit', submitCheckout);

