/**
 * Validation layer — mirrors apps-script/Validation.gs + Scores.gs
 */

const { fail } = require('./envelope');
const crypto = require('crypto');

function validateRequired(payload, fields) {
  const missing = [];
  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    return fail('VALIDATION_ERROR', `Missing required fields: ${missing.join(', ')}`, { missing });
  }
  return null;
}

function validateScoreRange(value, fieldName) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num) || num < 0 || num > 10) {
    return fail('VALIDATION_ERROR', `${fieldName} must be 0–10`, { field: fieldName });
  }
  if (num % 0.5 !== 0) {
    return fail('VALIDATION_ERROR', `${fieldName} must be in steps of 0.5`, { field: fieldName });
  }
  return null;
}

function validateSubmit(payload) {
  let err = validateRequired(payload, [
    'examId', 'roomId', 'boutId', 'student', 'judge', 'scores',
    'idempotencyKey', 'submittedAt',
  ]);
  if (err) return err;

  err = validateRequired(payload.student, ['studentId', 'studentName']);
  if (err) return err;

  err = validateRequired(payload.judge, ['judgeId', 'judgeName']);
  if (err) return err;

  const s = payload.scores;
  for (const f of ['P1', 'P2', 'P3']) {
    if (s[f] !== null && s[f] !== undefined) {
      const e = validateScoreRange(s[f], f);
      if (e) return e;
    }
  }

  if (s.P1 === undefined && s.P2 === undefined && s.P3 === undefined) {
    return fail('VALIDATION_ERROR', 'At least one score (P1/P2/P3) is required');
  }

  return null;
}

function calcTotal(scores) {
  const p1 = scores.P1 !== null && scores.P1 !== undefined ? Number(scores.P1) : 0;
  const p2 = scores.P2 !== null && scores.P2 !== undefined ? Number(scores.P2) : 0;
  const p3 = scores.P3 !== null && scores.P3 !== undefined ? Number(scores.P3) : 0;
  return Math.round((p1 + p2 + p3) * 10) / 10;
}

function computePayloadHash(payload) {
  const str = JSON.stringify({
    examId: payload.examId,
    boutId: payload.boutId,
    judgeId: payload.judge && payload.judge.judgeId,
    scores: payload.scores,
  });
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

const ALLOWED_TRANSITIONS = {
  DRAFT: 'PENDING_APPROVAL',
  PENDING_APPROVAL: 'OFFICIALLY_APPROVED',
};

function assertTransition(current, target) {
  if (ALLOWED_TRANSITIONS[current] !== target) {
    return fail(
      'INVALID_STATUS_TRANSITION',
      `Status transition ${current} → ${target} is not allowed`,
      { current, target, allowed: ALLOWED_TRANSITIONS[current] }
    );
  }
  return null;
}

module.exports = {
  validateRequired,
  validateScoreRange,
  validateSubmit,
  calcTotal,
  computePayloadHash,
  assertTransition,
};
