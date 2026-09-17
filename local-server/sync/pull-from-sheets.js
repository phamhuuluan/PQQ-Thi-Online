/**
 * Pull from Google Sheets → SQLite — T-701
 */

const { success, fail } = require('../lib/envelope');
const { getSheetsApi, hasServiceAccount } = require('../lib/google-auth');
const { getTabRows } = require('../lib/sheets-client');
const { withExamLock } = require('../lib/sheets-lock');
const { computePayloadHashFromRow } = require('../lib/sync-utils');
const repo = require('../repositories');
const syncLog = require('../repositories/sync-log');

function mapExamConfig(row) {
  return {
    exam_id: row.EXAM_ID,
    name: row.NAME || '',
    exam_date: row.EXAM_DATE || '',
    location: row.LOCATION || '',
    pass_judge_hash: row.PASS_JUDGE_HASH || '',
    pass_judge_salt: row.PASS_JUDGE_SALT || '',
    pass_secretary_hash: row.PASS_SECRETARY_HASH || '',
    pass_secretary_salt: row.PASS_SECRETARY_SALT || '',
    pass_cck_hash: row.PASS_CCK_HASH || '',
    pass_cck_salt: row.PASS_CCK_SALT || '',
    pass_admin_hash: row.PASS_ADMIN_HASH || '',
    pass_admin_salt: row.PASS_ADMIN_SALT || '',
    p1_p2_p3_map: row.P1_P2_P3_MAP || '',
    settings: row.SETTINGS || '',
    created_at: row.CREATED_AT || new Date().toISOString(),
  };
}

async function pullFromSheets(examId, config) {
  if (!examId) return fail('VALIDATION_ERROR', 'examId is required');
  if (!config.sheetsId) {
    return fail(
      'VALIDATION_ERROR',
      `sheetsId missing for exam ${examId}. Add entry to config.exams[] (examId + sheetsId).`
    );
  }
  if (!hasServiceAccount(config)) {
    return fail('UNAUTHORIZED', 'Service account key not found. See local-server/README.md');
  }

  return withExamLock(examId, async () => {
    try {
      const sheets = getSheetsApi(config);
      const spreadsheetId = config.sheetsId;
      const counts = { exam: 0, rooms: 0, students: 0, judges: 0, scores: 0 };

      // EXAM_CONFIG
      const examTab = await getTabRows(sheets, spreadsheetId, 'EXAM_CONFIG');
      const examRow = examTab.rows.find((r) => r.EXAM_ID === examId);
      if (!examRow) {
        return fail('VALIDATION_ERROR', `Exam ${examId} not found in EXAM_CONFIG tab`);
      }
      repo.upsertExam(mapExamConfig(examRow));
      counts.exam = 1;

      // ROOMS
      const roomsTab = await getTabRows(sheets, spreadsheetId, 'ROOMS');
      repo.deleteRoomsByExam(examId);
      for (const r of roomsTab.rows.filter((row) => row.EXAM_ID === examId)) {
        repo.upsertRoom({
          room_id: r.ROOM_ID,
          exam_id: examId,
          room_name: r.ROOM_NAME || '',
          location: r.LOCATION || '',
        });
        counts.rooms++;
      }

      // STUDENTS
      const studentsTab = await getTabRows(sheets, spreadsheetId, 'STUDENTS');
      repo.deleteStudentsByExam(examId);
      for (const s of studentsTab.rows.filter((row) => row.EXAM_ID === examId)) {
        repo.upsertStudent({
          student_id: s.STUDENT_ID,
          exam_id: examId,
          student_code: s.STUDENT_CODE || '',
          full_name: s.FULL_NAME || '',
          birth_date: s.BIRTH_DATE || '',
          club_or_region: s.CLUB_OR_REGION || '',
          grade_level: s.GRADE_LEVEL || '',
        });
        counts.students++;
      }

      // JUDGES
      const judgesTab = await getTabRows(sheets, spreadsheetId, 'JUDGES');
      repo.deleteJudgesByExam(examId);
      for (const j of judgesTab.rows.filter((row) => row.EXAM_ID === examId)) {
        repo.upsertJudge({
          judge_id: j.JUDGE_ID,
          exam_id: examId,
          judge_name: j.JUDGE_NAME || '',
          judge_type: j.JUDGE_TYPE || 'both',
        });
        counts.judges++;
      }

      // SCORES (snapshot existing cloud scores as baseline)
      const scoresTab = await getTabRows(sheets, spreadsheetId, 'SCORES');
      for (const sc of scoresTab.rows.filter((row) => row.EXAM_ID === examId)) {
        const hash = sc.PAYLOAD_HASH || computePayloadHashFromRow(sc);
        repo.upsertScoreFromPull({
          exam_id: examId,
          room_id: sc.ROOM_ID,
          bout_id: sc.BOUT_ID,
          student_id: sc.STUDENT_ID,
          student_name: sc.STUDENT_NAME || '',
          judge_id: sc.JUDGE_ID,
          judge_name: sc.JUDGE_NAME || '',
          p1: sc.P1 !== '' ? Number(sc.P1) : null,
          p2: sc.P2 !== '' ? Number(sc.P2) : null,
          p3: sc.P3 !== '' ? Number(sc.P3) : null,
          total: Number(sc.TOTAL) || 0,
          note: sc.NOTE || '',
          status: sc.STATUS || 'DRAFT',
          idempotency_key: sc.IDEMPOTENCY_KEY,
          client_request_id: sc.CLIENT_REQUEST_ID || '',
          payload_hash: hash,
          submitted_at: sc.SUBMITTED_AT || new Date().toISOString(),
          app_version: sc.APP_VERSION || '',
          locked_at: sc.LOCKED_AT || null,
          locked_by: sc.LOCKED_BY || null,
          approved_at: sc.APPROVED_AT || null,
          approved_by: sc.APPROVED_BY || null,
        });
        const synced = repo.findRawScoreByIdempotencyKey(sc.IDEMPOTENCY_KEY);
        if (synced) repo.markScoreSynced(synced.id);
        counts.scores++;
      }

      syncLog.insertSyncLog({
        direction: 'pull',
        status: 'success',
        detail: { examId, counts },
      });

      return success({
        examId,
        direction: 'pull',
        counts,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      syncLog.insertSyncLog({
        direction: 'pull',
        status: 'error',
        detail: { examId, message: err.message },
      });
      return fail('SERVER_UNAVAILABLE', `Pull failed: ${err.message}`);
    }
  });
}

module.exports = { pullFromSheets };
