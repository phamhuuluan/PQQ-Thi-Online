# 12 — Development Checklist

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

Checklist triển khai cho developer. Tick khi code + review + test xong hạng mục.

---

## FRONTEND

- [ ] Setup project folders (`js/`, `pwa/`, `assets/`)
- [ ] Multi-page HTML files: `index.html`, `cham-lt.html`, `cham-th.html`, `cham-full.html`, `dashboard.html`, `scoreboard.html`, `admin.html`, `approve.html`
- [ ] API adapter `getApiBase()` (Pages vs LAN / `.local`) — config.json + mDNS (DEC-OFF-01 = A+B)
- [ ] API client + error handling + retry idempotent
- [ ] Authentication Role Gate (FE-only pass check, no loginRole API)
- [ ] Session `examId` + `role` (+ `judgeType`/`judgeId`) — client-side
- [ ] Scoring UI Lý thuyết
- [ ] Scoring UI Thực hành
- [ ] Scoring UI Đầy đủ
- [ ] Nút **GỬI ĐIỂM** Online
- [ ] Nút **GỬI ĐIỂM** Offline (cùng payload)
- [ ] Disable edit khi status ≠ `DRAFT`
- [ ] Dashboard Thư ký
- [ ] Khóa phiếu UX
- [ ] CCK approval button (no PIN, fixed password, click → OFFICIALLY_APPROVED)
- [ ] Scoreboard polling (Online 10s conservative, jitter)
- [ ] Scoreboard LAN polling 3–5s
- [ ] Hiệu ứng Thủ khoa (motion + banner, DEC-SB-04 = B)
- [ ] Admin UI full (DEC-EXAM-02 = B): tạo kỳ, import, GK, rooms, settings
- [ ] Nút ĐỒNG BỘ (Offline Dashboard)
- [ ] PDF export trigger / download UX
- [ ] Responsive Mobile/Tablet/Laptop
- [ ] PWA manifest
- [ ] Service Worker precache app shell (không cache API như source of truth)
- [ ] Mode switch / origin detection documented
- [ ] Health check banner trước giờ thi Offline
- [ ] QR generation integration (DEC-EXAM-03 = B)
- [ ] Rooms selector UI (DEC-EXAM-01 = B)

---

## BACKEND — Google Apps Script

- [ ] Project Apps Script + `appsscript.json`
- [ ] `doPost` action router
- [ ] `getData` endpoint (Dashboard)
- [ ] `getScoreboard` endpoint (public, APPROVED only)
- [ ] Validation layer
- [ ] `submitScore` upsert + idempotencyKey; backend auto-calculates total (DEC-SCORE-03 = B)
- [ ] Reject submit if status ≠ `DRAFT`
- [ ] `lockSheet` → `PENDING_APPROVAL`
- [ ] `approveScore` — CCK fixed password check + only `PENDING_APPROVAL`
- [ ] Role permission checks (FE-only gate, but verify in critical actions)
- [ ] Scoreboard CacheService TTL (DEC-DB-07 = B)
- [ ] `sinceVersion` / `UNCHANGED` response
- [ ] deviceId light rate limit (scoreboard)
- [ ] LockService concurrent writes (DEC-OFF-03 = A)
- [ ] Exam Admin: create Folder + copy template
- [ ] Rotate 3 role passes (hash); không đụng Admin
- [ ] Judges/students write helpers
- [ ] PDF generate Docs→PDF→Drive path
- [ ] Update pdfUrl / pdfGeneratedAt / pdfHash
- [ ] Insert chữ ký / con dấu ảnh (DEC-PDF-01 = A)
- [ ] Deploy Web App: Anyone access (DEC-AUTH-06 = A)
- [ ] Deploy Web App + ghi URL vào FE config.json (DEC-API-04 = A)
- [ ] QR link generation script (DEC-EXAM-03 = B)

---

## GOOGLE SHEETS & DRIVE

- [ ] Template Spreadsheet baseline (DEC-EXAM-04 = C, from docs 03)
- [ ] Tabs/columns đúng schema đã chốt (UPPER_SNAKE, DEC-DB-01 = A)
- [ ] Sharing ACL: least privilege (DEC-AUTH-07 = A)
- [ ] Drive ExamRoom folder structure
- [ ] Chữ ký & con dấu assets trên Drive (signatures/ + seals/)
- [ ] ROOMS tab for multi-room (DEC-DB-04 = B)

---

## LOCAL SERVER

- [ ] `package.json` + engine Node
- [ ] `server.js` Express (hoặc tương đương)
- [ ] Serve static PWA (cùng bản FE multi-page)
- [ ] `db/schema.sql` apply on start (includes rooms table)
- [ ] SQLite repositories
- [ ] `GET /api/health`
- [ ] `POST /api/submitScore`
- [ ] `GET /api/getData`
- [ ] `GET /api/getScoreboard`
- [ ] `POST /api/lockSheet`
- [ ] `POST /api/approve`
- [ ] Auth/pass validate trên Local API
- [ ] `POST /api/sync/pull`
- [ ] `POST /api/sync/push`
- [ ] Conflict → `NEEDS_REVIEW` (Offline only)
- [ ] `sync_log` writes
- [ ] `config.example.json`
- [ ] README start: `npm install && npm start`
- [ ] LAN IP / port 3000 + mDNS `pqq.local` documented
- [ ] Service account for sync (DEC-OFF-02 = A)
- [ ] Rooms CRUD endpoints

---

## TESTING

- [ ] Unit: validation totals / status transitions
- [ ] Unit: idempotency map
- [ ] Integration: Apps Script ↔ Sheets
- [ ] Integration: Local API ↔ SQLite
- [ ] Offline tests: submit/lock/approve trên LAN
- [ ] Sync tests: pull → score → push; duplicate key; conflict hash
- [ ] E2E Online dry-run ≥3 devices
- [ ] E2E Offline B drill (PA-B checklist phần cứng)
- [ ] Quota stress: N scoreboards × poll interval
- [ ] Security smoke: wrong pass; cross-role denied

---

## DEPLOYMENT

- [ ] GitHub Pages workflow xanh
- [ ] Production FE config.json trỏ đúng Script URL
- [ ] Apps Script production deploy
- [ ] Google Sheets template published nội bộ
- [ ] Google Drive root + permissions
- [ ] Local Server USB bundle + snapshot sample
- [ ] Tiền kỳ checklist in ra cho Ban TC
- [ ] Production checklist ký xác nhận trước giờ G (DEC-DEP-03 = A)
- [ ] Rollback plan (Script version / Pages commit)
- [ ] Script + verify createExam (DEC-DEP-01 = C)

---

## PRODUCTION SMOKE (ngày thi)

### Online

- [ ] Gate login đủ role
- [ ] 1 điểm mẫu → DRAFT trên Sheets
- [ ] Khóa → CCK approve → OFFICIALLY_APPROVED
- [ ] Scoreboard LED cập nhật
- [ ] PDF thử

### Offline B

- [ ] `/api/health` OK
- [ ] 3 điện thoại gửi điểm → LED 3–5s
- [ ] Khóa + CCK approve trên LAN
- [ ] In USB 1 trang
- [ ] Sau thi: ĐỒNG BỘ thành công
