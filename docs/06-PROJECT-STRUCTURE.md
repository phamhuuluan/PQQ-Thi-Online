# 06 — Project Structure & Modules

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

**Source of Truth:** cấu trúc nêu trong SoT / PA-B; mở rộng thư mục để production-ready mà không đổi nghiệp vụ.

---

## 11. Repository Structure

```text
PQQ-Thi-Online/
├── index.html                 # Landing / role gate
├── cham-lt.html               # Scoring Lý thuyết
├── cham-th.html               # Scoring Thực hành
├── cham-full.html             # Scoring Đầy đủ
├── dashboard.html             # Thư ký Dashboard
├── scoreboard.html            # Public Scoreboard
├── admin.html                 # Admin (tạo kỳ, GK, settings)
├── approve.html               # CCK Approval
├── styles.css
├── assets/                    # logo, icons, QR templates…
├── js/                        # FE modules
│   ├── api/
│   ├── auth/
│   ├── features/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── pwa/
│   ├── manifest.webmanifest
│   └── sw.js
├── apps-script/               # Backend Online (.gs)
├── local-server/              # Backend Offline B (SoT)
│   ├── package.json
│   ├── server.js
│   ├── db/schema.sql
│   ├── sync/
│   │   ├── pull-from-sheets.js
│   │   └── push-to-sheets.js
│   ├── config.example.json
│   └── README.md
├── database/                  # Sheets template docs / CSV samples / ERD export
├── templates/                 # PDF Docs template mô tả / HTML print
├── deployment/                # Checklists deploy, Apps Script notes
├── scripts/                   # Helper setup (QR gen, seed…)
├── tests/                     # Unit / integration / e2e
├── docs/                      # Bộ tài liệu triển khai (thư mục này)
├── .github/workflows/pages.yml
├── QUY-TRINH-THI-ONLINE-PQQ.md # SOURCE OF TRUTH
└── PHUONG-AN-B-LAN.md         # Spec Offline B
```

### Lý do lựa chọn

| Thư mục | Lý do |
|---|---|
| Multi-page HTML ở root | GH Pages phục vụ static; mỗi màn = 1 file HTML riêng (DEC-FE-02 = C) |
| `apps-script/` | Tách backend Cloud khỏi FE; dễ version & review |
| `local-server/` | Đúng SoT / PA-B; laptop Thư ký chỉ cần folder này + snapshot |
| `docs/` | Bàn giao PM/dev không trộn với runtime |
| `tests/` | Sync/idempotency cần test có kiểm soát |
| Không monorepo nặng | Khớp constraint "dễ bàn giao", free tier |

---

## 12. Module Structure

### Authentication

| | |
|---|---|
| **Responsibilities** | Role gate, pass verify, client-side session (examId+role) |
| **Dependencies** | Exam config (hashes), API client |
| **APIs** | FE-only pass check; no loginRole API (DEC-AUTH-04 = B) |
| **DB** | `EXAM_CONFIG` pass hashes / `exams` SQLite |

### Exam Room

| | |
|---|---|
| **Responsibilities** | Tạo Folder+Sheets, examId, cấu hình kỳ |
| **Dependencies** | Drive, Apps Script Admin, Templates |
| **APIs** | `createExamRoom` |
| **DB** | Exam config Sheets; Drive folders |

### Rooms

| | |
|---|---|
| **Responsibilities** | Quản lý nhiều phòng/bảng thi trong 1 kỳ (DEC-EXAM-01 = B) |
| **Dependencies** | Exam Room |
| **APIs** | CRUD rooms (Admin UI) |
| **DB** | `rooms` table SQLite / ROOMS tab Sheets |

### Student Management

| | |
|---|---|
| **Responsibilities** | Import võ sinh đủ điều kiện; seed dòng điểm trống |
| **Dependencies** | Exam Room |
| **APIs** | import / get students |
| **DB** | STUDENTS / `students` |

### Judge Management

| | |
|---|---|
| **Responsibilities** | CRUD danh sách GK + `theory|practice|both` |
| **Dependencies** | Exam Room, Auth (pass GK chung) |
| **APIs** | configureJudges |
| **DB** | JUDGES / `judges` |

### Score Module

| | |
|---|---|
| **Responsibilities** | Form điểm, GỬI ĐIỂM, idempotency, status DRAFT |
| **Dependencies** | Auth, Students, Judges, API adapter |
| **APIs** | `submitScore`, `getData` |
| **DB** | SCORES / `scores` |

### Approval Workflow

| | |
|---|---|
| **Responsibilities** | Khóa phiếu + CCK approve click (no PIN) |
| **Dependencies** | Score, Auth roles TK/CCK |
| **APIs** | `lockSheet`, `approve` |
| **DB** | SCORES.status |

### Dashboard

| | |
|---|---|
| **Responsibilities** | Realtime rà soát; khóa; Offline nút sync |
| **Dependencies** | Score, Approval, Sync |
| **APIs** | `getData`, `lockSheet`, `sync/push` |
| **DB** | scores |

### Scoreboard

| | |
|---|---|
| **Responsibilities** | Polling ranking (OFFICIALLY_APPROVED only), Thủ khoa, LED |
| **Dependencies** | getScoreboard endpoint; CacheService |
| **APIs** | `getScoreboard` (public) |
| **DB** | derived từ scores |

### PDF Export

| | |
|---|---|
| **Responsibilities** | Template → PDF → Drive; chữ ký ảnh (DEC-PDF-01 = A) |
| **Dependencies** | Approved scores, Drive |
| **APIs** | PDF generate / trigger |
| **DB** | pdfUrl fields |

### Sync Engine

| | |
|---|---|
| **Responsibilities** | pull/push; conflict NEEDS_REVIEW (Offline only) |
| **Dependencies** | SQLite, Sheets, Drive |
| **APIs** | `/api/sync/pull`, `/api/sync/push` |
| **DB** | all local tables + `sync_log` |

### Offline Support / Local Server

| | |
|---|---|
| **Responsibilities** | Static PWA + mirror API + health + SQLite |
| **Dependencies** | Sync Engine, FE build copy |
| **APIs** | toàn bộ `/api/*` PA-B |
| **DB** | schema.sql |

### Admin Module (includes Settings)

| | |
|---|---|
| **Responsibilities** | Tạo kỳ, GK list, rotate 3 pass, rooms, mode switch, polling interval, API URL config (DEC-FE-05 = A merged) |
| **Dependencies** | Exam Room, Auth |
| **APIs** | Admin actions |
| **DB** | exam config / config.json Local |

### Video Ops (non-software module)

| | |
|---|---|
| **Responsibilities** | Runbook Meet/Zoom/Teams |
| **Dependencies** | Không API điểm |
| **APIs** | — |
| **DB** | — |
