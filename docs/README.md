# Project Implementation Document Set

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

**Hệ thống:** Thi thăng đai — nhiều kỳ Online/Offline (`exam.mode`) trên một bộ code  
**Source of Truth:** [`QUY-TRINH-THI-ONLINE-PQQ.md`](./QUY-TRINH-THI-ONLINE-PQQ.md) · Offline exam-day: [`PHUONG-AN-B-LAN.md`](./PHUONG-AN-B-LAN.md) · Tạo kỳ: [`HUONG_DAN_TAO_KY_THI.md`](./HUONG_DAN_TAO_KY_THI.md)  
**Mục đích:** Bộ tài liệu bàn giao / chia task / quản lý triển khai — **không thay thế** tài liệu nghiệp vụ.

> **DEC-OFF-04:** Online/Offline = thuộc tính kỳ thi. Local Server = host ngày thi Offline, không phải Offline Mode toàn hệ thống.

## Mục lục

| # | File | Nội dung |
|---|---|---|
| 01 | [01-SYSTEM-ANALYSIS.md](./01-SYSTEM-ANALYSIS.md) | Overview, Functional / Non-Functional, Actors, Scope |
| 02 | [02-SYSTEM-DESIGN.md](./02-SYSTEM-DESIGN.md) | Architecture Frontend / Backend / Infra (Mermaid) |
| 03 | [03-DATABASE-DESIGN.md](./03-DATABASE-DESIGN.md) | Google Sheets + SQLite + ERD |
| 04 | [04-API-DESIGN.md](./04-API-DESIGN.md) | Online / Offline / Sync / Auth APIs |
| 05 | [05-WORKFLOW-DESIGN.md](./05-WORKFLOW-DESIGN.md) | Online, Offline, Approval, PDF, Sync, Deploy |
| 06 | [06-PROJECT-STRUCTURE.md](./06-PROJECT-STRUCTURE.md) | Repository + Module map |
| 07 | [07-DEVELOPMENT-ROADMAP.md](./07-DEVELOPMENT-ROADMAP.md) | Phases, Milestones, Estimates |
| 08 | [08-RISK-ANALYSIS.md](./08-RISK-ANALYSIS.md) | Technical / Security / Sync / Ops risks |
| 09 | [09-MISSING-REQUIREMENTS.md](./09-MISSING-REQUIREMENTS.md) | Resolved — all decisions chốt |
| — | [DECISIONS.md](./DECISIONS.md) | **Biên bản quyết định** — 45/45 mục đã chốt |
| 10 | [10-DEPENDENCY-MAP.md](./10-DEPENDENCY-MAP.md) | Module dependency & parallel work |
| 11 | [11-MASTER-CHECKLIST.md](./11-MASTER-CHECKLIST.md) | PM / Architecture checklist |
| 12 | [12-DEVELOPMENT-CHECKLIST.md](./12-DEVELOPMENT-CHECKLIST.md) | FE / BE / Local / Test / Deploy |
| 13 | [13-IMPLEMENTATION-ORDER.md](./13-IMPLEMENTATION-ORDER.md) | Thứ tự triển khai tối ưu |

## Quy ước đọc

1. Đọc Source of Truth trước khi mở ticket.
2. **REQUIREMENT_FREEZE đã đạt** — mọi quyết định chốt trong [`DECISIONS.md`](./DECISIONS.md). Thay đổi spec phải qua Change Request.
3. Thiết kế kỹ thuật trong `docs/` **không được** đổi workflow trạng thái `DRAFT → PENDING_APPROVAL → OFFICIALLY_APPROVED`.
4. Payload `submitScore` Online và Offline **giống nhau** — chỉ đổi `API_BASE`.
5. Khi docs và Source of Truth lệch nhau → **ưu tiên Source of Truth** (trừ khi `DECISIONS.md` đã chốt và SoT được cập nhật theo).
6. Không còn mục `NEED_CONFIRMATION` — nếu phát hiện inconsistency, tạo Change Request.
