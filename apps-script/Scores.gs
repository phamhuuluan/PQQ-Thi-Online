/**
 * Scores — submitScore (upsert + idempotency), lockSheet, approve.
 * T-308: upsert + idempotencyKey
 * T-309: reject if status ≠ DRAFT
 * T-310: backend auto-calc total
 * T-311: validation payload
 * T-312: LockService for Sheets writes
 */

var Scores = (function() {

  // T-311: Validate submitScore payload
  function validateSubmit(payload) {
    var err = validateRequired(payload, [
      'examId', 'roomId', 'boutId', 'student', 'judge', 'scores',
      'idempotencyKey', 'submittedAt'
    ]);
    if (err) return err;

    var err2 = validateRequired(payload.student, ['studentId', 'studentName']);
    if (err2) return err2;

    var err3 = validateRequired(payload.judge, ['judgeId', 'judgeName']);
    if (err3) return err3;

    // Range + step validation
    var s = payload.scores;
    var fields = ['P1', 'P2', 'P3'];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (s[f] !== null && s[f] !== undefined) {
        var e = validateScoreRange(s[f], f);
        if (e) return e;
      }
    }

    // At least one score provided
    if (s.P1 === undefined && s.P2 === undefined && s.P3 === undefined) {
      return fail('VALIDATION_ERROR', 'At least one score (P1/P2/P3) is required');
    }

    return null;
  }

  // T-310: Calculate total from P1 + P2 + P3 (null scores count as 0)
  function calcTotal(scores) {
    var p1 = (scores.P1 !== null && scores.P1 !== undefined) ? Number(scores.P1) : 0;
    var p2 = (scores.P2 !== null && scores.P2 !== undefined) ? Number(scores.P2) : 0;
    var p3 = (scores.P3 !== null && scores.P3 !== undefined) ? Number(scores.P3) : 0;
    return Math.round((p1 + p2 + p3) * 10) / 10;
  }

  // T-308: submitScore upsert + idempotencyKey + T-309 + T-312 LockService
  function submit(payload) {
    var valErr = validateSubmit(payload);
    if (valErr) return valErr;

    var examId = payload.examId;
    var idKey = payload.idempotencyKey;

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
    } catch (e) {
      return fail('SERVER_UNAVAILABLE', 'Could not acquire lock, please retry');
    }

    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_' + examId);
      if (!sheetId) return fail('VALIDATION_ERROR', 'Exam not found: ' + examId);

      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName('SCORES');
      if (!sheet) return fail('INTERNAL_ERROR', 'SCORES tab not found');

      var data = sheet.getDataRange().getValues();
      var headers = data[0];

      // Column index map
      var col = {};
      for (var c = 0; c < headers.length; c++) col[headers[c]] = c;

      // T-308: Check idempotency — return existing if duplicate key
      for (var r = 1; r < data.length; r++) {
        if (String(data[r][col['IDEMPOTENCY_KEY']]) === idKey) {
          return success({
            status: data[r][col['STATUS']],
            idempotencyKey: idKey,
            total: data[r][col['TOTAL']],
            duplicate: true
          });
        }
      }

      // T-309: Check if existing record for this boutId+judgeId is not DRAFT
      var boutId = payload.boutId;
      var judgeId = payload.judge.judgeId;
      for (var r2 = 1; r2 < data.length; r2++) {
        var rowBout = String(data[r2][col['BOUT_ID']]);
        var rowJudge = String(data[r2][col['JUDGE_ID']]);
        var rowExam = String(data[r2][col['EXAM_ID']]);
        if (rowExam === examId && rowBout === boutId && rowJudge === judgeId) {
          var currentStatus = data[r2][col['STATUS']];
          if (currentStatus !== 'DRAFT') {
            return fail('INVALID_STATUS_TRANSITION',
              'Score for this bout/judge is already ' + currentStatus + ' and cannot be resubmitted');
          }
          // DRAFT exists — upsert: update in place
          var total = calcTotal(payload.scores);
          var s = payload.scores;
          var rowNum = r2 + 1;
          sheet.getRange(rowNum, col['P1'] + 1).setValue(s.P1 !== undefined ? s.P1 : '');
          sheet.getRange(rowNum, col['P2'] + 1).setValue(s.P2 !== undefined ? s.P2 : '');
          sheet.getRange(rowNum, col['P3'] + 1).setValue(s.P3 !== undefined ? s.P3 : '');
          sheet.getRange(rowNum, col['TOTAL'] + 1).setValue(total);
          sheet.getRange(rowNum, col['NOTE'] + 1).setValue(payload.note || '');
          sheet.getRange(rowNum, col['IDEMPOTENCY_KEY'] + 1).setValue(idKey);
          sheet.getRange(rowNum, col['SUBMITTED_AT'] + 1).setValue(payload.submittedAt);
          sheet.getRange(rowNum, col['APP_VERSION'] + 1).setValue(payload.appVersion || '');
          sheet.getRange(rowNum, col['PAYLOAD_HASH'] + 1).setValue(computePayloadHash_(payload));
          return success({
            status: 'DRAFT',
            idempotencyKey: idKey,
            total: total,
            duplicate: false,
            updated: true
          });
        }
      }

      // New record
      var total = calcTotal(payload.scores);
      var sc = payload.scores;
      var nextStt = data.length; // row count minus header = STT
      var newRow = new Array(headers.length).fill('');
      function setCol_(name, val) { if (col[name] !== undefined) newRow[col[name]] = val; }

      setCol_('STT', nextStt);
      setCol_('EXAM_ID', examId);
      setCol_('ROOM_ID', payload.roomId);
      setCol_('BOUT_ID', boutId);
      setCol_('STUDENT_ID', payload.student.studentId);
      setCol_('STUDENT_CODE', payload.student.studentCode || '');
      setCol_('STUDENT_NAME', payload.student.studentName);
      setCol_('JUDGE_ID', judgeId);
      setCol_('JUDGE_NAME', payload.judge.judgeName);
      setCol_('P1', sc.P1 !== undefined ? sc.P1 : '');
      setCol_('P2', sc.P2 !== undefined ? sc.P2 : '');
      setCol_('P3', sc.P3 !== undefined ? sc.P3 : '');
      setCol_('TOTAL', total);
      setCol_('NOTE', payload.note || '');
      setCol_('STATUS', 'DRAFT');
      setCol_('IDEMPOTENCY_KEY', idKey);
      setCol_('CLIENT_REQUEST_ID', payload.clientRequestId || '');
      setCol_('SUBMITTED_AT', payload.submittedAt);
      setCol_('APP_VERSION', payload.appVersion || '');
      setCol_('PAYLOAD_HASH', computePayloadHash_(payload));
      setCol_('NEEDS_REVIEW', false);

      sheet.appendRow(newRow);

      return success({
        status: 'DRAFT',
        idempotencyKey: idKey,
        total: total,
        duplicate: false
      });
    } finally {
      lock.releaseLock();
    }
  }

  // T-312: LockService used in lock/approve too
  function lock(payload) {
    var err = validateRequired(payload, ['examId', 'roomId', 'boutId', 'studentId']);
    if (err) return err;

    var permErr = checkPermission(payload.session && payload.session.role, 'lockSheet');
    if (permErr) return permErr;

    var scriptLock = LockService.getScriptLock();
    try { scriptLock.waitLock(10000); } catch (e) {
      return fail('SERVER_UNAVAILABLE', 'Could not acquire lock');
    }

    try {
      var examId = payload.examId;
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_' + examId);
      if (!sheetId) return fail('VALIDATION_ERROR', 'Exam not found');

      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName('SCORES');
      if (!sheet) return fail('INTERNAL_ERROR', 'SCORES tab not found');

      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var col = {};
      for (var c = 0; c < headers.length; c++) col[headers[c]] = c;

      // Find row
      for (var r = 1; r < data.length; r++) {
        if (String(data[r][col['EXAM_ID']]) === examId &&
            String(data[r][col['BOUT_ID']]) === payload.boutId &&
            String(data[r][col['STUDENT_ID']]) === payload.studentId) {

          var currentStatus = data[r][col['STATUS']];
          var transErr = assertTransition_(currentStatus, 'PENDING_APPROVAL');
          if (transErr) return transErr;

          var rowNum = r + 1;
          var now = new Date().toISOString();
          var lockedBy = (payload.session && payload.session.role) || 'secretary';
          sheet.getRange(rowNum, col['STATUS'] + 1).setValue('PENDING_APPROVAL');
          sheet.getRange(rowNum, col['LOCKED_AT'] + 1).setValue(now);
          sheet.getRange(rowNum, col['LOCKED_BY'] + 1).setValue(lockedBy);

          return success({
            status: 'PENDING_APPROVAL',
            lockedAt: now,
            lockedBy: lockedBy
          });
        }
      }
      return fail('VALIDATION_ERROR', 'Score record not found');
    } finally {
      scriptLock.releaseLock();
    }
  }

  function approve(payload) {
    var err = validateRequired(payload, ['examId', 'targets', 'approveIdempotencyKey']);
    if (err) return err;

    var permErr = checkPermission(payload.session && payload.session.role, 'approveScore');
    if (permErr) return permErr;

    // T-404: rate limit
    var rateErr = checkApproveRateLimit_();
    if (rateErr) return rateErr;

    var scriptLock = LockService.getScriptLock();
    try { scriptLock.waitLock(10000); } catch (e) {
      return fail('SERVER_UNAVAILABLE', 'Could not acquire lock');
    }

    try {
      var examId = payload.examId;
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_' + examId);
      if (!sheetId) return fail('VALIDATION_ERROR', 'Exam not found');

      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName('SCORES');
      if (!sheet) return fail('INTERNAL_ERROR', 'SCORES tab not found');

      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var col = {};
      for (var c = 0; c < headers.length; c++) col[headers[c]] = c;

      var targets = payload.targets;
      var approved = [];
      var now = new Date().toISOString();
      var approvedBy = (payload.session && payload.session.role) || 'cck';

      for (var t = 0; t < targets.length; t++) {
        var targetKey = targets[t].idempotencyKey;
        for (var r = 1; r < data.length; r++) {
          if (String(data[r][col['IDEMPOTENCY_KEY']]) === targetKey) {
            var currentStatus = data[r][col['STATUS']];
            var transErr2 = assertTransition_(currentStatus, 'OFFICIALLY_APPROVED');
            if (transErr2) return transErr2;
            var rowNum = r + 1;
            sheet.getRange(rowNum, col['STATUS'] + 1).setValue('OFFICIALLY_APPROVED');
            sheet.getRange(rowNum, col['APPROVED_AT'] + 1).setValue(now);
            sheet.getRange(rowNum, col['APPROVED_BY'] + 1).setValue(approvedBy);
            approved.push(targetKey);
            break;
          }
        }
      }

      return success({ approved: approved, approvedAt: now });
    } finally {
      scriptLock.releaseLock();
    }
  }

  // T-403: Enforce status transition map (used by lock + approve)
  // DRAFT → PENDING_APPROVAL → OFFICIALLY_APPROVED (only)
  // NEEDS_REVIEW is Offline-sync only, cannot be set by lock/approve here
  var ALLOWED_TRANSITIONS_ = {
    'DRAFT':              'PENDING_APPROVAL',
    'PENDING_APPROVAL':   'OFFICIALLY_APPROVED'
  };

  function assertTransition_(current, target) {
    if (ALLOWED_TRANSITIONS_[current] !== target) {
      return fail('INVALID_STATUS_TRANSITION',
        'Status transition ' + current + ' → ' + target + ' is not allowed',
        { current: current, target: target, allowed: ALLOWED_TRANSITIONS_[current] });
    }
    return null;
  }

  // T-404: Rate limit approval — max 10 approvals per 60s window (script-scoped)
  function checkApproveRateLimit_() {
    var cache = CacheService.getScriptCache();
    var key = 'approve_rate_' + Math.floor(Date.now() / 60000); // 1-min bucket
    var count = parseInt(cache.get(key) || '0', 10);
    if (count >= 10) {
      return fail('QUOTA_EXCEEDED', 'Approval rate limit reached (10/min), please wait');
    }
    cache.put(key, String(count + 1), 90);
    return null;
  }

  function computePayloadHash_(payload) {
    var str = JSON.stringify({
      examId: payload.examId,
      boutId: payload.boutId,
      judgeId: payload.judge && payload.judge.judgeId,
      scores: payload.scores
    });
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
    return raw.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  }

  return { submit: submit, lock: lock, approve: approve };
})();
