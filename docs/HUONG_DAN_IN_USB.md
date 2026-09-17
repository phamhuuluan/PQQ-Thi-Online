# Hướng dẫn in USB tại sân — Runbook (T-807)

> Dành cho **Thư ký** khi thi Offline B hoặc Online tại sân thi.

## Chuẩn bị phần cứng

| Thiết bị | Yêu cầu |
|----------|---------|
| Laptop Thư ký | Pin đầy / cắm điện, Local Server đang chạy (Offline) |
| Máy in USB | Driver cài sẵn, giấy A4 đủ |
| USB backup | Bản cài `local-server/` + snapshot DB |

## Trước giờ thi

1. In thử 1 trang PDF mẫu từ Dashboard → **Xem/In phiếu**
2. Kiểm tra chữ ký ảnh + con dấu hiển thị đúng trên PDF
3. Kiểm tra máy in USB nhận laptop

## Trong giờ thi (Offline B)

1. Chấm điểm → Khóa phiếu → CCK duyệt (như quy trình)
2. Trên Dashboard, bấm **Xuất PDF** cho từng phiếu đã duyệt
   - Hoặc **Xuất tất cả PDF** (batch)
3. Bấm **Xem/In phiếu** → cửa sổ in mở
4. `Ctrl+P` / `Cmd+P` → chọn máy in USB → In

## Sau khi in

1. Thầy Chưởng Môn **ký tay** trên bản in giấy (DEC-PDF-01 A: ký ảnh trên PDF + ký tay sau in)
2. Đóng dấu giấy nếu cần
3. Giao phiếu cho võ sinh / ban tổ chức

## Online (3 miền)

1. PDF tự lưu lên Google Drive sau khi xuất
2. Mở link PDF từ Dashboard hoặc Drive → In tại sân nếu cần

## Xử lý sự cố

| Sự cố | Cách xử lý |
|-------|------------|
| Máy in không nhận | Kiểm tra cáp USB, khởi động lại driver |
| PDF thiếu chữ ký | Upload ảnh vào `{examFolder}/signatures/` trên Drive |
| PDF thiếu con dấu | Upload ảnh vào `{examFolder}/seals/` trên Drive |
| Không xuất được PDF | Phiếu phải `OFFICIALLY_APPROVED`; kiểm tra `PDF_TEMPLATE_DOC_ID` |
| Mất mạng (Offline) | PDF lưu local qua trình duyệt; đồng bộ Cloud sau thi |

## Checklist in nhanh

```
□ Máy in USB hoạt động
□ Đã xuất PDF phiếu đã duyệt
□ Đã in thử 1 phiếu — layout OK
□ Thầy CM ký tay trên bản in
□ USB backup DB sau thi
```
