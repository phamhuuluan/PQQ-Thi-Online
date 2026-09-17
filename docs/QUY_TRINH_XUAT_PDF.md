# Quy trình xuất PDF cho Ban tổ chức (T-808)

> Hướng dẫn cho **Ban tổ chức** và **Thư ký** — xuất phiếu điểm chính thức sau khi CCK duyệt.

## Điều kiện xuất PDF

- Phiếu điểm ở trạng thái **`OFFICIALLY_APPROVED`**
- Đã cấu hình template Google Docs (`PDF_TEMPLATE_DOC_ID`)
- Đã upload ảnh chữ ký (`signatures/`) và con dấu (`seals/`) lên Drive kỳ thi

## Tiền kỳ (Admin / IT)

| Bước | Việc | Ai |
|------|------|-----|
| 1 | Tạo kỳ thi → Drive folder có `signatures/`, `seals/`, `PDF_Phieu/` | Admin |
| 2 | Upload ảnh chữ ký Thầy CM vào `signatures/` | Admin |
| 3 | Upload ảnh con dấu vào `seals/` | Admin |
| 4 | Tạo Google Doc template theo [templates/PDF_PHIEU_TEMPLATE.md](../templates/PDF_PHIEU_TEMPLATE.md) | IT |
| 5 | Set Script Property `PDF_TEMPLATE_DOC_ID` | IT |
| 6 | In thử 1 PDF mẫu | Thư ký |

## Trong / sau giờ thi (Thư ký)

### Online

1. Đăng nhập Dashboard (role Thư ký)
2. Chờ CCK duyệt phiếu → trạng thái **Đã duyệt**
3. Bấm **Xuất PDF** trên từng dòng, hoặc **Xuất tất cả PDF**
4. PDF tự lưu Drive: `{examFolder}/PDF_Phieu/{roomId}/{studentId}/`
5. Bấm **Tải PDF** hoặc mở link Drive để in

### Offline B

1. Chấm + khóa + duyệt trên LAN (như quy trình)
2. (Tuỳ chọn) **ĐỒNG BỘ** lên Cloud khi có Internet
3. **Xuất PDF** từ Dashboard (cần Internet để gọi Apps Script / Drive)
4. **Xem/In phiếu** → in USB tại sân
5. Xem thêm: [HUONG_DAN_IN_USB.md](./HUONG_DAN_IN_USB.md)

## Luồng kỹ thuật

```text
OFFICIALLY_APPROVED
  → Thư ký bấm "Xuất PDF"
  → Apps Script: copy Docs template
  → Chèn ảnh chữ ký + con dấu
  → Export PDF → Upload Drive
  → Cập nhật Sheets: PDF_URL, PDF_GENERATED_AT, PDF_HASH
```

## Vai trò

| Vai trò | Quyền xuất PDF |
|---------|----------------|
| Thư ký (TK) | ✓ |
| Admin | ✓ |
| Giám khảo | — |
| CCK | — (chỉ duyệt) |

## Lưu ý pháp lý

- Chữ ký trên PDF là **ảnh** (visual), không phải chữ ký số PAdES (DEC-PDF-01 A)
- Bản in giấy cần **ký tay** Thầy Chưởng Môn sau khi in
- `pdfHash` dùng đối chiếu tính toàn vẹn file khi lưu trữ

## Liên hệ IT khi

- Lỗi `PDF_TEMPLATE_DOC_ID not configured`
- PDF thiếu ảnh chữ ký/con dấu
- Không tìm thấy folder kỳ thi (`FOLDER_{examId}`)
