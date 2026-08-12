const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
}

// GET all users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, full_name, email, phone, role, is_admin, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// DELETE user
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself.' });
  }
  
  // Delete all their properties first
  db.prepare('DELETE FROM properties WHERE owner_id = ?').run(id);
  // Delete all their favorites
  db.prepare('DELETE FROM favorites WHERE user_id = ?').run(id);
  // Delete all their saved searches
  db.prepare('DELETE FROM saved_searches WHERE user_id = ?').run(id);
  
  // Delete the user
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  if (result.changes === 0) return res.status(404).json({ error: 'User not found.' });
  res.json({ success: true, message: 'User deleted.' });
});

// GET all properties (including all details)
router.get('/properties', requireAuth, requireAdmin, (req, res) => {
  const properties = db.prepare(`
    SELECT p.*, u.full_name as owner_name, u.email as owner_email
    FROM properties p
    JOIN users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC
  `).all();
  
  // Parse images JSON
  properties.forEach(p => {
    try { p.images = JSON.parse(p.images || '[]'); } catch(e) { p.images = []; }
  });
  
  res.json({ properties });
});

// DELETE property
router.delete('/properties/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Delete favorites referencing it
  db.prepare('DELETE FROM favorites WHERE property_id = ?').run(id);
  
  const result = db.prepare('DELETE FROM properties WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Property not found.' });
  
  res.json({ success: true, message: 'Property deleted.' });
});

module.exports = router;
