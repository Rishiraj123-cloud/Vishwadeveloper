require('dotenv').config();
const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const contactRoutes = require('./routes/contact');
const favoritesRoutes = require('./routes/favorites');
const savedSearchesRoutes = require('./routes/saved-searches');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const leadsRoutes = require('./routes/leads');
const visitsRoutes = require('./routes/visits');
const transactionsRoutes = require('./routes/transactions');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// Auth Limiter: Max 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Contact Limiter: Max 5 requests per 15 minutes
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many contact messages sent. Please wait.' }
});

app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/saved-searches', savedSearchesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/transactions', transactionsRoutes);

// Serve Images from Database
app.get('/api/image/:id', (req, res) => {
  const db = require('./db');
  const image = db.prepare('SELECT image_data FROM property_images WHERE id = ?').get(req.params.id);
  
  if (!image || !image.image_data) {
    return res.status(404).send('Image not found');
  }

  // image_data is stored as: data:image/webp;base64,.....
  const match = image.image_data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(buffer);
  } else {
    res.status(404).send('Invalid image data');
  }
});

// SSR for Property Details (SEO Meta Tags)
const fs = require('fs');
app.get('/property/:id', (req, res) => {
  const propertyId = req.params.id;
  const db = require('./db');
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
  
  if (!property) {
    return res.redirect('/listings.html');
  }
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let firstImg = `${baseUrl}/homeimg.png`;
  try {
    const imgs = JSON.parse(property.images || '[]');
    if (imgs.length > 0) {
      firstImg = baseUrl + imgs[0];
    }
  } catch(e) {}
  
  const title = `${property.title} | VISHWA DEVELOPERS`;
  const desc = `${property.property_type} for ${property.purpose} in ${property.location}. Price: ${property.price}`;
  
  const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${firstImg}" />
    <meta property="og:url" content="${baseUrl}/property/${property.id}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${firstImg}" />
  `;
  
  const htmlPath = path.join(__dirname, '..', 'property-details.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Server Error');
    // Inject meta tags before </head>
    const injectedHtml = data.replace('</head>', metaTags + '\\n</head>');
    res.send(injectedHtml);
  });
});

// Sitemap.xml Generation
app.get('/sitemap.xml', (req, res) => {
  const db = require('./db');
  const properties = db.prepare('SELECT id, created_at FROM properties ORDER BY created_at DESC').all();
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/listings.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/about.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/agents.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;

  properties.forEach(p => {
    xml += `
  <url>
    <loc>${baseUrl}/property/${p.id}</loc>
    <lastmod>${new Date(p.created_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });
  
  xml += `\n</urlset>`;
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vishwa Developers server running at http://localhost:${PORT}`);
});
