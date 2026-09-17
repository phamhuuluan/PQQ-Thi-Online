# 09 — Missing Requirements (Resolved)

> **Trạng thái: REQUIREMENT_FREEZE** — Mọi quyết định đã chốt tại [DECISIONS.md](./DECISIONS.md). Không thay đổi spec mà không qua Change Request.

---

## 16. Status

**All NEED_CONFIRMATION items resolved in DECISIONS.md on 2026-07-29.** See [DECISIONS.md](./DECISIONS.md) for full record of 45/45 decisions.

Không còn mục nào chờ xác nhận. Mọi NC-BR, NC-TECH, NC-DB, NC-API, NC-SEC, NC-DEP, NC-UI đã được chốt.

---

## Confirmation Protocol (Reference)

1. Gán owner (PO / Ban TC / Tech Lead) cho mỗi `NC-*`.
2. Chốt quyết định trong [`DECISIONS.md`](./DECISIONS.md) (câu hỏi + Option A/B/C + ô Quyết định). Không tick thay Ban tổ chức.
3. Sau khi nhóm **P0** trong `DECISIONS.md` đủ: lock API/DB version cho milestone tương ứng.
4. Không merge assumption vào code như requirement đã chốt.
5. Nếu quyết định sản phẩm đổi SoT → cập nhật SoT trong PR riêng, giữ `DECISIONS.md` làm biên bản.

---

## Change Request Process (Post-Freeze)

Nếu cần thay đổi requirement đã chốt:

1. Tạo issue / PR với label `change-request`.
2. Ghi rõ DEC-* nào bị ảnh hưởng.
3. PO / Ban TC phải approve trước khi merge.
4. Cập nhật DECISIONS.md + docs liên quan trong cùng PR.
