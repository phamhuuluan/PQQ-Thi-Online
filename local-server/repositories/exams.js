/**
 * Exams repository — re-export for auth module
 */
const repo = require('./index');

module.exports = {
  findById: repo.findExamById,
  getExamConfig: repo.getExamConfig,
  upsert: repo.upsertExam,
};
