/**
 * ExamAdmin — create exam room, import students, configure judges,
 * rotate passwords, generate QR links.
 */

var ExamAdmin = (function() {

  var TEMPLATE_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('TEMPLATE_SHEET_ID') || '';
  var ROOT_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID') || '';

  /**
   * T-201: Create exam room — Drive folder + copy template Sheets.
   */
  function createRoom(payload) {
    var err = validateRequired(payload, ['examId', 'name', 'examDate', 'location']);
    if (err) return err;

    var examId = payload.examId;
    var name = payload.name;

    // Permission check
    var permErr = checkPermission(payload.role || 'admin', 'createExamRoom');
    if (permErr) return permErr;

    try {
      // Create Drive folder structure
      var rootFolder = ROOT_FOLDER_ID
        ? DriveApp.getFolderById(ROOT_FOLDER_ID)
        : DriveApp.getRootFolder();

      var examFolder = rootFolder.createFolder(examId + ' — ' + name);
      var pdfFolder = examFolder.createFolder('PDF_Phieu');
      var sigFolder = examFolder.createFolder('signatures');
      var sealFolder = examFolder.createFolder('seals');

      // Copy template spreadsheet
      var templateFile = DriveApp.getFileById(TEMPLATE_SPREADSHEET_ID);
      var newFile = templateFile.makeCopy(examId + ' — Data', examFolder);
      var ss = SpreadsheetApp.open(newFile);

      // Write exam config to EXAM_CONFIG tab
      var configSheet = ss.getSheetByName('EXAM_CONFIG');
      if (!configSheet) {
        configSheet = ss.insertSheet('EXAM_CONFIG');
        configSheet.appendRow([
          'EXAM_ID', 'NAME', 'EXAM_DATE', 'LOCATION', 'TYPE',
          'PASS_JUDGE_HASH', 'PASS_JUDGE_SALT',
          'PASS_SECRETARY_HASH', 'PASS_SECRETARY_SALT',
          'PASS_CCK_HASH', 'PASS_CCK_SALT',
          'PASS_ADMIN_HASH', 'PASS_ADMIN_SALT',
          'P1_P2_P3_MAP', 'JUDGES_COUNT', 'SETTINGS', 'CREATED_AT'
        ]);
      }

      // Generate initial passwords
      var passJudge = generatePassHash(payload.passJudge || 'gk' + examId);
      var passSecretary = generatePassHash(payload.passSecretary || 'tk' + examId);
      var passCck = generatePassHash(payload.passCck || 'cck' + examId);
      // Admin pass is system-wide, not per-exam
      var passAdmin = generatePassHash(payload.passAdmin || 'admin2026');

      var p1p2p3Map = payload.p1p2p3Map || JSON.stringify({
        P1: 'ly_thuyet_1', P2: 'ly_thuyet_2', P3: 'thuc_hanh'
      });

      // Mode: online (3 miền) | offline (LAN Local Server) — chọn lúc tạo kỳ
      var examMode = (payload.mode === 'offline') ? 'offline' : 'online';
      var settingsObj = {};
      try {
        settingsObj = typeof payload.settings === 'string'
          ? JSON.parse(payload.settings || '{}')
          : (payload.settings || {});
      } catch (e) {
        settingsObj = {};
      }
      settingsObj.mode = examMode;
      var settingsJson = JSON.stringify(settingsObj);

      configSheet.appendRow([
        examId, name, payload.examDate, payload.location, payload.type || 'standard',
        passJudge.hash, passJudge.salt,
        passSecretary.hash, passSecretary.salt,
        passCck.hash, passCck.salt,
        passAdmin.hash, passAdmin.salt,
        p1p2p3Map, payload.judgesCount || 3, settingsJson,
        new Date().toISOString()
      ]);

      // Ensure other tabs exist
      ensureTab(ss, 'STUDENTS', ['STUDENT_ID', 'EXAM_ID', 'STUDENT_CODE', 'FULL_NAME', 'BIRTH_DATE', 'CLUB_OR_REGION', 'GRADE_LEVEL']);
      ensureTab(ss, 'JUDGES', ['JUDGE_ID', 'EXAM_ID', 'JUDGE_NAME', 'JUDGE_TYPE']);
      ensureTab(ss, 'SCORES', [
        'STT', 'EXAM_ID', 'ROOM_ID', 'BOUT_ID', 'STUDENT_ID', 'STUDENT_CODE', 'STUDENT_NAME',
        'JUDGE_ID', 'JUDGE_NAME', 'P1', 'P2', 'P3', 'TOTAL', 'NOTE', 'STATUS',
        'IDEMPOTENCY_KEY', 'CLIENT_REQUEST_ID', 'SUBMITTED_AT', 'APP_VERSION',
        'LOCKED_AT', 'LOCKED_BY', 'APPROVED_AT', 'APPROVED_BY', 'PAYLOAD_HASH', 'NEEDS_REVIEW',
        'PDF_URL', 'PDF_GENERATED_AT', 'PDF_HASH'
      ]);
      ensureTab(ss, 'ROOMS', ['ROOM_ID', 'EXAM_ID', 'ROOM_NAME', 'LOCATION']);

      // Create default room
      var roomsSheet = ss.getSheetByName('ROOMS');
      roomsSheet.appendRow(['ROOM_A', examId, 'Bảng A', payload.location || '']);

      // Store spreadsheet + folder IDs for future use (T-210, T-801)
      PropertiesService.getScriptProperties().setProperty('SHEET_' + examId, newFile.getId());
      PropertiesService.getScriptProperties().setProperty('FOLDER_' + examId, examFolder.getId());

      return success({
        examId: examId,
        mode: examMode,
        spreadsheetId: newFile.getId(),
        spreadsheetUrl: newFile.getUrl(),
        folderId: examFolder.getId(),
        folderUrl: examFolder.getUrl(),
        passes: {
          judge: payload.passJudge || 'gk' + examId,
          secretary: payload.passSecretary || 'tk' + examId,
          cck: payload.passCck || 'cck' + examId
        }
      });
    } catch (e) {
      return fail('INTERNAL_ERROR', 'Failed to create exam room: ' + e.message);
    }
  }

  /**
   * T-202: Import students — bulk write to STUDENTS tab.
   */
  function importStudents(payload) {
    var err = validateRequired(payload, ['examId', 'students']);
    if (err) return err;

    var permErr = checkPermission(payload.role || 'admin', 'importStudents');
    if (permErr) return permErr;

    var examId = payload.examId;
    var students = payload.students;

    if (!Array.isArray(students) || students.length === 0) {
      return fail('VALIDATION_ERROR', 'students must be a non-empty array');
    }

    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_' + examId);
      if (!sheetId) return fail('VALIDATION_ERROR', 'Exam not found: ' + examId);

      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName('STUDENTS');
      if (!sheet) return fail('INTERNAL_ERROR', 'STUDENTS tab not found');

      var imported = 0;
      for (var i = 0; i < students.length; i++) {
        var s = students[i];
        if (!s.studentId || !s.fullName) continue;
        sheet.appendRow([
          s.studentId,
          examId,
          s.studentCode || '',
          s.fullName,
          s.birthDate || '',
          s.clubOrRegion || '',
          s.gradeLevel || ''
        ]);
        imported++;
      }

      return success({ imported: imported, total: students.length });
    } catch (e) {
      return fail('INTERNAL_ERROR', 'Import failed: ' + e.message);
    }
  }

  /**
   * T-203: Configure judges + judgeType mapping.
   */
  function configureJudges(payload) {
    var err = validateRequired(payload, ['examId', 'judges']);
    if (err) return err;

    var permErr = checkPermission(payload.role || 'admin', 'configureJudges');
    if (permErr) return permErr;

    var examId = payload.examId;
    var judges = payload.judges;

    if (!Array.isArray(judges) || judges.length === 0) {
      return fail('VALIDATION_ERROR', 'judges must be a non-empty array');
    }

    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_' + examId);
      if (!sheetId) return fail('VALIDATION_ERROR', 'Exam not found: ' + examId);

      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName('JUDGES');
      if (!sheet) return fail('INTERNAL_ERROR', 'JUDGES tab not found');

      var configured = 0;
      var validTypes = ['theory', 'practice', 'both'];

      for (var i = 0; i < judges.length; i++) {
        var j = judges[i];
        if (!j.judgeId || !j.judgeName) continue;
        var judgeType = j.judgeType || 'both';
        if (validTypes.indexOf(judgeType) === -1) {
          judgeType = 'both';
        }
        sheet.appendRow([j.judgeId, examId, j.judgeName, judgeType]);
        configured++;
      }

      return success({ configured: configured, total: judges.length });
    } catch (e) {
      return fail('INTERNAL_ERROR', 'Configure judges failed: ' + e.message);
    }
  }

  /**
   * T-204: Rotate 3 role passes (hash) for exam; Admin unchanged.
   */
  function rotatePasswords(payload) {
    var err = validateRequired(payload, ['examId', 'passJudge', 'passSecretary', 'passCck']);
    if (err) return err;

    var permErr = checkPermission(payload.role || 'admin', 'rotateRolePasswords');
    if (permErr) return permErr;

    var examId = payload.examId;

    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_' + examId);
      if (!sheetId) return fail('VALIDATION_ERROR', 'Exam not found: ' + examId);

      var ss = SpreadsheetApp.openById(sheetId);
      var configSheet = ss.getSheetByName('EXAM_CONFIG');
      if (!configSheet) return fail('INTERNAL_ERROR', 'EXAM_CONFIG tab not found');

      // Find exam row
      var data = configSheet.getDataRange().getValues();
      var headers = data[0];
      var examIdCol = headers.indexOf('EXAM_ID');
      var rowIdx = -1;
      for (var i = 1; i < data.length; i++) {
        if (data[i][examIdCol] === examId) { rowIdx = i + 1; break; }
      }
      if (rowIdx === -1) return fail('VALIDATION_ERROR', 'Exam config not found');

      // Generate new hashes
      var passJudge = generatePassHash(payload.passJudge);
      var passSecretary = generatePassHash(payload.passSecretary);
      var passCck = generatePassHash(payload.passCck);

      // Update (columns: PASS_JUDGE_HASH, PASS_JUDGE_SALT, etc.)
      var colMap = {};
      for (var c = 0; c < headers.length; c++) colMap[headers[c]] = c + 1;

      configSheet.getRange(rowIdx, colMap['PASS_JUDGE_HASH']).setValue(passJudge.hash);
      configSheet.getRange(rowIdx, colMap['PASS_JUDGE_SALT']).setValue(passJudge.salt);
      configSheet.getRange(rowIdx, colMap['PASS_SECRETARY_HASH']).setValue(passSecretary.hash);
      configSheet.getRange(rowIdx, colMap['PASS_SECRETARY_SALT']).setValue(passSecretary.salt);
      configSheet.getRange(rowIdx, colMap['PASS_CCK_HASH']).setValue(passCck.hash);
      configSheet.getRange(rowIdx, colMap['PASS_CCK_SALT']).setValue(passCck.salt);

      return success({
        examId: examId,
        rotated: ['judge', 'secretary', 'cck'],
        passes: {
          judge: payload.passJudge,
          secretary: payload.passSecretary,
          cck: payload.passCck
        }
      });
    } catch (e) {
      return fail('INTERNAL_ERROR', 'Rotate passwords failed: ' + e.message);
    }
  }

  /**
   * T-205: QR/link generation for exam room.
   */
  function generateQrLinks(payload) {
    var err = validateRequired(payload, ['examId']);
    if (err) return err;

    var permErr = checkPermission(payload.role || 'admin', 'generateQrLinks');
    if (permErr) return permErr;

    var examId = payload.examId;
    var baseUrl = payload.baseUrl || 'https://YOUR_GITHUB_PAGES_URL';

    var links = {
      gate: baseUrl + '/index.html?examId=' + encodeURIComponent(examId),
      scoreboard: baseUrl + '/scoreboard.html?examId=' + encodeURIComponent(examId),
      judgeTheory: baseUrl + '/judge-theory.html?examId=' + encodeURIComponent(examId),
      judgePractice: baseUrl + '/judge-practice.html?examId=' + encodeURIComponent(examId),
      judgeFull: baseUrl + '/judge-full.html?examId=' + encodeURIComponent(examId),
      dashboard: baseUrl + '/dashboard.html?examId=' + encodeURIComponent(examId),
      approve: baseUrl + '/approve.html?examId=' + encodeURIComponent(examId)
    };

    // QR codes can be generated via Google Charts API
    var qrBaseUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=';
    var qrLinks = {};
    for (var key in links) {
      qrLinks[key] = qrBaseUrl + encodeURIComponent(links[key]);
    }

    return success({
      examId: examId,
      links: links,
      qrLinks: qrLinks
    });
  }

  function ensureTab(ss, tabName, headers) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(headers);
    }
    return sheet;
  }

  return {
    createRoom: createRoom,
    importStudents: importStudents,
    configureJudges: configureJudges,
    rotatePasswords: rotatePasswords,
    generateQrLinks: generateQrLinks
  };
})();
