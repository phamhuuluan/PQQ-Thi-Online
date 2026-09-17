/**
 * Exam registry — multi-exam Offline host config.
 * Online/Offline is NOT decided by this file; Admin sets exam.mode in Sheets.
 * This registry only maps offline examId → sheetsId for sync pull/push.
 */

function normalizeConfig(config) {
  const cfg = config && typeof config === 'object' ? { ...config } : {};
  if (Array.isArray(cfg.exams) && cfg.exams.length > 0) {
    cfg.exams = cfg.exams
      .filter((e) => e && e.examId && e.sheetsId)
      .map((e) => ({
        examId: String(e.examId).trim(),
        sheetsId: String(e.sheetsId).trim(),
        name: e.name || '',
      }));
    return cfg;
  }

  // Legacy single-exam config → exams[]
  if (cfg.examId && cfg.sheetsId) {
    cfg.exams = [{
      examId: String(cfg.examId).trim(),
      sheetsId: String(cfg.sheetsId).trim(),
      name: cfg.name || '',
    }];
  } else {
    cfg.exams = [];
  }
  return cfg;
}

function listRegistryExams(config) {
  return normalizeConfig(config).exams || [];
}

function findExamEntry(config, examId) {
  if (!examId) return null;
  return listRegistryExams(config).find((e) => e.examId === examId) || null;
}

function resolveSheetsId(config, examId) {
  const entry = findExamEntry(config, examId);
  if (entry && entry.sheetsId) return entry.sheetsId;
  return null;
}

function withExamSheetsConfig(config, examId) {
  const sheetsId = resolveSheetsId(config, examId);
  return Object.assign({}, config, { sheetsId: sheetsId || null, examId });
}

module.exports = {
  normalizeConfig,
  listRegistryExams,
  findExamEntry,
  resolveSheetsId,
  withExamSheetsConfig,
};
