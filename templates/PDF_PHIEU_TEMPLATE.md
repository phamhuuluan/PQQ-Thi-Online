# Mẫu Google Docs — Phiếu điểm PDF

> Dùng làm template cho `Pdf.gs` (T-801). Copy file Docs này, đặt placeholders, rồi lưu ID vào Script Property `PDF_TEMPLATE_DOC_ID`.

## Placeholders (thay thế tự động)

| Marker | Nội dung |
|--------|----------|
| `{{EXAM_NAME}}` | Tên kỳ thi |
| `{{EXAM_ID}}` | Mã kỳ thi |
| `{{EXAM_DATE}}` | Ngày thi |
| `{{LOCATION}}` | Địa điểm |
| `{{ROOM_ID}}` | Phòng/bảng |
| `{{BOUT_ID}}` | Mã bout |
| `{{STUDENT_ID}}` | Mã võ sinh |
| `{{STUDENT_CODE}}` | Mã hiển thị |
| `{{STUDENT_NAME}}` | Họ tên võ sinh |
| `{{JUDGE_NAME}}` | Tên giám khảo |
| `{{P1}}` `{{P2}}` `{{P3}}` | Điểm thành phần |
| `{{TOTAL}}` | Tổng điểm |
| `{{NOTE}}` | Ghi chú |
| `{{STATUS}}` | Trạng thái |
| `{{APPROVED_AT}}` | Thời gian duyệt |
| `{{APPROVED_BY}}` | Người duyệt |
| `{{GENERATED_AT}}` | Thời gian xuất PDF |

## Ảnh chữ ký / con dấu (T-802)

Đặt **một dòng riêng** trong Docs chứa marker (sẽ được thay bằng ảnh):

| Marker | Nguồn ảnh |
|--------|-----------|
| `{{SIGNATURE_IMG}}` | File đầu tiên trong `{examFolder}/signatures/` (PNG/JPEG) |
| `{{SEAL_IMG}}` | File đầu tiên trong `{examFolder}/seals/` (PNG/JPEG) |

> DEC-PDF-01 A: chỉ chữ ký **ảnh**, không chữ ký số cryptographic.

## Layout gợi ý

```
        CỘNG ĐỒNG PHẬT GIÁO VIỆT NAM
              PHẬT GIÁO QUẢNG NAM
        ─────────────────────────────
              PHIẾU ĐIỂM THI
        Kỳ thi: {{EXAM_NAME}}
        Ngày: {{EXAM_DATE}} · Địa điểm: {{LOCATION}}

        Võ sinh: {{STUDENT_NAME}} ({{STUDENT_CODE}})
        Bout: {{BOUT_ID}} · Phòng: {{ROOM_ID}}
        Giám khảo: {{JUDGE_NAME}}

        P1: {{P1}}    P2: {{P2}}    P3: {{P3}}
        TỔNG ĐIỂM: {{TOTAL}}

        Ghi chú: {{NOTE}}

        {{SIGNATURE_IMG}}          {{SEAL_IMG}}
        Chữ ký Thầy CM            Con dấu

        Duyệt: {{APPROVED_AT}} · Xuất: {{GENERATED_AT}}
```

## Cấu hình Apps Script

1. Tạo Google Doc từ layout trên
2. **Extensions → Apps Script → Project Settings → Script Properties**
3. Thêm: `PDF_TEMPLATE_DOC_ID` = ID của file Docs template

## Drive output path (T-803)

```
{examFolder}/PDF_Phieu/{roomId}/{studentId}/{boutId}_{studentId}.pdf
```
