const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// LIST MY FAVORITES
router.get('/', requireAuth, (req, res) => {
  const favorites = db.prepare(`
    SELECT properties.* FROM favorites
    JOIN properties ON properties.id = favorites.property_id
    WHERE favorites.user_id = ?
    ORDER BY favorites.created_at DESC
  `).all(req.user.id);
  res.json({ favorites });
});

// ADD FAVORITE
router.post('/:propertyId', requireAuth, (req, res) => {
  const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.propertyId);
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  try {
    db.prepare('INSERT INTO favorites (user_id, property_id) VALUES (?, ?)').run(req.user.id, req.params.propertyId);
  } catch (err) {
    // already favorited — ignore duplicate
  }
  res.status(201).json({ success: true });
});

// REMOVE FAVORITE
router.delete('/:propertyId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND property_id = ?').run(req.user.id, req.params.propertyId);
  res.json({ success: true });
});

module.exports = router;
