const jwt = require('jsonwebtoken');
const { getAdminDb } = require('../lib/adminDb');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin_secret_change_in_production');

    const admin = getAdminDb()
      .prepare('SELECT id, name, email, school, role FROM admins WHERE id = ?')
      .get(decoded.id);

    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = auth;
