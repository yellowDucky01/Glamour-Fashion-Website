const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'glamour.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Delete existing DB file to re-seed cleanly
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

db.serialize(async () => {
    console.log('🌱 Initializing SQLite database schema...');
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, async (err) => {
        if (err) {
            console.error('❌ Schema execution error:', err);
            return;
        }

        console.log('✅ Tables created. Seeding initial data...');

        // Hash passwords
        const adminPass = bcrypt.hashSync('admin123', 10);
        const userPass = bcrypt.hashSync('user123', 10);

        // Seed Users
        const userStmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
        userStmt.run('Glamour Admin', 'admin@glamour.com', adminPass, 'admin');
        userStmt.run('Elena Vance', 'elena@example.com', userPass, 'customer');
        userStmt.run('Marcus Aurelius', 'marcus@example.com', userPass, 'customer');
        userStmt.finalize();

        // Seed Categories
        const catStmt = db.prepare('INSERT INTO categories (name, slug, description, image_url) VALUES (?, ?, ?, ?)');
        catStmt.run('Men Collection', 'men', 'Refined menswear for modern elegance and timeless style.', 'image/men.JPG');
        catStmt.run('Women Collection', 'women', 'Exquisite haute couture, evening gowns, and chic daily wear.', 'image/women.JPG');
        catStmt.run('Kids Collection', 'kids', 'Playful yet sophisticated luxury fashion for children.', 'image/kids.JPG');
        catStmt.run('Accessories', 'accessories', 'Signature leather goods, timepieces, and jewelry.', 'image/showcase-image-4.png');
        catStmt.finalize();

        // Seed Products
        const prodStmt = db.prepare(`
            INSERT INTO products (name, slug, description, price, original_price, category_id, image_url, stock, rating, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const products = [
            // Men
            ['Tailored Italian Blazer', 'tailored-italian-blazer', 'Handcrafted virgin wool blazer featuring notch lapels and silk lining.', 495.00, 650.00, 1, 'image/men.JPG', 25, 4.9, 1],
            ['Monaco Cashmere Sweater', 'monaco-cashmere-sweater', 'Ultra-soft 100% Mongolian cashmere crewneck sweater in charcoal.', 280.00, 350.00, 1, 'image/showcase-image-2.png', 40, 4.8, 1],
            ['Sartorial Linen Trousers', 'sartorial-linen-trousers', 'Breathable pleated linen trousers perfect for warm luxury escapes.', 195.00, 240.00, 1, 'image/men.JPG', 30, 4.7, 0],
            ['Classic Velvet Tuxedo', 'classic-velvet-tuxedo', 'Midnight blue velvet tux with satin shawl collar for evening galas.', 890.00, 1100.00, 1, 'image/men.JPG', 12, 5.0, 1],

            // Women
            ['Silk Evening Gown', 'silk-evening-gown', 'Floor-length silk crepe gown with draped cowl neck and open back.', 780.00, 950.00, 2, 'image/women.JPG', 15, 5.0, 1],
            ['Parisian Trench Coat', 'parisian-trench-coat', 'Water-resistant double-breasted cotton gabardine trench with belt.', 520.00, 680.00, 2, 'image/showcase-image-1.jpg', 20, 4.9, 1],
            ['Minimalist Satin Slip Dress', 'minimalist-satin-slip-dress', 'Fluid bias-cut satin dress available in champagne and emerald.', 245.00, 310.00, 2, 'image/women.JPG', 35, 4.8, 0],
            ['Handwoven Tweed Jacket', 'handwoven-tweed-jacket', 'Structured tweed cropped jacket with gold filigree buttons.', 640.00, 780.00, 2, 'image/showcase-image-3.png', 18, 4.9, 1],

            // Kids
            ['Mini Royal Velvet Set', 'mini-royal-velvet-set', 'Tailored velvet blazer and shorts suit for festive celebrations.', 185.00, 230.00, 3, 'image/kids.JPG', 25, 4.9, 1],
            ['Organic Cotton Knit Cardigan', 'organic-cotton-knit-cardigan', 'Gentle organic cotton button-up cardigan with micro-ribbing.', 110.00, 140.00, 3, 'image/kids.JPG', 50, 4.7, 0],
            ['Heritage Plaid Dress', 'heritage-plaid-dress', 'Charming wool-blend tartan dress with Peter Pan collar.', 160.00, 195.00, 3, 'image/kids.JPG', 20, 4.8, 1],

            // Accessories
            ['Artisan Leather Tote Bag', 'artisan-leather-tote-bag', 'Full-grain calfskin tote with gold-plated hardware and suede interior.', 650.00, 800.00, 4, 'image/showcase-image-4.png', 14, 5.0, 1],
            ['Chrono Elegance Watch', 'chrono-elegance-watch', 'Swiss movement chronograph with sapphire crystal and leather strap.', 1250.00, 1500.00, 4, 'image/showcase-image-5.png', 8, 5.0, 1]
        ];

        products.forEach(p => prodStmt.run(...p));
        prodStmt.finalize();

        // Seed Promos
        const promoStmt = db.prepare('INSERT INTO promos (code, discount_percent) VALUES (?, ?)');
        promoStmt.run('GLAMOUR50', 50);
        promoStmt.run('VIP20', 20);
        promoStmt.run('WELCOME10', 10);
        promoStmt.finalize();

        // Seed Orders
        const orderStmt = db.prepare(`
            INSERT INTO orders (tracking_number, user_id, customer_name, customer_email, address, city, zip, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        orderStmt.run('GF-884920', 2, 'Elena Vance', 'elena@example.com', '742 Evergreen Terrace', 'Springfield', '97477', 1015.00, 'In Transit');
        orderStmt.run('GF-903112', 3, 'Marcus Aurelius', 'marcus@example.com', '10 Capitol Hill', 'Rome', '00100', 495.00, 'Delivered');
        orderStmt.run('GF-104599', 2, 'Elena Vance', 'elena@example.com', '742 Evergreen Terrace', 'Springfield', '97477', 245.00, 'Processing');
        orderStmt.finalize();

        // Seed Order Items
        const itemStmt = db.prepare(`
            INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
            VALUES (?, ?, ?, ?, ?)
        `);
        itemStmt.run(1, 1, 'Tailored Italian Blazer', 495.00, 1);
        itemStmt.run(1, 2, 'Monaco Cashmere Sweater', 280.00, 1);
        itemStmt.run(1, 7, 'Minimalist Satin Slip Dress', 240.00, 1);

        itemStmt.run(2, 1, 'Tailored Italian Blazer', 495.00, 1);

        itemStmt.run(3, 7, 'Minimalist Satin Slip Dress', 245.00, 1);
        itemStmt.finalize();

        console.log('✅ Database seeded successfully with products, categories, users, orders, and promos!');
        db.close();
    });
});
