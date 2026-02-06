// ============================================================
// User Service – Entry Point
// Express server with middleware, routes, DB init, and graceful shutdown.
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const Redis = require('ioredis');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { connectRabbitMQ } = require('./messaging');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Middleware ----
app.use(helmet());                    // Security headers
app.use(cors());                      // CORS for frontend
app.use(morgan('combined'));          // HTTP request logging
app.use(express.json());             // Parse JSON bodies

// ---- Database Pool ----
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'users_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ---- Redis Client ----
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Make pool and redis available to routes
app.set('db', pool);
app.set('redis', redis);

// ---- Health Check ----
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'user-service' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ---- Readiness Check ----
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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ---- Initialize Database Tables ----
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Users table ready');
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
      console.log(`🚀 User Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start user-service:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await pool.end();
  redis.disconnect();
  process.exit(0);
});

start();

module.exports = app; // Export for testing
