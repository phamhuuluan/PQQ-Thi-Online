# VERSION LOCK

> Tất cả tài liệu trong thư mục `docs/` đã đạt trạng thái **REQUIREMENT_FREEZE**.

## Source of Truth

| Tài liệu | Vai trò |
|-----------|---------|
| `QUY-TRINH-THI-ONLINE-PQQ.md` | Quy trình nghiệp vụ gốc |
| `PHUONG-AN-B-LAN.md` | Spec Phương án B (Offline LAN) |
| `DECISIONS.md` | Mọi quyết định kiến trúc & nghiệp vụ |
| `TASK_BREAKDOWN.md` | Kế hoạch triển khai chi tiết |

## Quy tắc

1. **Không thay đổi spec** mà không qua Change Request (CR) được phê duyệt.
2. Mọi CR phải cập nhật `DECISIONS.md` trước khi implement.
3. Thứ tự triển khai tuân theo `TASK_BREAKDOWN.md`.

## Version

- Docs version: **1.0.0** (frozen 2026-07-29)
- Runtime: Vanilla JS, Google Apps Script V8, Node.js >=18
- Frontend hosting: GitHub Pages
- Backend Online: Google Apps Script Web App
- Backend Offline: Express + SQLite (local-server/)
