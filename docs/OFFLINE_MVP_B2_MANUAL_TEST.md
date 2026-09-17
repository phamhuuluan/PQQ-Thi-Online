# Blocker #2 — Manual Test (Sync Push STATUS)

> **Không đóng B2** cho đến khi checklist dưới đây PASS.  
> Unit/API test không thay thế kiểm tra trên Spreadsheet thật (hoặc mô phỏng đủ 2 nhánh: insert + update).

**Mục tiêu:** Sau khóa/duyệt Offline, `sync/push` phải đưa **STATUS** (và lock/approve metadata) lên Google Sheets — không để Sheets kẹt `DRAFT`.

---

## Chuẩn bị

1. Local Server chạy, kỳ offline đã `sync/pull`.
2. Service Account Editor trên Spreadsheet của kỳ.
3. Dashboard Thư ký (LAN) đăng nhập được.

Mô phỏng 2 tình huống (cả hai đều bắt buộc):

| Tình huống | Ý nghĩa thực tế |
|---|---|
| **A — Push lần đầu sau duyệt** | Chấm cả buổi → khóa → duyệt → mới push (hàng mới trên Sheets) |
| **B — Push sau khi Sheets đã có DRAFT** | Đã có dòng cloud (pull/push sớm) → offline khóa/duyệt → push lại phải **update STATUS** |

---

## Functional / Offline checklist

### Tình huống A — Insert đầy đủ STATUS

- [ ] GK gửi điểm → SQLite `DRAFT`
- [ ] TK khóa → `PENDING_APPROVAL`
- [ ] CCK duyệt → `OFFICIALLY_APPROVED`
- [ ] TK bấm **Đồng bộ lên Cloud** (`sync/push`) khi có mạng
- [ ] Push báo thành công (`pushed` ≥ 1 hoặc tương đương)
- [ ] Mở tab **SCORES** trên Spreadsheet: dòng tương ứng có `STATUS = OFFICIALLY_APPROVED`
- [ ] Có `APPROVED_AT` / `APPROVED_BY` (không trống nếu UI/DB đã ghi)

### Tình huống B — Update STATUS (lõi Blocker #2)

Cách dựng nhanh:

1. Gửi điểm DRAFT → **push lần 1** (Sheets = DRAFT)  
2. Khóa + duyệt trên Local (không sửa điểm)  
3. **Push lần 2**

Hoặc: pull kỳ đã có dòng DRAFT trùng `IDEMPOTENCY_KEY`, rồi khóa/duyệt offline, push.

- [ ] Sau khóa/duyệt, phiếu vẫn nằm trong hàng đợi sync (không bị “đã sync” bỏ quên)
- [ ] Push lần 2: kết quả có **`updated` ≥ 1** (không chỉ `skipped`)
- [ ] Sheets đổi từ `DRAFT` → `PENDING_APPROVAL` hoặc thẳng `OFFICIALLY_APPROVED` đúng SQLite
- [ ] **Không** tạo dòng trùng cùng `IDEMPOTENCY_KEY`
- [ ] Điểm P1/P2/P3 trên Sheets **không đổi** so với trước khi khóa

---

## Edge / Failure

- [ ] Push khi **mất mạng** → lỗi rõ, SQLite vẫn giữ STATUS đã duyệt (không mất dữ liệu local)
- [ ] Push khi thiếu service account / chưa share Sheets → lỗi rõ, không đánh dấu synced nhầm
- [ ] Hai phiếu 2 giám khảo: cả hai STATUS lên Sheets đúng
- [ ] Conflict điểm (hash khác, cùng key) → `NEEDS_REVIEW` / không ghi đè điểm cloud tùy rule hiện tại — không làm hỏng các phiếu bình thường

---

## Regression (Blocker #1)

- [ ] Login GK → chọn giám khảo → chấm → submit vẫn OK
- [ ] Hai GK không ghi đè idempotency của nhau

---

## Cách kiểm tra kết quả trên Sheets

1. Mở Spreadsheet kỳ thi → sheet `SCORES`
2. Tìm cột `IDEMPOTENCY_KEY` khớp phiếu vừa chấm
3. Đối chiếu cột: `STATUS`, `LOCKED_AT`, `APPROVED_AT`, `P1`–`P3`, `TOTAL`
4. So với Dashboard Local: cùng STATUS

Trên Dashboard Offline: xem **Sync log** (nếu có) — kỳ vọng có mục `inserted` và/hoặc `updated_status`.

---

## Kết quả nghiệm thu

| Trường | Giá trị |
|---|---|
| Người test | _______________ |
| Ngày | ____/____/2026 |
| ExamId | _______________ |
| Spreadsheet | _______________ |
| Tình huống A | [ ] PASS · [ ] FAIL |
| Tình huống B | [ ] PASS · [ ] FAIL |
| Kết quả chung | [ ] PASS · [ ] FAIL |
| Ghi chú | |

**Chỉ khi PASS** mới đóng Blocker #2 và chuyển Blocker #3 (Club Pack / backup).
