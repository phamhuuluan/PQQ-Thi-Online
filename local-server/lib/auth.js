/**
 * Auth — SHA-256 pass verification + role permission checks
 * Mirrors apps-script/Auth.gs (AUTH-01 A, AUTH-04 B)
 * T-609: server-side pass validation for Local API
 */

const crypto = require('crypto');
const { fail } = require('./envelope');
const examsRepo = require('../repositories/exams');

const PERMISSIONS = {
  // getData (read): danh sách TS/GK + kiểm tra phiếu đã gửi — bắt buộc để chấm Offline
  judge: ['submitScore', 'getData'],
  gk: ['submitScore', 'getData'],
  secretary: ['getData', 'lockSheet', 'sync/pull', 'sync/push'],
  tk: ['getData', 'lockSheet', 'sync/pull', 'sync/push'],
  cck: ['getData', 'approveScore', 'approve'],
  admin: [
    'getData', 'createExamRoom', 'importStudents', 'configureJudges',
    'rotateRolePasswords', 'generateQrLinks', 'sync/pull', 'sync/push',
  ],
};

const PUBLIC_ACTIONS = ['getScoreboard', 'getExamConfig', 'health'];

const ROLE_PASS_FIELDS = {
  judge: { hash: 'pass_judge_hash', salt: 'pass_judge_salt' },
  gk: { hash: 'pass_judge_hash', salt: 'pass_judge_salt' },
  secretary: { hash: 'pass_secretary_hash', salt: 'pass_secretary_salt' },
  tk: { hash: 'pass_secretary_hash', salt: 'pass_secretary_salt' },
  cck: { hash: 'pass_cck_hash', salt: 'pass_cck_salt' },
  admin: { hash: 'pass_admin_hash', salt: 'pass_admin_salt' },
};

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}`, 'utf8').digest('hex');
}

function verifyPassword(password, storedHash, salt) {
  return hashPassword(password, salt) === storedHash;
}

function checkPermission(role, action) {
  if (PUBLIC_ACTIONS.includes(action)) return null;

  const normalizedRole = role === 'gk' ? 'judge' : role === 'tk' ? 'secretary' : role;
  const allowed = PERMISSIONS[role] || PERMISSIONS[normalizedRole] || [];
  if (!allowed.includes(action)) {
    return fail('FORBIDDEN', `Role "${role}" cannot perform action "${action}"`);
  }
  return null;
}

function validatePassForRole(examId, role, password) {
  if (!password) {
    return fail('UNAUTHORIZED', 'Password is required');
  }

  const exam = examsRepo.findById(examId);
  if (!exam) {
    return fail('VALIDATION_ERROR', `Exam not found: ${examId}`);
  }

  const fields = ROLE_PASS_FIELDS[role];
  if (!fields) {
    return fail('VALIDATION_ERROR', `Unknown role: ${role}`);
  }

  const storedHash = exam[fields.hash];
  const salt = exam[fields.salt];
  if (!storedHash || !salt) {
    return fail('INTERNAL_ERROR', 'Pass hash not configured for this exam');
  }

  if (!verifyPassword(password, storedHash, salt)) {
    return fail('UNAUTHORIZED', 'Invalid password');
  }

  return null;
}

function requireSessionRole(req, action) {
  const session = req.body?.session || req.query?.session
    ? (typeof req.query?.session === 'string' ? JSON.parse(req.query.session) : req.query?.session)
    : null;

  const role = session?.role || req.body?.role || req.query?.role;
  if (!role && !PUBLIC_ACTIONS.includes(action)) {
    return fail('FORBIDDEN', 'Role is required in session');
  }

  return checkPermission(role, action);
}

module.exports = {
  hashPassword,
  verifyPassword,
  checkPermission,
  validatePassForRole,
  requireSessionRole,
  PUBLIC_ACTIONS,
};
