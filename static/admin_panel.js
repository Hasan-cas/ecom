/**
 * ZENFOX Admin Dashboard Logic
 * Uses Event Delegation and Matches Order Model (order_id, total)
 */

const API_BASE = '/api/admin';
const ORDER_API = '/api/admin/orders';
const PRODUCT_API = '/api/admin/products';

const DOM = {
    productsTable: document.getElementById('products-table-body'),
    ordersContainer: document.getElementById('orders-list'),
    addProductForm: document.getElementById('add-product-form'),
    logoutBtn: document.getElementById('logout-btn')
};

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        if (response.status === 401) {
            window.location.href = 'admin-form';
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

    // Event Delegation: Products (Delete)
    if (DOM.productsTable) {
        DOM.productsTable.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-btn');
            if (btn) {
                const id = btn.dataset.id;
                if (confirm(`Delete product #${id}?`)) deleteProduct(id);
            }
        });
    }

    // Event Delegation: Orders (Status Update)
    if (DOM.ordersContainer) {
        DOM.ordersContainer.addEventListener('change', (e) => {
            const select = e.target.closest('.status-select-dropdown');
            if (select) {
                updateOrderStatus(select.dataset.id, select.value);
            }
        });
    }

    if (DOM.addProductForm) DOM.addProductForm.addEventListener('submit', handleAddProduct);
    if (DOM.logoutBtn) DOM.logoutBtn.addEventListener('click', handleLogout);
}

/* --- API Actions --- */

async function fetchProducts() {
    const res = await fetch('/api/products');
    const result = await res.json();
    if (result.status === 'success') renderProducts(result.data);
}

async function fetchOrders() {
    const res = await fetch(ORDER_API);
    const result = await res.json();
    if (result.status === 'success') renderOrders(result.data);
}

async function deleteProduct(id) {
    const res = await fetch(`${PRODUCT_API}/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProducts();
}

async function updateOrderStatus(orderId, newStatus) {
    const res = await fetch(`${ORDER_API}/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) fetchOrders();
}

async function handleAddProduct(e) {
    e.preventDefault();
    const formData = new FormData(DOM.addProductForm);
    const res = await fetch(PRODUCT_API, { method: 'POST', body: formData });
    if (res.ok) {
        DOM.addProductForm.reset();
        fetchProducts();
    }
}

async function handleLogout() {
    await fetch(`${API_BASE}/logout`);
    window.location.href = 'admin-form';
}

/* --- Rendering --- */

function renderProducts(products) {
    if (!DOM.productsTable) return;
    DOM.productsTable.innerHTML = products.map(p => `
        <tr class="hover:bg-gray-50 transition border-b border-gray-100">
            <td class="px-6 py-4 font-mono text-[10px]">#${p.id}</td>
            <td class="px-6 py-4 font-bold text-forest text-sm">${p.name}</td>
            <td class="px-6 py-4 text-sm font-medium">$${parseFloat(p.price).toFixed(2)}</td>
            <td class="px-6 py-4 text-right">
                <button data-id="${p.id}" class="delete-btn text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-tighter">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function renderOrders(orders) {
    if (!DOM.ordersContainer) return;
    if (orders.length === 0) {
        DOM.ordersContainer.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400 italic">No orders yet.</div>`;
        return;
    }

    DOM.ordersContainer.innerHTML = orders.map(order => `
        <div class="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Order #${order.order_id}</span>
                    <h4 class="font-bold text-forest text-lg">${order.customer_name}</h4>
                </div>
                <div class="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter bg-gray-100">
                    ${order.status}
                </div>
            </div>
            <p class="text-xs text-gray-500 mb-6">${order.address}</p>
            <div class="flex justify-between items-center pt-4 border-t border-gray-50">
                <span class="font-bold text-forest text-sm">$${parseFloat(order.total || 0).toFixed(2)}</span>
                <select data-id="${order.order_id}" class="status-select-dropdown text-[10px] uppercase font-bold bg-gray-50 border-none rounded-lg p-2 outline-none cursor-pointer">
                    <option value="" disabled selected>Update</option>
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                </select>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', checkAuth);

