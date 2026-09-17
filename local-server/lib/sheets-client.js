/**
 * Google Sheets read/write helpers for sync
 */

const { getSheetsApi } = require('./google-auth');

async function getTabRows(sheets, spreadsheetId, tabName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
  });
  const values = res.data.values || [];
  if (values.length < 2) return { headers: values[0] || [], rows: [] };

  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j] !== undefined ? values[i][j] : '';
    }
    rows.push(obj);
  }
  return { headers, rows };
}

async function appendRow(sheets, spreadsheetId, tabName, headers, rowObject) {
  const row = headers.map((h) => (rowObject[h] !== undefined && rowObject[h] !== null ? rowObject[h] : ''));
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

async function updateRow(sheets, spreadsheetId, tabName, rowIndex1Based, headers, updates) {
  const data = [];
  for (const [col, val] of Object.entries(updates)) {
    const colIdx = headers.indexOf(col);
    if (colIdx === -1) continue;
    const colLetter = columnToLetter(colIdx + 1);
    data.push({
      range: `${tabName}!${colLetter}${rowIndex1Based}`,
      values: [[val !== undefined && val !== null ? val : '']],
    });
  }
  if (!data.length) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'USER_ENTERED', data },
  });
}

function columnToLetter(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function findRowByColumn(rows, column, value) {
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][column]) === String(value)) return { index: i, row: rows[i], sheetRow: i + 2 };
  }
  return null;
}

module.exports = {
  getTabRows,
  appendRow,
  updateRow,
  findRowByColumn,
};
