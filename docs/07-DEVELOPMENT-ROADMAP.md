# 07 — Development Roadmap & Milestones

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

**Ước lượng** dưới đây là **planning estimate** cho team mới (1 Fullstack + 1 FE hoặc tương đương). Không phải cam kết nghiệp vụ.

---

## 13. Development Roadmap

### Phase 0 — Foundations

| | |
|---|---|
| **Scope** | Repo structure, coding conventions, adapter skeleton, docs SoT lock |
| **Tasks** | Tạo `js/`, `apps-script/`, `local-server/` scaffold; config API_BASE; GH Pages verify; multi-page HTML files |
| **Complexity** | Low |
| **Dependencies** | Không |
| **Estimate** | 2–3 ngày |
| **Risks** | Refactor sớm từ `index.html` monolith gây regression UI |

### Phase 1 — Database & Auth Gate

| | |
|---|---|
| **Scope** | Sheets template + SQLite schema; Role gate + pass hash; schema.sql committed |
| **Tasks** | schema.sql (DEC-DB-03 = A); FE-only pass check (no loginRole); client-side session (examId+role); SHA-256+salt |
| **Complexity** | Medium |
| **Dependencies** | Phase 0; hash format locked (DEC-AUTH-01 = A) |
| **Estimate** | 4–6 ngày |
| **Risks** | — |

### Phase 2 — Exam / Students / Judges / Admin UI (Tiền kỳ)

| | |
|---|---|
| **Scope** | createExamRoom, import students, configure judges, QR/link, full Admin UI (DEC-EXAM-02 = B) |
| **Tasks** | Apps Script Admin; Drive folder; Admin UI Web App; rooms support (DEC-EXAM-01 = B); QR generation script (DEC-EXAM-03 = B) |
| **Complexity** | High |
| **Dependencies** | Phase 1 |
| **Estimate** | 7–10 ngày |
| **Risks** | Template Sheets thiếu cột |

### Phase 3 — Score Module + Idempotency

| | |
|---|---|
| **Scope** | Màn LT/TH/full; submitScore Online; DRAFT; backend auto-calculates total |
| **Tasks** | Payload đúng SoT; validation; upsert overwrite when DRAFT; retry; range 0–10 step 0.5; boutId = studentId+round |
| **Complexity** | High |
| **Dependencies** | Phase 1–2 |
| **Estimate** | 5–7 ngày |
| **Risks** | — |

### Phase 4 — Approval Workflow

| | |
|---|---|
| **Scope** | Dashboard lock; CCK approve click (no PIN); enforce transitions |
| **Tasks** | lockSheet; approveScore (CCK fixed password, click approve → OFFICIALLY_APPROVED); disable UI; no rate limit lockout |
| **Complexity** | Medium |
| **Dependencies** | Phase 3 |
| **Estimate** | 3–5 ngày |
| **Risks** | — |

### Phase 5 — Scoreboard

| | |
|---|---|
| **Scope** | Polling, ranking (OFFICIALLY_APPROVED only), Thủ khoa, CacheService, jitter |
| **Tasks** | Public scoreboard page (getScoreboard endpoint); only APPROVED scores; tiebreak: highest total → highest column → lowest column; motion + banner |
| **Complexity** | Medium |
| **Dependencies** | Phase 3–4 |
| **Estimate** | 3–5 ngày |
| **Risks** | Quota Apps Script |

### Phase 6 — Local Server Offline B

| | |
|---|---|
| **Scope** | Mirror API + SQLite + serve static + health |
| **Tasks** | Implement endpoints PA-B; seed schema; LAN test; config+mDNS discovery |
| **Complexity** | High |
| **Dependencies** | Phase 3–4 contract ổn định |
| **Estimate** | 7–10 ngày |
| **Risks** | Single laptop SPOF; IP/QR ops |

### Phase 7 — Sync Engine

| | |
|---|---|
| **Scope** | pull/push; conflict NEEDS_REVIEW (Offline only) |
| **Tasks** | pull-from-sheets; push-to-sheets; sync_log UI; service account auth |
| **Complexity** | High |
| **Dependencies** | Phase 6 + Sheets schema |
| **Estimate** | 5–8 ngày |
| **Risks** | Conflict rules |

### Phase 8 — PDF & Drive

| | |
|---|---|
| **Scope** | Template PDF; chữ ký ảnh (image only, DEC-PDF-01 = A); Drive path; in USB runbook |
| **Tasks** | Pdf.gs; print CSS; update pdf fields; signatures + seals folders |
| **Complexity** | Medium |
| **Dependencies** | Approved scores |
| **Estimate** | 4–6 ngày |
| **Risks** | Template layout |

### Phase 9 — PWA / Hardening / Quota

| | |
|---|---|
| **Scope** | SW precache; scoreboard cache (CacheService TTL only); error UX |
| **Tasks** | Manifest; offline shell; conservative poll/cache (DEC-DEP-04 = B) |
| **Complexity** | Medium |
| **Dependencies** | Phases trước |
| **Estimate** | 3–5 ngày |
| **Risks** | SW cache stale FE |

### Phase 10 — Testing + Deployment Runbooks

| | |
|---|---|
| **Scope** | Unit/integration/sync/E2E; Tiền kỳ checklist; rehearsal |
| **Tasks** | Test harness idempotency; LAN drill; GH Pages + AS deploy docs; Pages checklist (DEC-DEP-03 = A) |
| **Complexity** | Medium–High |
| **Dependencies** | All feature phases |
| **Estimate** | 5–8 ngày |
| **Risks** | — |

**Tổng thô:** ~6–10 tuần calendar (1–2 dev).

---

## 14. Milestones

### Milestone M1 — Architecture Ready

| | |
|---|---|
| **Deliverables** | Repo folders, adapter, Pages live, SoT linked in docs |
| **Dependencies** | — |
| **Completion Criteria** | FE load được trên Pages; Local health stub đáp ứng |

### Milestone M2 — Auth + Exam Shell

| | |
|---|---|
| **Deliverables** | Role gate + 3 pass + Admin UI; tạo exam room + students/judges + rooms |
| **Dependencies** | M1 |
| **Completion Criteria** | Tạo 1 kỳ thử trên Sheets; đăng nhập đủ role |

### Milestone M3 — Online Scoring Path

| | |
|---|---|
| **Deliverables** | submit → DRAFT → lock → CCK approve → OFFICIALLY_APPROVED → Scoreboard |
| **Dependencies** | M2 |
| **Completion Criteria** | Dry-run Online end-to-end với ≥3 thiết bị |

### Milestone M4 — Offline B Path

| | |
|---|---|
| **Deliverables** | Local Server mirror; LAN realtime; sync pull/push |
| **Dependencies** | M3 (contract) |
| **Completion Criteria** | Drill mất mạng: gửi điểm → LED 3–5s → sync Cloud không mất/trùng |

### Milestone M5 — Post-event & Production Hardening

| | |
|---|---|
| **Deliverables** | PDF+Drive; PWA; quota cache; runbooks; rehearsal checklist |
| **Dependencies** | M3–M4 |
| **Completion Criteria** | Ban tổ chức chạy Tiền kỳ checklist đầy đủ; ký nhận bàn giao |

---

## Parallelization Hint

Có thể song song sau M2:

- FE Scoreboard UI ↔ BE CacheService
- PDF template design ↔ Local Server scaffold
- Ops runbook video ↔ core scoring
- Admin UI ↔ Score Module (if contracts defined)
