# E2E Offline B Drill — PA-B Checklist phần cứng (T-1008)

> Tham chiếu: [`docs/PHUONG-AN-B-LAN.md`](../docs/PHUONG-AN-B-LAN.md)

## Phần cứng bắt buộc

| # | Hạng mục | Spec tối thiểu | ✓ |
|---|---|---|---|
| 1 | Laptop Thư ký | Node 18+, pin đủ 4h | |
| 2 | Router Wi-Fi riêng | SSID `PQQ_KhaoThi`, không Internet cần thiết | |
| 3 | IP tĩnh laptop | `192.168.1.100` hoặc mDNS `pqq.local` | |
| 4 | GK devices | ≥3 phone/tablet, Chrome/Safari mới nhất | |
| 5 | USB backup | Chứa bundle `PQQ-Offline-B` | |
| 6 | Máy in USB (optional) | In phiếu tại sân | |

## Tiền kỳ tại nhà

- [ ] `npm run bundle:usb` → copy gói lên USB
- [ ] `cp config.example.json config.json` + service account
- [ ] `npm run seed` hoặc sync/pull từ Sheets thật
- [ ] `curl http://localhost:3000/api/health` → healthy
- [ ] In QR cho từng GK (`generateQrLinks` hoặc template Admin)

## Drill tại nhà (mô phỏng sân)

### Setup

- [ ] Tắt Wi-Fi Internet trên laptop (chỉ LAN router)
- [ ] `cd local-server && npm start`
- [ ] 3 điện thoại kết nối SSID `PQQ_KhaoThi`

### Kịch bản

| Bước | Ai | Kiểm tra | ✓ |
|---|---|---|---|
| 1 | Thư ký | Health banner xanh | |
| 2 | GK1–3 | Mở `http://192.168.1.100` → Role Gate | |
| 3 | GK | submitScore → DRAFT | |
| 4 | LED | Scoreboard cập nhật 3–5s | |
| 5 | Thư ký | lockSheet → PENDING | |
| 6 | CCK | approve → OFFICIALLY_APPROVED | |
| 7 | Thư ký | sync/push (bật 4G tạm) → Sheets | |

### Automated smoke (trước drill)

```bash
npm test
```

## Sự cố thường gặp

| Triệu chứng | Xử lý |
|---|---|
| GK không vào được | Kiểm tra IP/QR, cùng SSID |
| API lỗi 429 | Đợi 30s (rate limit) |
| Scoreboard trống | Chờ CCK duyệt (chỉ APPROVED) |
| Sync push fail | Kiểm tra service account + share Sheets |

**Người drill:** _______________  **Ngày:** ____/____/2026

**Ký xác nhận drill đạt:** _______________
