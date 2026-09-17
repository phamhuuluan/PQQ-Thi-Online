# 08 — Risk Analysis

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

Mọi rủi ro bám hạn chế / edge cases trong Source of Truth. Mức: **H** High · **M** Medium · **L** Low.

---

## 15. Risk Register

### Technical Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| Apps Script quota cạn khi nhiều LED/GK polling | Polling dày + đọc Sheets lặp | Scoreboard/Dashboard chậm/fail Online | CacheService TTL (DEC-DB-07 = B); conservative poll 10s/cache 20s (DEC-DEP-04 = B); jitter; giảm cột đọc | H |
| Sheets không scale kỳ siêu lớn | Dùng Sheets như DB | Chậm / lỗi | Giới hạn quy mô kỳ; đo thử trước | M |
| Monolith `index.html` khó bảo trì | FE chưa module hóa | Chậm feature, regression | Multi-page HTML (DEC-FE-02 = C); tách `js/features` | M |
| Không WebSocket | Thiết kế polling | Cảm giác "trễ" | Chu kỳ 5–10s Online / 3–5s LAN + UI motion | L |

### Security Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| Pass lộ plaintext | FE lưu sai / log | Mạo danh role | Hash only (SHA-256+salt); HTTPS Online | H |
| Apps Script `Anyone` execute | Deploy access rộng (DEC-AUTH-06 = A) | Spam/ghi giả | LockService (DEC-OFF-03 = A); FE-only pass gate + conservative rate | H |
| LAN mở guest Wi-Fi | Ops | Người lạ gửi điểm | SSID riêng `PQQ_KhaoThi`; không guest; HTTP LAN + SSID (DEC-AUTH-08 = A) | H |
| Cross-role nếu 1 pass | Sai thiết kế (đã chống trong SoT) | Vượt quyền | Enforce 3 pass độc lập | M |

### Sync Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| Ghi đè phiếu Cloud đã duyệt | Push naïvely | Mất kết quả chính thức | Reject / NEEDS_REVIEW nếu Cloud ≥ PENDING | H |
| Conflict payload khác hash | Double entry / sửa Offline | Dữ liệu phân kỳ | Conflict record; CCK chọn attempt | H |
| Quên ĐỒNG BỘ | Ops | Mất bản Cloud | Checklist hậu kỳ; giữ SQLite+USB backup | H |
| Trùng submit khi mạng chập | Retry | Nhân đôi dòng | idempotencyKey bắt buộc | H |

### Offline Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| Laptop Thư ký SPOF | Kiến trúc LAN | Dừng cả kỳ | Laptop dự phòng; USB cài sẵn; pin/điện | H |
| IP đổi → QR chết | DHCP | Không vào app | config.json + mDNS `pqq.local` (DEC-OFF-01 = A+B) | H |
| Dùng localStorage rời | Anti-pattern | Không Scoreboard realtime | Enforce Local Server only (SoT) | H |
| Router hỏng | Hardware | Mất LAN | Router dự phòng; rehearsal | M |

### Deployment Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| FE trỏ sai Apps Script URL | Config | Cả Online fail | config.json (DEC-API-04 = A) + checklist deploy | H |
| GH Pages cache cũ | CDN/SW | UI lệch BE | Version query; SW update strategy | M |
| Thiếu rehearsal Tiền kỳ | Ops | Lỗi giờ G | Checklist bắt buộc 1–2 ngày trước (DEC-DEP-03 = A) | H |

### Google Apps Script / Sheets Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| Cold start / latency | Platform | Submit chậm | UX loading; retry idempotent | M |
| Concurrent edit Sheets | Multi writer | Race | LockService lock theo exam/scoreKey (DEC-OFF-03 = A) | M |
| Template drift giữa kỳ | Copy tay | Thiếu cột | Script createExamRoom + verify (DEC-DEP-01 = C) | M |

### Local Server Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| `server.js` chưa hoàn thiện (SoT) | WIP | Offline B chưa production | Prioritize Phase 6–7 | H |
| schema.sql committed (DEC-DB-03 = A) | Resolved | — | — | — |
| Node version lệch laptop | Env | Không start | Ghi engine trong package.json + USB image | M |

### Performance Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| Thundering herd polling | Đồng bộ interval | Quota spike | Jitter ±1.5s; deviceId limit | M |
| getDataRange toàn sheet | Code naïvely | Chậm | Đọc cột cần; cache derived board | M |

### Business Risks

| Risk | Root Cause | Impact | Proposed Solution | Level |
|---|---|---|---|---|
| Kỳ thi dừng vì mất mạng mà chưa B | Chọn sai phương án | Thiệt hại uy tín | Decision table A/B sau Tiền kỳ | H |
| Video Pro thiếu | Chi phí bên thứ 3 | Live 3 miền kém | Runbook phân biệt "có/không video" | L |
| Kỳ vọng chữ ký số pháp lý | Nhầm visual PDF | Không đủ pháp lý | Làm rõ scope ảnh chữ ký vs crypto (DEC-PDF-01 = A) | M |

---

## Top 5 Mitigations Before First Real Exam

1. Rehearsal Offline B end-to-end tại nhà.
2. Idempotency + sync conflict tests xanh.
3. LockService Apps Script enabled (DEC-OFF-03 = A).
4. USB backup Local Server + snapshot DB + laptop 2.
5. Pages deploy checklist verified (DEC-DEP-03 = A).
