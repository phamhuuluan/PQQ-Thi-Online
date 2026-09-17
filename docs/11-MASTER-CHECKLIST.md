# 11 — Master Checklist (PM / Architecture)

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

Checklist quản lý dự án / bàn giao. Đánh dấu khi hoàn tất và đã review.

---

## SYSTEM ANALYSIS

- [ ] Project Overview đã đọc & thống nhất với Ban tổ chức
- [ ] Business / Project / System Goals đã capture
- [ ] Modes (Online / Offline B / Offline A) đã hiểu
- [ ] Actors & Roles đã thống nhất
- [ ] Use Cases / User Stories đã map ticket
- [ ] Business Rules BR-01…BR-12 đã chuyển thành acceptance criteria
- [ ] Scope In/Out đã ký nhận
- [ ] Functional Requirements phân loại MUST/SHOULD/NICE
- [ ] Non-Functional Requirements đã review
- [ ] Constraints (no VPS, polling, Sheets) đã chấp nhận

---

## SYSTEM DESIGN

- [ ] High Level Architecture review
- [ ] Component Diagram review
- [ ] Deployment Diagram review
- [ ] Data Flow Online/Offline review
- [ ] Frontend Architecture (multi-page HTML, adapter, PWA) review
- [ ] Backend Apps Script structure review
- [ ] Local Server structure review
- [x] Tech stack locked: Vanilla JS (DEC-FE-01 = A)

---

## DATABASE

- [x] Naming convention chốt: UPPER_SNAKE (DEC-DB-01 = A)
- [x] Google Sheets tabs/columns chốt (DEC-DB-01/02)
- [x] SQLite schema.sql committed (DEC-DB-03 = A)
- [ ] ERD review
- [x] Status enum + NEEDS_REVIEW policy chốt: Offline only (DEC-AP-03)
- [ ] Drive folder convention chốt

---

## API

- [ ] Online actions spec review
- [ ] Offline `/api/*` mirror review
- [ ] submitScore payload lock
- [x] getData / getScoreboard contract lock (DEC-API-03 = A, DEC-AUTH-09 = B two endpoints)
- [ ] lockSheet / approve lock
- [ ] sync pull/push + conflict rules lock
- [x] No loginRole endpoint (DEC-AUTH-04 = B, FE-only)
- [x] Error codes lock (DEC-API-02 = A)
- [ ] Permissions matrix lock
- [x] No rate limit lockout (DEC-AP-01)

---

## WORKFLOW

- [ ] Tiền Kỳ workflow + checklist
- [ ] Online Live workflow (Video + Score + Scoreboard + Hậu kỳ)
- [ ] Offline A Hotspot workflow
- [ ] Offline B LAN workflow
- [ ] Approval state machine
- [ ] PDF + in USB + ký giấy workflow
- [ ] Sync workflow
- [ ] Deployment / Switch Mode workflow
- [ ] Role Gate workflow
- [ ] Edge cases idempotency + conflict

---

## ROADMAP

- [ ] Phases estimates accepted
- [ ] Milestones M1–M5 defined on board
- [ ] Owners assigned
- [ ] Parallel workstreams agreed

---

## RISK ANALYSIS

- [ ] Technical risks reviewed
- [ ] Security risks reviewed
- [ ] Sync/Offline risks reviewed
- [ ] Deployment/GAS/Sheets risks reviewed
- [ ] Business risks reviewed
- [ ] Top 5 mitigations scheduled before first exam

---

## MISSING REQUIREMENTS

- [x] NC-BR-* decided
- [x] NC-TECH-* decided
- [x] NC-DB-* decided
- [x] NC-API-* decided
- [x] NC-SEC-* decided
- [x] NC-DEP-* decided
- [x] NC-UI-* decided
- [x] Decisions recorded in docs/DECISIONS.md
- [x] **REQUIREMENT_FREEZE achieved** (45/45 decisions chốt)

---

## DEPENDENCY & ORDER

- [x] Dependency map agreed by Tech Lead
- [ ] Implementation order followed (or exceptions documented)
- [ ] Critical path tracked weekly

---

## HANDOFF READINESS

- [ ] New developer có thể chạy Online dry-run theo docs
- [ ] New operator có thể chạy Offline B rehearsal theo PA-B
- [ ] Source of Truth còn là single source — docs không mâu thuẫn
