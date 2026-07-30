const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'glamour_fashion_secret_key_2026';

const dbPath = path.join(__dirname, 'database', 'glamour.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening database:', err);
    else console.log('✅ SQLite Database connected.');
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// -------------------------------------------------------------
// CATEGORIES ENDPOINTS
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// -------------------------------------------------------------
// PRODUCTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
    const { category, search, featured, sort } = req.query;
    let query = `
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
        query += ` AND c.slug = ?`;
        params.push(category);
    }

    if (search) {
        query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    if (featured === 'true' || featured === '1') {
        query += ` AND p.is_featured = 1`;
    }

    if (sort === 'price-low') {
        query += ` ORDER BY p.price ASC`;
    } else if (sort === 'price-high') {
        query += ` ORDER BY p.price DESC`;
    } else if (sort === 'rating') {
        query += ` ORDER BY p.rating DESC`;
    } else {
        query += ` ORDER BY p.id DESC`;
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/products/:id', (req, res) => {
    const query = `
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
    `;
    db.get(query, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
});

// -------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'customer'],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'An account with this email already exists.' });
                }
                return res.status(500).json({ error: err.message });
            }

            const token = jwt.sign({ id: this.lastID, email, name, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: this.lastID, name, email, role: 'customer' } });
        }
    );
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// -------------------------------------------------------------
// PROMO CODE VALIDATION
// -------------------------------------------------------------
app.post('/api/promos/validate', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Promo code required.' });

    db.get('SELECT * FROM promos WHERE UPPER(code) = UPPER(?) AND active = 1', [code], (err, promo) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code.' });
        res.json(promo);
    });
});

// -------------------------------------------------------------
// ORDERS & TRACKING ENDPOINTS
// -------------------------------------------------------------
app.post('/api/orders', (req, res) => {
    const { userId, customerName, customerEmail, address, city, zip, totalAmount, items } = req.body;

    if (!customerName || !customerEmail || !address || !items || !items.length) {
        return res.status(400).json({ error: 'Missing required order fields or items.' });
    }

    const trackingNumber = 'GF-' + Math.floor(100000 + Math.random() * 900000);

    db.run(
        `INSERT INTO orders (tracking_number, user_id, customer_name, customer_email, address, city, zip, total_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [trackingNumber, userId || null, customerName, customerEmail, address, city || '', zip || '', totalAmount, 'Processing'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const orderId = this.lastID;
            const itemStmt = db.prepare(`
                INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
                VALUES (?, ?, ?, ?, ?)
            `);

            items.forEach(item => {
                itemStmt.run(orderId, item.id, item.name, item.price, item.quantity);
            });
            itemStmt.finalize();

            res.json({
                success: true,
                orderId,
                trackingNumber,
                message: 'Order created successfully!'
            });
        }
    );
});

app.get('/api/orders/track/:trackingNumber', (req, res) => {
    const trackingNo = req.params.trackingNumber.trim();
    
    db.get('SELECT * FROM orders WHERE UPPER(tracking_number) = UPPER(?) OR id = ?', [trackingNo, trackingNo], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: 'No order found with provided tracking code.' });

        db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ...order, items });
        });
    });
});

// -------------------------------------------------------------
// ADMIN DASHBOARD & MANAGEMENT
// -------------------------------------------------------------
app.get('/api/admin/stats', (req, res) => {
    db.get('SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM orders', [], (err, orderStats) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT COUNT(*) as total_products FROM products', [], (err, prodStats) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all('SELECT * FROM orders ORDER BY id DESC LIMIT 5', [], (err, recentOrders) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    totalOrders: orderStats.total_orders || 0,
                    totalRevenue: orderStats.total_revenue || 0,
                    totalProducts: prodStats.total_products || 0,
                    recentOrders
                });
            });
        });
    });
});

app.post('/api/admin/products', (req, res) => {
    const { name, description, price, original_price, category_id, image_url, stock, is_featured } = req.body;

    if (!name || !price || !category_id) {
        return res.status(400).json({ error: 'Name, price, and category are required.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    db.run(
        `INSERT INTO products (name, slug, description, price, original_price, category_id, image_url, stock, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, description || '', price, original_price || null, category_id, image_url || 'image/showcase-image-1.jpg', stock || 20, is_featured ? 1 : 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, productId: this.lastID });
        }
    );
});

app.put('/api/admin/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, updated: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Glamour Fashion Full System Backend running at http://localhost:${PORT}`);
});
