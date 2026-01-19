/**
 * ZENFOX Admin Dashboard Logic
 * Integrates with: product_service.py, order_service.py, admin_service.py
 */

/**
 * admin_panel.js
 * Comprehensive logic for the Zenfox Admin Dashboard.
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    fetchOrders();
});

// --- Utility Functions ---

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (show) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-forest' : 'bg-red-600';
    
    toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg mb-2 transition-opacity duration-300 flex justify-between items-center min-w-[250px]`;
    toast.innerHTML = `
        <span class="text-sm font-medium">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 text-white/50 hover:text-white">&times;</button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- Product Management ---

/**
 * Enhanced Product Creation
 * Supports both Multipart (File Upload) and JSON (Image URL)
 */
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const fileInput = document.getElementById('image_file');
    
    showLoading(true);

    let options = {
        method: 'POST'
    };

    // Determine if we are sending Multipart (File) or JSON (URL only)
    if (fileInput && fileInput.files.length > 0) {
        // Use FormData for file uploads
        options.body = formData;
    } else {
        // Fallback to JSON if no file is present
        const data = Object.fromEntries(formData.entries());
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch('/api/admin/products', options);
        const result = await response.json();

        if (response.ok) {
            showToast("Product created successfully", "success");
            form.reset();
            fetchProducts();
        } else {
            showToast(result.message || "Error creating product", "error");
        }
    } catch (error) {
        console.error("Upload error:", error);
        showToast("Server connection failed", "error");
    } finally {
        showLoading(false);
    }
});

async function fetchProducts() {
    try {
        const response = await fetch('/api/admin/products');
        const products = await response.json();
        const tbody = document.getElementById('products-table-body');
        
        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">No products found.</td></tr>`;
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 font-mono text-xs text-gray-400">#${product.id}</td>
                <td class="px-6 py-4 font-medium text-forest">${product.name}</td>
                <td class="px-6 py-4">$${parseFloat(product.price).toFixed(2)}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="deleteProduct(${product.id})" class="btn-delete">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showToast("Failed to load products", "error");
    }
}

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
        const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast("Product deleted");
            fetchProducts();
        }
    } catch (error) {
        showToast("Delete failed", "error");
    }
}

// --- Order Management ---

async function fetchOrders() {
    const ordersList = document.getElementById('orders-list');
    try {
        const response = await fetch('/api/admin/orders');
        const orders = await response.json();

        if (orders.length === 0) {
            ordersList.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400">No recent orders.</div>`;
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <h4>Order #${order.id}</h4>
                <p>${order.customer_name} - ${order.status}</p>
                <p class="font-bold text-forest">$${parseFloat(order.total).toFixed(2)}</p>
                <select onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                </select>
            </div>
        `).join('');
    } catch (error) {
        console.error("Orders error:", error);
    }
}

async function updateOrderStatus(id, status) {
    try {
        const response = await fetch(`/api/admin/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (response.ok) showToast("Order status updated");
    } catch (error) {
        showToast("Update failed", "error");
    }
}

// --- Authentication ---

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/admin/logout');
        if (response.ok) {
            window.location.href = '/admin-login.html';
        }
    } catch (error) {
        showToast("Logout failed", "error");
    }
});
