const express = require('express');
const auth = require('../middleware/auth');
const { getDb } = require('../lib/sqlite');

const router = express.Router();

// Classroom AI scopes every saved generation to "teacher-<user id>".
const historyId = (id) => `teacher-${id}`;

router.use(auth);

// GET /api/teachers - List all teachers
router.get('/', (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({ teachers: [], message: 'Teacher database not available' });
    }

    const teachers = db.prepare(`
      SELECT
        u.id, u.name, u.email, u.school_name, u.created_at, u.last_login,
        COUNT(ch.id) as total_lessons,
        MAX(ch.created_at) as last_activity
      FROM users u
      -- Classroom AI files history under "teacher-<id>", not the bare id.
      LEFT JOIN chat_history ch ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)
      WHERE u.role = 'teacher'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    res.json({ teachers, total: teachers.length });
  } catch (err) {
    console.error('Teachers list error:', err);
    res.status(500).json({ error: 'Failed to load teachers' });
  }
});

// GET /api/teachers/:id - Single teacher detail
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(404).json({ error: 'Teacher database not available' });
    }

    const teacher = db.prepare(
      'SELECT id, name, email, school_name, role, created_at, last_login FROM users WHERE id = ?'
    ).get(req.params.id);

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Tool usage stats
    const usage_stats = db.prepare(
      'SELECT tool_name, COUNT(*) as count FROM chat_history WHERE teacher_id = ? GROUP BY tool_name ORDER BY count DESC'
    ).all(historyId(req.params.id));

    // Recent chats
    const recent_chats = db.prepare(`
      SELECT id, tool_name, topic, grade_level, subject, response_preview, created_at
      FROM chat_history
      WHERE teacher_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(historyId(req.params.id));

    res.json({ teacher, usage_stats, recent_chats });
  } catch (err) {
    console.error('Teacher detail error:', err);
    res.status(500).json({ error: 'Failed to load teacher details' });
  }
});

// GET /api/teachers/:id/chats - Paginated chat history for a teacher
router.get('/:id/chats', (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({ chats: [], total: 0, page: 1, limit: 20 });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const tool_filter = req.query.tool_filter || null;
    const teacherId = historyId(req.params.id);

    let countQuery = 'SELECT COUNT(*) as count FROM chat_history WHERE teacher_id = ?';
    let dataQuery = `
      SELECT id, tool_name, topic, grade_level, subject, response_preview, created_at
      FROM chat_history
      WHERE teacher_id = ?
    `;
    const params = [teacherId];

    if (tool_filter) {
      countQuery += ' AND tool_name = ?';
      dataQuery += ' AND tool_name = ?';
      params.push(tool_filter);
    }

    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const total = db.prepare(countQuery).get(...params);
    const chats = db.prepare(dataQuery).all(...params, limit, offset);

    const totalCount = total?.count || 0;
    res.json({
      chats,
      total: totalCount,
      page,
      pages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (err) {
    console.error('Teacher chats error:', err);
    res.status(500).json({ error: 'Failed to load teacher chats' });
  }
});

module.exports = router;
