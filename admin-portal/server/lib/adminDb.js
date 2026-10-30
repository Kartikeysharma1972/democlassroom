const Database = require('better-sqlite3');
const path = require('path');

// Admin accounts live in their own file rather than inside Classroom AI's
// database, which this portal only ever reads. Nothing else is stored here.
const dbPath = path.resolve(
  __dirname,
  '..',
  process.env.ADMIN_DB_PATH || 'admin.db'
);

let db = null;

function getAdminDb() {
  if (db) return db;

  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      school      TEXT NOT NULL DEFAULT '',
      role        TEXT NOT NULL DEFAULT 'principal',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      last_login  TEXT
    )
  `);
  console.log(`Admin accounts database ready at ${dbPath}`);
  return db;
}

module.exports = { getAdminDb };
