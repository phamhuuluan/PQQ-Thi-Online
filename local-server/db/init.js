/**
 * SQLite initialization — apply schema.sql on start (T-602)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname);
const DB_PATH = process.env.PQQ_TEST_DB || path.join(DB_DIR, 'pqq.sqlite');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');

let db = null;

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function initDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const isNew = !fs.existsSync(DB_PATH);
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  if (isNew) {
    console.log('[DB] Created new SQLite database at', DB_PATH);
  } else {
    console.log('[DB] Opened existing SQLite database at', DB_PATH);
  }

  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDatabase, getDb, closeDatabase, DB_PATH };
