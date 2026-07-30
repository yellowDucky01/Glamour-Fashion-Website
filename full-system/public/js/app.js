// Glamour Fashion — Full System Application Logic

let products = [];
let cart = JSON.parse(localStorage.getItem('glamour_cart')) || [];
let activeCategory = 'all';
let promoDiscountPercent = 0;
let currentUser = JSON.parse(localStorage.getItem('glamour_user')) || null;
let authToken = localStorage.getItem('glamour_token') || null;
let currentSlide = 0;
let slideInterval = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initHeroSlider();
    fetchProducts();
    updateCartUI();
    updateAuthNavUI();

    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('adminNavTab').style.display = 'block';
    }
});

// -------------------------------------------------------------
// HERO SLIDER
// -------------------------------------------------------------
function initHeroSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if (!slides.length) return;

    slideInterval = setInterval(() => {
        setSlide((currentSlide + 1) % slides.length);
    }, 5000);
}

function setSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if (!slides.length) return;

    slides[currentSlide].classList.remove('active');
    if (dots[currentSlide]) dots[currentSlide].classList.remove('active');

    currentSlide = index;

    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

// -------------------------------------------------------------
// STORE & PRODUCT FETCHING
// -------------------------------------------------------------
async function fetchProducts() {
    const searchVal = document.getElementById('searchInput').value;
    const sortVal = document.getElementById('sortSelect').value;

    let url = `/api/products?category=${activeCategory}`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (sortVal !== 'default') url += `&sort=${sortVal}`;

    try {
        const res = await fetch(url);
        products = await res.json();
        renderProducts(products);
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

function renderProducts(items) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    if (!items.length) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 60px 0;">
                <i class="fa-solid fa-magnifying-glass" style="font-size:3rem; color:#ccc; margin-bottom:15px;"></i>
                <h3 style="color:#555;">No products found matching your filter</h3>
            </div>
        `;
        return;
    }

    items.forEach(p => {
        const origPriceHtml = p.original_price ? `<span class="original-price">$${p.original_price.toFixed(2)}</span>` : '';
        const featuredBadge = p.is_featured ? `<span class="badge-featured">FEATURED</span>` : '';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-img-wrapper">
                <img src="${p.image_url}" alt="${p.name}">
                ${featuredBadge}
                <button class="wishlist-btn" onclick="toggleWishlist(${p.id})"><i class="fa-regular fa-heart"></i></button>
            </div>
            <div class="product-details">
                <span class="product-category">${p.category_name || 'COLLECTION'}</span>
                <h3 class="product-title">${p.name}</h3>
                <div class="product-rating">
                    <i class="fa-solid fa-star"></i> ${p.rating.toFixed(1)} <span style="color:#888;">(48 reviews)</span>
                </div>
                <div class="product-price-row">
                    <div>
                        <span class="price">$${p.price.toFixed(2)}</span>
                        ${origPriceHtml}
                    </div>
                    <button class="add-cart-btn" onclick="addToCart(${p.id})">
                        <i class="fa-solid fa-plus"></i> Add
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterCategory(category) {
    activeCategory = category;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.cat === category) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    fetchProducts();
}

function handleSearch() {
    fetchProducts();
}

function handleSort() {
    fetchProducts();
}

// -------------------------------------------------------------
// CART & SHOPPING DRAWER
// -------------------------------------------------------------
function toggleCartDrawer() {
    document.getElementById('cartOverlay').classList.toggle('active');
    document.getElementById('cartDrawer').classList.toggle('active');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    toggleCartDrawer();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }

    saveCart();
    updateCartUI();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('glamour_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const container = document.getElementById('cartItemsContainer');
    const badge = document.getElementById('cartBadge');
    container.innerHTML = '';

    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    badge.innerText = totalCount;

    if (!cart.length) {
        container.innerHTML = `
            <div style="text-align:center; padding: 60px 0; color:#888;">
                <i class="fa-solid fa-bag-shopping" style="font-size:3rem; margin-bottom:15px; color:#ddd;"></i>
                <p>Your shopping cart is empty.</p>
            </div>
        `;
        document.getElementById('cartSubtotal').innerText = '$0.00';
        document.getElementById('cartTotal').innerText = '$0.00';
        document.getElementById('discountRow').style.display = 'none';
        return;
    }

    let subtotal = 0;

    cart.forEach(item => {
        const itemSubtotal = item.price * item.quantity;
        subtotal += itemSubtotal;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
            <button class="remove-item-btn" onclick="removeFromCart(${item.id})">&times;</button>
        `;
        container.appendChild(el);
    });

    const discountAmount = (subtotal * promoDiscountPercent) / 100;
    const finalTotal = subtotal - discountAmount;

    document.getElementById('cartSubtotal').innerText = `$${subtotal.toFixed(2)}`;
    if (promoDiscountPercent > 0) {
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('cartDiscount').innerText = `-$${discountAmount.toFixed(2)} (${promoDiscountPercent}% off)`;
    } else {
        document.getElementById('discountRow').style.display = 'none';
    }
    document.getElementById('cartTotal').innerText = `$${finalTotal.toFixed(2)}`;
    document.getElementById('checkoutTotalBtn').innerText = finalTotal.toFixed(2);
}

async function applyPromoCode() {
    const code = document.getElementById('promoCodeInput').value.trim();
    if (!code) return;

    try {
        const res = await fetch('/api/promos/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (res.ok) {
            promoDiscountPercent = data.discount_percent;
            alert(`🎉 Success! Promo code ${data.code} applied (${data.discount_percent}% OFF)`);
            updateCartUI();
        } else {
            alert(data.error || 'Invalid promo code');
        }
    } catch (err) {
        alert('Failed to validate promo code.');
    }
}

// -------------------------------------------------------------
// USER AUTHENTICATION & NAV
// -------------------------------------------------------------
let authMode = 'login';

function switchAuthTab(tab) {
    authMode = tab;
    document.getElementById('loginTabBtn').className = tab === 'login' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('registerTabBtn').className = tab === 'register' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('nameGroup').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('authModalTitle').innerText = tab === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('authSubmitBtn').innerText = tab === 'login' ? 'Sign In' : 'Register Account';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login' ? { email, password } : { name, email, password };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('glamour_token', authToken);
            localStorage.setItem('glamour_user', JSON.stringify(currentUser));
            updateAuthNavUI();
            closeModal('authModal');
            alert(`Welcome back, ${currentUser.name}!`);

            if (currentUser.role === 'admin') {
                document.getElementById('adminNavTab').style.display = 'block';
            }
        } else {
            alert(data.error || 'Authentication failed');
        }
    } catch (err) {
        alert('Error connecting to server.');
    }
}

function quickLogin(email, password) {
    document.getElementById('authEmail').value = email;
    document.getElementById('authPassword').value = password;
    switchAuthTab('login');
}

function updateAuthNavUI() {
    const nav = document.getElementById('accountNav');
    if (currentUser) {
        nav.innerHTML = `
            <span style="color:#111; font-weight:600;"><i class="fa-regular fa-user"></i> ${currentUser.name}</span>
            <a href="#" onclick="logout()" style="color:var(--accent-red); margin-left:10px;">Logout</a>
        `;
    } else {
        nav.innerHTML = `<a href="#" onclick="openModal('authModal')"><i class="fa-regular fa-user"></i> Sign In / Register</a>`;
        document.getElementById('adminNavTab').style.display = 'none';
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('glamour_user');
    localStorage.removeItem('glamour_token');
    updateAuthNavUI();
    switchView('storeView');
    alert('Logged out successfully.');
}

// -------------------------------------------------------------
// ORDER TRACKING SYSTEM
// -------------------------------------------------------------
async function handleTrackingSearch(e) {
    e.preventDefault();
    const code = document.getElementById('trackingInput').value.trim();
    if (!code) return;

    try {
        const res = await fetch(`/api/orders/track/${encodeURIComponent(code)}`);
        const data = await res.json();

        const resDiv = document.getElementById('trackingResult');
        resDiv.style.display = 'block';

        if (!res.ok) {
            resDiv.innerHTML = `<p style="color:var(--accent-red); text-align:center;">${data.error}</p>`;
            return;
        }

        const steps = ['Processing', 'Shipped', 'In Transit', 'Delivered'];
        const currentIdx = steps.indexOf(data.status);

        let timelineHtml = '<div class="tracking-timeline">';
        steps.forEach((step, idx) => {
            const isDone = idx <= currentIdx;
            timelineHtml += `
                <div class="timeline-step ${isDone ? 'completed' : ''}">
                    <h5>${step}</h5>
                    <p>${isDone ? 'Completed' : 'Pending'}</p>
                </div>
            `;
        });
        timelineHtml += '</div>';

        let itemsHtml = '<ul style="margin-top:15px; list-style:none; font-size:0.9rem;">';
        data.items.forEach(i => {
            itemsHtml += `<li style="padding:4px 0;">• ${i.product_name} x${i.quantity} — $${(i.price * i.quantity).toFixed(2)}</li>`;
        });
        itemsHtml += '</ul>';

        resDiv.innerHTML = `
            <div style="background:#f9f9f9; padding:20px; border-radius:8px;">
                <h4>Tracking Code: <strong style="color:var(--gold-hover);">${data.tracking_number}</strong></h4>
                <p style="font-size:0.9rem; color:#555; margin-top:4px;">Customer: ${data.customer_name} (${data.customer_email})</p>
                <p style="font-size:0.9rem; color:#555;">Address: ${data.address}, ${data.city}</p>
                <p style="font-weight:700; margin-top:8px;">Total Amount: $${data.total_amount.toFixed(2)}</p>
                ${timelineHtml}
                <h5 style="margin-top:15px;">Order Items:</h5>
                ${itemsHtml}
            </div>
        `;
    } catch (err) {
        alert('Failed to search order tracking.');
    }
}

// -------------------------------------------------------------
// CHECKOUT & ORDER SUBMISSION
// -------------------------------------------------------------
function openCheckoutModal() {
    if (!cart.length) {
        alert('Your cart is empty!');
        return;
    }
    toggleCartDrawer();

    if (currentUser) {
        document.getElementById('checkoutName').value = currentUser.name;
        document.getElementById('checkoutEmail').value = currentUser.email;
    }

    openModal('checkoutModal');
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    const customerName = document.getElementById('checkoutName').value;
    const customerEmail = document.getElementById('checkoutEmail').value;
    const address = document.getElementById('checkoutAddress').value;
    const city = document.getElementById('checkoutCity').value;
    const zip = document.getElementById('checkoutZip').value;

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalAmount = subtotal - (subtotal * promoDiscountPercent) / 100;

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser ? currentUser.id : null,
                customerName,
                customerEmail,
                address,
                city,
                zip,
                totalAmount,
                items: cart
            })
        });

        const data = await res.json();
        if (res.ok) {
            closeModal('checkoutModal');
            cart = [];
            promoDiscountPercent = 0;
            saveCart();
            updateCartUI();

            openModal('trackingModal');
            document.getElementById('trackingInput').value = data.trackingNumber;
            handleTrackingSearch(new Event('submit'));
            alert(`🎉 Order Placed Successfully!\n\nYour Tracking Number is: ${data.trackingNumber}`);
        } else {
            alert(data.error || 'Failed to place order.');
        }
    } catch (err) {
        alert('Error placing order.');
    }
}

// -------------------------------------------------------------
// VIEW SWITCHING & ADMIN PANEL
// -------------------------------------------------------------
function switchView(viewId) {
    document.getElementById('storeView').style.display = viewId === 'storeView' ? 'block' : 'none';
    document.getElementById('adminView').className = viewId === 'adminView' ? 'admin-section active' : 'admin-section';

    if (viewId === 'adminView') {
        fetchAdminStats();
    }
}

async function fetchAdminStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();

        document.getElementById('statRevenue').innerText = `$${(data.totalRevenue || 0).toFixed(2)}`;
        document.getElementById('statOrders').innerText = data.totalOrders;
        document.getElementById('statProducts').innerText = data.totalProducts;

        const tbody = document.getElementById('adminOrdersTable');
        tbody.innerHTML = '';

        data.recentOrders.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${o.id}</td>
                <td><strong>${o.tracking_number}</strong></td>
                <td>${o.customer_name}</td>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>$${o.total_amount.toFixed(2)}</td>
                <td>
                    <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:4px 8px; border-radius:4px;">
                        <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="In Transit" ${o.status === 'In Transit' ? 'selected' : ''}>In Transit</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>
                    <button class="tab-btn" style="padding:4px 10px; font-size:0.8rem;" onclick="openModal('trackingModal'); document.getElementById('trackingInput').value='${o.tracking_number}'; handleTrackingSearch(event);">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to fetch admin stats:', err);
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        alert(`Order #${orderId} status updated to: ${status}`);
    } catch (err) {
        alert('Failed to update status');
    }
}

async function handleAddProductSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('newProdName').value;
    const category_id = parseInt(document.getElementById('newProdCategory').value);
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const original_price = parseFloat(document.getElementById('newProdOrigPrice').value) || null;
    const description = document.getElementById('newProdDesc').value;

    try {
        const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category_id, price, original_price, description })
        });

        if (res.ok) {
            closeModal('addProductModal');
            alert('Product added successfully!');
            fetchAdminStats();
            fetchProducts();
        } else {
            alert('Failed to add product');
        }
    } catch (err) {
        alert('Error adding product.');
    }
}

// -------------------------------------------------------------
// MODAL HELPERS & WISHLIST
// -------------------------------------------------------------
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function toggleWishlist(productId) {
    alert(`Item added to your Wishlist!`);
}
