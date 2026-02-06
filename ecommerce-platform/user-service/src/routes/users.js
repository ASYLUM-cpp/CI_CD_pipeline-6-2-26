// ============================================================
// User CRUD Routes
// Protected routes requiring JWT authentication.
// ============================================================
const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/users – List all users (admin only)
router.get('/', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const pool = req.app.get('db');
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/users/me – Get current user profile
router.get('/me', authenticate, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/users/me – Update current user profile
router.put('/me', authenticate, async (req, res) => {
  const { name } = req.body;
  const pool = req.app.get('db');
  try {
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
      [name, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/users/:id – Delete a user (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const pool = req.app.get('db');
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
