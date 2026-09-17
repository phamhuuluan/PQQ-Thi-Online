/**
 * Sync service — orchestrates pull/push + sync log.
 * Local Server only hosts Offline exams Admin already created; sync resolves sheetsId per examId.
 */

const { success, fail } = require('../lib/envelope');
const { checkPermission } = require('../lib/auth');
const { validateRequired } = require('../lib/validation');
const { pullFromSheets } = require('../sync/pull-from-sheets');
const { pushToSheets } = require('../sync/push-to-sheets');
const { withExamSheetsConfig, findExamEntry } = require('../lib/exam-registry');
const syncLog = require('../repositories/sync-log');

async function pull(payload, config) {
  const err = validateRequired(payload, ['examId']);
  if (err) return err;

  const permErr = checkPermission(payload.session?.role || payload.role, 'sync/pull');
  if (permErr) return permErr;

  if (!findExamEntry(config, payload.examId)) {
    return fail(
      'VALIDATION_ERROR',
      `Exam ${payload.examId} chưa có trong config.exams[]. Thêm { examId, sheetsId } rồi pull.`
    );
  }

  return pullFromSheets(payload.examId, withExamSheetsConfig(config, payload.examId));
}

async function push(payload, config) {
  const err = validateRequired(payload, ['examId']);
  if (err) return err;

  const permErr = checkPermission(payload.session?.role || payload.role, 'sync/push');
  if (permErr) return permErr;

  if (!findExamEntry(config, payload.examId)) {
    return fail(
      'VALIDATION_ERROR',
      `Exam ${payload.examId} chưa có trong config.exams[]. Thêm { examId, sheetsId } rồi push.`
    );
  }

  return pushToSheets(payload.examId, withExamSheetsConfig(config, payload.examId));
}

function getLog(params) {
  const limit = Math.min(parseInt(params.limit, 10) || 50, 200);
  const logs = syncLog.getSyncLogs(limit).map((row) => ({
    id: row.id,
    idempotencyKey: row.idempotency_key,
    direction: row.direction,
    status: row.status,
    detail: row.detail,
    createdAt: row.created_at,
  }));
  return success({ logs, count: logs.length });
}

module.exports = { pull, push, getLog };
