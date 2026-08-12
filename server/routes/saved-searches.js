const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// LIST MY SAVED SEARCHES
router.get('/', requireAuth, (req, res) => {
  const searches = db.prepare(`
    SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ searches });
});

// SAVE A NEW SEARCH
router.post('/', requireAuth, (req, res) => {
  const { property_type, purpose, location } = req.body;
  const result = db.prepare(`
    INSERT INTO saved_searches (user_id, property_type, purpose, location)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, property_type || null, purpose || null, location || null);
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// DELETE A SAVED SEARCH
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
