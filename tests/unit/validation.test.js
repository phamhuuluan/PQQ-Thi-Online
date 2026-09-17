/**
 * T-1001: Unit tests — validation totals / status transitions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateScoreRange,
  validateSubmit,
  calcTotal,
  assertTransition,
} = require('../../local-server/lib/validation');

describe('calcTotal', () => {
  it('sums P1+P2+P3 with null as 0', () => {
    assert.equal(calcTotal({ P1: 8, P2: 7.5, P3: 9 }), 24.5);
    assert.equal(calcTotal({ P1: 10, P2: null, P3: 5 }), 15);
    assert.equal(calcTotal({ P1: 0, P2: 0, P3: 0 }), 0);
  });

  it('rounds to 1 decimal', () => {
    assert.equal(calcTotal({ P1: 3.3, P2: 3.3, P3: 3.3 }), 9.9);
  });
});

describe('validateScoreRange', () => {
  it('accepts 0–10 step 0.5', () => {
    assert.equal(validateScoreRange(8.5, 'P1'), null);
    assert.equal(validateScoreRange(0, 'P1'), null);
    assert.equal(validateScoreRange(10, 'P1'), null);
  });

  it('rejects out of range and invalid step', () => {
    assert.equal(validateScoreRange(10.5, 'P1').error.code, 'VALIDATION_ERROR');
    assert.equal(validateScoreRange(-1, 'P1').error.code, 'VALIDATION_ERROR');
    assert.equal(validateScoreRange(8.3, 'P2').error.code, 'VALIDATION_ERROR');
  });
});

describe('validateSubmit', () => {
  const base = {
    examId: 'EXAM-1',
    roomId: 'ROOM_A',
    boutId: 'VS-001|R1',
    student: { studentId: 'VS-001', studentName: 'A' },
    judge: { judgeId: 'GK-101', judgeName: 'GK' },
    scores: { P1: 8 },
    idempotencyKey: 'key-1',
    submittedAt: new Date().toISOString(),
  };

  it('passes valid payload', () => {
    assert.equal(validateSubmit(base), null);
  });

  it('fails when required fields missing', () => {
    const err = validateSubmit({ examId: 'EXAM-1' });
    assert.equal(err.error.code, 'VALIDATION_ERROR');
  });

  it('fails when no scores provided', () => {
    const err = validateSubmit({ ...base, scores: {} });
    assert.equal(err.error.code, 'VALIDATION_ERROR');
  });
});

describe('assertTransition (T-403)', () => {
  it('allows DRAFT → PENDING_APPROVAL', () => {
    assert.equal(assertTransition('DRAFT', 'PENDING_APPROVAL'), null);
  });

  it('allows PENDING_APPROVAL → OFFICIALLY_APPROVED', () => {
    assert.equal(assertTransition('PENDING_APPROVAL', 'OFFICIALLY_APPROVED'), null);
  });

  it('rejects DRAFT → OFFICIALLY_APPROVED', () => {
    const err = assertTransition('DRAFT', 'OFFICIALLY_APPROVED');
    assert.equal(err.error.code, 'INVALID_STATUS_TRANSITION');
  });

  it('rejects OFFICIALLY_APPROVED → any', () => {
    const err = assertTransition('OFFICIALLY_APPROVED', 'DRAFT');
    assert.equal(err.error.code, 'INVALID_STATUS_TRANSITION');
  });
});
