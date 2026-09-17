# 13 — Implementation Order

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

Thứ tự tối ưu để team mới ship được kỳ thi thật (Online trước đường xương sống, Offline B ngay khi contract ổn định).

---

## 20. Ordered Steps

| # | Bước | Spec chốt |
|---|---|---|
| 1 | **Architecture Setup** | Multi-page HTML (DEC-FE-02=C); Vanilla JS (DEC-FE-01=A); GH Pages |
| 2 | **Database Design** | UPPER_SNAKE (DEC-DB-01=A); required cols only (DEC-DB-02=B); schema.sql from docs 03 (DEC-DB-03=A); rooms table (DEC-DB-04=B) |
| 3 | **Authentication** | SHA-256+salt (DEC-AUTH-01=A); FE-only pass check (DEC-AUTH-04=B); client-side session; no loginRole API |
| 4 | **Exam Room** | Template from docs 03 (DEC-EXAM-04=C); multi-room (DEC-EXAM-01=B) |
| 5 | **Student Management** | Phiếu điểm neo theo võ sinh |
| 6 | **Judge Management** | Phiếu neo theo judgeId + loại LT/TH — làm song song được với Students |
| 7 | **Score Module** | Upsert overwrite DRAFT (DEC-SCORE-02=A); backend auto-calc total (DEC-SCORE-03=B); range 0–10 step 0.5 (DEC-SCORE-04=B); boutId=studentId+round (DEC-SCORE-05=C); P1/P2/P3 map configurable (DEC-SCORE-01=B) |
| 8 | **Approval Workflow** | No PIN, CCK fixed password approve click; no rate limit lockout (DEC-AP-01) |
| 9 | **Dashboard** | getData endpoint; Thư ký vận hành khóa phiếu |
| 10 | **Scoreboard** | getScoreboard endpoint; APPROVED only (DEC-SB-01=B); 1 score/student (DEC-SB-02); tiebreak rule (DEC-SB-03); motion+banner (DEC-SB-04=B) |
| 11 | **PDF Export** | Image signature only (DEC-PDF-01=A); Drive folders PDF+signatures+seals (DEC-DB-06=C) |
| 12 | **Sync Engine** | NEEDS_REVIEW Offline only (DEC-AP-03); service account (DEC-OFF-02=A); sync_log+timestamps (DEC-DB-05=C) |
| 13 | **Offline Mode (Local Server)** | config+mDNS (DEC-OFF-01=A+B); LockService (DEC-OFF-03=A); HTTP LAN+SSID (DEC-AUTH-08=A) |
| 14 | **Admin UI** | Full Admin UI (DEC-EXAM-02=B); settings merged in (DEC-FE-05=A); QR script (DEC-EXAM-03=B) |
| 15 | **Testing** | Latest Chrome/Safari (DEC-FE-03=A); best-effort a11y (DEC-FE-04=B) |
| 16 | **Deployment** | Script+verify (DEC-DEP-01=C); no staging (DEC-DEP-02); Pages checklist (DEC-DEP-03=A); conservative poll/cache (DEC-DEP-04=B) |

---

## Why not Offline first?

SoT yêu cầu **một payload mirror**. Xây Online contract trước giúp Local Server chỉ việc implement lại — giảm sai lệch. Offline A (hotspot) gần như miễn phí sau Online.

## Why Scoreboard after Approval?

Scoreboard chỉ hiện OFFICIALLY_APPROVED (DEC-SB-01=B). Production Scoreboard cần approval flow hoàn thiện.

## Why Sync before declaring Offline done?

Offline B **không hoàn thành** nếu chỉ chấm LAN mà không `sync/push` an toàn — SoT coi Cloud là lưu trữ dài hạn.

---

## Minimum vertical slices (khuyến nghị board)

1. **Slice A — Online happy path:** Auth → submit → lock → CCK approve → scoreboard
2. **Slice B — Tiền kỳ Admin:** create exam → import students/judges → rooms → QR
3. **Slice C — Offline B:** health → submit LAN → sync push
4. **Slice D — Hậu kỳ:** PDF → Drive → print runbook

Mỗi slice phải có demo được cho Ban tổ chức trước khi mở slice sau trên critical path.
