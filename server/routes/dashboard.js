const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET dashboard aggregate metrics
router.get('/', requireAuth, (req, res) => {
  try {
    const ownerId = req.user.id;
    const isAdmin = req.user.is_admin === 1;
    
    // Base condition for properties
    const propCondition = isAdmin ? '1=1' : 'owner_id = ?';
    const params = isAdmin ? [] : [ownerId];
    
    // Properties stats
    const totalProperties = db.prepare(`SELECT COUNT(*) as count FROM properties WHERE ${propCondition}`).get(...params).count;
    const activeProperties = db.prepare(`SELECT COUNT(*) as count FROM properties WHERE status = 'Available' AND ${propCondition}`).get(...params).count;
    const soldProperties = db.prepare(`SELECT COUNT(*) as count FROM properties WHERE status = 'Sold' AND ${propCondition}`).get(...params).count;
    const rentedProperties = db.prepare(`SELECT COUNT(*) as count FROM properties WHERE status = 'Rented' AND ${propCondition}`).get(...params).count;
    const totalViews = db.prepare(`SELECT SUM(views) as total FROM properties WHERE ${propCondition}`).get(...params).total || 0;
    
    // Leads stats
    // We join leads with properties to filter by owner
    const leadsCondition = isAdmin ? '1=1' : 'p.owner_id = ?';
    const totalLeads = db.prepare(`
      SELECT COUNT(*) as count FROM leads l
      JOIN properties p ON l.property_id = p.id
      WHERE ${leadsCondition}
    `).get(...params).count;
    
    const newLeads = db.prepare(`
      SELECT COUNT(*) as count FROM leads l
      JOIN properties p ON l.property_id = p.id
      WHERE l.status = 'New' AND ${leadsCondition}
    `).get(...params).count;
    
    // Transactions / Revenue
    const revenueStats = db.prepare(`
      SELECT SUM(amount_paid) as total_collected, SUM(amount_agreed) as total_expected
      FROM transactions t
      JOIN properties p ON t.property_id = p.id
      WHERE ${leadsCondition}
    `).get(...params);

    res.json({
      properties: {
        total: totalProperties,
        active: activeProperties,
        sold: soldProperties,
        rented: rentedProperties,
        views: totalViews
      },
      leads: {
        total: totalLeads,
        new: newLeads
      },
      revenue: {
        collected: revenueStats.total_collected || 0,
        expected: revenueStats.total_expected || 0
      }
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
