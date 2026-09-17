# PQQ Local Server — Offline exam-day host

Backend Express + SQLite phục vụ **ngày thi Offline** trên LAN.

> **Không phải Offline Mode của toàn hệ thống.**  
> Online/Offline là thuộc tính kỳ thi (`exam.mode`) do **Admin** chọn lúc tạo kỳ trên hệ thống quản trị.  
> Local Server chỉ là thành phần Thư ký host để GK/CCK chấm realtime khi kỳ đó là Offline.

## Nghiệp vụ đúng

```text
Admin (Apps Script) tạo kỳ → chọn Online | Offline → lưu exam.mode
                                    │
                    mode=offline ───┘
                                    ▼
Thư ký thêm exam vào config.exams[] → sync pull → npm start (ngày thi)
                                    ▼
GK / CCK mở LAN URL → chọn đúng kỳ → chấm realtime trên Local Server
                                    ▼
Sau thi: sync push → Google Sheets
```

- **Admin** là nơi duy nhất tạo / cấu hình kỳ thi.
- **Thư ký không tạo kỳ** — chỉ host Local Server + pull/push.
- Một Local Server có thể đăng ký **nhiều kỳ Offline** trong `config.exams[]`.

## Yêu cầu

- Node.js >= 18
- Laptop Thư ký có IP tĩnh hoặc mDNS `pqq.local`
- Google Cloud Service Account (sync pull/push — DEC-OFF-02 A)
- Kỳ Offline đã được Admin tạo sẵn trên Cloud (có `spreadsheetId`)

## Cài đặt

```bash
cd local-server
npm install
cp config.example.json config.json
cp service-account.example.json service-account.json
# Sửa config.json → exams[]: từng kỳ offline (examId + sheetsId)
# Sửa service-account.json: credentials thật từ GCP
```

### Config multi-exam (bắt buộc)

```json
{
  "port": 3000,
  "hostname": "pqq.local",
  "serviceAccountKeyPath": "./service-account.json",
  "exams": [
    {
      "examId": "PQQ-HCM-2026-008",
      "sheetsId": "SPREADSHEET_ID_FROM_ADMIN_CREATE",
      "name": "Kỳ thi Offline HCM"
    },
    {
      "examId": "PQQ-DN-2026-002",
      "sheetsId": "ANOTHER_SPREADSHEET_ID",
      "name": "Kỳ thi Offline Đà Nẵng"
    }
  ]
}
```

> **Không** hard-code một `examId` / `sheetsId` toàn cục làm “mode hệ thống”.  
> Legacy `{ "examId", "sheetsId" }` vẫn được đọc và chuyển thành `exams[]` một phần tử.

> **Không commit** `service-account.json` hoặc `config.json` — đã có trong `.gitignore`.

## Service Account Setup (T-705)

1. Tạo project trên [Google Cloud Console](https://console.cloud.google.com)
2. Bật **Google Sheets API**
3. Tạo **Service Account** → tải JSON key → lưu `local-server/service-account.json`
4. Share từng Spreadsheet kỳ Offline với email service account (Editor)
5. Thêm từng kỳ vào `config.exams[]`

## Seed dữ liệu demo (test tại nhà)

```bash
npm run seed
# Password demo cho tất cả role: demo123
# Exam ID: PQQ-DEMO-2026-001 (settings.mode=offline)
```

## Chạy (ngày thi)

```bash
npm start
```

Server lắng nghe `http://0.0.0.0:3000`. mDNS opt-in: `mdns.enabled: true`.

### Trước giờ thi — pull từng kỳ

```bash
curl -X POST http://localhost:3000/api/sync/pull \
  -H 'Content-Type: application/json' \
  -d '{"examId":"PQQ-HCM-2026-008","role":"secretary"}'
```

### Đăng nhập ngày thi

1. Mở `http://pqq.local:3000` (hoặc IP laptop)
2. **Chọn kỳ thi** trong danh sách đã pull
3. Đăng nhập role GK / TK / CCK — API đi Local Server vì `exam.mode=offline`

### Admin

Tạo kỳ thi **không** làm trên Local Server. Mở Admin trên môi trường Online (GitHub Pages → Apps Script):

`https://…/admin.html`

Local Server từ chối `POST /api/createExamRoom` (403).

## Sync Engine

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/exams` | GET | Kỳ đã pull + registry `config.exams[]` |
| `/api/sync/pull` | POST | Tiền kỳ: Sheets → SQLite (theo `examId`) |
| `/api/sync/push` | POST | Hậu kỳ: SQLite → Sheets (theo `examId`) |
| `/api/sync/log` | GET | Lịch sử đồng bộ |

**Conflict rules (T-703):**
- Cùng `idempotencyKey`, khác `payloadHash` → `NEEDS_REVIEW` (không overwrite)
- Cloud đã `PENDING_APPROVAL` / `OFFICIALLY_APPROVED` → `NEEDS_REVIEW`

```bash
npm run test:sync   # Unit test conflict + sync_log (không cần Google API)
```

## API Endpoints (mirror Apps Script — data plane Offline)

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/health` | GET | Server + DB + danh sách kỳ |
| `/api/exams` | GET | Danh sách kỳ đã load |
| `/api/getExamConfig` | GET | Cấu hình kỳ (`?examId=` bắt buộc) |
| `/api/validatePass` | POST | Xác thực mật khẩu SHA-256 |
| `/api/submitScore` | POST | Gửi điểm → DRAFT |
| `/api/getData` | GET | Dashboard full data |
| `/api/getScoreboard` | GET | Public ranking |
| `/api/lockSheet` | POST | Khóa phiếu → PENDING_APPROVAL |
| `/api/approve` | POST | Duyệt → OFFICIALLY_APPROVED |

## Cấu trúc

```
local-server/
├── server.js
├── lib/                 # envelope, validation, auth, exam-registry, google-auth, …
├── services/            # scores, dashboard, scoreboard, sync
├── repositories/        # SQLite CRUD + sync-log
├── sync/
│   ├── pull-from-sheets.js
│   └── push-to-sheets.js
├── db/
│   ├── init.js
│   └── schema.sql
├── config.example.json  # exams[] multi-exam
├── service-account.example.json
└── README.md
```
