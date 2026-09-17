# Apps Script — Production Deploy (T-1012)

## Chuẩn bị

1. Mở project Apps Script (copy từ `apps-script/`)
2. Deploy → **New deployment** → Type: **Web app**
3. Settings (DEC-AUTH-06):
   - Execute as: **Me**
   - Who has access: **Anyone**

## Deploy steps

```text
1. clasp push   (hoặc copy/paste .gs files thủ công)
2. Deploy → Manage deployments → New version
3. Copy Web App URL: https://script.google.com/macros/s/.../exec
4. Cập nhật config.json (FE):
   "onlineApiUrl": "<URL vừa copy>"
5. Push GitHub Pages (T-1011)
```

## Verify production endpoint

```bash
# Health-like: getScoreboard (public)
curl "https://script.google.com/macros/s/DEPLOY_ID/exec?action=getScoreboard&examId=PQQ-TEST&deviceId=verify-1"

# getData (requires examId + role)
curl "https://script.google.com/macros/s/DEPLOY_ID/exec?action=getData&examId=PQQ-TEST&role=secretary"
```

Response phải là JSON envelope `{ "ok": true|false, "data": ..., "error": ... }`.

## Script Properties

Sau `createExamRoom`, set property `SHEET_<examId>` = Spreadsheet ID.

## Rollback

Apps Script → Manage deployments → chọn version trước → Deploy.

## Integration test (optional)

```bash
PQQ_SHEETS_ID=<spreadsheet_id> \
PQQ_SERVICE_ACCOUNT=./local-server/service-account.json \
  node --test tests/integration/apps-script-sheets.test.js
```
