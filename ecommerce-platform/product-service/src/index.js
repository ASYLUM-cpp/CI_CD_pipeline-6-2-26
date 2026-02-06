// ============================================================
// Product Service – Entry Point
// Express server with CRUD routes for product management.
// Caches product listings in Redis for performance.
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const Redis = require('ioredis');

const productRoutes = require('./routes/products');
const { connectRabbitMQ } = require('./messaging');

const app = express();
const PORT = process.env.PORT || 3002;

// ---- Middleware ----
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ---- Database Pool ----
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'products_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ---- Redis Client ----
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

app.set('db', pool);
app.set('redis', redis);

// ---- Health & Readiness ----
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'product-service' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});

// ---- Routes ----
app.use('/api/products', productRoutes);

// ---- Initialize Database Tables ----
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Seed some sample products if table is empty
    const count = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(count.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (name, description, price, stock, category) VALUES
        ('Laptop Pro 15', 'High-performance laptop with 16GB RAM', 999.99, 50, 'Electronics'),
        ('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 200, 'Accessories'),
        ('USB-C Hub', '7-in-1 USB-C hub adapter', 49.99, 150, 'Accessories'),
        ('Mechanical Keyboard', 'RGB mechanical keyboard', 79.99, 100, 'Accessories'),
        ('Monitor 27"', '4K IPS Monitor', 399.99, 30, 'Electronics');
      `);
      console.log('✅ Seeded sample products');
    }
    console.log('✅ Products table ready');
  } finally {
    client.release();
  }
}

// ---- Start Server ----
async function start() {
  try {
    await initDB();
    await connectRabbitMQ();
    app.listen(PORT, () => {
      console.log(`🚀 Product Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start product-service:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await pool.end();
  redis.disconnect();
  process.exit(0);
});

start();

module.exports = app;
