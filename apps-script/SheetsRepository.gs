/**
 * SheetsRepository — Read/Write operations on Google Sheets tabs.
 */

var SHEET_CACHE = {};

/**
 * Get active spreadsheet (template copy for the exam).
 * In production, examId maps to a specific spreadsheet.
 */
function getSpreadsheet(examId) {
  var props = PropertiesService.getScriptProperties();
  var sheetId = examId ? props.getProperty('SHEET_' + examId) : null;
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Get a sheet tab by name.
 */
function getSheet(examId, tabName) {
  var key = examId + '|' + tabName;
  if (SHEET_CACHE[key]) return SHEET_CACHE[key];
  var ss = getSpreadsheet(examId);
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return null;
  SHEET_CACHE[key] = sheet;
  return sheet;
}

/**
 * Get all data from a tab as array of objects (header row = keys).
 */
function getAllRows(examId, tabName) {
  var sheet = getSheet(examId, tabName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Find row index by column value. Returns 1-based row number or -1.
 */
function findRowByColumn(examId, tabName, columnName, value) {
  var sheet = getSheet(examId, tabName);
  if (!sheet) return -1;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;

  var headers = data[0];
  var colIdx = headers.indexOf(columnName);
  if (colIdx === -1) return -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(value)) {
      return i + 1; // 1-based sheet row
    }
  }
  return -1;
}

/**
 * Append a row to a tab.
 */
function appendRow(examId, tabName, rowObject) {
  var sheet = getSheet(examId, tabName);
  if (!sheet) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return rowObject[h] || ''; });
  sheet.appendRow(row);
  return true;
}

/**
 * Update a specific cell value.
 */
function updateCell(examId, tabName, rowNum, columnName, value) {
  var sheet = getSheet(examId, tabName);
  if (!sheet) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIdx = headers.indexOf(columnName);
  if (colIdx === -1) return false;
  sheet.getRange(rowNum, colIdx + 1).setValue(value);
  return true;
}

/**
 * Update multiple cells in a row.
 */
function updateRow(examId, tabName, rowNum, updates) {
  var sheet = getSheet(examId, tabName);
  if (!sheet) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var col in updates) {
    var colIdx = headers.indexOf(col);
    if (colIdx !== -1) {
      sheet.getRange(rowNum, colIdx + 1).setValue(updates[col]);
    }
  }
  return true;
}

/**
 * Get exam config from EXAM_CONFIG tab.
 */
function getExamConfig(examId) {
  var rows = getAllRows(examId, 'EXAM_CONFIG');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].EXAM_ID === examId) return rows[i];
  }
  return null;
}
