const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET all transactions for the current owner
router.get('/', requireAuth, (req, res) => {
  try {
    const ownerId = req.user.id;
    const isAdmin = req.user.is_admin === 1;
    
    const condition = isAdmin ? '1=1' : 'p.owner_id = ?';
    const params = isAdmin ? [] : [ownerId];

    const txs = db.prepare(`
      SELECT t.*, p.title as property_title 
      FROM transactions t
      JOIN properties p ON t.property_id = p.id
      WHERE ${condition}
      ORDER BY t.created_at DESC
    `).all(...params);
    
    res.json(txs);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new transaction
router.post('/', requireAuth, (req, res) => {
  try {
    const { property_id, transaction_type, amount_agreed, amount_paid, status } = req.body;
    if (!property_id || !transaction_type) {
      return res.status(400).json({ error: 'Property and type are required' });
    }

    const info = db.prepare(`
      INSERT INTO transactions (property_id, transaction_type, amount_agreed, amount_paid, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(property_id, transaction_type, amount_agreed || 0, amount_paid || 0, status || 'Pending');
    
    // Auto-update property status based on transaction type if transaction is 'Completed'
    if (status === 'Completed') {
       const newStatus = transaction_type === 'sale' ? 'Sold' : 'Rented';
       db.prepare(`UPDATE properties SET status = ? WHERE id = ?`).run(newStatus, property_id);
    }
    
    res.json({ success: true, id: info.lastInsertRowid });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update transaction
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { amount_agreed, amount_paid, status } = req.body;
    
    // Get existing to see if status changed to Completed
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    db.prepare(`
      UPDATE transactions 
      SET amount_agreed = COALESCE(?, amount_agreed), 
          amount_paid = COALESCE(?, amount_paid),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(amount_agreed, amount_paid, status, req.params.id);
    
    if (status === 'Completed' && existing.status !== 'Completed') {
       const newStatus = existing.transaction_type === 'sale' ? 'Sold' : 'Rented';
       db.prepare(`UPDATE properties SET status = ? WHERE id = ?`).run(newStatus, existing.property_id);
    }
    
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
