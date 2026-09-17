# 01 — System Analysis

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

**Source of Truth:** `QUY-TRINH-THI-ONLINE-PQQ.md`, `PHUONG-AN-B-LAN.md`  
**Vai trò tài liệu:** Phân tích hệ thống để bàn giao team phát triển — không thay đổi nghiệp vụ.

---

## 1. Project Overview

### 1.1 Business Goals

| Goal | Mô tả (từ SoT) |
|---|---|
| Minh bạch | Điểm & xếp hạng công khai trên Scoreboard LED |
| Gắn kết | 3 miền thi cùng sự kiện trực tiếp |
| Tiết kiệm | Chi phí hạ tầng kỹ thuật ≈ 0đ (free tier); giảm đi lại |
| Tập trung | Dữ liệu Sheets + Drive |
| Linh hoạt 2-trong-1 | Cùng hệ thống cho mạng tốt hoặc mất mạng |
| Dễ triển khai | Không VPS 24/7; Offline = Local Server tạm trên laptop Thư ký |

### 1.2 Project Goals

- Số hóa quy trình chấm thi thăng đai.
- Một bộ Frontend code phục vụ Online + Offline.
- Workflow: **Chuẩn bị trước — Đồng bộ sau**.
- Hỗ trợ Mobile / Tablet / Laptop (PWA, responsive).

### 1.3 System Goals

- Online: Browser → GitHub Pages → Apps Script → Sheets → Drive.
- Offline B: Browser → Local Server (LAN) → SQLite → (sau thi) sync Sheets/Drive.
- Offline A (dự phòng): Hotspot 4G → hành xử giống Online.
- Chuỗi trạng thái phiếu: `DRAFT → PENDING_APPROVAL → OFFICIALLY_APPROVED`.

### 1.4 Modes của hệ thống

| Mode | Điều kiện | Backend khi thi | Realtime |
|---|---|---|---|
| **Online 3 miền** | Internet ổn định | Apps Script → Sheets | Cloud polling 5–10s |
| **Offline B · LAN** | Mất / không Internet | Local Server + SQLite | LAN polling 3–5s |
| **Offline A · Hotspot** | Có 4G | Giống Online qua hotspot | Cloud |

Công tắc mode trên UI / auto theo origin (`GitHub Pages` vs IP LAN / `.local`).

### 1.5 Actors

| Actor | Vị trí | Trách nhiệm chính |
|---|---|---|
| Admin | Trung tâm / kỹ thuật | Tạo kỳ thi; cấu hình giám khảo; sinh 3 pass role; pass Admin cố định |
| Giám khảo | Điểm cầu / CLB | Pass GK → chọn LT/TH/cả hai → nhập điểm → **GỬI ĐIỂM** |
| Thư ký | Sân / trung tâm | Host Local Server (Offline B); Dashboard; khóa phiếu; PDF/in |
| Chánh chủ khảo (CCK) | Sân / trung tâm | Xem điểm; click duyệt → `OFFICIALLY_APPROVED` (pass cố định, không PIN) |
| Scoreboard viewer | LED / khán giả | Xem xếp hạng — **không pass** |
| Ban tổ chức / Kỹ thuật sân | Điểm cầu | Router, Local Server, camera, LED, máy in |
| Thầy Chưởng Môn | Trung tâm | Ký & đóng dấu bản in giấy |

### 1.6 Use Cases (rút từ SoT)

| ID | Use Case | Actor chính | Mode |
|---|---|---|---|
| UC-01 | Tạo phòng thi (Folder + Sheets) | Admin | Online (Tiền kỳ) |
| UC-02 | Import danh sách võ sinh | Admin / Thư ký | Online |
| UC-03 | Tạo link/QR truy cập | Admin | Online / Offline |
| UC-04 | Snapshot Sheets → SQLite | Thư ký | Offline B |
| UC-05 | Đăng nhập theo role + pass | GK / TK / CCK / Admin | Cả hai |
| UC-06 | Chấm & GỬI ĐIỂM | Giám khảo | Cả hai |
| UC-07 | Dashboard rà soát & khóa phiếu | Thư ký | Cả hai |
| UC-08 | Duyệt phiếu (CCK click approve) | CCK | Cả hai |
| UC-09 | Scoreboard LED polling | Công khai | Cả hai |
| UC-10 | Xuất PDF & in USB | Thư ký | Cả hai |
| UC-11 | Đồng bộ SQLite → Sheets/Drive | Thư ký | Offline B hậu kỳ |
| UC-12 | Setup video Meet/Zoom/Teams | Kỹ thuật sân | Online Live |

### 1.7 User Stories (định hướng sản phẩm — map SoT)

1. **Là** Admin, **tôi muốn** tạo kỳ thi + Folder Drive + Sheets, **để** phòng thi sẵn sàng trước 1–2 ngày.
2. **Là** Giám khảo, **tôi muốn** quét QR → pass → chọn LT/TH → gửi điểm, **để** chấm nhanh trên điện thoại.
3. **Là** Thư ký, **tôi muốn** khóa phiếu đã rà soát, **để** giám khảo không sửa tiếp.
4. **Là** CCK, **tôi muốn** click duyệt phiếu, **để** kết quả chính thức.
5. **Là** Ban tổ chức, **tôi muốn** Scoreboard LED cập nhật, **để** minh bạch.
6. **Là** Thư ký Offline, **tôi muốn** Local Server realtime LAN, **để** thi khi mất mạng.
7. **Là** Thư ký, **tôi muốn** ĐỒNG BỘ sau thi, **để** lưu Sheets/Drive vĩnh viễn.

### 1.8 Business Rules

| ID | Rule |
|---|---|
| BR-01 | Một bộ Frontend code; payload Online = Offline. |
| BR-02 | Trạng thái phiếu chỉ tiến: `DRAFT → PENDING_APPROVAL → OFFICIALLY_APPROVED`. |
| BR-03 | `submitScore` chỉ chấp nhận khi trạng thái hiện tại = `DRAFT` (sau khóa từ chối). |
| BR-04 | Ba pass role độc lập theo kỳ (GK / TK / CCK); Admin cố định; Scoreboard không pass. |
| BR-05 | Pass GK chung cho mọi giám khảo kỳ đó; loại chấm (`theory`/`practice`/`both`) quyết định UI. |
| BR-06 | CCK duyệt phiếu bằng click (pass role CCK cố định, không PIN riêng). |
| BR-07 | Pass lưu **hash** (SHA-256 + salt), không plaintext trên Frontend. |
| BR-08 | Idempotency qua `idempotencyKey` khi gửi điểm / approve / sync. |
| BR-09 | Offline B: **không** lưu điểm rời trên `localStorage` từng máy. |
| BR-10 | Scoreboard chỉ hiển thị phiếu `OFFICIALLY_APPROVED`. |
| BR-11 | Luồng video song song, không thay thế luồng điểm. |
| BR-12 | Tiền kỳ Offline B bắt buộc test LAN + snapshot ở nhà. |

### 1.9 Constraints

- Không VPS 24/7; Local Server chỉ tạm tại sân.
- Phụ thuộc quota Google Apps Script.
- Sheets là CSDL trung tâm — không DB quan hệ enterprise cho Online.
- Stack: HTML/CSS/JS + PWA + Apps Script + Sheets + Drive + Node Local Server + SQLite.
- Realtime = polling (không WebSocket).

### 1.10 Assumptions (không phải đặc tả — xác nhận khi triển khai)

| Giả định | Trạng thái |
|---|---|
| Stack = Vanilla HTML/CSS/JS (FE-01 A). Không React SPA / Firebase. | ĐÃ CHỐT |
| Template Sheets + Drive Folder sẽ tạo trong Phase Database | ĐÃ CHỐT |
| `local-server/db/schema.sql` sẽ được tạo theo đặc tả docs (DB-03 A) | ĐÃ CHỐT |
| Số giám khảo / số võ sinh mỗi kỳ trong hạn mức Sheets + Apps Script | Chấp nhận rủi ro quota — theo dõi thủ công |

### 1.11 Scope

**In scope**

- Web App chấm điểm (LT / TH / đầy đủ).
- Role gate + pass theo kỳ (FE-only hash check, không server loginRole).
- Dashboard Thư ký + khóa phiếu.
- CCK duyệt phiếu (click approve, không PIN).
- Scoreboard LED (chỉ hiển thị `OFFICIALLY_APPROVED`).
- PDF export + in USB + lưu Drive.
- Online Apps Script API.
- Offline B Local Server + sync pull/push.
- Offline A hotspot (cùng Online path).
- PWA cache shell.
- Tiền kỳ / chấm thi / hậu kỳ workflows.
- Setup hướng dẫn video (Meet/Zoom/Teams) — **không** xây nền tảng video.

**Out of scope (theo SoT)**

- Server WebSocket push.
- Cryptographic digital signature (PAdES) — chỉ chữ ký hình ảnh trừ khi bổ sung công cụ ngoài.
- Quản trị VPS 24/7.
- Thay localStorage làm source of truth Offline.
- OAuth2 bảo vệ API (AUTH-05 A: không OAuth2).
- Server-side loginRole endpoint (AUTH-04 B: FE-only pass check).

---

## 2. Functional Requirements

Phân loại: **MUST** = bắt buộc MVP vận hành kỳ thi · **SHOULD** = cần cho production ổn · **NICE** = nâng cao.

### 2.1 Authentication

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Màn chọn role: GK / TK / CCK / Admin / Scoreboard | MUST |
| FR-AUTH-02 | Pass theo kỳ cho GK, TK, CCK | MUST |
| FR-AUTH-03 | Pass Admin cố định | MUST |
| FR-AUTH-04 | Scoreboard không cần pass | MUST |
| FR-AUTH-05 | Session client-side: `examId` + `role` (+ `judgeType`/`judgeId`) lưu sessionStorage | MUST |
| FR-AUTH-06 | Đổi kỳ thi → invalidate session cũ | MUST |
| FR-AUTH-07 | Không rate limit lockout khi sai pass (AP-01) | — Đã bỏ |
| FR-AUTH-08 | Hash pass SHA-256 + salt (AUTH-01 A) | MUST |
| FR-AUTH-09 | Không OAuth2 (AUTH-05 A) | — Đã bỏ |
| FR-AUTH-10 | FE-only pass check; không server loginRole endpoint (AUTH-04 B). FE validate hash client-side để gate UI. | MUST |

### 2.2 Authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-AZ-01 | Pass role không mở cross-role | MUST |
| FR-AZ-02 | Chỉ Thư ký khóa phiếu | MUST |
| FR-AZ-03 | Chỉ CCK approve (click, không PIN) | MUST |
| FR-AZ-04 | Scoreboard chỉ đọc dữ liệu `OFFICIALLY_APPROVED` | MUST |
| FR-AZ-05 | Admin tạo kỳ / sinh pass / cấu hình GK | MUST |

### 2.3 Exam Management

| ID | Requirement | Priority |
|---|---|---|
| FR-EX-01 | Admin tạo Exam Room: Folder Drive + Sheets từ template | MUST |
| FR-EX-02 | Nhập: tên, ngày, địa điểm, đợt/loại, email/mã role | MUST |
| FR-EX-03 | Sinh `examId` | MUST |
| FR-EX-04 | Sinh lại 3 pass role mỗi kỳ | MUST |
| FR-EX-05 | Không đụng pass Admin khi tạo kỳ | MUST |

### 2.4 Room Management

| ID | Requirement | Priority |
|---|---|---|
| FR-RM-01 | `roomId` trong payload / polling | MUST |
| FR-RM-02 | Folder Drive theo exam/room | SHOULD |
| FR-RM-03 | Hỗ trợ nhiều phòng thi mỗi kỳ (EXAM-01 B). UI chia bảng theo room. | MUST |

### 2.5 Student Management

| ID | Requirement | Priority |
|---|---|---|
| FR-ST-01 | Import danh sách: mã, họ tên, ngày sinh, CLB/miền, cấp thi | MUST |
| FR-ST-02 | Khởi tạo dòng điểm/trạng thái trống sau import | MUST |
| FR-ST-03 | Tên tab sheet: UPPER_SNAKE_CASE tiếng Anh (DB-01 A) | MUST |

### 2.6 Judge Management

| ID | Requirement | Priority |
|---|---|---|
| FR-JG-01 | Số lượng giám khảo tuỳ kỳ | MUST |
| FR-JG-02 | `judgeId` + tên gắn phiếu | MUST |
| FR-JG-03 | Loại: `theory` \| `practice` \| `both` | MUST |
| FR-JG-04 | Điều hướng UI theo loại chấm | MUST |
| FR-JG-05 | Một pass Giám khảo cho cả danh sách | MUST |

### 2.7 Score Management

| ID | Requirement | Priority |
|---|---|---|
| FR-SC-01 | Nhập P1, P2, P3; Tổng backend auto-tính (SCORE-03 B) | MUST |
| FR-SC-02 | Map P1/P2/P3 ↔ LT/TH configurable per exam trên Sheets/Admin (SCORE-01 B) | MUST |
| FR-SC-03 | GỬI ĐIỂM → `DRAFT`; upsert overwrite khi DRAFT (SCORE-02 A) | MUST |
| FR-SC-04 | Upsert theo `idempotencyKey` | MUST |
| FR-SC-05 | Disable edit khi không còn `DRAFT` | MUST |
| FR-SC-06 | Range điểm 0–10 step 0.5 (SCORE-04 B) | MUST |
| FR-SC-07 | `boutId` = `studentId+round` (vd `VS-xxx\|R1`) (SCORE-05 C) | MUST |

### 2.8 Approval Workflow

| ID | Requirement | Priority |
|---|---|---|
| FR-AP-01 | Khóa phiếu → `PENDING_APPROVAL` | MUST |
| FR-AP-02 | CCK click approve → `OFFICIALLY_APPROVED` (pass cố định, không PIN — AP-02) | MUST |
| FR-AP-03 | Chỉ duyệt khi đang `PENDING_APPROVAL` | MUST |
| FR-AP-04 | Không rate limit lockout sai pass (AP-01) | — |
| FR-AP-05 | Idempotency approve | MUST |

### 2.9 Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-DB-01 | Thư ký GET dữ liệu realtime qua `getData` (full data, requires TK/CCK role) | MUST |
| FR-DB-02 | Rà soát / đối chiếu / khóa phiếu | MUST |
| FR-DB-03 | Offline: polling Local API | MUST |

### 2.10 Scoreboard

| ID | Requirement | Priority |
|---|---|---|
| FR-SB-01 | Polling GET `getScoreboard` (public, không auth); Online 5–10s; Offline LAN 3–5s | MUST |
| FR-SB-02 | Hiển thị Hạng, Võ sinh, Miền, Tổng | MUST |
| FR-SB-03 | Vinh danh Thủ khoa + motion animations (SB-04 B) | SHOULD |
| FR-SB-04 | Cache `CacheService` TTL only, không sinceVersion (DB-07 B) | SHOULD |
| FR-SB-05 | Jitter polling ±1.5s | SHOULD |
| FR-SB-06 | Chỉ hiển thị `OFFICIALLY_APPROVED` (SB-01 B) | MUST |
| FR-SB-07 | Tiebreak: highest total → highest single column → lowest column (SB-03) | MUST |

### 2.11 PDF Export

| ID | Requirement | Priority |
|---|---|---|
| FR-PDF-01 | Xuất PDF sau duyệt / hậu kỳ | MUST |
| FR-PDF-02 | Trigger khi `OFFICIALLY_APPROVED` (Online) | SHOULD |
| FR-PDF-03 | Offline: sau sync hoặc in tại sân | MUST (SoT: in USB tại sân) |
| FR-PDF-04 | Template Docs/HTML; lưu Drive path theo exam/room/student | SHOULD |
| FR-PDF-05 | Chèn ảnh chữ ký + con dấu (PDF-01 A: image only, không crypto) | SHOULD |
| FR-PDF-06 | Update `pdfUrl`, `pdfGeneratedAt`, `pdfHash` | SHOULD |

### 2.12 Google Drive / Sheets

| ID | Requirement | Priority |
|---|---|---|
| FR-GD-01 | Folder kỳ thi + PDF + signatures + seals (DB-06 C) | MUST |
| FR-GS-01 | Sheets = CSDL trung tâm Online | MUST |
| FR-GS-02 | Snapshot / upsert Offline sync | MUST |

### 2.13 Offline / Online / Local Server / Sync

| ID | Requirement | Priority |
|---|---|---|
| FR-ON-01 | Mode Online đầy đủ luồng chấm–duyệt–scoreboard | MUST |
| FR-OF-01 | Mode Offline B LAN realtime | MUST |
| FR-OF-02 | Mode Offline A hotspot | SHOULD |
| FR-LS-01 | Local Server: static PWA + API mirror + SQLite | MUST |
| FR-LS-02 | `/api/health` | MUST |
| FR-SY-01 | `sync/pull` tiền kỳ | MUST |
| FR-SY-02 | `sync/push` hậu kỳ + conflict → `NEEDS_REVIEW` (chỉ Offline sync path — AP-03) | MUST |

### 2.14 Admin / Settings / Audit / Deployment

| ID | Requirement | Priority |
|---|---|---|
| FR-AD-01 | Admin quản trị tạo kỳ / pass / GK list — Full Admin UI on Web App (EXAM-02 B) | MUST |
| FR-SET-01 | Settings merged vào Admin (FE-05 A) | MUST |
| FR-AUD-01 | Audit: sync_log + LOCKED/APPROVED timestamp fields trên scores (DB-05 C) | SHOULD |
| FR-DEP-01 | GitHub Pages + Apps Script deploy + Local Server setup | MUST |
| FR-DEP-02 | Checklist Tiền kỳ / phần cứng Offline (DEP-01 C: Script + checklist verify) | MUST |

---

## 3. Non-Functional Requirements

| Area | Requirement | Priority | Nguồn |
|---|---|---|---|
| Performance | Scoreboard cảm giác live; conservative design poll 10s cache 20s (DEP-04 B) | MUST | SoT |
| Performance | Cache scoreboard CacheService TTL only (DB-07 B) | SHOULD | SoT §PHẦN 1 |
| Security | Hash pass SHA-256+salt; FE-only check; LAN Wi-Fi riêng (HTTP LAN + private SSID — AUTH-08 A) | MUST | SoT |
| Scalability | Phù hợp quy mô kỳ thi môn phái trên Sheets; không claim enterprise DB | Constraint | SoT |
| Offline First | PWA + Local Server; không localStorage-as-DB | MUST | SoT |
| Availability | Online: phụ thuộc Google; Offline: phụ thuộc laptop Thư ký | Constraint | SoT |
| Reliability | Idempotency; conflict sync; USB backup | MUST | SoT / PA-B |
| Maintainability | Stack phổ biến (Vanilla HTML/CSS/JS); 1 codebase FE | MUST | SoT |
| Extensibility | Template tái sử dụng nhiều kỳ | SHOULD | SoT |
| Browser Support | Chrome Android + Safari iOS latest + Chrome desktop (FE-03 A) | MUST | SoT |
| Responsive | Bắt buộc | MUST | SoT |
| Accessibility | Best-effort (FE-04 B) | SHOULD | — |
| Logging | sync_log + timestamp fields (DB-05 C); Online logging qua Apps Script console | SHOULD | SoT |
| Monitoring | health Local; Apps Script quota theo dõi thủ công | SHOULD | SoT |
| Backup | Drive + USB snapshot Local | MUST | SoT |
| Deployment | GH Pages workflow; Apps Script Web App; Local npm start | MUST | SoT |
| Error Handling | Retry + idempotency; NEEDS_REVIEW chỉ Offline sync (AP-03) | MUST | SoT |
| Rate Limits | Không lockout sai pass (AP-01); cache scoreboard | — | SoT |
| Storage | Sheets ngắn hạn vận hành; Drive dài hạn | MUST | SoT |

---

## 4. Summary for Handoff

Team mới cần nắm:

1. Hai kịch bản runtime, một contract API.
2. Ba giai đoạn: Tiền kỳ → Chấm thi → Hậu kỳ.
3. Role gate + 3 pass theo kỳ; CCK duyệt click (không PIN). Auth = FE-only hash check.
4. Offline B là đường production khi mất mạng — không dùng localStorage rời.
5. Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.
