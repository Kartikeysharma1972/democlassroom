const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { getAdminDb } = require('../lib/adminDb');

const router = express.Router();

router.use(auth);

const ROLES = ['principal', 'vice_principal', 'coordinator'];

// GET /api/management/admins
router.get('/admins', (req, res) => {
  try {
    const admins = getAdminDb().prepare(
      'SELECT id, name, email, school, role, created_at, last_login FROM admins ORDER BY created_at'
    ).all();
    res.json({ admins });
  } catch (err) {
    console.error('List admins error:', err.message);
    res.status(500).json({ error: 'Failed to load admins' });
  }
});

// POST /api/management/admins
router.post('/admins', async (req, res) => {
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

    const info = db.prepare(
      'INSERT INTO admins (name, email, password, school, role) VALUES (?, ?, ?, ?, ?)'
    ).run(
      name.trim(),
      key,
      await bcrypt.hash(password, 10),
      (school || '').trim(),
      ROLES.includes(role) ? role : 'coordinator'
    );

    res.status(201).json({
      admin: db.prepare(
        'SELECT id, name, email, school, role, created_at FROM admins WHERE id = ?'
      ).get(info.lastInsertRowid),
    });
  } catch (err) {
    console.error('Create admin error:', err.message);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// DELETE /api/management/admins/:id
router.delete('/admins/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.admin.id) {
      return res.status(400).json({ error: 'You cannot remove your own account' });
    }

    const db = getAdminDb();
    const remaining = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
    if (remaining <= 1) {
      return res.status(400).json({ error: 'The last admin account cannot be removed' });
    }

    const info = db.prepare('DELETE FROM admins WHERE id = ?').run(id);
    if (!info.changes) return res.status(404).json({ error: 'Admin not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete admin error:', err.message);
    res.status(500).json({ error: 'Failed to remove admin' });
  }
});

module.exports = router;
