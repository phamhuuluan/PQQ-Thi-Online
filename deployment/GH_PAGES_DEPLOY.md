# GitHub Pages — Production Deploy (T-1011)

> DEC-DEP-02: Không staging — deploy thẳng từ `main`. Rollback = revert commit Pages.

## Trước deploy

- [ ] `config.json` trỏ đúng Apps Script production URL (xem `config.production.json.example`)
- [ ] Chạy `npm test` — tất cả pass
- [ ] Chạy `npm run verify:polling`
- [ ] Bump `version` trong `config.json` và `pwa/sw.js` (`CACHE_VERSION`)

## Deploy

```bash
git checkout main
git pull
# Cập nhật config.json với production Apps Script URL
git add config.json
git commit -m "chore: production config for kỳ thi XYZ"
git push origin main
```

Workflow `.github/workflows/pages.yml` tự deploy khi push `main`.

## Sau deploy — verify (bắt buộc)

- [ ] Mở URL GitHub Pages → Role Gate load OK
- [ ] DevTools → Application → Manifest + Service Worker registered
- [ ] Hard refresh (Ctrl+Shift+R) hoặc clear SW cache nếu vừa bump version
- [ ] `index.html` → đăng nhập GK (pass test) → redirect judge page
- [ ] `scoreboard.html?examId=...` → polling 10s, không lỗi CORS
- [ ] API call tới Apps Script URL — response envelope `{ok, data}`

## Rollback

```bash
git revert <commit-sha>
git push origin main
```

Hoặc GitHub → Actions → re-run deploy từ commit trước.

## Checklist SW cache (DEC-DEP-03)

| Bước | Việc |
|---|---|
| 1 | Bump `CACHE_VERSION` trong `pwa/sw.js` |
| 2 | Deploy Pages |
| 3 | Mở app → banner "Phiên bản mới" hoặc hard refresh |
| 4 | Verify `pwa/sw.js` version trong DevTools |
