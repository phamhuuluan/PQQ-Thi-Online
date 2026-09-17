/**
 * SQLite repositories — CRUD for exams, rooms, students, judges, scores (T-603)
 */

const { getDb } = require('../db/init');

// ─── Exams ───────────────────────────────────────────────────────────────────

function findExamById(examId) {
  return getDb().prepare('SELECT * FROM exams WHERE exam_id = ?').get(examId);
}

function listExams() {
  return getDb()
    .prepare('SELECT exam_id, name, exam_date, location, settings, created_at FROM exams ORDER BY exam_date DESC, exam_id')
    .all();
}

function parseExamMode(settingsRaw) {
  if (settingsRaw == null || settingsRaw === '') return 'online';
  try {
    const settings = typeof settingsRaw === 'string' ? JSON.parse(settingsRaw || '{}') : settingsRaw;
    return settings && settings.mode === 'offline' ? 'offline' : 'online';
  } catch (e) {
    return 'online';
  }
}

function upsertExam(exam) {
  const stmt = getDb().prepare(`
    INSERT INTO exams (
      exam_id, name, exam_date, location,
      pass_judge_hash, pass_judge_salt,
      pass_secretary_hash, pass_secretary_salt,
      pass_cck_hash, pass_cck_salt,
      pass_admin_hash, pass_admin_salt,
      p1_p2_p3_map, settings, created_at
    ) VALUES (
      @exam_id, @name, @exam_date, @location,
      @pass_judge_hash, @pass_judge_salt,
      @pass_secretary_hash, @pass_secretary_salt,
      @pass_cck_hash, @pass_cck_salt,
      @pass_admin_hash, @pass_admin_salt,
      @p1_p2_p3_map, @settings, @created_at
    )
    ON CONFLICT(exam_id) DO UPDATE SET
      name = excluded.name,
      exam_date = excluded.exam_date,
      location = excluded.location,
      pass_judge_hash = excluded.pass_judge_hash,
      pass_judge_salt = excluded.pass_judge_salt,
      pass_secretary_hash = excluded.pass_secretary_hash,
      pass_secretary_salt = excluded.pass_secretary_salt,
      pass_cck_hash = excluded.pass_cck_hash,
      pass_cck_salt = excluded.pass_cck_salt,
      pass_admin_hash = excluded.pass_admin_hash,
      pass_admin_salt = excluded.pass_admin_salt,
      p1_p2_p3_map = excluded.p1_p2_p3_map,
      settings = excluded.settings
  `);
  return stmt.run(exam);
}

function getExamConfig(examId) {
  const row = findExamById(examId);
  if (!row) return null;
  const mode = parseExamMode(row.settings);
  return {
    EXAM_ID: row.exam_id,
    NAME: row.name,
    EXAM_DATE: row.exam_date,
    LOCATION: row.location,
    MODE: mode,
    mode: mode,
    PASS_JUDGE_HASH: row.pass_judge_hash,
    PASS_JUDGE_SALT: row.pass_judge_salt,
    PASS_SECRETARY_HASH: row.pass_secretary_hash,
    PASS_SECRETARY_SALT: row.pass_secretary_salt,
    PASS_CCK_HASH: row.pass_cck_hash,
    PASS_CCK_SALT: row.pass_cck_salt,
    PASS_ADMIN_HASH: row.pass_admin_hash,
    PASS_ADMIN_SALT: row.pass_admin_salt,
    P1_P2_P3_MAP: row.p1_p2_p3_map,
    SETTINGS: row.settings,
  };
}

function listExamSummaries() {
  return listExams().map((row) => ({
    examId: row.exam_id,
    name: row.name,
    examDate: row.exam_date,
    location: row.location,
    mode: parseExamMode(row.settings),
    createdAt: row.created_at,
  }));
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

function findRoomsByExam(examId) {
  return getDb().prepare('SELECT * FROM rooms WHERE exam_id = ?').all(examId);
}

function upsertRoom(room) {
  return getDb().prepare(`
    INSERT INTO rooms (room_id, exam_id, room_name, location)
    VALUES (@room_id, @exam_id, @room_name, @location)
    ON CONFLICT(exam_id, room_id) DO UPDATE SET
      room_name = excluded.room_name,
      location = excluded.location
  `).run(room);
}

function deleteRoomsByExam(examId) {
  return getDb().prepare('DELETE FROM rooms WHERE exam_id = ?').run(examId);
}

// ─── Students ──────────────────────────────────────────────────────────────

function findStudentsByExam(examId) {
  return getDb().prepare('SELECT * FROM students WHERE exam_id = ? ORDER BY full_name').all(examId);
}

function upsertStudent(student) {
  return getDb().prepare(`
    INSERT INTO students (student_id, exam_id, student_code, full_name, birth_date, club_or_region, grade_level)
    VALUES (@student_id, @exam_id, @student_code, @full_name, @birth_date, @club_or_region, @grade_level)
    ON CONFLICT(exam_id, student_id) DO UPDATE SET
      student_code = excluded.student_code,
      full_name = excluded.full_name,
      birth_date = excluded.birth_date,
      club_or_region = excluded.club_or_region,
      grade_level = excluded.grade_level
  `).run(student);
}

function deleteStudentsByExam(examId) {
  return getDb().prepare('DELETE FROM students WHERE exam_id = ?').run(examId);
}

// ─── Judges ────────────────────────────────────────────────────────────────

function findJudgesByExam(examId) {
  return getDb().prepare('SELECT * FROM judges WHERE exam_id = ? ORDER BY judge_name').all(examId);
}

function upsertJudge(judge) {
  return getDb().prepare(`
    INSERT INTO judges (judge_id, exam_id, judge_name, judge_type)
    VALUES (@judge_id, @exam_id, @judge_name, @judge_type)
    ON CONFLICT(exam_id, judge_id) DO UPDATE SET
      judge_name = excluded.judge_name,
      judge_type = excluded.judge_type
  `).run(judge);
}

function deleteJudgesByExam(examId) {
  return getDb().prepare('DELETE FROM judges WHERE exam_id = ?').run(examId);
}

// ─── Scores ────────────────────────────────────────────────────────────────

function scoreRowToSheet(row) {
  if (!row) return null;
  return {
    EXAM_ID: row.exam_id,
    ROOM_ID: row.room_id,
    BOUT_ID: row.bout_id,
    STUDENT_ID: row.student_id,
    STUDENT_NAME: row.student_name,
    JUDGE_ID: row.judge_id,
    JUDGE_NAME: row.judge_name,
    P1: row.p1,
    P2: row.p2,
    P3: row.p3,
    TOTAL: row.total,
    NOTE: row.note,
    STATUS: row.status,
    IDEMPOTENCY_KEY: row.idempotency_key,
    CLIENT_REQUEST_ID: row.client_request_id,
    SUBMITTED_AT: row.submitted_at,
    APP_VERSION: row.app_version,
    LOCKED_AT: row.locked_at,
    LOCKED_BY: row.locked_by,
    APPROVED_AT: row.approved_at,
    APPROVED_BY: row.approved_by,
    PAYLOAD_HASH: row.payload_hash,
  };
}

function findScoreByIdempotencyKey(idempotencyKey) {
  const row = getDb().prepare('SELECT * FROM scores WHERE idempotency_key = ?').get(idempotencyKey);
  return scoreRowToSheet(row);
}

function findScoreByBoutAndJudge(examId, boutId, judgeId) {
  const row = getDb().prepare(
    'SELECT * FROM scores WHERE exam_id = ? AND bout_id = ? AND judge_id = ?'
  ).get(examId, boutId, judgeId);
  return row ? scoreRowToSheet(row) : null;
}

function findScoresByExam(examId, roomId) {
  let rows;
  if (roomId) {
    rows = getDb().prepare(
      'SELECT * FROM scores WHERE exam_id = ? AND room_id = ? ORDER BY submitted_at DESC'
    ).all(examId, roomId);
  } else {
    rows = getDb().prepare(
      'SELECT * FROM scores WHERE exam_id = ? ORDER BY submitted_at DESC'
    ).all(examId);
  }
  return rows.map(scoreRowToSheet);
}

function findRawScoreByIdempotencyKey(idempotencyKey) {
  return getDb().prepare('SELECT * FROM scores WHERE idempotency_key = ?').get(idempotencyKey);
}

function findRawScoresByBoutAndStudent(examId, boutId, studentId) {
  return getDb().prepare(
    'SELECT * FROM scores WHERE exam_id = ? AND bout_id = ? AND student_id = ?'
  ).all(examId, boutId, studentId);
}

function insertScore(data) {
  const stmt = getDb().prepare(`
    INSERT INTO scores (
      exam_id, room_id, bout_id, student_id, student_name,
      judge_id, judge_name, p1, p2, p3, total, note, status,
      idempotency_key, client_request_id, payload_hash,
      submitted_at, app_version
    ) VALUES (
      @exam_id, @room_id, @bout_id, @student_id, @student_name,
      @judge_id, @judge_name, @p1, @p2, @p3, @total, @note, @status,
      @idempotency_key, @client_request_id, @payload_hash,
      @submitted_at, @app_version
    )
  `);
  return stmt.run(data);
}

function updateScore(id, data) {
  const fields = Object.keys(data).map((k) => `${k} = @${k}`).join(', ');
  return getDb().prepare(`UPDATE scores SET ${fields} WHERE id = @id`).run({ ...data, id });
}

function updateScoreStatus(id, status, extra) {
  const sets = ['status = @status'];
  const params = { id, status };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      sets.push(`${k} = @${k}`);
      params[k] = v;
    }
  }
  return getDb().prepare(`UPDATE scores SET ${sets.join(', ')} WHERE id = @id`).run(params);
}

function findApprovedScores(examId, roomId) {
  let rows;
  if (roomId) {
    rows = getDb().prepare(
      "SELECT * FROM scores WHERE exam_id = ? AND room_id = ? AND status = 'OFFICIALLY_APPROVED'"
    ).all(examId, roomId);
  } else {
    rows = getDb().prepare(
      "SELECT * FROM scores WHERE exam_id = ? AND status = 'OFFICIALLY_APPROVED'"
    ).all(examId);
  }
  return rows.map(scoreRowToSheet);
}

function findUnsyncedScores(examId) {
  return getDb().prepare(
    "SELECT * FROM scores WHERE exam_id = ? AND synced_to_cloud = 0 AND status != 'NEEDS_REVIEW'"
  ).all(examId);
}

function markScoreSynced(id) {
  return getDb().prepare(
    'UPDATE scores SET synced_to_cloud = 1 WHERE id = ?'
  ).run(id);
}

function markScoreNeedsReview(id) {
  return getDb().prepare(
    "UPDATE scores SET status = 'NEEDS_REVIEW', synced_to_cloud = 0 WHERE id = ?"
  ).run(id);
}

function upsertScoreFromPull(score) {
  const existing = getDb().prepare(
    'SELECT id FROM scores WHERE idempotency_key = ?'
  ).get(score.idempotency_key);

  if (existing) {
    return updateScore(existing.id, score);
  }
  return insertScore(score);
}

// ─── Row mappers for dashboard ─────────────────────────────────────────────

function studentRowToSheet(row) {
  return {
    STUDENT_ID: row.student_id,
    EXAM_ID: row.exam_id,
    STUDENT_CODE: row.student_code,
    FULL_NAME: row.full_name,
    BIRTH_DATE: row.birth_date,
    CLUB_OR_REGION: row.club_or_region,
    GRADE_LEVEL: row.grade_level,
  };
}

function judgeRowToSheet(row) {
  return {
    JUDGE_ID: row.judge_id,
    EXAM_ID: row.exam_id,
    JUDGE_NAME: row.judge_name,
    JUDGE_TYPE: row.judge_type,
  };
}

module.exports = {
  findExamById,
  listExams,
  listExamSummaries,
  parseExamMode,
  upsertExam,
  getExamConfig,
  findRoomsByExam,
  upsertRoom,
  deleteRoomsByExam,
  findStudentsByExam,
  upsertStudent,
  deleteStudentsByExam,
  findJudgesByExam,
  upsertJudge,
  deleteJudgesByExam,
  findScoreByIdempotencyKey,
  findScoreByBoutAndJudge,
  findScoresByExam,
  findScoreByBoutAndStudent: findRawScoresByBoutAndStudent,
  findRawScoreByIdempotencyKey,
  findRawScoresByBoutAndStudent,
  insertScore,
  updateScore,
  updateScoreStatus,
  findApprovedScores,
  findUnsyncedScores,
  markScoreSynced,
  markScoreNeedsReview,
  upsertScoreFromPull,
  studentRowToSheet,
  judgeRowToSheet,
};
