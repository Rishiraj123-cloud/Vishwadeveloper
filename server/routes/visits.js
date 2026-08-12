const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET all site visits for the current owner
router.get('/', requireAuth, (req, res) => {
  try {
    const ownerId = req.user.id;
    const isAdmin = req.user.is_admin === 1;
    
    const condition = isAdmin ? '1=1' : 'p.owner_id = ?';
    const params = isAdmin ? [] : [ownerId];

    const visits = db.prepare(`
      SELECT sv.*, l.name as lead_name, p.title as property_title 
      FROM site_visits sv
      JOIN leads l ON sv.lead_id = l.id
      JOIN properties p ON sv.property_id = p.id
      WHERE ${condition}
      ORDER BY sv.visit_date ASC
    `).all(...params);
    
    res.json(visits);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST schedule new visit
router.post('/', requireAuth, (req, res) => {
  try {
    const { lead_id, property_id, visit_date, notes } = req.body;
    if (!lead_id || !property_id || !visit_date) {
      return res.status(400).json({ error: 'Lead, property, and date are required' });
    }

    const info = db.prepare(`
      INSERT INTO site_visits (lead_id, property_id, visit_date, notes)
      VALUES (?, ?, ?, ?)
    `).run(lead_id, property_id, visit_date, notes || null);
    
    // Also update lead status to 'Site visit scheduled' if it's not already something else advanced
    db.prepare(`UPDATE leads SET status = 'Site visit scheduled' WHERE id = ?`).run(lead_id);
    
    res.json({ success: true, id: info.lastInsertRowid });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update visit (reschedule, cancel)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { status, visit_date, notes } = req.body;
    db.prepare(`
      UPDATE site_visits 
      SET status = COALESCE(?, status), 
          visit_date = COALESCE(?, visit_date),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(status, visit_date, notes, req.params.id);
    
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE visit
router.delete('/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM site_visits WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
