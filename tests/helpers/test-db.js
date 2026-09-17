/**
 * Isolated SQLite DB for tests — sets PQQ_TEST_DB before init.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const MODULES_TO_RESET = [
  '../../local-server/db/init',
  '../../local-server/repositories',
  '../../local-server/repositories/exams',
  '../../local-server/repositories/sync-log',
  '../../local-server/services/scores-service',
  '../../local-server/services/dashboard-service',
  '../../local-server/services/scoreboard-service',
  '../../local-server/lib/auth',
];

function clearModuleCache() {
  MODULES_TO_RESET.forEach((rel) => {
    try {
      const resolved = require.resolve(path.join(__dirname, rel));
      delete require.cache[resolved];
    } catch (e) {
      /* module may not be loaded yet */
    }
  });
}

function createTestDbPath(label) {
  return path.join(os.tmpdir(), `pqq-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.sqlite`);
}

function setupTestDb(label) {
  const dbPath = createTestDbPath(label || 'default');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  // Close any prior connection
  try {
    const { closeDatabase } = require('../../local-server/db/init');
    closeDatabase();
  } catch (e) { /* ignore */ }

  clearModuleCache();
  process.env.PQQ_TEST_DB = dbPath;

  const { initDatabase } = require('../../local-server/db/init');
  initDatabase();
  return dbPath;
}

function teardownTestDb(dbPath) {
  clearModuleCache();
  try {
    const { closeDatabase } = require('../../local-server/db/init');
    closeDatabase();
  } catch (e) { /* ignore */ }
  delete process.env.PQQ_TEST_DB;
  if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}

function seedMinimalExam(examId, password) {
  const crypto = require('crypto');
  const repo = require('../../local-server/repositories');
  const { hashPassword } = require('../../local-server/lib/auth');

  function pass(pwd) {
    const salt = crypto.randomBytes(8).toString('hex');
    return { hash: hashPassword(pwd, salt), salt };
  }

  const p = pass(password || 'demo123');
  repo.upsertExam({
    exam_id: examId,
    name: 'Test Exam',
    exam_date: '2026-07-29',
    location: 'Test',
    pass_judge_hash: p.hash,
    pass_judge_salt: p.salt,
    pass_secretary_hash: p.hash,
    pass_secretary_salt: p.salt,
    pass_cck_hash: p.hash,
    pass_cck_salt: p.salt,
    pass_admin_hash: p.hash,
    pass_admin_salt: p.salt,
    p1_p2_p3_map: '{}',
    settings: '{}',
    created_at: new Date().toISOString(),
  });

  repo.upsertRoom({
    room_id: 'ROOM_A',
    exam_id: examId,
    room_name: 'Room A',
    location: '',
  });

  repo.upsertStudent({
    student_id: 'VS-001',
    student_code: 'PQQ-001',
    full_name: 'Test Student',
    exam_id: examId,
    club_or_region: 'HCM',
    birth_date: '2010-01-01',
    grade_level: '1',
  });

  repo.upsertJudge({
    judge_id: 'GK-101',
    judge_name: 'Judge 1',
    judge_type: 'both',
    exam_id: examId,
  });
}

function buildSubmitPayload(examId, overrides) {
  const boutId = 'VS-001|R1';
  const judgeId = 'GK-101';
  const idKey = [examId, 'ROOM_A', boutId, 'VS-001', judgeId].join('|');
  return Object.assign({
    examId,
    roomId: 'ROOM_A',
    boutId,
    student: { studentId: 'VS-001', studentName: 'Test Student', studentCode: 'PQQ-001' },
    judge: { judgeId, judgeName: 'Judge 1' },
    scores: { P1: 8, P2: 7.5, P3: 9 },
    note: '',
    idempotencyKey: idKey,
    clientRequestId: 'test-req-1',
    submittedAt: new Date().toISOString(),
    appVersion: '1.0.0',
  }, overrides || {});
}

module.exports = { setupTestDb, teardownTestDb, seedMinimalExam, buildSubmitPayload, clearModuleCache };
