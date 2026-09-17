# Checklist Tiền Kỳ — Ban Tổ Chức (T-1014)

> In tài liệu này và tick tại nhà **1–2 ngày trước ngày thi**.

**Kỳ thi:** _________________________  **Ngày thi:** ____/____/2026  
**Phương án:** [ ] Online 3 miền  [ ] Offline B (LAN)  [ ] Hybrid

---

## A. Hạ tầng & tài khoản

| # | Hạng mục | Người | ✓ | Ghi chú |
|---|---|---|---|---|
| A1 | Spreadsheet kỳ thi đã tạo (`createExamRoom`) | Admin | | examId: |
| A2 | Apps Script production URL đã deploy | IT | | |
| A3 | GitHub Pages URL đã deploy + config đúng | IT | | |
| A4 | ACL Sheets/Drive least privilege (DEC-AUTH-07) | IT | | |
| A5 | Offline B: USB bundle + laptop + router | IT | | |

## B. Dữ liệu kỳ thi

| # | Hạng mục | ✓ | Ghi chú |
|---|---|---|---|
| B1 | Danh sách võ sinh import đủ | | số lượng: |
| B2 | Danh sách giám khảo + judgeType | | |
| B3 | Phòng/bảng thi (roomId) | | |
| B4 | 3 pass GK/TK/CCK đã phát (Admin giữ) | | |
| B5 | QR/link GK đã in hoặc gửi Zalo | | |

## C. Rehearsal bắt buộc

| # | Hạng mục | ✓ |
|---|---|---|
| C1 | E2E Online dry-run ≥3 thiết bị ([E2E_ONLINE_DRY_RUN.md](./E2E_ONLINE_DRY_RUN.md)) | |
| C2 | Offline B: drill LAN nếu chọn PA-B ([E2E_OFFLINE_B_DRILL.md](./E2E_OFFLINE_B_DRILL.md)) | |
| C3 | `npm test` pass trên máy IT | |
| C4 | Scoreboard LED test tại địa điểm (nếu có) | |
| C5 | In USB test 1 phiếu mẫu ([HUONG_DAN_IN_USB.md](../docs/HUONG_DAN_IN_USB.md)) | |

## D. Tại sân — ngày G

| # | Việc | ✓ |
|---|---|---|
| D1 | Wi-Fi / 4G sẵn sàng theo phương án | |
| D2 | Local Server chạy (nếu Offline B) | |
| D3 | Health check / banner xanh | |
| D4 | Backup SQLite hoặc Sheets snapshot | |

---

**Ban TC xác nhận Tiền kỳ hoàn tất:**

| Vai trò | Họ tên | Chữ ký | Ngày |
|---|---|---|---|
| Trưởng Ban TC | | | |
| Thư ký | | | |
| IT/Kỹ thuật | | | |

---

# Production Sign-Off — Trước giờ thi (T-1014)

> Ký **trong ngày thi**, trước khi võ sinh bước vào sân.

**Kỳ thi:** _________________________  **Giờ G:** _______

| # | Kiểm tra cuối | ✓ |
|---|---|---|
| P1 | URL Pages + Apps Script hoạt động | |
| P2 | Role Gate tất cả vai trò OK | |
| P3 | ≥1 GK test gửi điểm thành công | |
| P4 | Dashboard Thư ký nhận phiếu | |
| P5 | Scoreboard hiển thị (sau duyệt test) | |
| P6 | Kế hoạch B sẵn sàng nếu mất mạng | |
| P7 | Liên hệ IT khẩn: _________________ | |

**Xác nhận GO-LIVE:**

| Vai trò | Họ tên | Chữ ký | Giờ |
|---|---|---|---|
| Chánh chủ khảo | | | |
| Thư ký | | | |
| IT trực | | | |

**NO-GO** (ghi lý do): _______________________________________________
