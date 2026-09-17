/**
 * Sync utilities — payload hash + row mappers
 */

const crypto = require('crypto');

function computePayloadHashFromRow(row) {
  const str = JSON.stringify({
    examId: row.exam_id || row.EXAM_ID,
    boutId: row.bout_id || row.BOUT_ID,
    judgeId: row.judge_id || row.JUDGE_ID,
    scores: {
      P1: row.p1 ?? row.P1 ?? null,
      P2: row.p2 ?? row.P2 ?? null,
      P3: row.p3 ?? row.P3 ?? null,
    },
  });
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function scoreRowToSheet(score, stt) {
  return {
    STT: stt,
    EXAM_ID: score.exam_id,
    ROOM_ID: score.room_id,
    BOUT_ID: score.bout_id,
    STUDENT_ID: score.student_id,
    STUDENT_CODE: score.student_code || '',
    STUDENT_NAME: score.student_name || '',
    JUDGE_ID: score.judge_id,
    JUDGE_NAME: score.judge_name || '',
    P1: score.p1 !== null && score.p1 !== undefined ? score.p1 : '',
    P2: score.p2 !== null && score.p2 !== undefined ? score.p2 : '',
    P3: score.p3 !== null && score.p3 !== undefined ? score.p3 : '',
    TOTAL: score.total,
    NOTE: score.note || '',
    STATUS: score.status,
    IDEMPOTENCY_KEY: score.idempotency_key,
    CLIENT_REQUEST_ID: score.client_request_id || '',
    SUBMITTED_AT: score.submitted_at,
    APP_VERSION: score.app_version || '',
    LOCKED_AT: score.locked_at || '',
    LOCKED_BY: score.locked_by || '',
    APPROVED_AT: score.approved_at || '',
    APPROVED_BY: score.approved_by || '',
    PAYLOAD_HASH: score.payload_hash || computePayloadHashFromRow(score),
    NEEDS_REVIEW: score.status === 'NEEDS_REVIEW',
  };
}

const LOCKED_STATUSES = ['PENDING_APPROVAL', 'OFFICIALLY_APPROVED'];

function isCloudLocked(status) {
  return LOCKED_STATUSES.includes(status);
}

/** DRAFT < PENDING_APPROVAL < OFFICIALLY_APPROVED — dùng để không downgrade cloud. */
function statusRank(status) {
  const s = status || 'DRAFT';
  if (s === 'OFFICIALLY_APPROVED') return 3;
  if (s === 'PENDING_APPROVAL') return 2;
  if (s === 'NEEDS_REVIEW') return 0;
  return 1; // DRAFT
}

/**
 * Quyết định khi đã có dòng cloud cùng IDEMPOTENCY_KEY.
 * Offline MVP: điểm (payload hash) conflict → NEEDS_REVIEW;
 * hash giống nhưng STATUS/metadata khác → update_status (không bỏ khóa/duyệt).
 *
 * @returns {{ action: 'skip'|'update_status'|'conflict', reason?: string, updates?: object }}
 */
function planPushForExistingRow(local, cloud) {
  const localHash = local.payload_hash || computePayloadHashFromRow(local);
  const cloudHash = cloud.PAYLOAD_HASH || computePayloadHashFromRow(cloud);
  const cloudStatus = cloud.STATUS || 'DRAFT';
  const localStatus = local.status || 'DRAFT';

  if (cloudHash !== localHash) {
    return {
      action: 'conflict',
      reason: isCloudLocked(cloudStatus)
        ? 'Cloud record locked/approved with different payload'
        : 'payloadHash mismatch',
    };
  }

  const updates = {
    STATUS: localStatus,
    LOCKED_AT: local.locked_at || '',
    LOCKED_BY: local.locked_by || '',
    APPROVED_AT: local.approved_at || '',
    APPROVED_BY: local.approved_by || '',
    NEEDS_REVIEW: localStatus === 'NEEDS_REVIEW' ? true : false,
  };

  const cloudMeta = {
    STATUS: cloudStatus,
    LOCKED_AT: cloud.LOCKED_AT || '',
    LOCKED_BY: cloud.LOCKED_BY || '',
    APPROVED_AT: cloud.APPROVED_AT || '',
    APPROVED_BY: cloud.APPROVED_BY || '',
    NEEDS_REVIEW: cloud.NEEDS_REVIEW === true || cloud.NEEDS_REVIEW === 'TRUE' || cloud.NEEDS_REVIEW === 'true',
  };

  const metaSame =
    String(cloudMeta.STATUS) === String(updates.STATUS) &&
    String(cloudMeta.LOCKED_AT) === String(updates.LOCKED_AT) &&
    String(cloudMeta.LOCKED_BY) === String(updates.LOCKED_BY) &&
    String(cloudMeta.APPROVED_AT) === String(updates.APPROVED_AT) &&
    String(cloudMeta.APPROVED_BY) === String(updates.APPROVED_BY);

  if (metaSame) {
    return { action: 'skip', reason: 'already_in_sync' };
  }

  if (statusRank(cloudStatus) > statusRank(localStatus)) {
    return { action: 'skip', reason: 'cloud_ahead_no_downgrade' };
  }

  return { action: 'update_status', updates, reason: 'status_or_meta_changed' };
}

module.exports = {
  computePayloadHashFromRow,
  scoreRowToSheet,
  isCloudLocked,
  LOCKED_STATUSES,
  statusRank,
  planPushForExistingRow,
};
