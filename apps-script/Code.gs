/**
 * PQQ Thi Online — Apps Script Backend
 * Entry point: doPost (action router) + doGet (getData / getScoreboard)
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // T-904 + T-905: deviceId throttle + global rate limit
    var rateErr = RateLimit.check(action, payload);
    if (rateErr) return jsonResponse(rateErr);

    switch (action) {
      case 'submitScore':
        return jsonResponse(Scores.submit(payload));
      case 'lockSheet':
        return jsonResponse(Scores.lock(payload));
      case 'approve':
        return jsonResponse(Scores.approve(payload));
      case 'createExamRoom':
        return jsonResponse(ExamAdmin.createRoom(payload));
      case 'importStudents':
        return jsonResponse(ExamAdmin.importStudents(payload));
      case 'configureJudges':
        return jsonResponse(ExamAdmin.configureJudges(payload));
      case 'rotateRolePasswords':
        return jsonResponse(ExamAdmin.rotatePasswords(payload));
      case 'generateQrLinks':
        return jsonResponse(ExamAdmin.generateQrLinks(payload));
      case 'generatePdf':
        return jsonResponse(Pdf.generate(payload));
      default:
        return jsonResponse({ ok: false, error: 'Unknown action', code: 'UNKNOWN_ACTION' });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'getData';

    // T-904 + T-905: deviceId throttle + global rate limit
    var rateErr = RateLimit.check(action, e.parameter);
    if (rateErr) return jsonResponse(rateErr);

    switch (action) {
      case 'getData':
        return jsonResponse(Dashboard.getData(e.parameter));
      case 'getScoreboard':
        return jsonResponse(Scoreboard.get(e.parameter));
      case 'getExamConfig':
        return jsonResponse(getExamConfigAction_(e.parameter));
      default:
        return jsonResponse({ ok: false, error: 'Unknown action', code: 'UNKNOWN_ACTION' });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

function getExamConfigAction_(params) {
  var examId = params.examId;
  if (!examId) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'examId is required' } };
  }
  var row = getExamConfig(examId);
  if (!row) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Exam not found: ' + examId } };
  }
  var mode = 'online';
  try {
    var settings = typeof row.SETTINGS === 'string' ? JSON.parse(row.SETTINGS || '{}') : (row.SETTINGS || {});
    if (settings && settings.mode === 'offline') mode = 'offline';
  } catch (e) { /* default online */ }
  row.MODE = mode;
  row.mode = mode;
  return { ok: true, data: row };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
