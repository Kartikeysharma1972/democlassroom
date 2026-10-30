const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Classroom AI's database, which this portal only ever reads. CLASSROOM_DB_PATH
// settles it outright; without one, try the layouts this app ships in - beside
// Classroom AI in the deployment repo, and under apps/ in the monorepo.
const candidates = (
  process.env.CLASSROOM_DB_PATH
    ? [process.env.CLASSROOM_DB_PATH]
    : ['../../backend/classroomai.db', '../../classroom-ai/backend/classroomai.db']
).map(p => path.resolve(__dirname, '..', p));

let db = null;

function getDb() {
  if (db) return db;

  const dbPath = candidates.find(p => fs.existsSync(p));
  if (!dbPath) {
    console.warn(
      'SQLite database not found - teacher data will be unavailable. Looked in:\n  ' +
      candidates.join('\n  ') +
      '\nSet CLASSROOM_DB_PATH to point at it.'
    );
    return null;
  }

  try {
    db = new Database(dbPath, { readonly: true });
    console.log(`Connected to SQLite database at ${dbPath}`);
    return db;
  } catch (err) {
    console.error('Failed to open SQLite database:', err.message);
    return null;
  }
}

module.exports = { getDb };
