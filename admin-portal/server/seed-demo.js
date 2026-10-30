// Creates the two accounts the demo is run with, and leaves any existing ones
// alone apart from resetting these two passwords. Safe to run again.
//
//   node seed-demo.js
//
// The admin lands in this portal's admin.db. The teacher is Classroom AI's
// account, so it goes through Classroom AI's own API - which has to be running.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getAdminDb } = require('./lib/adminDb');

const ADMIN = { name: 'Demo Admin', email: 'admin@ai.com', password: 'admin123', school: 'Codevidhya', role: 'principal' };
const TEACHER = { name: 'Demo Teacher', email: 'teacher@ai.com', password: 'teacher123', school_name: 'Codevidhya' };
const CLASSROOM_AI = process.env.CLASSROOM_AI_URL || 'http://localhost:8001';

async function seedAdmin() {
  const db = getAdminDb();
  const hash = await bcrypt.hash(ADMIN.password, 10);
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(ADMIN.email);

  if (existing) {
    db.prepare('UPDATE admins SET name = ?, password = ?, school = ?, role = ? WHERE id = ?')
      .run(ADMIN.name, hash, ADMIN.school, ADMIN.role, existing.id);
    console.log(`admin  ${ADMIN.email} / ${ADMIN.password}  (password reset)`);
  } else {
    db.prepare('INSERT INTO admins (name, email, password, school, role) VALUES (?, ?, ?, ?, ?)')
      .run(ADMIN.name, ADMIN.email, hash, ADMIN.school, ADMIN.role);
    console.log(`admin  ${ADMIN.email} / ${ADMIN.password}  (created)`);
  }
}

async function seedTeacher() {
  let res;
  try {
    res = await fetch(`${CLASSROOM_AI}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEACHER),
    });
  } catch {
    console.log(`teacher  skipped - Classroom AI is not reachable at ${CLASSROOM_AI}`);
    return;
  }

  if (res.ok) {
    console.log(`teacher  ${TEACHER.email} / ${TEACHER.password}  (created)`);
    return;
  }

  // Classroom AI has no password reset, so an account that is already there
  // keeps whatever password it was given.
  const data = await res.json().catch(() => ({}));
  const why = data.detail || data.error || `HTTP ${res.status}`;
  console.log(`teacher  ${TEACHER.email}  (not created: ${why})`);
}

(async () => {
  await seedAdmin();
  await seedTeacher();
})();
