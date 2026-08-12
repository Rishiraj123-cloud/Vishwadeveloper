const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../lib-email');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    businessName: user.business_name,
  };
}

// USER SIGNUP
router.post('/signup', (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND role = ?').get(email, 'user');
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    `INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'user')`
  ).run(fullName, email, phone, hash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
});

// OWNER SIGNUP
router.post('/owner-signup', (req, res) => {
  const { fullName, businessName, email, phone, propertiesRange, password } = req.body;
  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND role = ?').get(email, 'owner');
  if (existing) return res.status(409).json({ error: 'An owner account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    `INSERT INTO users (full_name, email, phone, password_hash, role, business_name, properties_range)
     VALUES (?, ?, ?, ?, 'owner', ?, ?)`
  ).run(fullName, email, phone, hash, businessName || null, propertiesRange || null);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
});

// LOGIN (shared by user + owner, role tells us which table row to match)
router.post('/login', (req, res) => {
  const { emailOrPhone, password, role } = req.body;
  if (!emailOrPhone || !password || !role) {
    return res.status(400).json({ error: 'Missing login details.' });
  }
  const user = db.prepare(
    'SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = ?'
  ).get(emailOrPhone, emailOrPhone, role);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json({ token: makeToken(user), user: publicUser(user) });
});

// CURRENT USER
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) {
    // Return 200 even if not found to prevent email enumeration
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
    .run(token, expires, user.id);
    
  await sendPasswordResetEmail(email, token);
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

// RESET PASSWORD
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required.' });

  const user = db.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime("now")').get(token);
  
  if (!user) return res.status(400).json({ error: 'Invalid or expired token.' });
  
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(hash, user.id);
    
  res.json({ success: true, message: 'Password has been reset successfully.' });
});

module.exports = router;
