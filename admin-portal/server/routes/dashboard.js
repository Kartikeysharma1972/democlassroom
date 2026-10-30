const express = require('express');
const auth = require('../middleware/auth');
const { getDb } = require('../lib/sqlite');

const router = express.Router();

const EMPTY = {
  teachers: 0,
  lessons: 0,
  active_teachers_today: 0,
  trends: { teachers: 0, lessons: 0 },
  tool_usage: {},
  grade_coverage: [],
  recent_activity: [],
};

// GET /api/dashboard
router.get('/', auth, (req, res) => {
  const db = getDb();
  if (!db) return res.json(EMPTY);

  try {
    const today = new Date().toISOString().slice(0, 10);
    const daysAgo = (n) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    };

    const teachers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const lessons = db.prepare('SELECT COUNT(*) AS c FROM chat_history').get().c;

    const activeToday = db.prepare(
      'SELECT COUNT(DISTINCT teacher_id) AS c FROM chat_history WHERE created_at >= ?'
    ).get(today).c;

    // Week-on-week movement, so the cards can show a direction rather than a
    // bare number.
    const countSince = (table, column, from, to) =>
      db.prepare(
        `SELECT COUNT(*) AS c FROM ${table} WHERE ${column} >= ? AND ${column} < ?`
      ).get(from, to).c;

    const thisWeek = countSince('chat_history', 'created_at', daysAgo(7), daysAgo(-1));
    const lastWeek = countSince('chat_history', 'created_at', daysAgo(14), daysAgo(7));
    const newTeachers = countSince('users', 'created_at', daysAgo(7), daysAgo(-1));
    const priorTeachers = countSince('users', 'created_at', daysAgo(14), daysAgo(7));

    const pct = (now, before) => {
      if (!before) return now ? 100 : 0;
      return Math.round(((now - before) / before) * 1000) / 10;
    };

    const toolUsage = {};
    db.prepare(
      'SELECT tool_name, COUNT(*) AS c FROM chat_history GROUP BY tool_name ORDER BY c DESC'
    ).all().forEach(r => { toolUsage[r.tool_name] = r.c; });

    // Which grades the staff actually generate material for.
    const gradeCoverage = db.prepare(`
      SELECT grade_level AS grade, COUNT(*) AS count
      FROM chat_history
      WHERE grade_level IS NOT NULL AND grade_level != ''
      GROUP BY grade_level
      ORDER BY count DESC
      LIMIT 14
    `).all();

    const recentActivity = db.prepare(`
      SELECT ch.id, ch.teacher_id, ch.tool_name, ch.topic, ch.grade_level, ch.subject,
             ch.response_preview, ch.created_at, u.name AS teacher_name, u.email AS teacher_email
      FROM chat_history ch
      -- Classroom AI files history under "teacher-<id>", not the bare id.
      LEFT JOIN users u ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)
      ORDER BY ch.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      teachers,
      lessons,
      active_teachers_today: activeToday,
      trends: { teachers: pct(newTeachers, priorTeachers), lessons: pct(thisWeek, lastWeek) },
      tool_usage: toolUsage,
      grade_coverage: gradeCoverage,
      recent_activity: recentActivity,
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Could not read Classroom AI data' });
  }
});

module.exports = router;
