/**
 * Seed demo data for Local Server testing.
 * Usage: node scripts/seed-demo.js
 */

const path = require('path');
const crypto = require('crypto');

const { initDatabase } = require('../local-server/db/init');
const repo = require('../local-server/repositories');
const { hashPassword } = require('../local-server/lib/auth');

const EXAM_ID = 'PQQ-DEMO-2026-001';
const DEMO_PASSWORD = 'demo123';

function makePassHash(password) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = hashPassword(password, salt);
  return { hash, salt };
}

initDatabase();

const judgePass = makePassHash(DEMO_PASSWORD);
const secretaryPass = makePassHash(DEMO_PASSWORD);
const cckPass = makePassHash(DEMO_PASSWORD);
const adminPass = makePassHash(DEMO_PASSWORD);

repo.upsertExam({
  exam_id: EXAM_ID,
  name: 'Kỳ thi Demo Offline',
  exam_date: '2026-07-29',
  location: 'HCM',
  pass_judge_hash: judgePass.hash,
  pass_judge_salt: judgePass.salt,
  pass_secretary_hash: secretaryPass.hash,
  pass_secretary_salt: secretaryPass.salt,
  pass_cck_hash: cckPass.hash,
  pass_cck_salt: cckPass.salt,
  pass_admin_hash: adminPass.hash,
  pass_admin_salt: adminPass.salt,
  p1_p2_p3_map: JSON.stringify({ P1: 'Lý thuyết', P2: 'Thực hành', P3: 'Tổng hợp' }),
  settings: JSON.stringify({ mode: 'offline' }),
  created_at: new Date().toISOString(),
});

repo.upsertRoom({
  room_id: 'ROOM_A',
  exam_id: EXAM_ID,
  room_name: 'Bảng A',
  location: 'Sân chính',
});

const students = [
  { student_id: 'VS-000001', student_code: 'PQQ-001', full_name: 'NGUYEN VAN A', club_or_region: 'HCM' },
  { student_id: 'VS-000002', student_code: 'PQQ-002', full_name: 'TRAN VAN B', club_or_region: 'HN' },
  { student_id: 'VS-000003', student_code: 'PQQ-003', full_name: 'LE THI C', club_or_region: 'DN' },
];

students.forEach((s) => {
  repo.upsertStudent({
    ...s,
    exam_id: EXAM_ID,
    birth_date: '2010-01-01',
    grade_level: '1',
  });
});

const judges = [
  { judge_id: 'GK-101', judge_name: 'Nguyễn Văn A', judge_type: 'theory' },
  { judge_id: 'GK-102', judge_name: 'Trần Văn B', judge_type: 'theory' },
  { judge_id: 'GK-103', judge_name: 'Lê Văn C', judge_type: 'practice' },
  { judge_id: 'GK-104', judge_name: 'Phạm Văn D', judge_type: 'practice' },
  { judge_id: 'GK-105', judge_name: 'Hoàng Thị E', judge_type: 'both' },
];

judges.forEach((j) => {
  repo.upsertJudge({ ...j, exam_id: EXAM_ID });
});

console.log('✅ Demo data seeded successfully');
console.log('   Exam ID:', EXAM_ID);
console.log('   Password (all roles):', DEMO_PASSWORD);
console.log('   Students:', students.length);
console.log('   Judges:', judges.length);
console.log('');
console.log('Run: cd local-server && npm start');
console.log('Open: http://localhost:3000');
