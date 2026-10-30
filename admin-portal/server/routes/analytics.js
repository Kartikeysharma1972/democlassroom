const express = require('express');
const auth = require('../middleware/auth');
const { getDb } = require('../lib/sqlite');

const router = express.Router();

router.use(auth);

// Classroom AI scopes every saved generation to "teacher-<user id>", so any
// join back to the users table has to carry the prefix.
const JOIN_TEACHER = "LEFT JOIN users u ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)";

function withDb(res, fallback, work) {
  const db = getDb();
  if (!db) return res.json(fallback);
  try {
    return res.json(work(db));
  } catch (err) {
    console.error('Analytics error:', err.message);
    return res.status(500).json({ error: 'Could not read Classroom AI data' });
  }
}

// GET /api/analytics/usage-over-time?days=30
router.get('/usage-over-time', (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
  withDb(res, { data: [] }, (db) => {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const rows = db.prepare(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM chat_history
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(from.toISOString().slice(0, 10));

    return { data: rows, days };
  });
});

// GET /api/analytics/tool-popularity
router.get('/tool-popularity', (req, res) => {
  withDb(res, { data: [] }, (db) => ({
    data: db.prepare(`
      SELECT tool_name AS tool, COUNT(*) AS count
      FROM chat_history
      GROUP BY tool_name
      ORDER BY count DESC
    `).all(),
  }));
});

// GET /api/analytics/top-teachers?limit=10
router.get('/top-teachers', (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  withDb(res, { data: [] }, (db) => ({
    data: db.prepare(`
      SELECT u.id, u.name, u.email, u.school_name,
             COUNT(ch.id) AS lessons,
             COUNT(DISTINCT ch.tool_name) AS tools_used,
             MAX(ch.created_at) AS last_activity
      FROM users u
      LEFT JOIN chat_history ch ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)
      GROUP BY u.id
      HAVING lessons > 0
      ORDER BY lessons DESC
      LIMIT ?
    `).all(limit),
  }));
});

// GET /api/analytics/grade-coverage - which grades staff generate material for
router.get('/grade-coverage', (req, res) => {
  withDb(res, { data: [] }, (db) => ({
    data: db.prepare(`
      SELECT grade_level AS grade,
             COUNT(*) AS count,
             COUNT(DISTINCT teacher_id) AS teachers
      FROM chat_history
      WHERE grade_level IS NOT NULL AND grade_level != ''
      GROUP BY grade_level
      ORDER BY count DESC
    `).all(),
  }));
});

// GET /api/analytics/curriculum-coverage - subjects and the topics under them
router.get('/curriculum-coverage', (req, res) => {
  withDb(res, { data: [] }, (db) => ({
    data: db.prepare(`
      SELECT COALESCE(NULLIF(subject, ''), 'Unspecified') AS subject,
             COUNT(*) AS count,
             COUNT(DISTINCT topic) AS topics,
             COUNT(DISTINCT teacher_id) AS teachers
      FROM chat_history
      GROUP BY COALESCE(NULLIF(subject, ''), 'Unspecified')
      ORDER BY count DESC
    `).all(),
  }));
});

// GET /api/analytics/teacher-effectiveness - breadth and recency per teacher
router.get('/teacher-effectiveness', (req, res) => {
  withDb(res, { data: [] }, (db) => {
    const rows = db.prepare(`
      SELECT u.id, u.name, u.school_name,
             COUNT(ch.id) AS lessons,
             COUNT(DISTINCT ch.tool_name) AS tools_used,
             COUNT(DISTINCT ch.subject) AS subjects,
             COUNT(DISTINCT ch.grade_level) AS grades,
             COUNT(DISTINCT DATE(ch.created_at)) AS active_days,
             MAX(ch.created_at) AS last_activity
      FROM users u
      LEFT JOIN chat_history ch ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)
      GROUP BY u.id
      HAVING lessons > 0
      ORDER BY lessons DESC
    `).all();

    // A plain 0-100 blend of how much, how broadly and how often someone
    // works - enough to sort a staff list by, and easy to explain.
    const max = rows.reduce((m, r) => Math.max(m, r.lessons), 0) || 1;
    return {
      data: rows.map(r => ({
        ...r,
        score: Math.round(
          (r.lessons / max) * 60 +
          Math.min(r.tools_used / 8, 1) * 20 +
          Math.min(r.active_days / 20, 1) * 20
        ),
      })),
    };
  });
});

module.exports = router;
