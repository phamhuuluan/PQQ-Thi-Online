# DECISIONS — Chốt Requirement trước Implement

> **🔒 REQUIREMENT_FREEZE** — 45/45 mục đã chốt (2026-07-29). Không thay đổi spec mà không qua Change Request.

**Mục đích:** Tổng hợp mọi mục `NEED_CONFIRMATION` trong `docs/` thành câu hỏi để Product Owner / Ban tổ chức chốt.  
**Source of Truth:** [`../QUY-TRINH-THI-ONLINE-PQQ.md`](../QUY-TRINH-THI-ONLINE-PQQ.md) · [`../PHUONG-AN-B-LAN.md`](../PHUONG-AN-B-LAN.md)  
**Backlog gốc:** [`09-MISSING-REQUIREMENTS.md`](./09-MISSING-REQUIREMENTS.md)

> Tech Lead **chỉ đề xuất**, **không quyết định nghiệp vụ**.  
> Mọi quyết định đã được điền đầy đủ.

### Cách dùng

1. Điền từng mục: chọn Option (hoặc Other), ghi người chốt + ngày.
2. Ưu tiên nhóm **P0 — chặn Phase 1–3** trước.
3. Khi đủ P0: thông báo Tech Lead → lock API/DB version → bắt đầu implement.
4. Sau khi chốt, có thể đồng bộ ngắn vào SoT nếu muốn SoT phản ánh quyết định sản phẩm.

### Trạng thái tổng

| Mức | Ý nghĩa | Mục tiêu |
|---|---|---|
| **P0** | Chặn Auth / Score / Schema / Scoreboard policy | Chốt trước khi code |
| **P1** | Cần trước kỳ thi thật / Offline B | Chốt trước M4 |
| **P2** | Có thể trì hoãn có kiểm soát | Post-MVP được nếu ghi rõ |

**Tiến độ:** `45 / 45` mục đã chốt.

---

## Mục lục theo module

1. [Chấm điểm & Phiếu điểm (Score)](#1-chấm-điểm--phiếu-điểm-score)
2. [Scoreboard & Xếp hạng](#2-scoreboard--xếp-hạng)
3. [Phê duyệt & PIN (Approval)](#3-phê-duyệt--pin-approval)
4. [Đăng nhập / Session / Bảo mật](#4-đăng-nhập--session--bảo-mật)
5. [Kỳ thi / Phòng / Võ sinh / Giám khảo](#5-kỳ-thi--phòng--võ-sinh--giám-khảo)
6. [Database — Google Sheets & SQLite](#6-database--google-sheets--sqlite)
7. [API Contract](#7-api-contract)
8. [Offline / Local Server / Sync](#8-offline--local-server--sync)
9. [Kiến trúc Frontend & NFR](#9-kiến-trúc-frontend--nfr)
10. [Admin / UI / Settings / PDF-Drive](#10-admin--ui--settings--pdf-drive)
11. [Triển khai & Vận hành (Deployment)](#11-triển-khai--vận-hành-deployment)
12. [Bảng tiến độ nhanh](#12-bảng-tiến-độ-nhanh)

---

## Template ô quyết định (dùng chung)

```
Quyết định: [ ] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 1. Chấm điểm & Phiếu điểm (Score)

### DEC-SCORE-01 · NC-BR-01 — Map P1 / P2 / P3 với Lý thuyết & Thực hành · **P0**

**Câu hỏi:** Khi giám khảo chọn loại LT / TH / Cả hai, các ô điểm P1, P2, P3 trên phiếu tương ứng phần nào?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Cố định: P1 = Lý thuyết; P2 + P3 = Thực hành (hoặc tương tự cố định) | Đơn giản code & training | Không linh hoạt theo kỳ khác tiêu chí |
| **B** | Cấu hình map theo từng kỳ trên Sheets/Admin | Linh hoạt nhiều kỳ thi | Cần UI/config; dễ cấu hình sai |
| **C** | Bộ tiêu chí mở rộng (nhiều hơn 3 phần, đặt tên động) | Đủ nghiệp vụ phức tạp | Phá payload SoT mẫu; effort lớn |

**Khuyến nghị Tech Lead:** **B** nếu môn phái hay đổi tiêu chí giữa các kỳ; **A** nếu MVP gấp và tiêu chí ổn định. Không chọn C ở MVP trừ khi SoT cập nhật payload.

```
Quyết định: [ ] A  [x] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-SCORE-02 · NC-BR-05 — Sửa điểm khi còn `DRAFT` · **P0**

**Câu hỏi:** Cùng một giám khảo (`idempotencyKey` / cùng scoreKey) gửi lại điểm khi phiếu còn `DRAFT` thì hệ thống xử lý thế nào?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Upsert ghi đè điểm mới | GK sửa được trước khi khóa; khớp retry mạng | Cần audit nếu muốn lịch sử |
| **B** | Chỉ insert một lần; lần sau báo lỗi | Đơn giản, ít tranh cãi “điểm cuối” | GK gõ nhầm phải nhờ Admin/xóa tay |
| **C** | Upsert nhưng giữ lịch sử phiên bản | Minh bạch cao | Schema phức tạp hơn |

**Khuyến nghị Tech Lead:** **A** (SoT đã mô tả upsert + idempotency). C để post-MVP nếu Ban TC yêu cầu lịch sử.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-SCORE-03 · (API) — `total` có phải = P1+P2+P3? · **P0**

**Câu hỏi:** Backend có bắt buộc validate `scores.total === P1+P2+P3` không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Bắt buộc khớp tuyệt đối | Chống sai số FE | Cần quy ước làm tròn |
| **B** | Backend tự tính `total` từ P1–P3, bỏ qua client total | An toàn nhất | FE total chỉ hiển thị |
| **C** | Không validate total | Nhanh ship | Dễ lệch Dashboard/Scoreboard |

**Khuyến nghị Tech Lead:** **B**.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-SCORE-04 · (API) — Thang điểm / range hợp lệ · **P0**

**Câu hỏi:** Mỗi phần P1/P2/P3 được chấm trong khoảng nào? Cho phép số thập phân không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | 0–10, số nguyên | Quen UI; validate dễ | Không đủ nuance |
| **B** | 0–10, bước 0.5 hoặc 1 chữ số thập phân | Linh hoạt vừa đủ | Cần format hiển thị |
| **C** | Thang khác (ghi rõ: ___–___ ) | Đúng nội quy môn phái | Phải cập nhật SoT/UI |

**Khuyến nghị Tech Lead:** Chờ Ban TC chốt nội quy. Nếu chưa có, tạm ghi **Other** + số liệu chính thức — **không để dev tự chọn**.

```
Quyết định: [ ] A  [x] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-SCORE-05 · NC-BR-04 — `boutId` nghĩa gì & ai tạo? · **P0**

**Câu hỏi:** `boutId` trong payload đại diện cho gì và ai sinh giá trị?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Hệ thống auto theo lượt gọi tên / thứ tự thi | Ít thao tác GK | Cần module quản lý lượt |
| **B** | Thư ký nhập/chọn thủ công trên Dashboard | Kiểm soát tại sân | Dễ quên / gõ sai |
| **C** | Suy ra từ `studentId` + round (vd `VS-xxx|R1`) | Đơn giản | Khó nếu 1 người thi nhiều lượt phức tạp |

**Khuyến nghị Tech Lead:** **C** cho MVP 1 lượt/võ sinh; nâng **A** khi có quản lý sổ lượt.

```
Quyết định: [ ] A  [ ] B  [X] C  [ ] Other: _______________
Người chốt: Tech Lead    Ngày: 29/07/2026
Ghi chú: boutId = studentId+round cho MVP
```

---

## 2. Scoreboard & Xếp hạng

### DEC-SB-01 · NC-BR-03 — Scoreboard hiện DRAFT hay chỉ APPROVED? · **P0**

**Câu hỏi:** LED Scoreboard được phép hiển thị trạng thái nào? *(SoT nêu 2 lựa chọn, chưa chốt.)*

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Minh bạch realtime: hiện cả `DRAFT` (và/hoặc PENDING) | Nóng, gắn kết | Điểm có thể đổi trước khi duyệt |
| **B** | Chỉ `OFFICIALLY_APPROVED` | Ổn định, ít tranh cãi | LED “chậm” hơn cảm xúc sân |
| **C** | DRAFT làm mờ / nhãn “chưa chính thức”; APPROVED nổi | Cân bằng | UI phức tạp hơn |

**Khuyến nghị Tech Lead:** **B** nếu ưu tiên uy tín kết quả; **C** nếu muốn vừa live vừa phân biệt chính thức.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-SB-02 · NC-BR-06 — Nhiều giám khảo / 1 võ sinh: cách tính điểm xếp hạng · **P0**

**Câu hỏi:** Khi có nhiều phiếu GK cho cùng võ sinh, điểm đưa lên Scoreboard tính thế nào?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Trung bình cộng các phiếu (đã duyệt theo policy) | Công bằng phổ biến | Hòa điểm nhiều hơn |
| **B** | Tổng điểm các phiếu | Đơn giản | Phụ thuộc số lượng GK không đều |
| **C** | Bỏ điểm cao nhất + thấp nhất rồi trung bình | Giảm outlier | Cần ≥3 GK; phức tạp hơn |
| **D** | Other (nội quy môn phái): _______________ | Đúng thực tế | Phải viết rõ để code |

**Khuyến nghị Tech Lead:** Không tự chọn — **bắt buộc Ban TC / nội quy**. Dev chỉ implement sau khi có công thức viết rõ (kể cả trường hợp chưa đủ số phiếu).

```
Quyết định: [ ] A  [ ] B  [ ] C  [X] D/Other: Mỗi võ sinh chỉ có một phiếu điểm thôi
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-SB-03 · NC-BR-02 — Quy tắc Thủ khoa & hòa điểm · **P0**

**Câu hỏi:** Ai được vinh danh Thủ khoa khi hòa điểm / khác cấp đai?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Người có tổng/điểm cao nhất; hòa → đồng Thủ khoa | Đơn giản | Có thể nhiều người |
| **B** | Tie-break theo cấp đai / miền / CLB (thứ tự do Ban TC ghi) | 1 Thủ khoa rõ | Cần rule chi tiết |
| **C** | CCK chọn tay trên danh sách hòa | Linh hoạt tại sân | Ít “tự động”, phụ thuộc người |

**Khuyến nghị Tech Lead:** **B** nếu nội quy sẵn; không thì **A** + đồng Thủ khoa cho MVP.

```
Quyết định: [ ] A  [ ] B  [ ] C  [X] Other: Người có tổng điểm cao nhất, nếu bằng nhau thì tính xem ai có điểm cột điểm cao, ví dụ cùng tổng điểm nhưng một người có cột 9, có người cột bằng 8 thì người cột 9, nếu mà cùng cột điểm cao nhất thì tính theo điểm thấp nhất, ai có điểm thấp nhất cao hơn người kia là được

Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-SB-04 · NC-UI-01 — Mức độ hiệu ứng Scoreboard / Thủ khoa · **P2**

**Câu hỏi:** Scoreboard cần hiệu ứng đến mức nào ở MVP?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Chỉ bảng xếp hạng + đổi hạng; Thủ khoa = highlight tĩnh | Nhanh ship | Ít “bùng nổ” sân khấu |
| **B** | Thêm motion nhảy số / banner Thủ khoa (2–3 animation) | Đúng tinh thần SoT | Effort FE + QA LED |
| **C** | Full show (âm thanh, fullscreen ceremony…) | Ấn tượng | Ngoài scope kỹ thuật điểm; dễ trễ |

**Khuyến nghị Tech Lead:** **B** vừa đủ SoT; C để post-MVP.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 3. Phê duyệt & PIN (Approval)

### DEC-AP-01 · NC-TECH-03 — Số lần sai pass/PIN & thời gian khóa · **P0**

**Câu hỏi:** Sai mật khẩu role hoặc PIN duyệt bao nhiêu lần thì tạm khóa, khóa bao lâu?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | N=5 lần sai → khóa T=15 phút *(gợi ý kỹ thuật trong docs)* | Cân bằng UX/bảo mật | Không phải nội quy chính thức |
| **B** | N=3 → khóa T=30 phút | Chặt hơn | Dễ khóa nhầm giờ thi |
| **C** | Other: N=___ ; T=___ phút | Đúng yêu cầu tổ chức | — |

**Khuyến nghị Tech Lead:** **A** làm mặc định kỹ thuật nếu Ban TC không có số liệu riêng. Có thể tách riêng N/T cho **pass role** vs **PIN**.

```
Quyết định: [ ] A  [ ] B  [ ] C/Other: Không khoá
Áp dụng: [ ] Chung  [ ] Pass riêng: ___  [ ] PIN riêng: ___
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AP-02 · (SoT gợi ý) — PIN duyệt có được trùng pass role CCK không? · **P1**

**Câu hỏi:** Vận hành có cho phép PIN duyệt = cùng giá trị pass role CCK trong kỳ (vẫn kiểm tra 2 bước kỹ thuật) không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Cho phép trùng (khuyến nghị vận hành SoT) | Ít mã phải nhớ | Rủi ro nếu lộ 1 mã = đủ vào + duyệt |
| **B** | Bắt buộc PIN khác pass role | Tách lớp bảo mật tốt hơn | Thêm việc phát mã |
| **C** | Admin chọn theo từng kỳ | Linh hoạt | Phải train |

**Khuyến nghị Tech Lead:** **A** theo SoT vận hành; vẫn giữ 2 API check riêng. Nếu kỳ quan trọng/nhiều rủi ro → **B**.

```
Quyết định: [ ] A  [ ] B  [ ] C  [ ] Other: Bỏ Pin đi chánh chủ khảo cũng là mật khẩu cố định không thay đổi

Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AP-03 · NC-BR-07 — Trạng thái `NEEDS_REVIEW` trên Online? · **P1**

**Câu hỏi:** `NEEDS_REVIEW` chỉ xuất hiện khi sync Offline→Cloud hay cả Online Sheets?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Chỉ Offline sync conflict | Đúng SoT edge-case; schema Online gọn | Online không có nhánh review |
| **B** | Cả Online (vd phát hiện bất thường) | Thống nhất UI | Cần quy trình CCK xử lý Online |
| **C** | Đổi tên/alias khác trên Online | — | Dễ rối thuật ngữ |

**Khuyến nghị Tech Lead:** **A** cho MVP.

```
Quyết định: [ ] A  [ ] B  [ ] C  [ ] Other: Tách riêng offline là offline
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 4. Đăng nhập / Session / Bảo mật

### DEC-AUTH-01 · NC-TECH-01 — Thuật toán hash pass & PIN · **P0**

**Câu hỏi:** Pass role và PIN được hash bằng thuật toán nào (Online Sheets = Offline SQLite)?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | `SHA-256(secret + salt)` đúng mô tả SoT cho PIN | Khớp SoT; implement Apps Script dễ | SHA-256 thuần yếu hơn KDF nếu salt kém |
| **B** | PBKDF2 / bcrypt | Chặt hơn | Apps Script khó/hạn chế; lệch SoT |
| **C** | A cho MVP; lên kế hoạch migrate B sau | Thực dụng | Phải có migration path |

**Khuyến nghị Tech Lead:** **A** (bám SoT) + salt ngẫu nhiên per exam; **C** nếu muốn lộ trình dài hạn.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-02 · NC-TECH-02 — Session lưu ở đâu & TTL · **P0**

**Câu hỏi:** Session (`examId`, `role`, `judgeId`…) lưu thế nào, hết hạn ra sao?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | `sessionStorage` (hết khi đóng tab) | An toàn hơn trên máy chung | Mất session khi refresh/tab mới |
| **B** | `localStorage` + TTL (vd 12 giờ) | Tiện trên sân | Rủi ro máy dùng chung |
| **C** | Server session token (Apps Script/Local) + TTL | Chuẩn production | Effort lớn hơn |

**Khuyến nghị Tech Lead:** **C** nếu làm `loginRole` ngay Phase 1; nếu thời gian gấp: **B** + TTL ngắn (4–8h) chỉ lưu metadata, không lưu plaintext pass.

```
Quyết định: [ ] A  [ ] B  [X] C  [ ] Other: _______________
TTL nếu B/C: ________ giờ
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-03 · NC-API-03 — Cách auth mỗi request API · **P0**

**Câu hỏi:** Sau khi vào role, mỗi lần gọi API (submit/lock/approve) xác thực bằng gì?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Session token sau `loginRole` | Không gửi lại pass; kiểm soát revoke | Cần store token + TTL |
| **B** | Gửi lại pass mỗi request | Đơn giản | Pass hay lộ qua log/network |
| **C** | Google OAuth2 map role | Gắn tài khoản Google | SoT: tùy chọn sau; chưa đặc tả đủ |

**Khuyến nghị Tech Lead:** **A** cho MVP technical. **C** roadmap sau (xem DEC-AUTH-05).

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-04 · NC-API-04 / FR-AUTH-10 — Có bắt buộc API `loginRole` trước khi chấm? · **P0**

**Câu hỏi:** Luồng chính thức có phải: chọn role → `loginRole` → nhận session → mới được submit/lock/approve?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có — bắt buộc `loginRole` | Khớp SoT “cần khi code”; một chỗ rate-limit | Phải thiết kế payload ngay Phase 1 |
| **B** | FE-only check pass; API tin payload role | Ship nhanh | Yếu — dễ giả role |
| **C** | Hybrid: FE gate + API verify pass khi action | — | Gần B nếu không có token |

**Khuyến nghị Tech Lead:** **A**.

```
Quyết định: [] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-05 · NC-SEC-01 — Google OAuth2 phạm vi MVP · **P2**

**Câu hỏi:** MVP kỳ thi đầu tiên có bắt buộc OAuth2 map tài khoản Google → role không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Không — đủ role pass + PIN (SoT gate đã chốt) | Đúng MVP SoT | Chưa gắn Google account |
| **B** | Có — OAuth song song từ ngày 1 | Bảo mật tài khoản | Trễ tiến độ; spec chưa đủ |
| **C** | Post-MVP: OAuth cho Admin/Script deploy only | Thực dụng | Phân biệt rõ với auth vận hành sân |

**Khuyến nghị Tech Lead:** **A** (+ **C** cho deploy Apps Script nếu cần).

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: KHÔNG CẦN DÙNG Google OAuth2
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-06 · NC-API-06 / NC-SEC — Apps Script Web App “Who has access” · **P0**

**Câu hỏi:** Deploy Apps Script Web App chọn chế độ truy cập nào?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Anyone (kể cả chưa Google) | GK mở link dễ | Rủi ro bị gọi API nếu không token |
| **B** | Anyone with Google Account | Có identity Google | Máy không login Google khó |
| **C** | Only myself / domain cụ thể | Chặt | Không phù hợp 3 miền đa tài khoản |

**Khuyến nghị Tech Lead:** Nếu DEC-AUTH-03 = **A** (token) → có thể **A** kèm rate limit. Nếu chưa có token vững → tránh A trần.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Execute as: [ ] Me  [ ] User accessing  [ ] Other
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-07 · NC-SEC-02 — Chính sách chia sẻ Sheets / Drive · **P1**

**Câu hỏi:** Ai được quyền xem/sửa Spreadsheet kỳ thi và Folder Drive?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Least privilege: chỉ tài khoản kỹ thuật + Admin; role sân chỉ qua Web App | An toàn | Cần tài khoản dịch vụ/kỹ thuật rõ |
| **B** | Share rộng cho Ban TC (edit) | Dễ can thiệp tay | Dễ sửa nhầm điểm |
| **C** | View cho Ban TC; edit chỉ Admin/script | Cân bằng | Vẫn cần kỷ luật |

**Khuyến nghị Tech Lead:** **C** hoặc **A**.

```
Quyết định: [X] A  [ ] B  [ ] C  [] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-08 · NC-SEC-03 & NC-SEC-04 — Bảo vệ Local API & HTTPS LAN · **P1**

**Câu hỏi:** Offline B: Local API bảo vệ thế nào? Có bắt HTTPS trong LAN không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | HTTP LAN + SSID riêng + session token sau login *(chấp nhận rủi ro MITM LAN thấp)* | Thực tế sân thi | Không HTTPS |
| **B** | Thêm shared secret trong QR/config | Chống khách lạ cùng Wi-Fi hơn | QR lộ = secret lộ |
| **C** | Bắt HTTPS/TLS trên LAN | Bảo mật truyền tải | Phức tạp cert trên laptop Thư ký |

**Khuyến nghị Tech Lead:** **A** (+ tùy chọn **B**). Không **C** ở MVP trừ khi IT hỗ trợ.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] A+B  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-AUTH-09 · (API) — Phạm vi `getData` theo role · **P1**

**Câu hỏi:** Scoreboard công khai và Dashboard Thư ký lấy cùng endpoint `getData` nhưng khác quyền/field thế nào?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Một endpoint + `viewMode=dashboard|scoreboard` lọc field/status | Khớp đề xuất docs | Cần enforce server-side |
| **B** | Hai endpoint tách (`getData` / `getScoreboard`) | Rõ ràng | Duplicate logic |
| **C** | Cùng full data; FE tự lọc | Nhanh | Lộ nhận xét/điểm nháp ra LED |

**Khuyến nghị Tech Lead:** **A** (hoặc **B** nếu team thích tách). **Cấm C**.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 5. Kỳ thi / Phòng / Võ sinh / Giám khảo

### DEC-EXAM-01 · FR-RM-03 — Có chia nhiều `roomId` / bảng trong 1 kỳ không? · **P1**

**Câu hỏi:** Một kỳ thi có nhiều phòng/bảng song song cần UI quản lý room không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | MVP: 1 room mặc định / kỳ (`ROOM_A`) | Đơn giản | Kỳ lớn phải tách nhiều exam |
| **B** | Hỗ trợ nhiều room + chọn room trên UI | Đúng payload `roomId` SoT | Effort Dashboard/Scoreboard |
| **C** | Room chỉ trên Sheets, không UI | Linh hoạt data | Dễ nhầm vận hành |

**Khuyến nghị Tech Lead:** **A** cho kỳ nhỏ; nếu Ban TC xác nhận thi nhiều sân cùng examId → **B**.

```
Quyết định: [] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-EXAM-02 · NC-UI-02 — Admin: UI Web App hay thao tác Sheets + Script? · **P0**

**Câu hỏi:** Việc tạo kỳ, import võ sinh, cấu hình GK, sinh pass — làm ở đâu ở MVP?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Sheets tay + chạy Apps Script (ít/no Admin UI) | Ship nhanh Tiền kỳ | Đòi kỹ năng Sheets |
| **B** | Admin UI đầy đủ trên Web App | Dễ Ban TC dùng | Effort lớn Phase 2 |
| **C** | Hybrid: Admin UI tối thiểu (tạo kỳ + sinh pass); import CSV/Sheets | Cân bằng | Vẫn cần train 2 kênh |

**Khuyến nghị Tech Lead:** **C** hoặc **A** tùy ai vận hành Tiền kỳ. Nếu chỉ 1–2 kỹ thuật viên → **A** chấp nhận được.

```
Quyết định: [ ] A  [XAA] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-EXAM-03 · (API) — Sinh QR / link: API hay thủ công? · **P1**

**Câu hỏi:** Link/QR cho giám khảo được tạo thế nào?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Thủ công: Admin copy URL + generator QR online/in | Không cần code | Dễ sai IP/URL |
| **B** | Script/API `generateQrLinks` xuất sheet + ảnh QR | Chuẩn hóa | Effort |
| **C** | Template in sẵn + merge mã từ Sheets | Ops quen | Phụ thuộc quy trình in |

**Khuyến nghị Tech Lead:** **A** MVP + checklist; **B** khi ổn định URL pattern.

```
Quyết định: [] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-EXAM-04 · Assumption — Template Sheets/Drive đã có sẵn? · **P0**

**Câu hỏi:** Hiện đã có file Template Exam Room (Sheets + Folder mẫu) để copy khi tạo kỳ chưa?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Đã có — đường dẫn/ID: _______________ | Implement Admin ngay | Phải khớp schema chốt |
| **B** | Chưa có — team tạo template trong Phase Database | Kiểm soát schema | Chặn Tiền kỳ đến khi xong |
| **C** | Dùng docs 03 đề xuất làm template mới | Thống nhất docs | Cần Ban TC duyệt cột nghiệp vụ |

**Khuyến nghị Tech Lead:** Nếu chưa có → **C** sau khi chốt nhóm Database bên dưới.

```
Quyết định: [ ] A  [ ] B  [X] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 6. Database — Google Sheets & SQLite

### DEC-DB-01 · NC-DB-01 / FR-ST-03 — Tên tab Sheets & quy ước cột · **P0**

**Câu hỏi:** Chốt danh sách tab + quy ước đặt tên cột chính thức cho template?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Theo đề xuất docs 03: `EXAM_CONFIG`, `JUDGES`, `STUDENTS`/`DANH_SACH_GOC`, `SCORES`, … + header `UPPER_SNAKE` | Thống nhất kỹ thuật | Có thể lệch thói quen Sheets tiếng Việt |
| **B** | Giữ tên tiếng Việt theo template hiện có (nếu có) | Quen Ban TC | Dev map tên khó hơn |
| **C** | Hybrid: tab tiếng Việt hiển thị; thêm hàng khóa ENGLISH ổn định | Dễ nhìn + ổn API | Phức tạp template |

**Khuyến nghị Tech Lead:** **A** nếu tạo template mới; **B/C** nếu template đang dùng rồi.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Danh sách tab chốt (ghi rõ): ________________________________
Ghi chú: _______________________________________________
```

---

### DEC-DB-02 · NC-DB-02 — Khóa chính & cột bắt buộc Sheets · **P0**

**Câu hỏi:** Có duyệt schema tối thiểu theo payload SoT (`examId`, `roomId`, `boutId`, `studentId`, `judgeId`, P1–P3, total, status, `idempotencyKey`, …) làm cột bắt buộc không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Duyệt nguyên bộ cột đề xuất docs 03 (kể cả LOCKED_AT/BY, APPROVED_AT/BY, PDF_*) | Đủ hậu kỳ/audit nhẹ | Template dài |
| **B** | Chỉ cột SoT nhìn thấy + payload bắt buộc; cột audit/PDF thêm sau | MVP gọn | Phải migrate cột sau |
| **C** | Ban TC đính kèm file template — team map ngược | Ground truth thực tế | Phụ thuộc file gửi |

**Khuyến nghị Tech Lead:** **B** + ticket follow-up cột PDF; hoặc **A** nếu muốn ít migrate.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             ______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-DB-03 · NC-DB-03 — Commit `schema.sql` theo docs 03 · **P0**

**Câu hỏi:** File SQLite `local-server/db/schema.sql` có được chốt theo ERD/SQL đề xuất trong `03-DATABASE-DESIGN.md` không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có — dùng đề xuất docs 03 (có thể chỉnh nhỏ sau quyết định rooms) | Unblock Offline B | Cần đồng bộ Sheets |
| **B** | Chưa — chờ template Sheets xong rồi mirror | Tránh lệch 2 DB | Trễ Local Server |
| **C** | Other schema đính kèm | — | Phải review kỹ |

**Khuyến nghị Tech Lead:** **A** ngay sau DEC-DB-01/02/04.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-DB-04 · NC-DB-04 — Bảng `rooms` / `config` vs 4 bảng SoT · **P1**

**Câu hỏi:** Snapshot Offline (PA-B nêu `rooms`, `config`) lưu thế nào so với 4 bảng SoT (`students`, `judges`, `scores`, `sync_log`)?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Nhúng config + default room vào bảng `exams` | Ít bảng; đủ MVP 1 room | Đa room kém |
| **B** | Thêm bảng `rooms` (+ giữ `exams` làm config) | Khớp PA-B snapshot wording | Schema rộng hơn SoT 4-bảng |
| **C** | Chỉ đúng 4 bảng SoT; config hardcode file `config.json` | Tối giản | Lệch data Cloud |

**Khuyến nghị Tech Lead:** **A** nếu DEC-EXAM-01 = A; **B** nếu đa room.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-DB-05 · NC-DB-05 / FR-AUD-01 — Audit log · **P2**

**Câu hỏi:** MVP có cần bảng/sheet `AUDIT_LOG` ghi mọi thao tác không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có Sheet/SQLite AUDIT_LOG từ MVP | Truy vết mạnh | Effort + dung lượng |
| **B** | Hoãn post-MVP; chỉ dựa `idempotencyKey` + timestamps trên SCORES | Nhanh | Khó điều tra sự cố tinh vi |
| **C** | Chỉ log Offline `sync_log` + vài field LOCKED/APPROVED | Thực dụng | Online audit mỏng |

**Khuyến nghị Tech Lead:** **C** hoặc **B**.

```
Quyết định: [ ] A  [ ] B  [X] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-DB-06 · (DB) — Thư mục Drive bổ sung (`signatures/`, `seals/`, `backup/`, `media/`) · **P2**

**Câu hỏi:** Ngoài path PDF SoT (`/ExamRoom/{examId}/{roomId}/PDF_Phiếu/...`), có chuẩn hóa thêm các thư mục con không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có đủ: signatures, seals, backup, media | Ops rõ | Phải tạo/maintain |
| **B** | Chỉ PDF path SoT; tài sản khác để tùy tiện | Đơn giản | Lộn xộn dài hạn |
| **C** | PDF + signatures + seals (bắt buộc cho PDF); backup/media tùy kỳ | Cân bằng | — |

**Khuyến nghị Tech Lead:** **C**.

```
Quyết định: [ ] A  [ ] B  [X] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-DB-07 · NC-DB / docs03 — Có dùng tab `SYNC_META` cho scoreboard version không? · **P1**

**Câu hỏi:** Có tạo cơ chế `sinceVersion` / `SYNC_META` để tối ưu polling không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có — bắt buộc (kèm CacheService) | Giảm quota | Thêm complexity |
| **B** | Chỉ CacheService TTL, chưa cần version | Đủ sớm | Vẫn đọc/tính nhiều hơn A |
| **C** | Hoãn đến khi đo quota thực tế | Tập trung nghiệp vụ | Risk cháy quota kỳ lớn |

**Khuyến nghị Tech Lead:** **B** MVP Online nhỏ; chuẩn bị **A** trước kỳ 3 miền nhiều LED.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 7. API Contract

### DEC-API-01 · NC-API-02 — Envelope JSON response · **P0**

**Câu hỏi:** Mọi API Online/Offline có thống nhất envelope sau không?

```json
{ "ok": true|false, "data": {}, "error": { "code": "", "message": "", "details": {} } }
```

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Chốt envelope trên | FE một parser | Cần edit mọi action |
| **B** | Mỗi action shape riêng | Linh hoạt ngắn hạn | FE rối |
| **C** | Other schema: _______________ | — | Phải viết rõ |

**Khuyến nghị Tech Lead:** **A**.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-API-02 · NC-API-02/04 — Bảng mã lỗi chuẩn · **P0**

**Câu hỏi:** Có chốt bộ mã lỗi đề xuất trong docs 04 (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_STATUS_TRANSITION`, `PIN_INVALID`, `PIN_LOCKED`, `CONFLICT_NEEDS_REVIEW`, …) không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Duyệt nguyên list docs 04 | Unblock FE | Có thể thêm sau |
| **B** | Rút gọn chỉ 4–5 mã | Đơn giản | Khó UX chi tiết |
| **C** | Other list đính kèm | — | — |

**Khuyến nghị Tech Lead:** **A**.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-API-03 · NC-API-05 — `getData` tách Dashboard vs Scoreboard · **P0**

**Câu hỏi:** Chốt contract `getData` với `viewMode` (hoặc 2 endpoint theo DEC-AUTH-09) trước khi FE Scoreboard/Dashboard làm song song?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có — viết sample JSON chốt trong quyết định/ghi chú | Tránh rework | Tốn 1 buổi spec |
| **B** | FE mock trước, chốt API sau | Parallel UI | Rủi ro lệch |

**Khuyến nghị Tech Lead:** **A** (kèm DEC-AUTH-09).

```
Quyết định: [X] A  [ ] B  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú / link sample JSON: _____________________________
```

---

### DEC-API-04 · NC-API-01 — URL Apps Script production/staging · **P1**

**Câu hỏi:** Chiến lược quản lý URL Web App?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | File config (`config.json` / `config.production.json`) không commit secret nếu có | Rõ môi trường | Cần quy trình update |
| **B** | Hardcode trong FE | Nhanh | Sai sót deploy |
| **C** | Chỉ staging trước kỳ 1; production URL điền sau rehearsal | An toàn | Phải nhớ chuyển |

**Khuyến nghị Tech Lead:** **A** (+ **C** cho kỳ đầu). Điền URL thật vào đây khi có:

```
Staging URL: ___________________________________________
Production URL: ________________________________________
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: Tech Lead    Ngày: 29/07/2026
```

---

## 8. Offline / Local Server / Sync

### DEC-OFF-01 · NC-DEP-04 / FE adapter — IP LAN vs config / mDNS · **P1**

**Câu hỏi:** Frontend nhận diện base URL Local Server thế nào? *(Tránh hardcode IP cố định.)*

> **Cập nhật 2026-07-30:** Hostname **không** còn định nghĩa Offline Mode hệ thống. Backend ngày thi theo **`exam.mode`**. DEC-OFF-01 chỉ còn về **discovery URL** (localApiBase / mDNS) khi kỳ đang chọn là offline.

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | `config.json` trên Local Server (IP/hostname/port) + same-origin khi mở từ LAN | Linh hoạt | Phải sửa config mỗi sân nếu IP đổi |
| **B** | mDNS `pqq.local` (+ fallback IP) | QR ổn định hơn | Phụ thuộc router/OS hỗ trợ |
| **C** | Giữ ví dụ SoT `192.168.1.100` + IP tĩnh bắt buộc ops | Đơn giản đúng tài liệu | QR chết nếu DHCP |

**Khuyến nghị Tech Lead:** **A+B** nếu làm được; tối thiểu **A** + checklist IP tĩnh.

```
Quyết định: [ ] A  [ ] B  [ ] C  [X] A+B  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-OFF-04 · exam.mode vs runtime environment · **P0**

**Câu hỏi:** Online/Offline là thuộc tính môi trường chạy hay thuộc tính kỳ thi?

| Option | Nội dung |
|---|---|
| **A (chốt)** | `exam.mode` do Admin chọn lúc tạo kỳ; data plane theo mode kỳ đang chọn; Local Server = host ngày thi Offline, không tạo kỳ; multi-exam `config.exams[]` |
| **B** | Hostname/LAN = Offline Mode toàn hệ thống (cũ — loại bỏ) |

```
Quyết định: [X] A  [ ] B
Người chốt: Architecture refactor 2026-07-30
Ghi chú: Control plane Admin luôn Apps Script; Thư ký không tạo kỳ; adapter resolveApiBase(exam.mode)
```

---

### DEC-OFF-02 · (API Sync) — Auth khi `sync/pull` & `sync/push` · **P1**

**Câu hỏi:** Local Server lấy quyền gọi Sheets/Drive bằng gì?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Service account / OAuth token lưu trên laptop Thư ký (`config` local, không commit) | Tự động | Cần setup Google Cloud |
| **B** | Thư ký đăng nhập Google một lần trên máy, script dùng user credential | Ít infra | Phụ thuộc user session |
| **C** | Export/import CSV thủ công thay API sync | Đơn giản kỹ thuật | Lệch SoT nút ĐỒNG BỘ; dễ lỗi người |

**Khuyến nghị Tech Lead:** **B** cho MVP nhanh; **A** khi ổn định dài hạn. Tránh **C** trừ khi emergency.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-OFF-03 · (Risk) — Concurrent write Sheets khi Online · **P2**

**Câu hỏi:** Có bắt buộc dùng LockService Apps Script khi nhiều GK gửi điểm đồng thời không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có — lock theo exam hoặc theo scoreKey | Giảm race | Latency tăng |
| **B** | Không — dựa upsert idempotencyKey | Đơn giản | Hiếm race khi đọc-ghi phức tạp |
| **C** | Lock chỉ cho approve/lockSheet | Bảo vệ trạng thái quan trọng | Submit vẫn có race nhẹ |

**Khuyến nghị Tech Lead:** **C** hoặc **A** trước kỳ 3 miền đông.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 9. Kiến trúc Frontend & NFR

### DEC-FE-01 · NC-TECH-06 — Stack Frontend · **P0**

**Câu hỏi:** Frontend giữ HTML/CSS/Vanilla JS theo SoT hay đổi stack (React/Vite…)?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Vanilla theo SoT | Khớp tài liệu; GH Pages đơn giản; dễ bàn giao | Tổ chức code cần kỷ luật |
| **B** | React/Vite SPA | DX team hiện đại | Đổi kiến trúc SoT; build/PWA phức tạp hơn |
| **C** | Other: _______________ | — | Cần cập nhật toàn bộ docs |

**Khuyến nghị Tech Lead:** **A** trừ khi PO chính thức đổi SoT.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-FE-02 · (Design) — Hash router vs Path router trên GitHub Pages · **P1**

**Câu hỏi:** Điều hướng màn `/cham/...`, `/dashboard`, … dùng gì?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Hash router (`#/cham/...`) | GH Pages không cần rewrite | URL kém “đẹp” |
| **B** | Path router + cấu hình Pages/404 fallback | URL sạch | Cấu hình dễ gãy |
| **C** | Multi-page HTML riêng (ít JS router) | Rất đơn giản | Trùng code |

**Khuyến nghị Tech Lead:** **A** hoặc **C** cho MVP; **B** nếu có người maintain Pages sâu.

```
Quyết định: [ ] A  [ ] B  [X] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-FE-03 · NC-TECH-04 — Trình duyệt hỗ trợ · **P1**

**Câu hỏi:** Matrix trình duyệt bắt buộc test?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Chrome Android + Safari iOS mới nhất + Chrome desktop | Đủ 95% sân | Không support máy cũ |
| **B** | A + thêm legacy (vd iOS 14 / Chrome cũ 2 năm) | Rộng hơn | Effort QA |
| **C** | Other list: _______________ | — | — |

**Khuyến nghị Tech Lead:** **A**.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-FE-04 · NC-TECH-05 — Accessibility · **P2**

**Câu hỏi:** Mục tiêu accessibility?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | WCAG 2.1 AA | Chuẩn | Effort lớn |
| **B** | Best-effort: contrast, font size, touch target | Thực dụng MVP | Không claim AA |
| **C** | Không đặt mục tiêu riêng | Nhanh | Rủi ro dụng trên sân |

**Khuyến nghị Tech Lead:** **B**.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-FE-05 · NC-UI-03 / FR-SET-01 — Module System Settings · **P2**

**Câu hỏi:** Có màn Settings riêng (mode, polling interval, API URL) không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Gộp vào Admin | Ít route | Admin phình |
| **B** | Settings riêng | Rõ trách nhiệm | Thêm UI |
| **C** | Không UI — chỉ config file | Đơn giản | Thư ký khó chỉnh tại sân |

**Khuyến nghị Tech Lead:** **C** MVP; **A** nếu Ban TC không kỹ thuật.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

## 10. Admin / UI / Settings / PDF-Drive

### DEC-PDF-01 · (SoT scope) — Chữ ký trên PDF: ảnh hay chữ ký số cryptographic? · **P1**

**Câu hỏi:** Xác nhận phạm vi chữ ký/con dấu trên PDF?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Chỉ ảnh chữ ký + con dấu (đúng SoT visual) + ký tay giấy sau khi in | Khớp stack | Không phải chữ ký số pháp lý |
| **B** | Bắt buộc PAdES/PKCS#7 | Pháp lý mạnh | Ngoài stack; cần tool ngoài |
| **C** | A cho MVP; nghiên cứu B sau | Thực dụng | Kỳ vọng phải communicate rõ |

**Khuyến nghị Tech Lead:** **A** hoặc **C**. Phải truyền thông với Ban TC để tránh hiểu nhầm.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: Tech Lead    Ngày: 29/07/2026
Ghi chú: Image signature only; ký tay giấy sau khi in
```

---

## 11. Triển khai & Vận hành (Deployment)

### DEC-DEP-01 · NC-DEP-02 — Tạo kỳ mới: bắt buộc script Admin? · **P1**

**Câu hỏi:** Mỗi kỳ mới có bắt buộc chạy script `createExamRoom` (không copy tay lung tung) không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Bắt buộc script | Template không drift | Phải có người chạy script |
| **B** | Cho copy tay theo checklist | Linh hoạt | Sai cột/quyền |
| **C** | Script + checklist verify | An toàn | Time nhẹ |

**Khuyến nghị Tech Lead:** **C**.

```
Quyết định: [ ] A  [ ] B  [X] C  [ ] Other: _______________
Người chốt: Tech Lead    Ngày: 29/07/2026
Ghi chú: Script + checklist verify
```

---

### DEC-DEP-02 · NC-DEP-03 — Staging vs Production · **P1**

**Câu hỏi:** Có tách môi trường Spreadsheet + Apps Script staging riêng không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có 2 môi trường đầy đủ | An toàn thử | Bảo trì 2 deploy |
| **B** | Một môi trường; test trên sheet “THỬ” tab/kỳ giả | Ít setup | Rủi ro đụng data thật |
| **C** | Staging chỉ trước kỳ đầu; sau đó gộp | Thực dụng ngắn hạn | — |

**Khuyến nghị Tech Lead:** **A** nếu có ≥2 người dev; **C** nếu nhân sự ít.

```
Quyết định: [ ] A  [ ] B  [ ] C  [ ] Other: Không cần tách
Người chốt: _______________    Ngày: ____/____/________
Ghi chú: _______________________________________________
```

---

### DEC-DEP-03 · NC-DEP-01 — Checklist GitHub Pages bổ sung · **P2**

**Câu hỏi:** Ngoài workflow hiện có, có yêu cầu checklist release Pages (version bump, hard-refresh SW, verify URL) thành văn bản bắt buộc không?

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Có — tạo `deployment/` checklist bắt buộc tick trước giờ G | Giảm quên | Thêm giấy tờ |
| **B** | Không — dựa PR review + workflow | Gọn | Ops dễ sót SW cache |
| **C** | Checklist chỉ cho người trực Pages | Cân bằng | — |

**Khuyến nghị Tech Lead:** **A** hoặc **C**.

```
Quyết định: [X] A  [ ] B  [ ] C  [ ] Other: _______________
Người chốt: Tech Lead    Ngày: 29/07/2026
Ghi chú: Pages checklist bắt buộc
```

---

### DEC-DEP-04 · NC-DEP-05 / Assumption quota — Quy mô kỳ & SLA Apps Script · **P0**

**Câu hỏi:** Quy mô kỳ thi mục tiêu để thiết kế polling/quota?

Điền số liệu kỳ điển hình / kỳ lớn nhất dự kiến:

| Hạng mục | Kỳ điển hình | Kỳ lớn nhất |
|---|---|---|
| Số võ sinh | ____ | ____ |
| Số giám khảo | ____ | ____ |
| Số LED/Scoreboard | ____ | ____ |
| Số Dashboard mở song song | ____ | ____ |
| Thời lượng giờ thi (giờ) | ____ | ____ |

| Option | Nội dung | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A** | Chốt số liệu bảng trên + chấp nhận tối ưu cache theo docs | Capacity có căn cứ | Phải ước lượng trung thực |
| **B** | “Chưa biết” — thiết kế conservative (poll 10s, cache 20s) | An toàn kỹ thuật | LED kém “nóng” |
| **C** | Other ràng buộc: _______________ | — | — |

**Khuyến nghị Tech Lead:** Điền số liệu + chọn **A**; nếu chưa ước lượng được → **B** tạm.

```
Quyết định: [ ] A  [X] B  [ ] C  [ ] Other: _______________
Người chốt: Tech Lead    Ngày: 29/07/2026
Ghi chú: Conservative poll/cache cho đến khi đo được số liệu thực
```

---

## 12. Bảng tiến độ nhanh

Đánh dấu khi đã điền **Quyết định** ở trên.

### P0 — Chặn bắt đầu implement

- [x] DEC-SCORE-01 (NC-BR-01) Map P1–P3 → **B** configurable per exam
- [x] DEC-SCORE-02 (NC-BR-05) Upsert DRAFT → **A** overwrite
- [x] DEC-SCORE-03 Validate total → **B** backend auto-calc
- [x] DEC-SCORE-04 Thang điểm → **B** 0–10 step 0.5
- [x] DEC-SCORE-05 (NC-BR-04) boutId → **C** studentId+round
- [x] DEC-SB-01 (NC-BR-03) DRAFT vs APPROVED trên LED → **B** APPROVED only
- [x] DEC-SB-02 (NC-BR-06) Công thức nhiều GK → 1 score/student
- [x] DEC-SB-03 (NC-BR-02) Thủ khoa / hòa điểm → highest total → highest col → lowest col
- [x] DEC-AP-01 (NC-TECH-03) N/T rate limit → No lockout
- [x] DEC-AUTH-01 (NC-TECH-01) Hash → **A** SHA-256+salt
- [x] DEC-AUTH-02 (NC-TECH-02) Session TTL → FE-only client-side
- [x] DEC-AUTH-03 (NC-API-03) Token vs pass → FE-only pass check
- [x] DEC-AUTH-04 (NC-API-04) loginRole bắt buộc? → **B** No loginRole
- [x] DEC-AUTH-06 Apps Script access mode → **A** Anyone
- [x] DEC-EXAM-02 (NC-UI-02) Admin UI vs Sheets → **B** Full Admin UI
- [x] DEC-EXAM-04 Template Sheets/Drive tồn tại? → **C** docs 03 as template
- [x] DEC-DB-01 (NC-DB-01) Tabs/cột → **A** UPPER_SNAKE
- [x] DEC-DB-02 (NC-DB-02) Cột bắt buộc → **B** Required only
- [x] DEC-DB-03 (NC-DB-03) schema.sql → **A** from docs 03
- [x] DEC-API-01 Envelope JSON → **A** {ok, data, error}
- [x] DEC-API-02 Error codes → **A** Full list
- [x] DEC-API-03 getData contract → **A** Lock contract
- [x] DEC-FE-01 (NC-TECH-06) Vanilla vs React → **A** Vanilla
- [x] DEC-DEP-04 (NC-DEP-05) Quy mô / quota → **B** Conservative

### P1 — Trước Offline B / kỳ thật

- [x] DEC-AP-02 PIN trùng pass CCK? → PIN removed; CCK fixed password
- [x] DEC-AP-03 (NC-BR-07) NEEDS_REVIEW scope → Offline only
- [x] DEC-AUTH-07 (NC-SEC-02) ACL Sheets/Drive → **A** Least privilege
- [x] DEC-AUTH-08 (NC-SEC-03/04) Local API / HTTPS → **A** HTTP LAN + SSID
- [x] DEC-AUTH-09 getData theo role → **B** Two endpoints
- [x] DEC-EXAM-01 Nhiều room? → **B** Multi-room
- [x] DEC-EXAM-03 QR generation → **B** Script/API
- [x] DEC-DB-04 (NC-DB-04) rooms/config → **B** Add rooms table
- [x] DEC-DB-07 SYNC_META / version → **B** CacheService TTL only
- [x] DEC-API-04 (NC-API-01) URLs → **A** config.json
- [x] DEC-OFF-01 (NC-DEP-04) LAN discovery → **A+B** config + mDNS
- [x] DEC-OFF-04 exam.mode vs runtime → **A** exam attribute; Local Server = offline host only
- [x] DEC-OFF-02 Sync credentials → **A** Service account
- [x] DEC-FE-02 Hash vs path router → **C** Multi-page HTML
- [x] DEC-FE-03 (NC-TECH-04) Browser matrix → **A** Latest Chrome/Safari
- [x] DEC-PDF-01 Chữ ký PDF scope → **A** Image signature only
- [x] DEC-DEP-01 (NC-DEP-02) createExam bắt buộc → **C** Script + verify
- [x] DEC-DEP-02 (NC-DEP-03) Staging → No staging

### P2 — Có thể hoãn

- [x] DEC-SB-04 (NC-UI-01) Hiệu ứng Scoreboard → **B** Motion + banner
- [x] DEC-AUTH-05 (NC-SEC-01) OAuth2 MVP? → **A** No OAuth2
- [x] DEC-DB-05 (NC-DB-05) Audit log → **C** sync_log + timestamps
- [x] DEC-DB-06 Drive folders phụ → **C** PDF + signatures + seals
- [x] DEC-OFF-03 LockService concurrent → **A** LockService
- [x] DEC-FE-04 (NC-TECH-05) Accessibility → **B** Best-effort
- [x] DEC-FE-05 (NC-UI-03) Settings module → **A** Merged into Admin
- [x] DEC-DEP-03 (NC-DEP-01) Pages checklist → **A** Bắt buộc

---

## Điều kiện “đủ để bắt đầu implement”

Tech Lead chỉ mở Phase 1 code khi:

1. **Tất cả checkbox P0** đã có Quyết định điền đủ.  
2. Các mục nghiệp vụ P0 do **Ban tổ chức / PO** ký (không chỉ Tech Lead tự tick).  
3. File này được coi là phụ lục quyết định; SoT vẫn là mô tả vận hành — nếu quyết định đổi SoT, cập nhật SoT trong PR riêng.

**Chưa đủ P0 → không lock API/DB → không implement production path.**
