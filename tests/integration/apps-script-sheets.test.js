/**
 * T-1003: Integration test Apps Script ↔ Sheets (staging)
 * Skips automatically when PQQ_SHEETS_ID is not set.
 *
 * Run with credentials:
 *   PQQ_SHEETS_ID=your_sheet_id PQQ_SERVICE_ACCOUNT=./local-server/service-account.json \
 *     node --test tests/integration/apps-script-sheets.test.js
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SHEETS_ID = process.env.PQQ_SHEETS_ID;
const SA_PATH = process.env.PQQ_SERVICE_ACCOUNT ||
  path.join(__dirname, '../../local-server/service-account.json');

const skip = !SHEETS_ID || !fs.existsSync(SA_PATH);

describe('Apps Script ↔ Sheets integration', { skip: skip ? 'PQQ_SHEETS_ID or service account not configured' : false }, () => {
  let sheets;

  before(async () => {
    const { getSheetsApi } = require('../../local-server/lib/google-auth');
    sheets = await getSheetsApi({ serviceAccountKeyPath: SA_PATH });
  });

  it('reads EXAM_CONFIG tab from staging spreadsheet', async () => {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'EXAM_CONFIG!A1:Z10',
    });
    assert.ok(resp.data.values);
    assert.ok(resp.data.values.length >= 1);
    const headers = resp.data.values[0];
    assert.ok(headers.includes('EXAM_ID') || headers.includes('exam_id'));
  });

  it('reads SCORES tab headers', async () => {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'SCORES!A1:Z1',
    });
    const headers = resp.data.values[0];
    assert.ok(headers.includes('IDEMPOTENCY_KEY') || headers.includes('STATUS'));
  });
});

if (skip) {
  console.log('ℹ️  T-1003 skipped: set PQQ_SHEETS_ID + service account to run live Sheets integration');
}
