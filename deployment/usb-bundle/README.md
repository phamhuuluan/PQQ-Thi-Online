# PQQ Offline B — USB Bundle

Gói triển khai cho laptop Thư ký (Phương án B — LAN không Internet).

## Nội dung gói

| Thành phần | Mô tả |
|---|---|
| `local-server/` | Express API + SQLite + Sync Engine |
| `*.html`, `js/`, `pwa/`, `assets/` | PWA static (cùng bản GitHub Pages) |
| `config.json` | Cấu hình FE (onlineApiUrl — dùng khi có mạng) |
| `SNAPSHOT_SAMPLE.json` | Mẫu metadata sau sync/pull |

## Cài đặt tại nhà (Tiền kỳ)

```bash
cd local-server
cp config.example.json config.json
cp service-account.example.json service-account.json
# Điền sheetsId, examId, credentials GCP
npm install
npm start
```

Mở `http://localhost:3000` → Dashboard Thư ký → **ĐỒNG BỔ KÉO** (sync/pull).

## Verify snapshot

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/getExamConfig?examId=PQQ-DEMO-2026-001"
```

So sánh `counts` với `SNAPSHOT_SAMPLE.json`.

## Tại sân

1. Bật router Wi-Fi `PQQ_KhaoThi` (SSID riêng)
2. Laptop IP tĩnh `192.168.1.100` (hoặc mDNS `pqq.local`)
3. `cd local-server && npm start`
4. GK quét QR → chấm điểm → GỬI ĐIỂM
5. Thư ký khóa phiếu → CCK duyệt
6. Hậu kỳ: **ĐỒNG BỔ ĐẨY** (sync/push)

## Rollback

- Giữ bản USB trước kỳ thi
- SQLite backup: copy `local-server/db/pqq.sqlite` sau mỗi buổi thi

Xem thêm: [`../../PHUONG-AN-B-LAN.md`](../../docs/PHUONG-AN-B-LAN.md)
