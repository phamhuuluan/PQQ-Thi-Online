/**
 * T-1010: Security smoke — wrong pass; cross-role denied
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, teardownTestDb, seedMinimalExam } = require('../helpers/test-db');

const EXAM = 'PQQ-SEC-TEST-001';
let dbPath;
let validatePassForRole;
let checkPermission;
let scoresService;

before(() => {
  dbPath = setupTestDb('security');
  seedMinimalExam(EXAM, 'correct-pass');
  ({ validatePassForRole, checkPermission } = require('../../local-server/lib/auth'));
  scoresService = require('../../local-server/services/scores-service');
});

after(() => {
  teardownTestDb(dbPath);
});

describe('password validation', () => {
  it('accepts correct password', () => {
    assert.equal(validatePassForRole(EXAM, 'gk', 'correct-pass'), null);
  });

  it('rejects wrong password', () => {
    const err = validatePassForRole(EXAM, 'gk', 'wrong-pass');
    assert.equal(err.error.code, 'UNAUTHORIZED');
  });

  it('rejects empty password', () => {
    const err = validatePassForRole(EXAM, 'gk', '');
    assert.equal(err.error.code, 'UNAUTHORIZED');
  });
});

describe('role permission checks', () => {
  it('judge can submitScore and getData', () => {
    assert.equal(checkPermission('gk', 'submitScore'), null);
    assert.equal(checkPermission('gk', 'getData'), null);
  });

  it('judge cannot lockSheet', () => {
    const err = checkPermission('gk', 'lockSheet');
    assert.equal(err.error.code, 'FORBIDDEN');
  });

  it('secretary can lockSheet but not approve', () => {
    assert.equal(checkPermission('secretary', 'lockSheet'), null);
    assert.equal(checkPermission('secretary', 'approve').error.code, 'FORBIDDEN');
  });

  it('cck can approve but not submitScore', () => {
    assert.equal(checkPermission('cck', 'approve'), null);
    assert.equal(checkPermission('cck', 'submitScore').error.code, 'FORBIDDEN');
  });
});

describe('cross-role API enforcement', () => {
  it('lockSheet denied without secretary role', () => {
    const result = scoresService.lockSheet({
      examId: EXAM,
      roomId: 'ROOM_A',
      boutId: 'VS-001|R1',
      studentId: 'VS-001',
      session: { role: 'gk' },
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'FORBIDDEN');
  });
});
