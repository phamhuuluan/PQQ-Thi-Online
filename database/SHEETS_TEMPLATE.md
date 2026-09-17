# Google Sheets Template — PQQ Thi Online

> File này mô tả cấu trúc Template Spreadsheet baseline cho mỗi kỳ thi.
> Khi tạo kỳ mới, Apps Script sẽ copy template này.

## Tab: EXAM_CONFIG

| Column | Type | Description |
|--------|------|-------------|
| EXAM_ID | text | ID kỳ thi (PK) |
| NAME | text | Tên kỳ thi |
| EXAM_DATE | date | Ngày thi |
| LOCATION | text | Địa điểm |
| TYPE | text | Loại kỳ thi |
| PASS_JUDGE_HASH | text | SHA-256+salt pass GK |
| PASS_JUDGE_SALT | text | Salt GK |
| PASS_SECRETARY_HASH | text | SHA-256+salt pass TK |
| PASS_SECRETARY_SALT | text | Salt TK |
| PASS_CCK_HASH | text | SHA-256+salt pass CCK |
| PASS_CCK_SALT | text | Salt CCK |
| PASS_ADMIN_HASH | text | SHA-256 pass Admin (cố định) |
| PASS_ADMIN_SALT | text | Salt Admin |
| P1_P2_P3_MAP | JSON text | Map P1/P2/P3 ↔ LT/TH per exam |
| JUDGES_COUNT | number | Số GK |
| SETTINGS | JSON text | Cấu hình thêm — gồm `mode`: `online` \| `offline` (chọn lúc tạo kỳ) |
| CREATED_AT | datetime | Timestamp tạo |

## Tab: STUDENTS

| Column | Type | Description |
|--------|------|-------------|
| STUDENT_ID | text | Mã võ sinh (PK within exam) |
| EXAM_ID | text | FK → EXAM_CONFIG |
| STUDENT_CODE | text | Mã hiển thị |
| FULL_NAME | text | Họ tên |
| BIRTH_DATE | date | Ngày sinh |
| CLUB_OR_REGION | text | CLB / Đơn vị / Miền |
| GRADE_LEVEL | text | Cấp đai |

## Tab: JUDGES

| Column | Type | Description |
|--------|------|-------------|
| JUDGE_ID | text | Mã GK (PK within exam) |
| EXAM_ID | text | FK → EXAM_CONFIG |
| JUDGE_NAME | text | Họ tên GK |
| JUDGE_TYPE | text | `theory` / `practice` / `both` |

## Tab: SCORES

| Column | Type | Description |
|--------|------|-------------|
| STT | number | Số thứ tự (auto) |
| EXAM_ID | text | FK |
| ROOM_ID | text | FK |
| BOUT_ID | text | studentId+round |
| STUDENT_ID | text | FK |
| STUDENT_CODE | text | Mã hiển thị |
| STUDENT_NAME | text | Họ tên |
| JUDGE_ID | text | FK |
| JUDGE_NAME | text | Tên GK |
| P1 | number | 0–10 step 0.5 |
| P2 | number | 0–10 step 0.5 |
| P3 | number | 0–10 step 0.5 |
| TOTAL | number | Backend auto-calc |
| NOTE | text | Ghi chú |
| STATUS | text | DRAFT / PENDING_APPROVAL / OFFICIALLY_APPROVED |
| IDEMPOTENCY_KEY | text | Unique |
| CLIENT_REQUEST_ID | text | Optional |
| SUBMITTED_AT | datetime | ISO 8601 |
| APP_VERSION | text | Optional |
| LOCKED_AT | datetime | Khi khóa |
| LOCKED_BY | text | Role/ID người khóa |
| APPROVED_AT | datetime | Khi duyệt |
| APPROVED_BY | text | CCK |
| PAYLOAD_HASH | text | For sync conflict |
| NEEDS_REVIEW | boolean | Chỉ Offline sync |
| PDF_URL | text | Link Drive sau xuất PDF (T-804) |
| PDF_GENERATED_AT | datetime | Thời gian xuất PDF |
| PDF_HASH | text | SHA-256 hash file PDF |

## Tab: ROOMS (optional, multi-room)

| Column | Type | Description |
|--------|------|-------------|
| ROOM_ID | text | PK within exam |
| EXAM_ID | text | FK |
| ROOM_NAME | text | Tên phòng/bảng |
| LOCATION | text | Vị trí |

## Sharing ACL (AUTH-07 A)

- Template file: Owner = service account / admin.
- Khi tạo kỳ mới: share Editor cho team accounts cần thiết.
- Không share public.
