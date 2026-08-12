const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const { name, phone, email, message, propertyId, ownerId } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  db.prepare(
    'INSERT INTO contact_messages (name, phone, email, message, property_id, owner_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, phone || null, email, message, propertyId || null, ownerId || null);

  // Automatically convert this inquiry into a CRM Lead
  db.prepare(
    'INSERT INTO leads (name, email, phone, property_id, status, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, phone || null, propertyId || null, 'New', `Auto-generated from contact form. Message: ${message}`);

  res.status(201).json({ success: true });
});

module.exports = router;
