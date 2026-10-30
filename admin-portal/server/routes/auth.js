const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getAdminDb } = require('../lib/adminDb');
const auth = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'admin_secret_change_in_production';

const ROLES = ['principal', 'vice_principal', 'coordinator'];

function publicAdmin(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    school: row.school,
    role: row.role,
  };
}

function sign(row) {
  return jwt.sign({ id: row.id }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register - anyone with the school's sign-up key becomes an admin
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, school, role } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getAdminDb();
    const key = email.trim().toLowerCase();

    if (db.prepare('SELECT id FROM admins WHERE email = ?').get(key)) {
      return res.status(400).json({ error: 'An admin with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const info = db.prepare(
      'INSERT INTO admins (name, email, password, school, role) VALUES (?, ?, ?, ?, ?)'
    ).run(
      name.trim(),
      key,
      hash,
      (school || '').trim(),
      ROLES.includes(role) ? role : 'principal'
    );

    const row = db.prepare('SELECT * FROM admins WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ token: sign(row), admin: publicAdmin(row) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during sign up' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getAdminDb();
    const row = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.trim().toLowerCase());
    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    db.prepare("UPDATE admins SET last_login = datetime('now') WHERE id = ?").run(row.id);
    res.json({ token: sign(row), admin: publicAdmin(row) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ admin: publicAdmin(req.admin) });
});

module.exports = router;
