# TASK_BREAKDOWN — Phân rã công việc triển khai Hệ thống Thi Online PQQ

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md).

---

## Bảng tổng hợp

| Phase | Tên | Ước lượng | Số task | Đường găng |
|-------|-----|-----------|---------|------------|
| 0 | Nền tảng (Foundations) | 2–3 ngày | 8 | ✅ |
| 1 | Database & Auth Gate | 5–7 ngày | 12 | ✅ |
| 2 | Exam / Students / Judges + Admin UI | 5–8 ngày | 11 | ✅ |
| 3 | Score Module | 5–7 ngày | 13 | ✅ |
| 4 | Approval Workflow | 4–6 ngày | 10 | ✅ |
| 5 | Scoreboard | 3–5 ngày | 8 | ✅ |
| 6 | Local Server Offline B | 7–10 ngày | 12 | ✅ |
| 7 | Sync Engine | 5–8 ngày | 9 | ✅ |
| 8 | PDF & Drive | 4–6 ngày | 8 | ✅ |
| 9 | PWA / Hardening | 3–5 ngày | 8 | ✅ |
| 10 | Testing + Deployment | 5–8 ngày | 14 | ✅ |
| | **Tổng** | **~48–73 ngày** | **113** | |

**Ký hiệu:** 🔴 = Đường găng (Critical Path) · Assignee: `FS` = Fullstack, `FE` = Frontend, `BE` = Backend, `OPS` = DevOps

---

## Phase 0 — Nền tảng (Foundations)

> Ước lượng: 2–3 ngày · Phụ thuộc: Không

### DevOps

- [x] **T-001** — Tạo cấu trúc thư mục `js/`, `apps-script/`, `local-server/`, `pwa/`, `assets/` · 2h · Deps: — · Assignee: `FS` 🔴
- [x] **T-002** — Cấu hình GitHub Pages workflow, verify deploy · 3h · Deps: T-001 · Assignee: `OPS` 🔴
- [x] **T-003** — Tạo `config.js` với `getApiBase()` — phân biệt Pages vs LAN (`.local`) · 2h · Deps: T-001 · Assignee: `FS` 🔴

### Frontend

- [x] **T-004** — Tách `index.html` monolith thành multi-page HTML (gate, cham, dashboard, approve, scoreboard, admin) · 4h · Deps: T-001 · Assignee: `FE` 🔴
- [x] **T-005** — Tạo API client module (`js/api.js`) + error handling + retry idempotent · 3h · Deps: T-003 · Assignee: `FE` 🔴

### Backend

- [x] **T-006** — Scaffold Apps Script project + `appsscript.json` · 2h · Deps: T-001 · Assignee: `BE` 🔴

### Docs

- [x] **T-007** — Khoá SoT: liên kết docs, ghi rõ version lock · 1h · Deps: — · Assignee: `FS`
- [x] **T-008** — Tạo `local-server/` scaffold + `package.json` + engine Node · 2h · Deps: T-001 · Assignee: `FS`

---

## Phase 1 — Database & Auth Gate

> Ước lượng: 5–7 ngày · Phụ thuộc: Phase 0

### Database

- [x] **T-101** — Tạo Template Spreadsheet baseline (tabs/columns đúng schema UPPER_SNAKE) · 4h · Deps: T-006 · Assignee: `BE` 🔴
- [x] **T-102** — Hoàn thiện `db/schema.sql` cho SQLite (rooms, students, judges, scores, sync_log) · 4h · Deps: T-008 · Assignee: `BE` 🔴
- [x] **T-103** — Thiết lập Sharing ACL tối thiểu cho Sheets · 1h · Deps: T-101 · Assignee: `BE`

### Backend

- [x] **T-104** — Implement `doPost` action router trên Apps Script · 3h · Deps: T-006 · Assignee: `BE` 🔴
- [x] **T-105** — Implement `doGet` / `getData` endpoint (auth required) · 3h · Deps: T-104 · Assignee: `BE` 🔴
- [x] **T-106** — Validation layer (envelope `{ok, data, error}`, error codes) · 3h · Deps: T-104 · Assignee: `BE` 🔴
- [x] **T-107** — Hash 3 pass/kỳ thi (GK/TK) SHA-256 + salt; CCK cố định; Admin cố định · 4h · Deps: T-104 · Assignee: `BE` 🔴
- [x] **T-108** — Role permission checks middleware · 3h · Deps: T-107 · Assignee: `BE` 🔴

### Frontend

- [x] **T-109** — Màn hình Role Gate — 5 lối vào (GK, TK, CCK, Admin, Scoreboard) · 4h · Deps: T-004 · Assignee: `FE` 🔴
- [x] **T-110** — FE-only pass check (SHA-256 client-side) + feedback lỗi · 3h · Deps: T-109, T-107 · Assignee: `FE` 🔴
- [x] **T-111** — Session client-side: lưu `examId`, `role`, `judgeType`, `judgeId` · 2h · Deps: T-110 · Assignee: `FE` 🔴
- [x] **T-112** — Pass rate limit UI (chặn brute-force phía client) · 2h · Deps: T-110 · Assignee: `FE`

---

## Phase 2 — Exam / Students / Judges + Admin UI

> Ước lượng: 5–8 ngày · Phụ thuộc: Phase 1

### Backend

- [x] **T-201** — `createExamRoom`: tạo Drive folder + copy template Sheets · 4h · Deps: T-101, T-104 · Assignee: `BE` 🔴
- [x] **T-202** — Import students helper (ghi vào Sheets) · 3h · Deps: T-201 · Assignee: `BE` 🔴
- [x] **T-203** — Configure judges helper + judgeType mapping · 3h · Deps: T-201 · Assignee: `BE` 🔴
- [x] **T-204** — Rotate 3 role passes (hash) cho kỳ thi; không đụng Admin · 2h · Deps: T-107, T-201 · Assignee: `BE`
- [x] **T-205** — QR/link generation cho phòng thi · 3h · Deps: T-201 · Assignee: `BE`

### Frontend

- [x] **T-206** — Admin UI: Tạo kỳ thi mới · 4h · Deps: T-201 · Assignee: `FE` 🔴
- [x] **T-207** — Admin UI: Quản lý thí sinh (import/list/edit) · 4h · Deps: T-202 · Assignee: `FE` 🔴
- [x] **T-208** — Admin UI: Quản lý giám khảo · 3h · Deps: T-203 · Assignee: `FE`
- [x] **T-209** — Admin UI: Hiển thị QR/link phòng thi · 2h · Deps: T-205 · Assignee: `FE`

### Database

- [x] **T-210** — Drive ExamRoom folder structure + chữ ký/con dấu assets · 2h · Deps: T-201 · Assignee: `BE`

### Docs

- [x] **T-211** — Ghi chép quy trình tạo kỳ thi cho Ban tổ chức · 2h · Deps: T-206 · Assignee: `FS`

---

## Phase 3 — Score Module

> Ước lượng: 5–7 ngày · Phụ thuộc: Phase 1–2

### Frontend

- [x] **T-301** — Scoring UI: Màn Lý thuyết (P1/P2/P3 configurable map, range 0–10 step 0.5) · 5h · Deps: T-111 · Assignee: `FE` 🔴
- [x] **T-302** — Scoring UI: Màn Thực hành · 5h · Deps: T-301 · Assignee: `FE` 🔴
- [x] **T-303** — Scoring UI: Màn Đầy đủ (full) · 4h · Deps: T-301 · Assignee: `FE` 🔴
- [x] **T-304** — Nút **GỬI ĐIỂM** Online (gọi `submitScore`) · 3h · Deps: T-301, T-005 · Assignee: `FE` 🔴
- [x] **T-305** — Nút **GỬI ĐIỂM** Offline (cùng payload, gọi local API) · 2h · Deps: T-304 · Assignee: `FE`
- [x] **T-306** — Disable edit khi status ≠ `DRAFT` · 2h · Deps: T-304 · Assignee: `FE` 🔴
- [x] **T-307** — Hiển thị boutId (= studentId + round, e.g. `VS-xxx|R1`) · 1h · Deps: T-301 · Assignee: `FE`

### Backend

- [x] **T-308** — `submitScore` upsert + idempotencyKey · 5h · Deps: T-104, T-101 · Assignee: `BE` 🔴
- [x] **T-309** — Reject submit if status ≠ `DRAFT` · 2h · Deps: T-308 · Assignee: `BE` 🔴
- [x] **T-310** — Backend tính total score từ P1/P2/P3 · 3h · Deps: T-308 · Assignee: `BE` 🔴
- [x] **T-311** — Validation payload (range, step, required fields) · 3h · Deps: T-308 · Assignee: `BE` 🔴
- [x] **T-312** — LockService cho Sheets writes (tránh race condition) · 3h · Deps: T-308 · Assignee: `BE`

### Frontend

- [x] **T-313** — Responsive scoring form (Mobile/Tablet/Laptop) · 3h · Deps: T-301 · Assignee: `FE`

---

## Phase 4 — Approval Workflow (Không PIN)

> Ước lượng: 4–6 ngày · Phụ thuộc: Phase 3

### Backend

- [x] **T-401** — `lockSheet` → chuyển status sang `PENDING_APPROVAL` · 3h · Deps: T-308 · Assignee: `BE` 🔴
- [x] **T-402** — `approveScore` — CCK click approve (không PIN), chỉ khi `PENDING_APPROVAL` · 4h · Deps: T-401 · Assignee: `BE` 🔴
- [x] **T-403** — Enforce status transitions (DRAFT → PENDING_APPROVAL → OFFICIALLY_APPROVED) · 3h · Deps: T-401, T-402 · Assignee: `BE` 🔴
- [x] **T-404** — Rate limit cho approval endpoint · 2h · Deps: T-402 · Assignee: `BE`

### Frontend

- [x] **T-405** — Dashboard Thư ký: danh sách phiếu, status badge · 4h · Deps: T-105, T-111 · Assignee: `FE` 🔴
- [x] **T-406** — Nút Khoá phiếu UX (gọi `lockSheet`) · 2h · Deps: T-405, T-401 · Assignee: `FE` 🔴
- [x] **T-407** — Màn CCK approval (click duyệt, không PIN modal) · 3h · Deps: T-402 · Assignee: `FE` 🔴
- [x] **T-408** — Disable UI toàn bộ khi status ≠ `DRAFT` · 2h · Deps: T-306 · Assignee: `FE` 🔴
- [x] **T-409** — Hiển thị trạng thái phiếu realtime trên Dashboard · 2h · Deps: T-405 · Assignee: `FE`
- [x] **T-410** — Nút ĐỒNG BỘ placeholder (cho Offline Dashboard) · 1h · Deps: T-405 · Assignee: `FE`

---

## Phase 5 — Scoreboard

> Ước lượng: 3–5 ngày · Phụ thuộc: Phase 3–4

### Backend

- [x] **T-501** — `getScoreboard` endpoint (public, không auth) · 3h · Deps: T-105 · Assignee: `BE` 🔴
- [x] **T-502** — CacheService 15–20s cho scoreboard response · 2h · Deps: T-501 · Assignee: `BE` 🔴
- [x] **T-503** — `sinceVersion` / `UNCHANGED` response để giảm payload · 2h · Deps: T-501 · Assignee: `BE`
- [x] **T-504** — deviceId light rate limit (scoreboard) · 2h · Deps: T-501 · Assignee: `BE`

### Frontend

- [x] **T-505** — Trang Scoreboard public: hiển thị chỉ `OFFICIALLY_APPROVED` · 4h · Deps: T-501 · Assignee: `FE` 🔴
- [x] **T-506** — Polling scoreboard (Online 5–10s + jitter; conservative 10s/20s cache) · 3h · Deps: T-505 · Assignee: `FE` 🔴
- [x] **T-507** — Tiebreak ranking: highest total → highest single column → lowest column · 3h · Deps: T-505 · Assignee: `FE` 🔴
- [x] **T-508** — Hiệu ứng Thủ khoa · 2h · Deps: T-507 · Assignee: `FE`

---

## Phase 6 — Local Server Offline B

> Ước lượng: 7–10 ngày · Phụ thuộc: Phase 3–4 contract ổn định

### Backend

- [x] **T-601** — `server.js` Express: setup + serve static PWA · 4h · Deps: T-008 · Assignee: `FS`
- [x] **T-602** — SQLite apply `schema.sql` on start · 3h · Deps: T-102, T-601 · Assignee: `FS`
- [x] **T-603** — SQLite repositories (CRUD students, judges, scores, rooms) · 5h · Deps: T-602 · Assignee: `FS`
- [x] **T-604** — `GET /api/health` · 1h · Deps: T-601 · Assignee: `FS`
- [x] **T-605** — `POST /api/submitScore` (mirror Online logic) · 4h · Deps: T-603, T-308 · Assignee: `FS`
- [x] **T-606** — `GET /api/getData` · 3h · Deps: T-603 · Assignee: `FS`
- [x] **T-607** — `POST /api/lockSheet` · 2h · Deps: T-603 · Assignee: `FS`
- [x] **T-608** — `POST /api/approve` · 2h · Deps: T-603 · Assignee: `FS`
- [x] **T-609** — Auth/pass validate trên Local API (SHA-256 check) · 3h · Deps: T-601, T-107 · Assignee: `FS`
- [x] **T-610** — `config.example.json` + mDNS discovery · 3h · Deps: T-601 · Assignee: `FS`

### Frontend

- [x] **T-611** — Health check banner trước giờ thi Offline · 2h · Deps: T-604, T-003 · Assignee: `FE`
- [x] **T-612** — Mode switch / origin detection (Online ↔ Offline) documented + implemented · 3h · Deps: T-003 · Assignee: `FE`

---

## Phase 7 — Sync Engine

> Ước lượng: 5–8 ngày · Phụ thuộc: Phase 6 + Sheets schema

### Backend

- [x] **T-701** — `POST /api/sync/pull` — kéo dữ liệu từ Sheets về SQLite · 5h · Deps: T-603, T-101 · Assignee: `FS`
- [x] **T-702** — `POST /api/sync/push` — đẩy dữ liệu từ SQLite lên Sheets · 5h · Deps: T-701 · Assignee: `FS`
- [x] **T-703** — Conflict detection → `NEEDS_REVIEW` status · 4h · Deps: T-702 · Assignee: `FS`
- [x] **T-704** — `sync_log` writes (ghi lịch sử đồng bộ) · 2h · Deps: T-701 · Assignee: `FS`
- [x] **T-705** — Service account setup cho sync (Sheets API) · 3h · Deps: T-701 · Assignee: `FS`
- [x] **T-706** — LockService cho Sheets writes khi sync · 2h · Deps: T-702, T-312 · Assignee: `FS`

### Frontend

- [x] **T-707** — Nút ĐỒNG BỘ hoàn chỉnh (Offline Dashboard) · 3h · Deps: T-701, T-410 · Assignee: `FE`
- [x] **T-708** — Sync log UI (hiển thị lịch sử sync) · 2h · Deps: T-704 · Assignee: `FE`
- [x] **T-709** — Scoreboard LAN polling 3–5s · 2h · Deps: T-506, T-606 · Assignee: `FE`

---

## Phase 8 — PDF & Drive

> Ước lượng: 4–6 ngày · Phụ thuộc: Approved scores (Phase 4)

### Backend

- [x] **T-801** — `Pdf.gs`: template PDF từ Google Docs → PDF · 5h · Deps: T-402 · Assignee: `BE`
- [x] **T-802** — Insert chữ ký / con dấu ảnh vào PDF · 3h · Deps: T-801, T-210 · Assignee: `BE`
- [x] **T-803** — Upload PDF lên Drive path chuẩn · 2h · Deps: T-801 · Assignee: `BE`
- [x] **T-804** — Update `pdfUrl` / `pdfGeneratedAt` / `pdfHash` trên Sheets · 2h · Deps: T-803 · Assignee: `BE`

### Frontend

- [x] **T-805** — PDF export trigger / download UX · 3h · Deps: T-803 · Assignee: `FE`
- [x] **T-806** — Print CSS cho in trực tiếp · 2h · Deps: T-805 · Assignee: `FE`

### Docs

- [x] **T-807** — Hướng dẫn in USB runbook · 1h · Deps: T-805 · Assignee: `FS`
- [x] **T-808** — Quy trình xuất PDF cho Ban tổ chức · 1h · Deps: T-805 · Assignee: `FS`

---

## Phase 9 — PWA / Hardening / Quota

> Ước lượng: 3–5 ngày · Phụ thuộc: Tất cả phases trước

### Frontend

- [x] **T-901** — PWA manifest (`manifest.json`, icons, theme) · 2h · Deps: T-004 · Assignee: `FE`
- [x] **T-902** — Service Worker precache app shell (không cache API) · 4h · Deps: T-901 · Assignee: `FE`
- [x] **T-903** — Offline shell fallback UX · 2h · Deps: T-902 · Assignee: `FE`

### Backend

- [x] **T-904** — deviceId throttle cho tất cả endpoint · 2h · Deps: T-504 · Assignee: `BE`
- [x] **T-905** — Rate limit tổng hợp Apps Script · 2h · Deps: T-904 · Assignee: `BE`

### DevOps

- [x] **T-906** — Conservative polling config (10s/20s cache) verify · 1h · Deps: T-506 · Assignee: `OPS`
- [x] **T-907** — Error UX toàn hệ thống (toast, retry, fallback) · 3h · Deps: T-005 · Assignee: `FE`
- [x] **T-908** — Stress test quota Apps Script + báo cáo · 3h · Deps: T-905 · Assignee: `FS`

---

## Phase 10 — Testing + Deployment

> Ước lượng: 5–8 ngày · Phụ thuộc: Tất cả feature phases

### Testing

- [x] **T-1001** — Unit test: validation totals / status transitions · 3h · Deps: T-311, T-403 · Assignee: `FS`
- [x] **T-1002** — Unit test: idempotency map · 2h · Deps: T-308 · Assignee: `FS`
- [x] **T-1003** — Integration test: Apps Script ↔ Sheets (staging) · 4h · Deps: T-101 · Assignee: `BE`
- [x] **T-1004** — Integration test: Local API ↔ SQLite · 3h · Deps: T-603 · Assignee: `FS`
- [x] **T-1005** — Offline tests: submit/lock/approve trên LAN · 3h · Deps: T-605, T-607, T-608 · Assignee: `FS`
- [x] **T-1006** — Sync tests: pull → score → push; duplicate key; conflict hash · 4h · Deps: T-701, T-702 · Assignee: `FS`
- [x] **T-1007** — E2E Online dry-run ≥3 devices · 4h · Deps: T-505, T-402 · Assignee: `FS`
- [x] **T-1008** — E2E Offline B drill (PA-B checklist phần cứng) · 4h · Deps: T-601 · Assignee: `FS`
- [x] **T-1009** — Quota stress: N scoreboards × poll interval · 3h · Deps: T-502 · Assignee: `BE`
- [x] **T-1010** — Security smoke: wrong pass; cross-role denied · 2h · Deps: T-107, T-108 · Assignee: `FS`

### Deployment

- [x] **T-1011** — Production FE config trỏ đúng Script URL + deploy GH Pages · 2h · Deps: T-002 · Assignee: `OPS`
- [x] **T-1012** — Apps Script production deploy + ghi URL vào FE config · 2h · Deps: T-104 · Assignee: `BE`
- [x] **T-1013** — Local Server USB bundle + snapshot sample + README · 2h · Deps: T-601 · Assignee: `FS`

### Docs

- [x] **T-1014** — Tiền kỳ checklist in ra cho Ban TC + Production checklist ký xác nhận · 3h · Deps: T-1007 · Assignee: `FS`

---

## Sơ đồ đường găng (Critical Path)

```
T-001 → T-004 → T-109 → T-110 → T-111
                                    ↓
T-006 → T-104 → T-107 ──────→ T-308 → T-309 → T-401 → T-402 → T-501 → T-505
         ↓                      ↓
        T-101 ──────────→ T-201 → T-202
                                    ↓
                            T-206 → T-207
                                    
T-308 → T-301 → T-304 → T-306
```

**Tổng thời gian đường găng ước tính:** ~6–10 tuần (1–2 dev).

---

## Ghi chú

- **Assignee placeholder:** `FS` = Fullstack, `FE` = Frontend, `BE` = Backend, `OPS` = DevOps. Thay tên thật khi phân công.
- **Ước lượng:** Cho team 1 Fullstack + 1 FE. Điều chỉnh theo năng lực thực tế.
- **Song song hóa:** Sau Phase 2 (M2), có thể song song FE Scoreboard ↔ BE CacheService, PDF template ↔ Local Server scaffold, Ops runbook ↔ core scoring.
- **Không staging:** Deploy thẳng; dùng script + verify cho kỳ thi mới. Xem [DECISIONS.md](./DECISIONS.md).
- **Rollback:** Script version (Apps Script) / Pages commit (GitHub Pages).
