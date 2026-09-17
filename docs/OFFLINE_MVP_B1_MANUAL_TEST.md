# Blocker #1 — Manual Test (Judge Session & Identity)

> **Không đóng B1** cho đến khi checklist dưới đây PASS trên thiết bị thật.  
> Unit test không thay thế bước này.

## Chuẩn bị (máy Thư ký / laptop dev)

```bash
cd local-server && npm install
cd .. && npm run seed
cd local-server && npm start
```

Mở trên điện thoại/máy trong cùng mạng (hoặc cùng máy):

`http://<IP-laptop>:3000` hoặc `http://localhost:3000`

| Mục | Giá trị demo |
|---|---|
| Kỳ thi | `PQQ-DEMO-2026-001` |
| Mật khẩu GK | `demo123` |
| Giám khảo seed | Nguyễn Văn A / Trần Văn B (lý thuyết), Lê Văn C / Phạm Văn D (thực hành), Hoàng Thị E (đầy đủ) |

---

## Checklist nghiệm thu

Đánh dấu khi **đã làm tay** và kết quả đúng.

### Luồng đăng nhập

- [ ] Chọn đúng kỳ thi `PQQ-DEMO-2026-001`
- [ ] Chọn role Giám khảo → nhập `demo123` → đăng nhập thành công
- [ ] Hiện danh sách giám khảo **theo tên**, dạng: `Nguyễn Văn A - Giám khảo lý thuyết` (**không** hiện `GK-101` trên UI)
- [ ] Nút xác nhận là **Bắt đầu chấm thi**

### Judge Session

- [ ] Chọn Nguyễn Văn A → vào `judge-theory.html`
- [ ] Header/form hiện tên + loại, **không** hiện mã GK
- [ ] DevTools → Application → Session Storage `pqq_session` có đủ: `examId`, `role`, `judgeId`, `judgeName`, `judgeType`
- [ ] `judgeId` / `judgeType` khớp người đã chọn

### Redirect theo loại

- [ ] Trần Văn B (theory) → màn Lý thuyết
- [ ] Lê Văn C (practice) → màn Thực hành *(Đăng xuất trước khi đổi người)*
- [ ] Hoàng Thị E (both) → màn Đầy đủ

### getData + chấm điểm

- [ ] Danh sách thí sinh hiện (VS demo)
- [ ] Gửi điểm 1 thí sinh → thành công, trạng thái DRAFT
- [ ] Hai giám khảo khác nhau (A rồi C, sau logout) chấm cùng thí sinh → **hai phiếu**, không ghi đè nhau

### Device rule + Logout

- [ ] Sau khi đã vào chấm, mở lại trang chủ → thấy banner phiên đang mở, **không** cho chọn role khác
- [ ] **Tiếp tục chấm thi** quay lại đúng màn
- [ ] **Đăng xuất** xóa session → có thể chọn giám khảo khác
- [ ] Một thiết bị tại một thời điểm chỉ một Judge Session

### Thiết bị thật

- [ ] Lặp login → chọn GK → chấm → logout thành công trên **điện thoại thật** (Chrome/Safari) nối LAN/Local Server

---

## Kết quả

| Trường | Giá trị |
|---|---|
| Người test | _______________ |
| Ngày | ____/____/2026 |
| Môi trường | localhost / LAN IP: _______________ |
| Kết quả | [ ] PASS · [ ] FAIL |
| Ghi chú lỗi | |

**Chỉ khi PASS** mới được đóng Blocker #1 và chuyển Blocker #2.
