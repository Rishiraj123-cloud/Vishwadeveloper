const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'vishwa.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','owner')),
    business_name TEXT,
    properties_range TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, role)
  );
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    property_type TEXT,
    purpose TEXT CHECK(purpose IN ('sale','rent')),
    price TEXT,
    beds INTEGER,
    baths INTEGER,
    sqft INTEGER,
    description TEXT,
    images TEXT,
    lat REAL,
    lng REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    property_id INTEGER,
    owner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(property_id) REFERENCES properties(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(property_id) REFERENCES properties(id)
  );
  CREATE TABLE IF NOT EXISTS saved_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    property_type TEXT,
    purpose TEXT,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_notified_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    property_id INTEGER,
    status TEXT DEFAULT 'New',
    notes TEXT,
    follow_up_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(property_id) REFERENCES properties(id)
  );
  CREATE TABLE IF NOT EXISTS site_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    visit_date DATETIME NOT NULL,
    status TEXT DEFAULT 'Upcoming',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id),
    FOREIGN KEY(property_id) REFERENCES properties(id)
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    transaction_type TEXT CHECK(transaction_type IN ('sale','rent')),
    amount_agreed REAL,
    amount_paid REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(property_id) REFERENCES properties(id)
  );
`);

// Migration: add images column if the table already existed without it
try {
  db.exec("ALTER TABLE properties ADD COLUMN images TEXT;");
  console.log("Migration: added images column");
} catch (e) {
  // column already exists, ignore
}

// Migration: add property_id / owner_id to contact_messages if missing
try {
  db.exec("ALTER TABLE contact_messages ADD COLUMN property_id INTEGER;");
  console.log("Migration: added property_id column to contact_messages");
} catch (e) {
  // column already exists, ignore
}
try {
  db.exec("ALTER TABLE contact_messages ADD COLUMN owner_id INTEGER;");
  console.log("Migration: added owner_id column to contact_messages");
} catch (e) {}
// Migration: add properties columns
const pragmaImages = db.prepare('PRAGMA table_info(properties)').all();
if (!pragmaImages.some(col => col.name === 'images')) {
  db.prepare('ALTER TABLE properties ADD COLUMN images TEXT').run();
  console.log("Migration: Added 'images' column to properties.");
}
if (!pragmaImages.some(col => col.name === 'status')) {
  db.prepare("ALTER TABLE properties ADD COLUMN status TEXT DEFAULT 'Available'").run();
  console.log("Migration: Added 'status' column to properties.");
}
if (!pragmaImages.some(col => col.name === 'views')) {
  db.prepare("ALTER TABLE properties ADD COLUMN views INTEGER DEFAULT 0").run();
  console.log("Migration: Added 'views' column to properties.");
}
try {
  db.exec("ALTER TABLE properties ADD COLUMN lat REAL;");
  console.log("Migration: added lat column to properties");
} catch (e) {}
try {
  db.exec("ALTER TABLE properties ADD COLUMN lng REAL;");
  console.log("Migration: added lng column to properties");
} catch (e) {}

// Migration: add password reset columns to users
try {
  db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT;");
  console.log("Migration: added reset_token to users");
} catch(e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME;");
  console.log("Migration: added reset_token_expires to users");
} catch(e) {}

// Migration: add admin flag
try {
  db.exec("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;");
  console.log("Migration: added is_admin to users");
} catch(e) {}

// Create default admin if not exists
const adminEmail = 'admin@vishwadevelopers.com';
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!adminExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare(`INSERT INTO users (full_name, email, phone, password_hash, role, is_admin) VALUES (?, ?, ?, ?, 'user', 1)`)
    .run('Super Admin', adminEmail, '0000000000', hash);
  console.log("Created default admin account.");
}

// Create default owner if not exists
const ownerEmail = 'vishwadeveleopers29@gmail.com';
const ownerExists = db.prepare('SELECT id FROM users WHERE email = ?').get(ownerEmail);
if (!ownerExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('vishwa@2026', 10);
  db.prepare(`INSERT INTO users (full_name, email, phone, password_hash, role, is_admin) VALUES (?, ?, ?, ?, 'owner', 1)`)
    .run('Vishwa Developers', ownerEmail, '+91', hash);
  console.log("Created master owner account for client.");
}

// Create default regular user if not exists
const userEmail = 'user@vishwadevelopers.com';
const userExists = db.prepare('SELECT id FROM users WHERE email = ?').get(userEmail);
if (!userExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('password123', 10);
  db.prepare(`INSERT INTO users (full_name, email, phone, password_hash, role, is_admin) VALUES (?, ?, ?, ?, 'user', 0)`)
    .run('Demo User', userEmail, '0000000000', hash);
  console.log("Created default regular user account.");
}

module.exports = db;
