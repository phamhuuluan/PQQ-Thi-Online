/**
 * Pdf — Google Docs template → PDF → Drive (T-801–T-804)
 * DEC-PDF-01 A: image signature + seal only (no crypto)
 * Drive path: {examFolder}/PDF_Phieu/{roomId}/{studentId}/{boutId}.pdf
 */

var Pdf = (function() {

  var props = PropertiesService.getScriptProperties();

  function generate(payload) {
    var err = validateRequired(payload, ['examId']);
    if (err) return err;

    var role = (payload.session && payload.session.role) || payload.role || 'secretary';
    var permErr = checkPermission(role, 'generatePdf');
    if (permErr) return permErr;

    var examId = payload.examId;
    var targets = payload.targets;

    if (targets && Array.isArray(targets) && targets.length > 0) {
      return generateBatch_(examId, targets);
    }

    if (!payload.idempotencyKey && !(payload.boutId && payload.studentId)) {
      return fail('VALIDATION_ERROR', 'idempotencyKey or boutId+studentId is required');
    }

    var scoreRow = findScoreRow_(examId, payload);
    if (!scoreRow) return fail('VALIDATION_ERROR', 'Score record not found');
    if (scoreRow.STATUS !== 'OFFICIALLY_APPROVED') {
      return fail('INVALID_STATUS_TRANSITION', 'PDF only for OFFICIALLY_APPROVED scores');
    }

    return generateOne_(examId, scoreRow);
  }

  function generateBatch_(examId, targets) {
    var generated = [];
    var errors = [];

    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var scoreRow = findScoreRow_(examId, t);
      if (!scoreRow) {
        errors.push({ target: t, error: 'Not found' });
        continue;
      }
      if (scoreRow.STATUS !== 'OFFICIALLY_APPROVED') {
        errors.push({ target: t, error: 'Not approved' });
        continue;
      }
      var result = generateOne_(examId, scoreRow);
      if (result.ok) {
        generated.push(result.data);
      } else {
        errors.push({ target: t, error: result.error });
      }
    }

    return success({ generated: generated, errors: errors, count: generated.length });
  }

  function generateOne_(examId, scoreRow) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);
    } catch (e) {
      return fail('SERVER_UNAVAILABLE', 'Could not acquire lock for PDF generation');
    }

    try {
      var templateDocId = props.getProperty('PDF_TEMPLATE_DOC_ID');
      if (!templateDocId) {
        return fail('INTERNAL_ERROR', 'PDF_TEMPLATE_DOC_ID not configured in Script Properties');
      }

      var folderId = props.getProperty('FOLDER_' + examId);
      if (!folderId) {
        return fail('VALIDATION_ERROR', 'Exam Drive folder not found. Re-create exam room or set FOLDER_' + examId);
      }

      var examFolder = DriveApp.getFolderById(folderId);
      var examConfig = getExamConfig(examId) || {};

      // T-802: Load signature + seal images from Drive
      var sigBlob = getFirstImageBlob_(examFolder, 'signatures');
      var sealBlob = getFirstImageBlob_(examFolder, 'seals');

      // T-801: Copy template Doc → fill placeholders → export PDF
      var tempName = 'TEMP_PDF_' + scoreRow.BOUT_ID + '_' + Date.now();
      var docCopy = DriveApp.getFileById(templateDocId).makeCopy(tempName, examFolder);
      var doc = DocumentApp.openById(docCopy.getId());
      var body = doc.getBody();

      fillPlaceholders_(body, scoreRow, examConfig);
      insertImageAtMarker_(body, '{{SIGNATURE_IMG}}', sigBlob, 120, 40);
      insertImageAtMarker_(body, '{{SEAL_IMG}}', sealBlob, 80, 80);

      doc.saveAndClose();

      var pdfBlob = docCopy.getAs(MimeType.PDF);
      docCopy.setTrashed(true);

      // T-803: Upload to Drive path PDF_Phieu/{roomId}/{studentId}/
      var pdfFolder = getOrCreatePdfPath_(examFolder, scoreRow.ROOM_ID, scoreRow.STUDENT_ID);
      var fileName = scoreRow.BOUT_ID.replace(/\|/g, '_') + '_' + scoreRow.STUDENT_ID + '.pdf';
      var existing = pdfFolder.getFilesByName(fileName);
      if (existing.hasNext()) {
        existing.next().setTrashed(true);
      }
      var pdfFile = pdfFolder.createFile(pdfBlob.setName(fileName));

      // T-804: Update Sheets PDF columns
      var pdfHash = computeBlobHash_(pdfBlob);
      var pdfUrl = pdfFile.getUrl();
      var generatedAt = new Date().toISOString();
      updateScorePdfFields_(examId, scoreRow.IDEMPOTENCY_KEY, pdfUrl, generatedAt, pdfHash);

      return success({
        examId: examId,
        boutId: scoreRow.BOUT_ID,
        studentId: scoreRow.STUDENT_ID,
        pdfUrl: pdfUrl,
        pdfFileId: pdfFile.getId(),
        pdfGeneratedAt: generatedAt,
        pdfHash: pdfHash,
        fileName: fileName,
      });
    } catch (e) {
      return fail('INTERNAL_ERROR', 'PDF generation failed: ' + e.message);
    } finally {
      lock.releaseLock();
    }
  }

  function findScoreRow_(examId, payload) {
    var scores = getAllRows(examId, 'SCORES');
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      if (s.EXAM_ID !== examId) continue;
      if (payload.idempotencyKey && s.IDEMPOTENCY_KEY === payload.idempotencyKey) return s;
      if (payload.boutId && payload.studentId &&
          s.BOUT_ID === payload.boutId && s.STUDENT_ID === payload.studentId) return s;
    }
    return null;
  }

  function fillPlaceholders_(body, score, examConfig) {
    var map = {
      '{{EXAM_ID}}': score.EXAM_ID || '',
      '{{EXAM_NAME}}': examConfig.NAME || score.EXAM_ID || '',
      '{{EXAM_DATE}}': examConfig.EXAM_DATE || '',
      '{{LOCATION}}': examConfig.LOCATION || '',
      '{{ROOM_ID}}': score.ROOM_ID || '',
      '{{BOUT_ID}}': score.BOUT_ID || '',
      '{{STUDENT_ID}}': score.STUDENT_ID || '',
      '{{STUDENT_CODE}}': score.STUDENT_CODE || '',
      '{{STUDENT_NAME}}': score.STUDENT_NAME || '',
      '{{JUDGE_NAME}}': score.JUDGE_NAME || '',
      '{{P1}}': String(score.P1 !== '' ? score.P1 : '-'),
      '{{P2}}': String(score.P2 !== '' ? score.P2 : '-'),
      '{{P3}}': String(score.P3 !== '' ? score.P3 : '-'),
      '{{TOTAL}}': String(score.TOTAL !== '' ? score.TOTAL : '-'),
      '{{NOTE}}': score.NOTE || '',
      '{{STATUS}}': score.STATUS || '',
      '{{APPROVED_AT}}': score.APPROVED_AT || '',
      '{{APPROVED_BY}}': score.APPROVED_BY || '',
      '{{GENERATED_AT}}': new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    };

    for (var key in map) {
      body.replaceText(key, map[key]);
    }
  }

  /** T-802: Insert image at placeholder marker (image only — DEC-PDF-01 A) */
  function insertImageAtMarker_(body, marker, blob, width, height) {
    var found = body.findText(marker);
    if (!found) return;

    var el = found.getElement();
    var parent = el.getParent();
    if (parent.getType() !== DocumentApp.ElementType.PARAGRAPH) return;

    var para = parent.asParagraph();
    para.clear();
    el.asText().setText('');

    if (blob) {
      var img = para.appendInlineImage(blob);
      img.setWidth(width);
      img.setHeight(height);
    } else {
      para.appendText('[' + marker.replace(/[{}]/g, '') + ' — chưa có ảnh]');
    }
  }

  function getFirstImageBlob_(examFolder, subfolderName) {
    var folders = examFolder.getFoldersByName(subfolderName);
    if (!folders.hasNext()) return null;
    var folder = folders.next();
    var types = [MimeType.PNG, MimeType.JPEG, MimeType.GIF];
    for (var t = 0; t < types.length; t++) {
      var files = folder.getFilesByType(types[t]);
      if (files.hasNext()) return files.next().getBlob();
    }
    return null;
  }

  function getOrCreatePdfPath_(examFolder, roomId, studentId) {
    var pdfRoot = getOrCreateSubfolder_(examFolder, 'PDF_Phieu');
    var roomFolder = getOrCreateSubfolder_(pdfRoot, roomId || 'ROOM_A');
    return getOrCreateSubfolder_(roomFolder, studentId);
  }

  function getOrCreateSubfolder_(parent, name) {
    var folders = parent.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    return parent.createFolder(name);
  }

  function updateScorePdfFields_(examId, idempotencyKey, pdfUrl, generatedAt, pdfHash) {
    var sheetId = props.getProperty('SHEET_' + examId);
    if (!sheetId) return;
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('SCORES');
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var col = {};
    for (var c = 0; c < headers.length; c++) col[headers[c]] = c;

    ensurePdfColumns_(sheet, headers, col);

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][col['IDEMPOTENCY_KEY']]) === idempotencyKey) {
        var rowNum = r + 1;
        if (col['PDF_URL'] !== undefined) sheet.getRange(rowNum, col['PDF_URL'] + 1).setValue(pdfUrl);
        if (col['PDF_GENERATED_AT'] !== undefined) sheet.getRange(rowNum, col['PDF_GENERATED_AT'] + 1).setValue(generatedAt);
        if (col['PDF_HASH'] !== undefined) sheet.getRange(rowNum, col['PDF_HASH'] + 1).setValue(pdfHash);
        break;
      }
    }
  }

  function ensurePdfColumns_(sheet, headers, col) {
    var needed = ['PDF_URL', 'PDF_GENERATED_AT', 'PDF_HASH'];
    var missing = needed.filter(function(h) { return col[h] === undefined; });
    if (!missing.length) return;

    var lastCol = headers.length;
    for (var i = 0; i < missing.length; i++) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(missing[i]);
      col[missing[i]] = lastCol - 1;
    }
  }

  function computeBlobHash_(blob) {
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, blob.getBytes());
    return raw.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  }

  return { generate: generate };
})();
