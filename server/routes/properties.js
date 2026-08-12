const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

// Geocode a location string to lat/lng using OpenStreetMap's free Nominatim API
async function geocodeLocation(locationStr) {
  if (!locationStr) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationStr)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VishwaDevelopers/1.0 (property listing site)' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (err) {
    console.error('Geocoding failed for:', locationStr, err.message);
    return null;
  }
}

const sharp = require('sharp');
const fs = require('fs');

// Configure multer to use memory storage so we can process with sharp
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per image, we'll compress it
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

// Helper to parse Indian prices
function parsePriceToNumber(priceStr) {
  if (!priceStr) return null;
  let s = String(priceStr).trim().toLowerCase().replace(/₹|rs\.?|inr/g, '').trim();
  const croreMatch = s.match(/([\d,.]+)\s*(cr|crore)/);
  if (croreMatch) {
    const num = parseFloat(croreMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) return Math.round(num * 1e7);
  }
  const lakhMatch = s.match(/([\d,.]+)\s*(l|lac|lakh)/);
  if (lakhMatch) {
    const num = parseFloat(lakhMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) return Math.round(num * 1e5);
  }
  const plain = s.replace(/[^0-9.]/g, '');
  if (plain) {
    const num = parseFloat(plain);
    if (!isNaN(num) && num > 1000) return Math.round(num);
  }
  return null;
}

// LIST + FILTER
router.get('/', (req, res) => {
  const { type, purpose, location, beds, minPrice, maxPrice } = req.query;
  let query = 'SELECT * FROM properties WHERE 1=1';
  const params = [];

  if (type) { query += ' AND property_type = ?'; params.push(type); }
  if (purpose) { query += ' AND purpose = ?'; params.push(purpose); }
  if (location) { query += ' AND location LIKE ?'; params.push(`%${location}%`); }
  if (beds) { query += ' AND beds >= ?'; params.push(parseInt(beds)); }

  query += ' ORDER BY created_at DESC';
  let properties = db.prepare(query).all(...params);

  // In-memory price filter for TEXT prices
  if (minPrice || maxPrice) {
    const min = minPrice ? parseInt(minPrice) : 0;
    const max = maxPrice ? parseInt(maxPrice) : Infinity;
    properties = properties.filter(p => {
      const numPrice = parsePriceToNumber(p.price);
      if (!numPrice) return true; // If we can't parse it, keep it
      return numPrice >= min && numPrice <= max;
    });
  }

  res.json({ properties: properties.map(parseImages) });
});

// OWNER'S OWN PROPERTIES (must come before /:id)
router.get('/mine', requireAuth, requireOwner, (req, res) => {
  const properties = db.prepare(
    'SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ properties: properties.map(parseImages) });
});

// SINGLE PROPERTY
router.get('/:id', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found.' });

  const owner = db.prepare(
    'SELECT id, full_name, email, phone, business_name FROM users WHERE id = ?'
  ).get(property.owner_id);
  property.owner = owner || null;

  res.json({ property: parseImages(property) });
});

// CREATE (owner only) — now accepts up to 5 images via multipart/form-data
router.post('/', requireAuth, requireOwner, upload.array('images', 5), async (req, res) => {
  const { title, location, propertyType, purpose, price, beds, baths, sqft, description } = req.body;
  if (!title || !location || !purpose || !price) {
    return res.status(400).json({ error: 'Title, location, purpose, and price are required.' });
  }

  const imagePaths = [];
  
  if (req.files && req.files.length > 0) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    for (const file of req.files) {
      const ext = path.extname(file.originalname) || '.jpg';
      const baseFilename = Date.now() + '-' + Math.round(Math.random() * 1e9);
      let filename = baseFilename + '.webp';
      let filepath = path.join(uploadsDir, filename);
      
      try {
        // Process with sharp
        await sharp(file.buffer)
          .resize({ width: 1280, height: 800, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);
      } catch (err) {
        console.error('Sharp processing failed, falling back to original file:', err);
        filename = baseFilename + ext;
        filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, file.buffer);
      }
        
      imagePaths.push('/uploads/' + filename);
    }
  }

  const imagesJson = JSON.stringify(imagePaths);

  let coords = null;
  if (req.body.lat && req.body.lng) {
    coords = { lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) };
  } else {
    coords = await geocodeLocation(location);
  }

  const info = db.prepare(
    `INSERT INTO properties (owner_id, title, location, property_type, purpose, price, beds, baths, sqft, description, images, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, title, location, propertyType || null, purpose, price, beds || null, baths || null, sqft || null, description || null, imagesJson, coords ? coords.lat : null, coords ? coords.lng : null);

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ property: parseImages(property) });
});

// DELETE (owner only, must own it)
router.delete('/:id', requireAuth, requireOwner, (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  if (property.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own listings.' });
  }
  db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Helper: turn the stored JSON string back into a real array for the frontend
function parseImages(property) {
  try {
    property.images = property.images ? JSON.parse(property.images) : [];
  } catch (e) {
    property.images = [];
  }
  return property;
}

module.exports = router;
