# Offline MVP — Acceptance Checklist

> Tiêu chí nghiệm thu duy nhất: **có thể tổ chức một kỳ thi Offline thực tế tại một CLB**.  
> Chỉ đánh dấu `[x]` khi đã **kiểm chứng bằng tay** (không chỉ “có code”).  
> Online / multi-exam / PDF Drive / PWA data-plane: **ngoài phạm vi**.

**Trạng thái:** IN PROGRESS  
**Quy ước vận hành:** 1 kỳ = 1 laptop Thư ký = 1 Local Server = 1 SQLite = 1 Spreadsheet = 1 USB (Club Pack)

---

## A. Prep (có Internet — trước ngày thi)

- [ ] Tạo kỳ thi `mode=offline` (Admin / Apps Script)
- [ ] Import thí sinh thành công
- [ ] Import giám khảo thành công (`judgeType`: theory | practice | both)
- [ ] Có mật khẩu role GK / TK / CCK
- [ ] Share Spreadsheet Editor với Service Account
- [ ] Điền `local-server/config.json` **đúng 1** phần tử trong `exams[]`
- [ ] `sync/pull` thành công (students + judges + exam config vào SQLite)

## B. Setup ngày thi (LAN — có thể mất Internet)

- [ ] Khởi động Local Server trên laptop Thư ký
- [ ] `GET /api/health` healthy
- [ ] Thiết bị GK/CCK/TV cùng Wi-Fi LAN, mở URL Local Server
- [ ] Chọn đúng `examId`
- [ ] Đăng nhập TK / CCK / GK bằng mật khẩu kỳ thi

## C. Chấm điểm (Blocker-critical)

- [ ] Giám khảo **chọn đúng bản thân** (judgeId) khi đăng nhập
- [ ] Hệ thống mở đúng form theo `judgeType` (theory / practice / full)
- [ ] Hai GK khác nhau không ghi đè phiếu của nhau (idempotency theo judgeId)
- [ ] Danh sách thí sinh hiển thị sau đăng nhập GK
- [ ] Gửi điểm → trạng thái `DRAFT`
- [ ] ≥3 thiết bị chấm đồng thời trên LAN

## D. Khóa / Duyệt / In

- [ ] Thư ký khóa phiếu → `PENDING_APPROVAL`
- [ ] CCK phê duyệt → `OFFICIALLY_APPROVED`
- [ ] Scoreboard chỉ hiện phiếu đã duyệt, cập nhật trên LAN
- [ ] In kết quả tại sân (browser print / USB printer)

## E. Hậu kỳ (có mạng trở lại)

- [ ] `sync/push` đẩy điểm **và STATUS** (DRAFT / PENDING / APPROVED) lên Sheets
- [ ] Đối chiếu vài dòng trên Spreadsheet khớp SQLite

## F. Backup / Restore / Sự cố

- [ ] Backup: copy được file SQLite (+ config) ra USB
- [ ] Restore: thay SQLite từ USB → Local Server đọc lại điểm đã chấm
- [ ] Mất Internet trong giờ thi: vẫn chấm / khóa / duyệt trên LAN
- [ ] Mất điện laptop: có SOP (pin / UPS / laptop dự phòng + USB DB)

## G. Nghiệm thu tổng

- [ ] Chạy xong **Offline Rehearsal** (kịch bản đầy đủ) không lỗi blocker
- [ ] Thư ký làm theo checklist Club Pack **không cần sửa code**
- [ ] Product Owner ký xác nhận Offline MVP đạt

---

## Blocker tracking (từ Audit)

| ID | Hạng mục | Mức | Trạng thái |
|---|---|---|---|
| B1 | Judge identity + routing form + GK đọc danh sách TS | BLOCKER | CLOSED (Manual PASS) |
| B2 | Sync push không cập nhật STATUS lên Sheets | BLOCKER | CODE READY — chờ Manual Test PASS |
| B3 | Club Pack 1:1:1 + backup/restore tối thiểu | BLOCKER (ops) | OPEN |
| B4 | Rehearsal E2E Offline B ký xác nhận | BLOCKER (ops) | OPEN |
| C1 | config placeholder / deploy GAS thật | CRITICAL | OPEN |
| C2 | Auth LAN tin client role | CRITICAL (chấp nhận SSID riêng) | DEFER soft |
| N1 | PDF Drive offline | NICE | POSTPONE |
| N2 | PIN CCK (đã bỏ theo DEC) | — | N/A |
| N3 | Multi-exam UI / multi-tenant | — | POSTPONE |
| N4 | Offline A Hotspot | — | POSTPONE |
| N5 | PWA data-plane | — | POSTPONE |
