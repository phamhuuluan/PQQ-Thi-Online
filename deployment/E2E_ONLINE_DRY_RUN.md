# E2E Online Dry-Run — ≥3 thiết bị (T-1007)

> Thực hiện **1–2 ngày trước kỳ thi** tại nhà, có Internet.

## Thiết bị tối thiểu

| # | Thiết bị | Vai trò test |
|---|---|---|
| 1 | Laptop | Thư ký Dashboard |
| 2 | Tablet/Phone | Giám khảo LT |
| 3 | Phone | Giám khảo TH |
| 4 | Laptop/TV (optional) | Scoreboard LED |

## Tiền điều kiện

- [ ] Apps Script production deployed (T-1012)
- [ ] GitHub Pages deployed với đúng `onlineApiUrl` (T-1011)
- [ ] Kỳ thi test đã tạo qua Admin (`createExamRoom`)
- [ ] ≥3 võ sinh + ≥2 GK trong Sheets

## Kịch bản dry-run

### Bước 1 — Role Gate (tất cả thiết bị)

- [ ] Mở URL Pages → chọn role → nhập pass → redirect đúng trang
- [ ] Scoreboard mở không cần pass

### Bước 2 — Chấm điểm song song (GK 1 + GK 2)

- [ ] GK1: judge-theory → chọn võ sinh → P1 → **GỬI ĐIỂM** → status DRAFT
- [ ] GK2: judge-practice → cùng võ sinh → P2/P3 → **GỬI ĐIỂM**
- [ ] Retry cùng idempotencyKey → duplicate OK (không lỗi)

### Bước 3 — Dashboard Thư ký

- [ ] Dashboard polling hiện phiếu DRAFT
- [ ] **Khóa phiếu** → PENDING_APPROVAL
- [ ] GK không sửa được điểm sau khóa

### Bước 4 — CCK Approval

- [ ] approve.html → danh sách PENDING
- [ ] Click **Duyệt** → OFFICIALLY_APPROVED (không PIN)

### Bước 5 — Scoreboard

- [ ] scoreboard.html?examId=... → hiện điểm sau ≤15s
- [ ] Chỉ OFFICIALLY_APPROVED (không hiện DRAFT)

### Bước 6 — PDF (nếu có mạng)

- [ ] Dashboard → Xuất PDF → `pdfUrl` trên Sheets

## Ghi nhận kết quả

| Thiết bị | Browser | Pass/Fail | Ghi chú |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

**Người test:** _______________  **Ngày:** ____/____/2026

**Ký xác nhận dry-run đạt:** _______________
