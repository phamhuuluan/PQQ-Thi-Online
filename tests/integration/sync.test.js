/**
 * T-1006: Sync tests — pull → score → push; duplicate key; conflict hash
 * (No Google API required — tests SQLite + sync_log + conflict rules)
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, teardownTestDb } = require('../helpers/test-db');
const { computePayloadHashFromRow, isCloudLocked } = require('../../local-server/lib/sync-utils');
const { hashPassword } = require('../../local-server/lib/auth');
const crypto = require('crypto');

const EXAM = 'PQQ-SYNC-TEST-001';
let dbPath;
let repo;
let syncLog;

function makePass() {
  const salt = crypto.randomBytes(8).toString('hex');
  return { hash: hashPassword('test', salt), salt };
}

before(() => {
  dbPath = setupTestDb('sync');
  repo = require('../../local-server/repositories');
  syncLog = require('../../local-server/repositories/sync-log');
  const p = makePass();
  repo.upsertExam({
    exam_id: EXAM,
    name: 'Sync Test',
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
  repo.upsertRoom({ room_id: 'ROOM_A', exam_id: EXAM, room_name: 'Test Room', location: '' });
});

after(() => {
  teardownTestDb(dbPath);
});

describe('sync conflict hash', () => {
  it('same payload → same hash; different scores → different hash', () => {
    const base = {
      exam_id: EXAM,
      bout_id: 'VS-001|R1',
      judge_id: 'GK-101',
      p1: 8, p2: 7, p3: 9,
    };
    const h1 = computePayloadHashFromRow(base);
    const h2 = computePayloadHashFromRow({ ...base });
    const h3 = computePayloadHashFromRow({ ...base, p1: 9 });
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
  });

  it('cloud locked statuses', () => {
    assert.equal(isCloudLocked('OFFICIALLY_APPROVED'), true);
    assert.equal(isCloudLocked('PENDING_APPROVAL'), true);
    assert.equal(isCloudLocked('DRAFT'), false);
  });
});

describe('sync push queue', () => {
  const idKey = EXAM + '|ROOM_A|VS-001|R1|VS-001|GK-101';
  const hash = computePayloadHashFromRow({
    exam_id: EXAM,
    bout_id: 'VS-001|R1',
    judge_id: 'GK-101',
    p1: 8, p2: 7, p3: 9,
  });

  it('unsynced score appears in push queue', () => {
    repo.insertScore({
      exam_id: EXAM,
      room_id: 'ROOM_A',
      bout_id: 'VS-001|R1',
      student_id: 'VS-001',
      student_name: 'Test Student',
      judge_id: 'GK-101',
      judge_name: 'GK 1',
      p1: 8, p2: 7, p3: 9,
      total: 24,
      note: '',
      status: 'OFFICIALLY_APPROVED',
      idempotency_key: idKey,
      client_request_id: '',
      payload_hash: hash,
      submitted_at: new Date().toISOString(),
      app_version: '1.0.0',
    });

    const raw = repo.findRawScoreByIdempotencyKey(idKey);
    assert.equal(raw.synced_to_cloud, 0);
    assert.equal(repo.findUnsyncedScores(EXAM).length, 1);
  });

  it('lock/approve resets synced_to_cloud (Blocker #2)', () => {
    const raw = repo.findRawScoreByIdempotencyKey(idKey);
    repo.markScoreSynced(raw.id);
    assert.equal(repo.findRawScoreByIdempotencyKey(idKey).synced_to_cloud, 1);

    repo.updateScoreStatus(raw.id, 'PENDING_APPROVAL', {
      locked_at: new Date().toISOString(),
      locked_by: 'secretary',
      synced_to_cloud: 0,
    });
    assert.equal(repo.findRawScoreByIdempotencyKey(idKey).synced_to_cloud, 0);
    assert.ok(repo.findUnsyncedScores(EXAM).some((r) => r.idempotency_key === idKey));
  });

  it('NEEDS_REVIEW excluded from push queue', () => {
    const raw = repo.findRawScoreByIdempotencyKey(idKey);
    repo.markScoreNeedsReview(raw.id);
    assert.equal(repo.findUnsyncedScores(EXAM).length, 0);
  });

  it('writes sync_log on conflict', () => {
    syncLog.insertSyncLog({
      idempotencyKey: idKey,
      direction: 'push',
      status: 'conflict_needs_review',
      detail: { reason: 'payloadHash mismatch' },
    });
    const logs = syncLog.getSyncLogs(5);
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].direction, 'push');
    assert.equal(logs[0].status, 'conflict_needs_review');
  });
});

describe('planPushForExistingRow (Blocker #2)', () => {
  const { planPushForExistingRow } = require('../../local-server/lib/sync-utils');
  const hash = computePayloadHashFromRow({
    exam_id: EXAM,
    bout_id: 'VS-001|R1',
    judge_id: 'GK-101',
    p1: 8, p2: 7, p3: 9,
  });

  it('same hash + STATUS changed → update_status', () => {
    const local = {
      status: 'OFFICIALLY_APPROVED',
      payload_hash: hash,
      locked_at: '2026-07-31T10:00:00Z',
      locked_by: 'secretary',
      approved_at: '2026-07-31T11:00:00Z',
      approved_by: 'cck',
      exam_id: EXAM,
      bout_id: 'VS-001|R1',
      judge_id: 'GK-101',
      p1: 8, p2: 7, p3: 9,
    };
    const cloud = {
      STATUS: 'DRAFT',
      PAYLOAD_HASH: hash,
      LOCKED_AT: '',
      LOCKED_BY: '',
      APPROVED_AT: '',
      APPROVED_BY: '',
      EXAM_ID: EXAM,
      BOUT_ID: 'VS-001|R1',
      JUDGE_ID: 'GK-101',
      P1: 8, P2: 7, P3: 9,
    };
    const plan = planPushForExistingRow(local, cloud);
    assert.equal(plan.action, 'update_status');
    assert.equal(plan.updates.STATUS, 'OFFICIALLY_APPROVED');
  });

  it('same hash + same meta → skip', () => {
    const local = {
      status: 'DRAFT',
      payload_hash: hash,
      locked_at: null,
      locked_by: null,
      approved_at: null,
      approved_by: null,
      exam_id: EXAM,
      bout_id: 'VS-001|R1',
      judge_id: 'GK-101',
      p1: 8, p2: 7, p3: 9,
    };
    const cloud = {
      STATUS: 'DRAFT',
      PAYLOAD_HASH: hash,
      EXAM_ID: EXAM,
      BOUT_ID: 'VS-001|R1',
      JUDGE_ID: 'GK-101',
      P1: 8, P2: 7, P3: 9,
    };
    assert.equal(planPushForExistingRow(local, cloud).action, 'skip');
  });

  it('hash mismatch → conflict', () => {
    const local = {
      status: 'DRAFT',
      payload_hash: hash,
      exam_id: EXAM,
      bout_id: 'VS-001|R1',
      judge_id: 'GK-101',
      p1: 8, p2: 7, p3: 9,
    };
    const cloud = {
      STATUS: 'DRAFT',
      PAYLOAD_HASH: 'different-hash',
      EXAM_ID: EXAM,
      BOUT_ID: 'VS-001|R1',
      JUDGE_ID: 'GK-101',
      P1: 9, P2: 7, P3: 9,
    };
    assert.equal(planPushForExistingRow(local, cloud).action, 'conflict');
  });

  it('does not downgrade cloud APPROVED to local DRAFT', () => {
    const local = {
      status: 'DRAFT',
      payload_hash: hash,
      exam_id: EXAM,
      bout_id: 'VS-001|R1',
      judge_id: 'GK-101',
      p1: 8, p2: 7, p3: 9,
    };
    const cloud = {
      STATUS: 'OFFICIALLY_APPROVED',
      PAYLOAD_HASH: hash,
      APPROVED_AT: '2026-07-31T11:00:00Z',
      APPROVED_BY: 'cck',
      EXAM_ID: EXAM,
      BOUT_ID: 'VS-001|R1',
      JUDGE_ID: 'GK-101',
      P1: 8, P2: 7, P3: 9,
    };
    const plan = planPushForExistingRow(local, cloud);
    assert.equal(plan.action, 'skip');
    assert.equal(plan.reason, 'cloud_ahead_no_downgrade');
  });
});
