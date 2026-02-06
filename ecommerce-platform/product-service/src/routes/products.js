// ============================================================
// Product CRUD Routes
// Full CRUD for products. GET routes are cached in Redis.
// POST/PUT/DELETE routes invalidate the cache.
// ============================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { publishMessage } = require('../messaging');

const router = express.Router();
const CACHE_KEY = 'products:all';
const CACHE_TTL = 300; // 5 minutes

// Middleware: verify JWT (optional for GET, required for mutations)
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback-secret');
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// GET /api/products – List all products (with Redis caching)
router.get('/', async (req, res) => {
  const pool = req.app.get('db');
  const redis = req.app.get('redis');

  try {
    // Check cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );

    // Store in cache
    await redis.set(CACHE_KEY, JSON.stringify(result.rows), 'EX', CACHE_TTL);
    res.json(result.rows);
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/products/:id – Get single product
router.get('/:id', async (req, res) => {
  const pool = req.app.get('db');
  const redis = req.app.get('redis');
  const cacheKey = `product:${req.params.id}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await redis.set(cacheKey, JSON.stringify(result.rows[0]), 'EX', CACHE_TTL);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/products – Create product (auth required)
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, price, stock, category } = req.body;
    const pool = req.app.get('db');
    const redis = req.app.get('redis');

    try {
      const result = await pool.query(
        `INSERT INTO products (name, description, price, stock, category)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, description || '', price, stock || 0, category || 'General']
      );

      // Invalidate cache
      await redis.del(CACHE_KEY);

      // Publish event
      await publishMessage('product.created', result.rows[0]);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create product error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// PUT /api/products/:id – Update product (auth required)
router.put('/:id', authenticate, async (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const pool = req.app.get('db');
  const redis = req.app.get('redis');

  try {
    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        stock = COALESCE($4, stock),
        category = COALESCE($5, category),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, description, price, stock, category, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await redis.del(CACHE_KEY);
    await redis.del(`product:${req.params.id}`);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/products/:id – Delete product (auth required)
router.delete('/:id', authenticate, async (req, res) => {
  const pool = req.app.get('db');
  const redis = req.app.get('redis');

  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await redis.del(CACHE_KEY);
    await redis.del(`product:${req.params.id}`);
    await publishMessage('product.deleted', { id: req.params.id });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
