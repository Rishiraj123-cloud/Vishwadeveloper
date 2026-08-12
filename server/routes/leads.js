const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET all leads for the current owner
router.get('/', requireAuth, (req, res) => {
  try {
    const ownerId = req.user.id;
    const isAdmin = req.user.is_admin === 1;
    
    const condition = isAdmin ? '1=1' : 'p.owner_id = ?';
    const params = isAdmin ? [] : [ownerId];

    const leads = db.prepare(`
      SELECT l.*, p.title as property_title 
      FROM leads l
      LEFT JOIN properties p ON l.property_id = p.id
      WHERE ${condition}
      ORDER BY l.created_at DESC
    `).all(...params);
    
    res.json(leads);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new lead (Internal/CRM usage)
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, email, phone, property_id, status, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const info = db.prepare(`
      INSERT INTO leads (name, email, phone, property_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email || null, phone || null, property_id || null, status || 'New', notes || null);
    
    res.json({ success: true, id: info.lastInsertRowid });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update lead status
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { status, notes, follow_up_date } = req.body;
    db.prepare(`
      UPDATE leads 
      SET status = COALESCE(?, status), 
          notes = COALESCE(?, notes), 
          follow_up_date = COALESCE(?, follow_up_date)
      WHERE id = ?
    `).run(status, notes, follow_up_date, req.params.id);
    
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE lead
router.delete('/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
