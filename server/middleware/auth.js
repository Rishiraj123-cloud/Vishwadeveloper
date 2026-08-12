const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

function requireOwner(req, res, next) {
  if (req.user.role !== 'owner' && req.user.role !== 'user') {
    return res.status(403).json({ error: 'Owner or user account required.' });
  }
  next();
}

module.exports = { requireAuth, requireOwner };
