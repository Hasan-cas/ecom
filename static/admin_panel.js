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
    // Category Inputs
    parentCatInput: document.getElementById('parent-category-input'),
    subCatInput: document.getElementById('sub-category-input'),
    combinedCatHidden: document.getElementById('combined-category'),
    // Variants Input
    variantsInput: document.getElementById('variants-input'),
    // UI Helpers
    submitBtn: document.querySelector('#add-product-form button[type="submit"]')
};

/* ==========================================================================
   Auth & Initialization
   ========================================================================== */

async function checkAuth() {
    toggleLoading(true);
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        if (response.status === 401) {
            window.location.href = 'admin_form.html';
            return;
        }
        initDashboard();
    } catch (error) {
        window.location.href = 'admin-form';
    } finally {
        toggleLoading(false);
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
        <tr class="hover:bg-gray-50 transition border-b border-gray-50">
            <td class="px-6 py-4 font-mono text-xs text-gray-400">#${p.id}</td>
            <td class="px-6 py-4">
                <div class="font-bold text-gray-800">${p.name}</div>
                <div class="text-[9px] uppercase tracking-widest text-forest font-semibold">
                    ${p.category ? p.category.replace('-', ' > ') : 'Uncategorized'}
                </div>
            </td>
            <td class="px-6 py-4 font-medium text-gray-600">$${parseFloat(p.price).toFixed(2)}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteProduct(${p.id})" class="text-red-500 hover:text-red-700 transition">
                    <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleAddProduct(e) {
    e.preventDefault();

    // 1. Category Refinement
    const parent = DOM.parentCatInput.value.trim();
    const sub = DOM.subCatInput.value.trim();
    
    if (!parent || !sub) {
        showToast("Both category fields are required", "error");
        return;
    }
    
    DOM.combinedCatHidden.value = `${parent.toLowerCase()}-${sub.toLowerCase()}`;

    // 2. Variant Refinement (Size:Price:Stock Parsing)
    const variantRaw = DOM.variantsInput.value.trim();
    let refinedVariants = [];

    if (variantRaw) {
        refinedVariants = variantRaw.split('/').map(pair => {
            const [size, price, stock] = pair.split(':');
            return {
                size: size ? size.trim() : '',
                price: price ? parseFloat(price.trim()) : 0,
                stock: stock ? parseInt(stock.trim()) : 0
            };
        }).filter(v => v.size !== '' && !isNaN(v.price));
    }

    const formData = new FormData(e.target);
    
    // Add processed variants as JSON string
    formData.append('variants', JSON.stringify(refinedVariants));

    setSubmitting(true);

    try {
        const response = await fetch(PRODUCT_API, {
            method: 'POST',
            body: formData 
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Product created successfully", "success");
            e.target.reset();
            DOM.parentCatInput.value = '';
            DOM.subCatInput.value = '';
            fetchProducts();
        } else {
            showToast(result.message || "Error adding product", "error");
        }
    } catch (error) {
        showToast("Error connecting to server", "error");
    } finally {
        setSubmitting(false);
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
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Order #${order.id}</span>
                    <h4 class="font-bold text-gray-800">${order.customer_name}</h4>
                </div>
                <span class="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                    ${order.status === 'Pending' ? 'text-orange-600 bg-orange-50' : ''}
                    ${order.status === 'Shipped' ? 'text-blue-600 bg-blue-50' : ''}
                    ${order.status === 'Delivered' ? 'text-green-600 bg-green-50' : ''}">
                    ${order.status}
                </span>
            </div>
            
            <p class="text-xs text-gray-500 mb-4 h-8 overflow-hidden">${order.address}</p>
            
            <div class="space-y-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                <span class="text-sm font-bold text-forest">$${parseFloat(order.total_amount).toFixed(2)}</span>
                <select onchange="updateOrderStatus(${order.id}, this.value)" 
                        class="text-[10px] uppercase font-bold bg-gray-50 rounded-lg px-2 py-1 outline-none border-none cursor-pointer hover:bg-gray-100 transition">
                    <option value="" disabled selected>Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                </select>
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
            showToast(`Order #${orderId} Updated`, "success");
            fetchOrders();
        }
    } catch (error) {
        showToast("Update failed", "error");
    }
}

/* ==========================================================================
   Utilities
   ========================================================================== */

function toggleLoading(isLoading) {
    if (DOM.loadingSpinner) {
        DOM.loadingSpinner.classList.toggle('hidden', !isLoading);
    }
}

function setSubmitting(isSubmitting) {
    if (DOM.submitBtn) {
        DOM.submitBtn.disabled = isSubmitting;
        DOM.submitBtn.innerText = isSubmitting ? 'PROCESSING...' : 'ADD PRODUCT';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-6 py-3 rounded-xl text-white text-xs font-bold uppercase tracking-widest shadow-2xl transition-all duration-300 transform translate-y-0 ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function handleLogout() {
    await fetch('/api/admin/logout');
    window.location.href = 'admin-form';
}

// Entry Point
document.addEventListener('DOMContentLoaded', checkAuth);

