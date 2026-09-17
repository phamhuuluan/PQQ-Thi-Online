-- PQQ Thi Online — SQLite Schema (Offline B)
-- Source of Truth: docs/03-DATABASE-DESIGN.md (DB-03 A)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exams (
  exam_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exam_date TEXT,
  location TEXT,
  pass_judge_hash TEXT NOT NULL,
  pass_judge_salt TEXT NOT NULL,
  pass_secretary_hash TEXT NOT NULL,
  pass_secretary_salt TEXT NOT NULL,
  pass_cck_hash TEXT NOT NULL,
  pass_cck_salt TEXT NOT NULL,
  pass_admin_hash TEXT NOT NULL,
  pass_admin_salt TEXT NOT NULL,
  p1_p2_p3_map TEXT,
  settings TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  room_name TEXT,
  location TEXT,
  PRIMARY KEY (exam_id, room_id),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
);

CREATE TABLE IF NOT EXISTS students (
  student_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  student_code TEXT,
  full_name TEXT NOT NULL,
  birth_date TEXT,
  club_or_region TEXT,
  grade_level TEXT,
  PRIMARY KEY (exam_id, student_id),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
);

CREATE TABLE IF NOT EXISTS judges (
  judge_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  judge_name TEXT NOT NULL,
  judge_type TEXT NOT NULL CHECK (judge_type IN ('theory', 'practice', 'both')),
  PRIMARY KEY (exam_id, judge_id),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  judge_id TEXT NOT NULL,
  judge_name TEXT,
  p1 REAL CHECK (p1 IS NULL OR (p1 >= 0 AND p1 <= 10)),
  p2 REAL CHECK (p2 IS NULL OR (p2 >= 0 AND p2 <= 10)),
  p3 REAL CHECK (p3 IS NULL OR (p3 >= 0 AND p3 <= 10)),
  total REAL NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'PENDING_APPROVAL', 'OFFICIALLY_APPROVED', 'NEEDS_REVIEW'
  )),
  idempotency_key TEXT NOT NULL UNIQUE,
  client_request_id TEXT,
  payload_hash TEXT,
  submitted_at TEXT NOT NULL,
  app_version TEXT,
  locked_at TEXT,
  locked_by TEXT,
  approved_at TEXT,
  approved_by TEXT,
  synced_to_cloud INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
  FOREIGN KEY (exam_id, room_id) REFERENCES rooms(exam_id, room_id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('pull', 'push')),
  status TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scores_exam_status ON scores(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_scores_synced ON scores(synced_to_cloud);
CREATE INDEX IF NOT EXISTS idx_scores_room ON scores(exam_id, room_id);
CREATE INDEX IF NOT EXISTS idx_scores_bout ON scores(exam_id, bout_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON sync_log(created_at);
