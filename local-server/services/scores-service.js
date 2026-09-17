/**
 * Scores service — submitScore, lockSheet, approve (T-605, T-607, T-608)
 * Mirrors apps-script/Scores.gs
 */

const { success, fail } = require('../lib/envelope');
const {
  validateSubmit, calcTotal, computePayloadHash, assertTransition, validateRequired,
} = require('../lib/validation');
const { checkPermission } = require('../lib/auth');
const repo = require('../repositories');

const APPROVE_RATE_LIMIT = 10;
const approveRateBuckets = new Map();

function checkApproveRateLimit() {
  const bucket = Math.floor(Date.now() / 60000);
  const count = approveRateBuckets.get(bucket) || 0;
  if (count >= APPROVE_RATE_LIMIT) {
    return fail('QUOTA_EXCEEDED', 'Approval rate limit reached (10/min), please wait');
  }
  approveRateBuckets.set(bucket, count + 1);
  // Cleanup old buckets
  for (const key of approveRateBuckets.keys()) {
    if (key < bucket - 1) approveRateBuckets.delete(key);
  }
  return null;
}

function submitScore(payload) {
  const valErr = validateSubmit(payload);
  if (valErr) return valErr;

  const examId = payload.examId;
  const idKey = payload.idempotencyKey;

  if (!repo.findExamById(examId)) {
    return fail('VALIDATION_ERROR', `Exam not found: ${examId}`);
  }

  // Idempotency check
  const existing = repo.findScoreByIdempotencyKey(idKey);
  if (existing) {
    return success({
      status: existing.STATUS,
      idempotencyKey: idKey,
      total: existing.TOTAL,
      duplicate: true,
    });
  }

  const boutId = payload.boutId;
  const judgeId = payload.judge.judgeId;

  // Check existing bout+judge record
  const existingBout = repo.findScoreByBoutAndJudge(examId, boutId, judgeId);
  if (existingBout) {
    if (existingBout.STATUS !== 'DRAFT') {
      return fail(
        'INVALID_STATUS_TRANSITION',
        `Score for this bout/judge is already ${existingBout.STATUS} and cannot be resubmitted`
      );
    }

    const total = calcTotal(payload.scores);
    const s = payload.scores;
    const rawRows = repo.findRawScoresByBoutAndStudent(examId, boutId, payload.student.studentId);
    const rawRow = rawRows.find((r) => r.judge_id === judgeId);
    if (rawRow) {
      repo.updateScore(rawRow.id, {
        p1: s.P1 !== undefined ? s.P1 : null,
        p2: s.P2 !== undefined ? s.P2 : null,
        p3: s.P3 !== undefined ? s.P3 : null,
        total,
        note: payload.note || '',
        idempotency_key: idKey,
        submitted_at: payload.submittedAt,
        app_version: payload.appVersion || '',
        payload_hash: computePayloadHash(payload),
        synced_to_cloud: 0,
      });
    }

    return success({
      status: 'DRAFT',
      idempotencyKey: idKey,
      total,
      duplicate: false,
      updated: true,
    });
  }

  // New record
  const total = calcTotal(payload.scores);
  const sc = payload.scores;
  repo.insertScore({
    exam_id: examId,
    room_id: payload.roomId,
    bout_id: boutId,
    student_id: payload.student.studentId,
    student_name: payload.student.studentName,
    judge_id: judgeId,
    judge_name: payload.judge.judgeName,
    p1: sc.P1 !== undefined ? sc.P1 : null,
    p2: sc.P2 !== undefined ? sc.P2 : null,
    p3: sc.P3 !== undefined ? sc.P3 : null,
    total,
    note: payload.note || '',
    status: 'DRAFT',
    idempotency_key: idKey,
    client_request_id: payload.clientRequestId || '',
    payload_hash: computePayloadHash(payload),
    submitted_at: payload.submittedAt,
    app_version: payload.appVersion || '',
  });

  return success({
    status: 'DRAFT',
    idempotencyKey: idKey,
    total,
    duplicate: false,
  });
}

function lockSheet(payload) {
  const err = validateRequired(payload, ['examId', 'roomId', 'boutId', 'studentId']);
  if (err) return err;

  const permErr = checkPermission(payload.session?.role, 'lockSheet');
  if (permErr) return permErr;

  const examId = payload.examId;
  const rows = repo.findRawScoresByBoutAndStudent(examId, payload.boutId, payload.studentId);
  if (!rows.length) {
    return fail('VALIDATION_ERROR', 'Score record not found');
  }

  const now = new Date().toISOString();
  const lockedBy = payload.session?.role || 'secretary';
  let lockedCount = 0;

  for (const row of rows) {
    if (row.status !== 'DRAFT') continue;
    const transErr = assertTransition(row.status, 'PENDING_APPROVAL');
    if (transErr) return transErr;
    // Blocker #2: status đổi → phải vào lại hàng đợi push
    repo.updateScoreStatus(row.id, 'PENDING_APPROVAL', {
      locked_at: now,
      locked_by: lockedBy,
      synced_to_cloud: 0,
    });
    lockedCount++;
  }

  if (lockedCount === 0) {
    return fail('INVALID_STATUS_TRANSITION', 'No DRAFT scores found to lock for this bout/student');
  }

  return success({
    status: 'PENDING_APPROVAL',
    lockedAt: now,
    lockedBy,
    lockedCount,
  });
}

function approveScore(payload) {
  const err = validateRequired(payload, ['examId', 'targets', 'approveIdempotencyKey']);
  if (err) return err;

  const permErr = checkPermission(payload.session?.role, 'approveScore');
  if (permErr) return permErr;

  const rateErr = checkApproveRateLimit();
  if (rateErr) return rateErr;

  const targets = payload.targets;
  const approved = [];
  const now = new Date().toISOString();
  const approvedBy = payload.session?.role || 'cck';

  for (const target of targets) {
    const targetKey = target.idempotencyKey;
    const rawRow = repo.findRawScoreByIdempotencyKey(targetKey);
    if (!rawRow) continue;

    const transErr = assertTransition(rawRow.status, 'OFFICIALLY_APPROVED');
    if (transErr) return transErr;

    // Blocker #2: status đổi → phải vào lại hàng đợi push
    repo.updateScoreStatus(rawRow.id, 'OFFICIALLY_APPROVED', {
      approved_at: now,
      approved_by: approvedBy,
      synced_to_cloud: 0,
    });
    approved.push(targetKey);
  }

  return success({ approved, approvedAt: now });
}

module.exports = { submitScore, lockSheet, approveScore };
