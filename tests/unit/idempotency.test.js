/**
 * T-1002: Unit tests — idempotency key map / duplicate handling
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, teardownTestDb, seedMinimalExam, buildSubmitPayload } = require('../helpers/test-db');

const EXAM = 'PQQ-IDEM-TEST-001';
let dbPath;
let scoresService;

before(() => {
  dbPath = setupTestDb('idempotency');
  seedMinimalExam(EXAM);
  scoresService = require('../../local-server/services/scores-service');
});

after(() => {
  teardownTestDb(dbPath);
});

describe('idempotencyKey', () => {
  it('builds stable key exam|room|bout|student|judge', () => {
    const p = buildSubmitPayload(EXAM);
    assert.equal(p.idempotencyKey, 'PQQ-IDEM-TEST-001|ROOM_A|VS-001|R1|VS-001|GK-101');
  });

  it('returns duplicate=true on same idempotencyKey', () => {
    const payload = buildSubmitPayload(EXAM);
    const first = scoresService.submitScore(payload);
    assert.equal(first.ok, true);
    assert.equal(first.data.duplicate, false);

    const second = scoresService.submitScore({ ...payload, scores: { P1: 9, P2: 9, P3: 9 } });
    assert.equal(second.ok, true);
    assert.equal(second.data.duplicate, true);
    assert.equal(second.data.total, first.data.total);
  });

  it('upserts DRAFT when same bout+judge with new idempotencyKey', () => {
    const exam2 = 'PQQ-IDEM-TEST-002';
    seedMinimalExam(exam2);
    const payload = buildSubmitPayload(exam2);
    scoresService.submitScore(payload);

    const newKey = payload.idempotencyKey + '-v2';
    const updated = scoresService.submitScore({
      ...payload,
      idempotencyKey: newKey,
      scores: { P1: 10, P2: 10, P3: 10 },
    });
    assert.equal(updated.ok, true);
    assert.equal(updated.data.updated, true);
    assert.equal(updated.data.total, 30);
  });

  it('rejects resubmit when status is not DRAFT', () => {
    const exam3 = 'PQQ-IDEM-TEST-003';
    seedMinimalExam(exam3);
    const payload = buildSubmitPayload(exam3);
    scoresService.submitScore(payload);

    scoresService.lockSheet({
      examId: exam3,
      roomId: 'ROOM_A',
      boutId: payload.boutId,
      studentId: 'VS-001',
      session: { role: 'secretary' },
    });

    const retry = scoresService.submitScore({
      ...payload,
      idempotencyKey: payload.idempotencyKey + '-retry',
    });
    assert.equal(retry.ok, false);
    assert.equal(retry.error.code, 'INVALID_STATUS_TRANSITION');
  });

  it('stores one row per idempotency_key in DB', () => {
    const repo = require('../../local-server/repositories');
    const exam4 = 'PQQ-IDEM-TEST-004';
    seedMinimalExam(exam4);
    const payload = buildSubmitPayload(exam4);
    scoresService.submitScore(payload);
    scoresService.submitScore(payload);

    const row = repo.findRawScoreByIdempotencyKey(payload.idempotencyKey);
    assert.ok(row);
    assert.equal(row.status, 'DRAFT');
  });
});
