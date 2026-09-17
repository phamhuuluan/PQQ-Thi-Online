/**
 * sync_log repository — T-704
 */

const { getDb } = require('../db/init');

function insertSyncLog({ idempotencyKey, direction, status, detail }) {
  return getDb().prepare(`
    INSERT INTO sync_log (idempotency_key, direction, status, detail, created_at)
    VALUES (@idempotency_key, @direction, @status, @detail, @created_at)
  `).run({
    idempotency_key: idempotencyKey || null,
    direction,
    status,
    detail: typeof detail === 'string' ? detail : JSON.stringify(detail || {}),
    created_at: new Date().toISOString(),
  });
}

function getSyncLogs(limit = 50) {
  return getDb().prepare(
    'SELECT * FROM sync_log ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
}

module.exports = { insertSyncLog, getSyncLogs };
