/**
 * ZENFOX Admin Dashboard Logic
 * Integrates with: product_service.py, order_service.py, admin_service.py
 */

const API_BASE = '/api/admin';
const PRODUCT_API = '/api/admin/products';
const ORDER_API = '/api/admin/orders';

// DOM Elements Cache
const DOM = {
    productsTable: document.getElementById('products-table-body'),
    ordersContainer: document.getElementById('orders-list'),
    addProductForm: document.getElementById('add-product-form'),
    logoutBtn: document.getElementById('logout-btn'),
    loadingSpinner: document.getElementById('loading-spinner'),
    // New Category Inputs
    parentCatInput: document.getElementById('parent-category-input'),
    subCatInput: document.getElementById('sub-category-input'),
    combinedCatHidden: document.getElementById('combined-category')
};

/* ==========================================================================
   Auth & Initialization
   ========================================================================== */

async function checkAuth() {
    try {
        // Hits the @admin_required decorator on backend
        const response = await fetch(`${API_BASE}/dashboard`);
        if (response.status === 401) {
            window.location.href = 'admin_form.html';
            return;
        }
        initDashboard();
    } catch (error) {
        window.location.href = 'admin-form';
    }
}

function initDashboard() {
    fetchProducts();
    fetchOrders();

    if (DOM.addProductForm) {
        DOM.addProductForm.addEventListener('submit', handleAddProduct);
    }
    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener('click', handleLogout);
    }
}

/* ==========================================================================
   Product Management
   ========================================================================== */

async function fetchProducts() {
    try {
        // Backend route defined in product_route.py
        const response = await fetch('/api/products');
        const result = await response.json();
        
        if (result.status === 'success') {
            renderProducts(result.data);
        }
    } catch (error) {
        showToast("Failed to load products", "error");
    }
}

function renderProducts(products) {
    if (!DOM.productsTable) return;
    
    if (products.length === 0) {
        DOM.productsTable.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">No products found.</td></tr>`;
        return;
    }

    DOM.productsTable.innerHTML = products.map(p => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-4 font-mono text-xs">#${p.id}</td>
            <td class="px-6 py-4">
                <div class="font-medium text-forest">${p.name}</div>
                <div class="text-[9px] uppercase tracking-widest text-gray-400">
                    ${p.category ? p.category.replace('-', ' ') : 'Uncategorized'}
                </div>
            </td>
            <td class="px-6 py-4">$${parseFloat(p.price).toFixed(2)}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteProduct(${p.id})" class="text-red-600 hover:text-red-800 font-bold text-xs uppercase tracking-widest">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function handleAddProduct(e) {
    e.preventDefault();

    // 1. Combine Main and Sub categories into 'parent-child' format
    const parent = DOM.parentCatInput.value.toLowerCase().trim();
    const sub = DOM.subCatInput.value.toLowerCase().trim();
    const combined = `${parent}-${sub}`;
    
    // 2. Set the hidden input value so FormData picks it up for the backend
    DOM.combinedCatHidden.value = combined;

    const formData = new FormData(e.target); 

    try {
        const response = await fetch(PRODUCT_API, {
            method: 'POST',
            // multipart/form-data is handled automatically by the browser
            body: formData 
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Product created successfully", "success");
            
            // 3. Reset form and custom inputs
            e.target.reset();
            DOM.parentCatInput.value = '';
            DOM.subCatInput.value = '';
            
            fetchProducts();
        } else {
            showToast(result.message, "error");
        }
    } catch (error) {
        showToast("Error connecting to server", "error");
    }
}

async function deleteProduct(id) {
    if (!confirm("Delete this product permanently?")) return;

    try {
        const response = await fetch(`${PRODUCT_API}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast("Product deleted", "success");
            fetchProducts();
        }
    } catch (error) {
        showToast("Delete failed", "error");
    }
}

/* ==========================================================================
   Order Management
   ========================================================================== */

async function fetchOrders() {
    try {
        const response = await fetch(ORDER_API);
        const result = await response.json();
        if (result.status === 'success') {
            renderOrders(result.data);
        }
    } catch (error) {
        showToast("Failed to load orders", "error");
    }
}

function renderOrders(orders) {
    if (!DOM.ordersContainer) return;

    if (orders.length === 0) {
        DOM.ordersContainer.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400">No orders yet.</div>`;
        return;
    }

    DOM.ordersContainer.innerHTML = orders.map(order => `
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="text-[10px] font-bold text-gray-400 uppercase">Order #${order.id}</span>
                    <h4 class="font-bold text-forest">${order.customer_name}</h4>
                </div>
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-gray-100 
                    ${order.status === 'Pending' ? 'text-orange-600 bg-orange-50' : ''}
                    ${order.status === 'Shipped' ? 'text-blue-600 bg-blue-50' : ''}
                    ${order.status === 'Delivered' ? 'text-green-600 bg-green-50' : ''}">
                    ${order.status}
                </span>
            </div>
            
            <p class="text-xs text-gray-500 mb-4">${order.address}</p>
            
            <div class="space-y-3 pt-3 border-t border-gray-50">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-forest">$${parseFloat(order.total_amount).toFixed(2)}</span>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" 
                            class="text-[10px] uppercase font-bold border-none bg-gray-50 rounded-md p-1 outline-none cursor-pointer">
                        <option value="" disabled selected>Update Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                    </select>
                </div>
            </div>
        </div>
    `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${ORDER_API}/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showToast(`Order #${orderId} set to ${newStatus}`, "success");
            fetchOrders();
        }
    } catch (error) {
        showToast("Update failed", "error");
    }
}

/* ==========================================================================
   Utilities
   ========================================================================== */

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `px-6 py-3 rounded-xl text-white text-xs font-bold uppercase tracking-widest shadow-2xl transition-all duration-300 animate-bounce ${type === 'success' ? 'bg-forest' : 'bg-red-500'}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function handleLogout() {
    await fetch('/api/admin/logout');
    window.location.href = 'admin-form';
}

// Entry Point
document.addEventListener('DOMContentLoaded', checkAuth);

