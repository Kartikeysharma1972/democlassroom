const express = require('express');
const auth = require('../middleware/auth');
const { getDb } = require('../lib/sqlite');

const router = express.Router();

router.use(auth);

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCSV(headers, rows) {
  const headerLine = headers.map(h => csvEscape(h.label)).join(',');
  const dataLines = rows.map(row => headers.map(h => csvEscape(row[h.key])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function sendCSV(res, filename, headers, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCSV(headers, rows));
}

const stamp = () => new Date().toISOString().slice(0, 10);

// GET /api/export/teachers
router.get('/teachers', (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Classroom AI data not available' });

  try {
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.school_name, u.created_at, u.last_login,
             COUNT(ch.id) AS total_lessons,
             COUNT(DISTINCT ch.tool_name) AS tools_used,
             MAX(ch.created_at) AS last_activity
      FROM users u
      LEFT JOIN chat_history ch ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)
      GROUP BY u.id
      ORDER BY total_lessons DESC
    `).all();

    sendCSV(res, `teachers-${stamp()}.csv`, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'school_name', label: 'School' },
      { key: 'total_lessons', label: 'Lessons Generated' },
      { key: 'tools_used', label: 'Tools Used' },
      { key: 'last_activity', label: 'Last Activity' },
      { key: 'created_at', label: 'Joined' },
    ], rows);
  } catch (err) {
    console.error('Export teachers error:', err.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/export/activity - every saved generation
router.get('/activity', (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Classroom AI data not available' });

  try {
    const rows = db.prepare(`
      SELECT ch.created_at, u.name AS teacher_name, u.email AS teacher_email,
             ch.tool_name, ch.topic, ch.grade_level, ch.subject
      FROM chat_history ch
      LEFT JOIN users u ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)
      ORDER BY ch.created_at DESC
    `).all();

    sendCSV(res, `activity-${stamp()}.csv`, [
      { key: 'created_at', label: 'When' },
      { key: 'teacher_name', label: 'Teacher' },
      { key: 'teacher_email', label: 'Email' },
      { key: 'tool_name', label: 'Tool' },
      { key: 'topic', label: 'Topic' },
      { key: 'grade_level', label: 'Grade' },
      { key: 'subject', label: 'Subject' },
    ], rows);
  } catch (err) {
    console.error('Export activity error:', err.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/export/report - the whole picture as JSON
router.get('/report', (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Classroom AI data not available' });

  try {
    const today = new Date().toISOString().slice(0, 10);

    res.json({
      generated_at: new Date().toISOString(),
      overview: {
        total_teachers: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
        total_lessons: db.prepare('SELECT COUNT(*) AS c FROM chat_history').get().c,
        active_teachers_today: db.prepare(
          'SELECT COUNT(DISTINCT teacher_id) AS c FROM chat_history WHERE created_at >= ?'
        ).get(today).c,
      },
      tool_usage: db.prepare(
        'SELECT tool_name AS tool, COUNT(*) AS count FROM chat_history GROUP BY tool_name ORDER BY count DESC'
      ).all(),
      grade_coverage: db.prepare(`
        SELECT grade_level AS grade, COUNT(*) AS count
        FROM chat_history
        WHERE grade_level IS NOT NULL AND grade_level != ''
        GROUP BY grade_level ORDER BY count DESC
      `).all(),
      top_teachers: db.prepare(`
        SELECT u.name, u.email, COUNT(ch.id) AS lessons
        FROM users u
        LEFT JOIN chat_history ch ON ch.teacher_id = 'teacher-' || CAST(u.id AS TEXT)
        GROUP BY u.id HAVING lessons > 0
        ORDER BY lessons DESC LIMIT 10
      `).all(),
    });
  } catch (err) {
    console.error('Export report error:', err.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
