# Hướng dẫn tạo kỳ thi — Dành cho Ban tổ chức / Admin

## Nguyên tắc

```text
System → Admin tạo kỳ thi → Chọn Online | Offline → Kỳ thi sẵn sàng
```

- **Chỉ Admin** tạo và cấu hình kỳ thi (trên hệ thống quản trị / Apps Script).
- **Online / Offline** là thuộc tính của kỳ thi (`exam.mode`), không phải thuộc tính của môi trường chạy app.
- **Thư ký không tạo kỳ.** Với kỳ Offline, Thư ký chỉ host Local Server ngày thi và sync pull/push.
- Local Server **không** phải “Offline Mode toàn hệ thống” — chỉ phục vụ các kỳ `mode=offline`.

## Bước 1: Đăng nhập Admin

Admin **không hiện** trên trang chủ (`index.html`). Chỉ truy cập bằng đường dẫn trực tiếp:

1. Mở `…/admin.html` trên môi trường **Online** (ví dụ `https://your-site.github.io/PQQ-Thi-Online/admin.html`).
2. Nhập mật khẩu Admin (cố định, do đội kỹ thuật cấp).

> Không chia sẻ link Admin công khai. Không dùng Local Server để tạo kỳ thi.

## Bước 2: Tạo kỳ thi mới

1. Tab **Tạo kỳ thi**.
2. **Chọn loại kỳ thi** (bắt buộc) — ghi vào `settings.mode`:
   - **Online** — ngày thi: GitHub Pages → Apps Script → Sheets (có Internet)
   - **Offline** — ngày thi: Thư ký host Local Server; GK/CCK chấm LAN; sync Sheets sau kỳ
3. Điền thông tin: mã kỳ (`examId`), tên, ngày, địa điểm.
4. Mật khẩu GK / TK / CCK: để trống để hệ thống tự tạo, hoặc nhập tay.
5. Nhấn **Tạo kỳ thi**.
6. Hệ thống tạo Drive folder + Spreadsheet (lưu `exam.mode`) + mật khẩu 3 role.

### Nếu chọn Offline — việc của Thư ký (sau khi Admin tạo xong)

1. Share Spreadsheet với Service Account (Editor).
2. Thêm vào `local-server/config.json` → mảng `exams[]`:

```json
{
  "examId": "PQQ-HCM-2026-008",
  "sheetsId": "<spreadsheetId từ kết quả tạo kỳ>",
  "name": "…"
}
```

3. Ngày thi: `cd local-server && npm start`
4. `POST /api/sync/pull` với `{ "examId": "…", "role": "secretary" }`
5. GK/CCK mở URL LAN, **chọn đúng kỳ thi**, đăng nhập và chấm.

Có thể đăng ký nhiều kỳ Offline trên cùng một Local Server (`exams[]`).

## Bước 3: Import thí sinh

1. Tab **Thí sinh**.
2. Dán danh sách JSON hoặc paste từ Excel.
3. Format JSON:
   ```json
   [
     {"studentId": "VS-001", "fullName": "Nguyễn Văn A", "studentCode": "PQQ-001", "clubOrRegion": "Miền Nam", "gradeLevel": "Cấp 1"}
   ]
   ```
4. Nhấn **Import thí sinh**.

## Bước 4: Cấu hình giám khảo

1. Tab **Giám khảo**.
2. Nhập danh sách JSON (`judgeType`: `theory` | `practice` | `both`).

## Bước 5: Tạo QR & phát

1. Tab **QR / Links**.
2. QR phải mang `examId` để ngày thi chọn đúng kỳ (và đúng `exam.mode`).

## Bước 6: Đổi mật khẩu (nếu cần)

1. Tab **Mật khẩu** — đổi 3 pass GK/TK/CCK. Pass Admin không đổi tại đây.

## Lưu ý

- Nhiều kỳ Online và Offline có thể cùng tồn tại trong hệ thống.
- Backend ngày thi theo **`exam.mode` của kỳ đã chọn**, không theo hostname mở web.
- Pass Admin là cố định toàn hệ thống; mỗi kỳ có bộ pass GK/TK/CCK riêng.
