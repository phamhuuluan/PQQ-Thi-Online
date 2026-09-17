/**
 * Dashboard service — getData (T-606)
 * Mirrors apps-script/Dashboard.gs
 */

const { success, fail } = require('../lib/envelope');
const { checkPermission } = require('../lib/auth');
const repo = require('../repositories');

function getData(params) {
  const { examId, role, roomId } = params;

  if (!examId) {
    return fail('VALIDATION_ERROR', 'examId is required');
  }

  const permErr = checkPermission(role, 'getData');
  if (permErr) return permErr;

  if (!repo.findExamById(examId)) {
    return fail('VALIDATION_ERROR', `Exam not found: ${examId}`);
  }

  const scores = repo.findScoresByExam(examId, roomId || null);
  const students = repo.findStudentsByExam(examId).map(repo.studentRowToSheet);
  const judges = repo.findJudgesByExam(examId).map(repo.judgeRowToSheet);

  return success({
    examId,
    scores,
    students,
    judges,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getData };
