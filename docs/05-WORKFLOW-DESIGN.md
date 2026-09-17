# 05 — Workflow Design

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

**Source of Truth:** mọi workflow trong `QUY-TRINH-THI-ONLINE-PQQ.md` + `PHUONG-AN-B-LAN.md` — không bỏ sót macro flow.

---

## Macro: 3 giai đoạn

```mermaid
flowchart LR
  G1[Giai đoạn 1<br/>Tiền Kỳ · 1–2 ngày trước · tại nhà]
  G2[Giai đoạn 2<br/>Chấm thi · Cloud-First hoặc Local Server]
  G3[Giai đoạn 3<br/>Hậu kỳ · Đồng bộ Cloud · Lưu Drive]
  G1 --> G2 --> G3
```

---

## 10.1 Online Workflow (3 miền Live)

### Bước vận hành tại sân

1. **Setup Video** (song song): Meet/Zoom/Teams · 3 điểm cầu + Tổ đình · camera toàn/cận cảnh · âm thanh 2 chiều · LED.
2. **Chấm điểm**
   - GK: Web App → GỬI ĐIỂM → Apps Script → Sheets `DRAFT`.
   - TK: Dashboard GET getData → Khóa phiếu → `PENDING_APPROVAL`.
   - CCK: xem + click approve → `OFFICIALLY_APPROVED` (không PIN).
3. **Scoreboard**: polling GET getScoreboard (public) 5–10s · chỉ OFFICIALLY_APPROVED · Hạng/Võ sinh/Miền/Tổng · Thủ khoa + motion animations.
4. **Hậu kỳ**: PDF · in · Drive (điểm đã realtime trên Sheets).

```mermaid
sequenceDiagram
  participant GK as Giám khảo
  participant WA as Web App
  participant AS as Apps Script
  participant GS as Google Sheets
  participant TK as Thư ký
  participant CCK as CCK
  participant SB as Scoreboard LED

  GK->>WA: Nhập điểm + GỬI ĐIỂM
  WA->>AS: fetch POST doPost
  AS->>GS: Validate & ghi DRAFT (total auto-calc)
  TK->>WA: Dashboard
  WA->>AS: GET getData
  TK->>AS: Khóa phiếu
  AS->>GS: PENDING_APPROVAL + locked_at
  CCK->>WA: Click approve
  WA->>AS: approveScore (no PIN)
  AS->>GS: OFFICIALLY_APPROVED + approved_at
  loop 5–10s
    SB->>AS: GET getScoreboard
    AS-->>SB: Ranking (OFFICIALLY_APPROVED only)
  end
```

---

## 10.2 Offline Workflow

### Phương án A — Hotspot 4G (dự phòng)

- Điện thoại phát hotspot → thiết bị kết nối → **giống Online** (Apps Script).
- Không Local Server.

### Phương án B — LAN Local Server (chính)

Xem chi tiết PA-B.

```mermaid
flowchart TB
  subgraph LAN["Wi-Fi nội bộ · không Internet"]
    TK[Laptop Thư ký Local Server + SQLite]
    GK1[GK1]
    GK2[GK2]
    GK3[GK3]
    LED[Scoreboard LED]
  end
  GK1 -->|POST submitScore| TK
  GK2 -->|POST submitScore| TK
  GK3 -->|POST submitScore| TK
  TK -->|GET 3–5s| LED
  TK -->|Sau thi ĐỒNG BỘ| CLOUD[Sheets + Drive]
```

Luồng nghiệp vụ giữ nguyên: **GỬI ĐIỂM → DRAFT → Khóa → CCK click approve → OFFICIALLY_APPROVED**.

---

## 10.3 Local Server Workflow (Tiền kỳ → Giờ thi → Hậu kỳ)

### Tiền kỳ (có Internet, tại nhà)

```mermaid
flowchart TD
  START[Tiền Kỳ 1–2 ngày trước]
  S1[Admin Apps Script: Folder + Sheets Exam Room]
  S2[Import võ sinh]
  S3[Link/QR — GH Pages hoặc IP LAN / pqq.local]
  S4[Router + Local Server + snapshot pull + test in + E2E]
  DONE[Checklist đạt · sẵn sàng sân]
  START --> S1 --> S2 --> S3 --> S4 --> DONE
```

Checklist kết quả Tiền kỳ (SoT):

- [ ] Phòng thi (Folder + Sheets) đã tạo
- [ ] Danh sách võ sinh import đủ
- [ ] Link/QR sẵn sàng (EXAM-03 B: generateQrLinks)
- [ ] Router + Local Server + máy in đã test *(bắt buộc Offline B)*

### Trong giờ thi

1. Thư ký bật router + `npm start` Local Server.
2. GK join Wi-Fi `PQQ_KhaoThi` → QR `http://pqq.local:3000` hoặc `http://192.168.1.100:3000`.
3. GỬI ĐIỂM → SQLite `DRAFT`.
4. Dashboard / LED poll Local 3–5s.
5. Khóa phiếu → CCK click approve → Approved.
6. Xuất PDF, in USB tại sân (nếu cần).

### Hậu kỳ

1. Có 4G/Wi-Fi.
2. Nút **ĐỒNG BỘ** / `POST /api/sync/push`.
3. Upsert Sheets + PDF/backup Drive.

---

## 10.4 Approval Workflow (không PIN — AP-02)

```mermaid
stateDiagram-v2
  [*] --> DRAFT: Giám khảo gửi điểm
  DRAFT --> PENDING_APPROVAL: Thư ký khóa phiếu (+ locked_at)
  PENDING_APPROVAL --> OFFICIALLY_APPROVED: CCK click approve (+ approved_at)
  OFFICIALLY_APPROVED --> [*]: PDF / Scoreboard công bố
```

Frontend sau khóa:

- Disable input + nút GỬI ĐIỂM nếu status ≥ `PENDING_APPROVAL`.
- Backend vẫn enforce reject submit.
- CCK duyệt bằng click (pass role CCK cố định, không PIN riêng).

---

## 10.5 PDF Workflow

```mermaid
flowchart TD
  A[OFFICIALLY_APPROVED]
  B[Apps Script đọc phiếu Sheets]
  C[Điền template Docs/HTML]
  D[Chèn ảnh chữ ký + con dấu Drive — image only PDF-01 A]
  E[Export PDF]
  F[Lưu Drive ExamRoom/examId/roomId/PDF_Phiếu/studentId]
  G[Update pdfUrl pdfGeneratedAt pdfHash — follow-up sau MVP]
  A --> B --> C --> D --> E --> F --> G
```

- Online: trigger sau approve.
- Offline: sau sync lên Sheets (và/hoặc in tại sân trước sync).
- Chữ ký cryptographic: **ngoài scope** (PDF-01 A: image only).

---

## 10.6 Export Workflow (in ấn tại chỗ)

```text
Web App duyệt kết quả
  → Xuất PDF
  → Máy in USB (laptop Thư ký)
  → Thầy Chưởng Môn ký & đóng dấu bản giấy
```

---

## 10.7 Sync Workflow

```mermaid
flowchart TD
  PULL[POST sync/pull · Tiền kỳ · service account OFF-02 A] --> SQL[(SQLite snapshot)]
  SQL --> EXAM[Giờ thi ghi scores]
  EXAM --> PUSH[POST sync/push · Hậu kỳ · LockService OFF-03 A]
  PUSH --> CHK{idempotencyKey / payloadHash}
  CHK -->|OK| GS[Upsert Sheets]
  CHK -->|Conflict| NR[NEEDS_REVIEW — chỉ Offline sync AP-03]
  CHK -->|Cloud đã PENDING/APPROVED| RJ[Reject hoặc NEEDS_REVIEW]
  GS --> DR[Drive PDF/backup/signatures/seals]
```

---

## 10.8 Deployment Workflow

```mermaid
flowchart TD
  DEV[GitHub repo 1 bộ code] --> Pages[GitHub Pages FE multi-page HTML]
  DEV --> AS[Deploy Apps Script Web App — Anyone access]
  AS --> BIND[Gắn URL vào config.json API-04 A]
  DEV --> LS[Ship local-server lên laptop Thư ký]
  Pages --> RUN_ON[Online thi]
  LS --> RUN_OFF[Offline B thi]
  RUN_OFF --> SYNC[ĐỒNG BỘ Cloud]
```

Switch mode:

```mermaid
flowchart LR
  A[Người dùng / URL] --> B{Origin?}
  B -->|GitHub Pages| C[Apps Script]
  C --> D[Sheets realtime]
  B -->|IP LAN / pqq.local| E[Local API]
  E --> F[SQLite]
  F --> G[Realtime LAN]
  F --> H{Mạng sau thi?}
  H -->|Có| I[ĐỒNG BỘ]
  I --> D
```

---

## 10.9 Role Gate Workflow (đã chốt — FE-only auth)

```text
Mở Web App (index.html)
 → CHỌN ROLE
      Scoreboard → redirect scoreboard.html ngay
      Giám khảo → pass (FE hash check) → theory|practice|both → redirect judge-*.html
      Thư ký → pass (FE hash check) → redirect dashboard.html
      CCK → pass (FE hash check) → redirect approve.html
      Admin → pass cố định (FE hash check) → redirect admin.html
 → Session client-side: examId + role (+ judgeType/judgeId) in sessionStorage
```

Pass lưu hash Sheets (Online) / SQLite (Offline). FE-only check (AUTH-04 B).

---

## 10.10 Edge Cases (SoT PHẦN 3)

| Case | Xử lý |
|---|---|
| Online mạng chập chờn | Retry cùng `idempotencyKey` |
| Sync conflict Offline | `NEEDS_REVIEW` (chỉ Offline — AP-03); CCK chọn attempt đúng |
| Laptop/router Offline | USB backup, laptop dự phòng, test trước (PA-B) |
| Sai pass nhiều lần | Không lockout (AP-01) |

---

## Chọn phương án tại sân (Sau Tiền kỳ)

| Điều kiện | Phương án |
|---|---|
| 4G/Wi-Fi ổn định | A Cloud-First (Online) |
| Mất sóng / sóng yếu | B LAN Local Server |
