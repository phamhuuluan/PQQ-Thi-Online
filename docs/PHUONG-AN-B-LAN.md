# Phương án B · LAN Local Server

**Phạm vi:** Ngày thi của kỳ **`exam.mode=offline`** — chấm realtime khi không có Internet, chỉ cần mạng LAN nội bộ.

> Local Server **không** định nghĩa Offline Mode toàn hệ thống.  
> Kỳ Offline do **Admin tạo trước** trên hệ thống quản trị; Thư ký chỉ host LAN ngày thi.

---

## Tóm tắt

Laptop **Thư ký** host Local Server (API + SQLite) cho **các kỳ Offline đã pull**. Giám khảo / CCK kết nối cùng Wi-Fi, chọn đúng `examId`, gửi điểm realtime — payload mirror Online, backend là laptop thay vì Apps Script.

Internet chỉ cần:
- **Trước thi (Admin)** — tạo kỳ Offline + cấu hình TS/GK trên Cloud
- **Trước thi (Thư ký)** — snapshot `sync/pull` Sheets → SQLite theo `examId`
- **Sau thi** — `sync/push` kết quả lên Sheets & Drive

Một Local Server đăng ký nhiều kỳ offline qua `config.exams[]` (`examId` + `sheetsId`).

---

## Sơ đồ vận hành

```text
                    ┌──────────────────────────────────────┐
                    │  Laptop Thư ký · 192.168.1.100     │
                    │  ┌────────────┐  ┌───────────────┐  │
                    │  │ PWA (static)│  │ Local API     │  │
                    │  │ Dashboard  │  │ + SQLite DB   │  │
                    │  │ Scoreboard │  │ + Sync module │  │
                    │  └────────────┘  └───────────────┘  │
                    └──────────────────┬───────────────────┘
                                       │ Wi-Fi LAN (PQQ_KhaoThi)
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
         GK1 (phone)              GK2 (tablet)              GK3 (phone)
         GỬI ĐIỂM                 GỬI ĐIỂM                 GỬI ĐIỂM
         POST /api/submitScore     POST /api/submitScore     POST /api/submitScore
```

---

## Luồng theo giai đoạn

### Tiền kỳ (1–2 ngày trước, tại nhà — có Internet)

| Bước | Việc |
|---|---|
| 1 | **Admin** tạo kỳ thi trên hệ thống quản trị, chọn **Offline**, import TS/GK |
| 2 | Cài Local Server trên laptop Thư ký (`local-server/`) |
| 3 | Thêm kỳ vào `config.exams[]` (`examId` + `sheetsId`); share SA Editor |
| 4 | **Snapshot** — `POST /api/sync/pull` Sheets → SQLite theo `examId` |
| 5 | Cấu hình router Wi-Fi: SSID `PQQ_KhaoThi`, IP tĩnh laptop |
| 6 | In QR trỏ LAN URL kèm `?examId=...` |
| 7 | **Test E2E**: chọn kỳ → 3 máy → gửi điểm → Scoreboard 3–5s |

### Trong giờ thi (mất sóng 100%, chỉ LAN)

| Bước | Ai | Việc |
|---|---|---|
| 1 | Thư ký | Bật router + khởi động Local Server |
| 2 | Giám khảo | Kết nối Wi-Fi `PQQ_KhaoThi`, quét QR / mở link LAN |
| 3 | Giám khảo | Nhập điểm → **GỬI ĐIỂM** → `POST /api/submitScore` |
| 4 | Local Server | Ghi SQLite, trả `DRAFT` |
| 5 | Dashboard / LED | Polling `GET /api/getData` mỗi 3–5s |
| 6 | Thư ký | Rà soát → **Khóa phiếu** → `PENDING_APPROVAL` |
| 7 | CCK | Nhập PIN → `OFFICIALLY_APPROVED` |
| 8 | Thư ký | Xuất PDF, in USB tại sân |

### Hậu kỳ (có 4G/Wi-Fi)

1. Thư ký bấm **ĐỒNG BỘ LÊN CLOUD**
2. Local Server upsert theo `idempotencyKey` lên Google Sheets
3. Upload PDF / backup lên Google Drive

---

## API Local Server

Mirror contract của Apps Script để frontend dùng **một bộ code** với API adapter.

| Endpoint | Method | Mục đích |
|---|---|---|
| `/api/health` | GET | Kiểm tra server sống |
| `/api/submitScore` | POST | Giám khảo gửi điểm → `DRAFT` |
| `/api/getData` | GET | Dashboard / Scoreboard polling |
| `/api/lockSheet` | POST | Thư ký khóa phiếu → `PENDING_APPROVAL` |
| `/api/approve` | POST | CCK duyệt PIN → `OFFICIALLY_APPROVED` |
| `/api/sync/pull` | POST | Tiền kỳ: snapshot từ Sheets |
| `/api/sync/push` | POST | Hậu kỳ: đẩy lên Sheets |

### Payload `submitScore` (giống Online)

```json
{
  "action": "submitScore",
  "examId": "PQQ-HCM-2026-008",
  "roomId": "ROOM_A",
  "boutId": "BOUT-000123",
  "student": { "studentId": "VS-000058", "studentName": "TRAN VAN B" },
  "judge": { "judgeId": "GK-101", "judgeName": "NGUYEN VAN A" },
  "scores": { "P1": 7, "P2": 8, "P3": 6, "total": 21 },
  "note": "Đòn kỹ thuật sạch, tinh thần ổn định.",
  "idempotencyKey": "PQQ-HCM-2026-008|ROOM_A|BOUT-000123|VS-000058|GK-101",
  "submittedAt": "2026-07-16T14:37:12.123+07:00"
}
```

---

## Frontend — API Adapter

```javascript
function getApiBase() {
  const host = window.location.hostname;
  // Phục vụ từ Local Server → cùng origin
  if (host === '192.168.1.100' || host.endsWith('.local')) return '';
  // Online → Apps Script
  return 'https://script.google.com/macros/s/.../exec';
}
```

| Mode | `API_BASE` | Nút | Realtime |
|---|---|---|---|
| Online 3 miền | Apps Script (Internet) | GỬI ĐIỂM | Có (Cloud) |
| **Offline B · LAN** | `http://192.168.1.100` | **GỬI ĐIỂM** | **Có (LAN)** |

---

## CSDL cục bộ (SQLite)

| Bảng | Mục đích |
|---|---|
| `students` | Danh sách võ sinh (snapshot) |
| `judges` | Giám khảo & phân quyền |
| `scores` | Phiếu điểm + trạng thái + `idempotencyKey` |
| `sync_log` | Theo dõi bản ghi đã push Cloud chưa |

---

## Checklist phần cứng

```
□ Router Wi-Fi (không cần Internet)
□ Laptop Thư ký: IP tĩnh 192.168.1.100, cắm điện / pin đầy
□ Local Server auto-start khi mở laptop
□ Máy in USB gắn laptop Thư ký
□ QR in sẵn cho từng giám khảo (link LAN)
□ Test: 3 điện thoại + TV/LED cùng Wi-Fi → Scoreboard realtime
□ USB backup: bản cài Local Server + snapshot DB
```

---

## So sánh với Online

| Tiêu chí | Offline B · LAN | Online 3 miền |
|---|---|---|
| Internet khi thi | **Không** | Bắt buộc |
| Backend lúc thi | Laptop Thư ký (LAN) | Apps Script (Cloud) |
| Nút giám khảo | GỬI ĐIỂM | GỬI ĐIỂM |
| Dashboard realtime | **Có (LAN)** | Có (Cloud) |
| Đồng bộ Cloud | Sau thi | Ngay khi gửi |
| Phạm vi | 1 CLB | 3 miền + Tổ đình |

---

## Hạn chế & rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Laptop/router hỏng giữa buổi | Test trước; USB backup; laptop dự phòng |
| IP đổi | IP tĩnh trên router; in QR đúng IP |
| Mất điện laptop | Cắm điện; pin dự phòng |
| Chưa sync Cloud | Đồng bộ ngay khi có mạng; giữ SQLite làm backup |

---

## Cấu trúc thư mục

```text
local-server/
├── package.json
├── server.js           # Express + API + static PWA
├── db/
│   └── schema.sql
├── sync/
│   ├── pull-from-sheets.js
│   └── push-to-sheets.js
├── config.example.json
└── README.md
```

Khởi động: `cd local-server && npm install && npm start` → mở `http://192.168.1.100:3000`
