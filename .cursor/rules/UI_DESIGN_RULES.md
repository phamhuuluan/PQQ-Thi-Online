# UI Design Rules — Phật Quang Quyền (PQQ) Công đức

> Tài liệu được trích xuất **chỉ từ source code hiện tại** (`index.html`, `css/`, `js/`).  
> Không bao gồm quy tắc chưa được implement hoặc chưa được định nghĩa trong project.

---

## 1. UI Architecture

### Stack & cấu trúc file

| Layer | Công nghệ / Pattern | Nguồn |
|-------|---------------------|-------|
| Markup shell | `index.html` — header cố định + container rỗng | `index.html` |
| View templates | HTML string trong `js/templates/*.js`, inject qua `insertAdjacentHTML` | `dashboard.js`, `scoring.js`, `clubModal.js` |
| Logic / render | Vanilla JS, namespace global `PQQ` | `js/*.js` |
| Styles | CSS thuần, tách file theo domain | `css/*.css` |
| Icons | Font Awesome 6.4.0 (CDN) | `index.html` |
| Charts | Chart.js 4.4.0 (CDN) | `index.html`, `js/chart.js` |
| State | Object global `PQQ.state` | `js/state.js` |

### Nguyên tắc kiến trúc UI (đang áp dụng)

1. **Shell tối giản + inject động**: `index.html` chỉ giữ header, `#mainContainer`, `#modalRoot`, `#toastStack`. Dashboard, Scoring, Modal được inject khi init.
2. **Tách template / logic**: HTML layout nằm trong `js/templates/`, logic render & event nằm trong `js/dashboard.js`, `js/scoring.js`, `js/club.js`, v.v.
3. **Cập nhật DOM qua state**: Dùng `innerHTML`, `classList.toggle/add/remove`, `textContent` — không dùng framework reactive.
4. **CSS theo module**: Load thứ tự cố định trong `index.html`:
   ```
   variables → base → layout → toast → table → dashboard → chart → modal → scoring → responsive
   ```
5. **Script classic (không `type="module"`)**: Hỗ trợ chạy `file://` và GitHub Pages.
6. **Ngôn ngữ UI**: `lang="vi"`, nội dung tiếng Việt, format số `toLocaleString('vi-VN')`, timezone `Asia/Ho_Chi_Minh`.

### Hai mode màn hình

| Mode | Kích hoạt | Container | Badge header |
|------|-----------|-----------|--------------|
| Admin Dashboard | URL không có `?clb=` | `#admin-dashboard` | `fa-chart-bar` + "Admin Dashboard" |
| Chấm Điểm | URL có `?clb=<keyword>` | `#chamdiem-section` | `fa-pen-to-square` + "Chấm Điểm" |

Chuyển mode bằng `display: none/block` trên section — **không có router SPA, không có sidebar/nav menu**.

---

## 2. Design Tokens

### 2.1 CSS Variables (`css/variables.css`)

| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| `--primary` | `#0d6efd` | CTA, accent, icon, focus |
| `--primary-dk` | `#0a58ca` | Hover primary, text accent đậm |
| `--success` | `#198754` | Toast OK, số đã chấm, stat green |
| `--danger` | `#dc3545` | Toast error, error text |
| `--warning` | `#e67e22` | Toast warning, dirty state, rubric note border |
| `--bg` | `#f0f2f6` | Body background |
| `--surface` | `#ffffff` | Card, input, modal |
| `--border` | `#dee2e6` | Border chung |
| `--text` | `#1e2a3a` | Text chính |
| `--muted` | `#6c757d` | Text phụ, label |
| `--header-a` | `#8a1c14` | Gradient header/modal (đỏ đậm) |
| `--header-b` | `#c0392b` | Gradient header/modal (đỏ) |
| `--radius` | `10px` | Card, banner, submit bar |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,.07)` | Card, stat-chip |
| `--shadow-md` | `0 4px 20px rgba(0,0,0,.1)` | Submit bar inner |

### 2.2 Typography

| Element | Font | Size | Weight | Ghi chú |
|---------|------|------|--------|---------|
| `body` | `'Segoe UI', system-ui, -apple-system, sans-serif` | — | — | `css/base.css` |
| `.site-header h1` | inherit | `1.25rem` → `1rem` @560px | 700 | `uppercase`, `letter-spacing: .4px` |
| `.site-header .sub` | inherit | `.78rem` | — | `opacity: .78` |
| `.mode-badge` | inherit | `.82rem` | 700 | |
| `.card-header` | inherit | `.95rem` | 700 | |
| `thead th` | inherit | `.72rem` | 700 | `uppercase`, `letter-spacing: .45px` |
| `td` | inherit | `.88rem` | — | |
| `.btn` | inherit | `.85rem` | 700 | |
| `.stat-chip .val` | inherit | `1.35rem` | 800 | `font-variant-numeric: tabular-nums` |
| `.stat-chip .lbl` | inherit | `.68rem` | 600 | `uppercase`, `letter-spacing: .4px` |
| `.kpi-value` | inherit | `2.2rem` | 800 | Dashboard KPI |
| `.font-mono` | inherit | — | — | Chỉ `font-variant-numeric: tabular-nums` (không phải monospace font) |

**Số liệu**: Luôn dùng `font-variant-numeric: tabular-nums` cho số thống kê, điểm, ngày.

### 2.3 Spacing (giá trị thực tế trong CSS)

| Context | Padding / Margin / Gap |
|---------|------------------------|
| `.page` | `margin: 22px auto 60px`, `padding: 0 20px`, `max-width: 1200px` |
| `#chamdiem-section` containers | `max-width: 1320px` (page, stat-row, banner, submit-bar) |
| `.site-header` | `padding: 14px 24px`, `gap: 10px` |
| `.card-header` | `padding: 14px 18px` |
| `.modal-body` | `padding: 20px` (club modal: `14px 16px 16px`) |
| `.stat-row` | `gap: 12px`, `margin: 20px auto 0`, `padding: 0 20px` |
| `.stat-chip` | `padding: 12px 18px`, `gap: 9px` |
| `.btn` | `padding: 8px 18px`, `gap: 6px` |
| Submit bar `.btn` | `padding: 11px 22px`, `min-width: 220px` |
| `td` / `th` | `padding: 9px 10px` (table base), chi tiết khác theo từng table |

### 2.4 Border Radius

| Token / Class | Giá trị |
|---------------|---------|
| `--radius` | `10px` |
| `.btn` | `8px` |
| `.modal-box` | `14px` |
| `.mode-badge` | `20px` (pill) |
| `.badge-tong` | `999px` (full pill) |
| `.search-wrap input` | `8px` |
| `.search-wrap-lg input` | `12px` |
| `.toast` | `9px` |
| `.stat-chip` | `9px` |
| `.m-stat` | `8px` |

### 2.5 Shadows & Gradients

**Gradients đang dùng:**
- Header / Modal header: `linear-gradient(135deg, var(--header-a), var(--header-b))`
- Dashboard KPI: `linear-gradient(160deg, #8a1c14 0%, #c0392b 55%, #d35400 100%)`
- Scoring month banner: `linear-gradient(135deg, #e8f0fe, #f0f7ff)`
- Submit bar fade: `linear-gradient(180deg, transparent, var(--bg) 28%)`
- Total value badge: `linear-gradient(180deg, #eef4ff, #e4edff)`

### 2.6 Chart Colors (`PQQ.CHART_COLORS` trong `js/constants.js`)

| Key | Giá trị |
|-----|---------|
| `overview` | `['#0d6efd', '#198754', '#e67e22', '#0d9488', '#c0392b']` |
| `topClubHot` | `rgba(192,57,43,.85)` |
| `topClubNormal` | `rgba(13,110,253,.75)` |
| `topStudentHot` | `rgba(25,135,84,.85)` |
| `topStudentNormal` | `rgba(13,148,136,.72)` |

Chart tooltip: `backgroundColor: rgba(30,42,58,.92)`, `cornerRadius: 8`, `padding: 10`.

### 2.7 Score Bar Thresholds (`PQQ.SCORE_BAR_THRESHOLDS`)

| Level | Class | Màu | Điều kiện |
|-------|-------|-----|-----------|
| `high` | `.score-bar-fill.high` | `#6fcf97` | `>= 8` |
| `mid` | `.score-bar-fill.mid` | `#f0c674` | `>= 5` |
| `low` | `.score-bar-fill.low` | `#f5a89a` | `< 5` |

### 2.8 Z-index

| Layer | z-index |
|-------|---------|
| `.site-header` | 200 |
| `.submit-bar` | 150 |
| `thead th` (sticky) | 10–12 (tùy table) |
| `#toastStack` | 9999 |
| `.modal-backdrop` | 10000 |

---

## 3. Component Rules

### 3.1 Buttons

**Base class**: `.btn`

```html
<button type="button" class="btn btn-primary">
  <i class="fas fa-paper-plane"></i> Label
</button>
```

| Variant | Class | Background | Trạng thái đặc biệt |
|---------|-------|------------|---------------------|
| Primary | `.btn-primary` | `var(--primary)` → hover `var(--primary-dk)` | Dùng cho submit |
| Success | `.btn-success` | `var(--success)` | **Đã định nghĩa CSS, chưa dùng trong JS** |
| Muted | `.btn-muted` | `var(--muted)` | Loading/submitting state |
| Danger | `.btn-danger` | `var(--danger)` | **Đã định nghĩa CSS, chưa dùng trong JS** |
| Warning | `.btn-warning` | `var(--warning)` | **Đã định nghĩa CSS, chưa dùng trong JS** |

**Hành vi chung:**
- `display: inline-flex`, `align-items: center`, `gap: 6px`
- Hover: `transform: translateY(-1px)` (trừ `:disabled`)
- Disabled: `opacity: .6`, `cursor: not-allowed`
- Loading icon: `<i class="fas fa-circle-notch spin"></i>` (class `.spin` → animation `spin`)

**Button phụ — `.btn-detail`** (dashboard only):
- Background `#e8f0fe`, color `var(--primary)`, `font-size: .75rem`, `border-radius: 6px`
- Không extend `.btn` base

### 3.2 Cards

```html
<div class="card">
  <div class="card-header">
    <span><i class="fas fa-icon"></i> Tiêu đề</span>
    <!-- optional: search-wrap -->
  </div>
  <div class="tbl-scroll">...</div>
</div>
```

- Background `var(--surface)`, `border-radius: var(--radius)`, `box-shadow: var(--shadow-sm)`
- Header icon màu `var(--primary)`, `margin-right: 7px`
- Variants: `.card.dash-overview`, `.card.rubric-card`

### 3.3 Stat Chips

```html
<div class="stat-chip blue">
  <div class="icon" style="color:var(--primary)"><i class="fas fa-users"></i></div>
  <div>
    <div class="val" id="...">—</div>
    <div class="lbl">Label</div>
  </div>
</div>
```

| Color modifier | Border-left color | Đang dùng |
|----------------|-------------------|-----------|
| `.blue` | `var(--primary)` | ✅ Scoring |
| `.green` | `var(--success)` | ✅ Scoring |
| `.orange` | `var(--warning)` | ✅ Scoring |
| `.red` | `var(--danger)` | ❌ Chưa dùng |
| `.teal` | `#0d9488` | ❌ Chưa dùng |
| `.slate` | `#475569` | ❌ Chưa dùng |

Layout: `.stat-row` grid 3 cột → 2 cột @900px → 1 cột @520px.

### 3.4 Search

**Hai cách implement:**

| Variant | Class | Width | Dùng ở |
|---------|-------|-------|--------|
| Compact | `.search-wrap` | input `210px` → `150px` @560px | Dashboard card header |
| Large | `.search-wrap.search-wrap-lg` | `min(420px, 100%)` → full width @560px | Scoring page |

Pattern chung:
```html
<div class="search-wrap">
  <i class="fas fa-magnifying-glass"></i>
  <input type="text" id="..." placeholder="...">
</div>
```

- Icon absolute left, `pointer-events: none`
- Focus: `border-color: var(--primary)`
- Scoring search có thêm `aria-label`, icon `aria-hidden="true"`

### 3.5 Tables

**Ba pattern table khác nhau:**

| Table | Class / ID | Đặc điểm |
|-------|------------|----------|
| Generic | `table` trong `.tbl-scroll` | `min-width: 520px`, sticky thead, hover `#f5f7fa` |
| Scoring | `#cdTable` | `table-layout: fixed`, sticky header z-index 12, dirty row highlight, score inputs |
| Club modal | `.club-detail-table` | Multi-level header (group-row + subhead-row), sticky col-name, color-coded month/year |
| Rubric | `.rubric-table` | 2 cột: điểm + tiêu chí |

**Utility classes cho cells:**
- `.left` — text-align left
- `.text-muted` — color `var(--muted)`
- `.font-mono` — tabular-nums
- `.hidden` — `display: none` (search filter)
- Column classes: `.col-name`, `.col-score`, `.col-total`, `.col-note`, `.col-updated`

### 3.6 Modal

```html
<div class="modal-backdrop" id="modalBackdrop">
  <div class="modal-box modal-club">
    <div class="modal-hd">
      <h3 id="modalTitle">...</h3>
      <button class="modal-close" id="modalClose"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" id="modalBody">...</div>
  </div>
</div>
```

- Open: thêm class `.open` trên backdrop, `document.body.style.overflow = 'hidden'`
- Close: click nút X hoặc click backdrop (không click vào `.modal-box`)
- Animation enter: `mdIn .26s ease` (translateY + fade)
- Club modal: `.modal-club` → `max-width: min(1100px, 96vw)`

**Modal stats** (`.modal-stats` + `.m-stat`):
- Grid 3 cột → 2 cột @560px
- Value `.v`: `font-size: 1.4rem`, `font-weight: 800`
- Label `.l`: uppercase, `font-size: .68rem`, `color: var(--muted)`

### 3.7 Toast

```js
PQQ.toast('ok' | 'err' | 'wrn', message);
```

| Type | Class | Background | Icon (`PQQ.TOAST_ICONS`) |
|------|-------|------------|--------------------------|
| Success | `.toast.ok` | `var(--success)` | `fa-circle-check` |
| Error | `.toast.err` | `var(--danger)` | `fa-circle-exclamation` |
| Warning | `.toast.wrn` | `var(--warning)` | `fa-triangle-exclamation` |

- Position: fixed bottom-right (`bottom: 20px`, `right: 18px`)
- Auto remove sau 3600ms (JS) + animation `tOut` sau 3s
- `max-width: 280px`, text trắng, `font-weight: 600`

### 3.8 Loader / Spinner

```html
<div class="loader-wrap">
  <div class="spinner"></div>
  <p>Đang tải…</p>
</div>
```

- Dùng trong: table empty state, modal body, initial load
- Spinner: 44×44px, border 4px, `border-top-color: var(--primary)`, animation `spin .75s`

### 3.9 Scoring-specific Components

| Component | Classes | Mô tả |
|-----------|---------|-------|
| Month banner | `.scoring-month-banner` > `.banner-inner` | Gradient xanh nhạt, icon calendar |
| Score input | `.score-input` trong `.score-cell` | `type="number"`, min 0 max 10, no spin buttons |
| Score bar | `.score-bar` > `.score-bar-fill.{low\|mid\|high}` | Height 4px (3px trong #cdTable) |
| Total badge | `.total-val` > `.total-num` | Gradient blue pill |
| Note input | `.note-input` | Textarea, dirty → border warning + bg `#fffaf3` |
| Updated cell | `.cd-updated` > `.cd-upd-date` + `.cd-upd-time` | 2-line date/time |
| Submit bar | `.submit-bar` > `.submit-inner` | Sticky bottom, hint + primary button |
| Rubric accordion | `.rubric-card.is-open` | Toggle `.rubric-body` display |
| Rubric tabs | CSS-only radio tabs `.rubric-tab-input` + `label` | 5 tabs, no JS tab switching |

### 3.10 Dashboard-specific Components

| Component | Classes |
|-----------|---------|
| KPI panel | `.dash-overview-kpi` |
| Chart area | `.dash-overview-chart`, `.chart-wrap` |
| 2-col grid | `.dash-grid` |
| Detail button | `.btn-detail` |

### 3.11 Icons

**Hai cách dùng icon trong project:**

1. **Font Awesome** (`fas fa-*`) — chuẩn chính, dùng ở header, buttons, stat chips, toast, search
2. **Emoji** — chỉ dùng trong dashboard card headers: `🏆`, `🥇`

Không có icon component wrapper — dùng trực tiếp `<i class="fas ...">` hoặc emoji trong text.

---

## 4. Layout & Responsive Rules

### 4.1 Container widths

| Container | max-width |
|-----------|-----------|
| `.page`, `.stat-row`, `.scoring-month-banner`, `.submit-bar` | `1200px` |
| `#chamdiem-section` (page, stat-row, banner, submit-bar) | `1320px` |
| `.modal-box` (default) | `600px` |
| `.modal-box.modal-club` | `min(1100px, 96vw)` |

### 4.2 Grid layouts

| Grid | Columns | Breakpoint collapse |
|------|---------|---------------------|
| `.stat-row` | 3 → 2 → 1 | 900px, 520px |
| `.dash-overview` | 2 (KPI + chart) → 1 | 900px |
| `.dash-grid` | 2 → 1 | 860px |
| `.modal-stats` | 3 → 2 | 560px |

### 4.3 Breakpoints (tổng hợp từ toàn bộ CSS)

| Breakpoint | Thay đổi chính |
|------------|----------------|
| `900px` | stat-row 2 cột; dash-overview 1 cột |
| `860px` | dash-grid 1 cột |
| `720px` | modal-club full width, padding giảm |
| `560px` | Header h1 nhỏ; search full width; score input nhỏ; modal-stats 2 cột; submit bar stack; rubric tabs 3-per-row |
| `520px` | stat-row 1 cột |

### 4.4 Sticky elements

| Element | Position |
|---------|----------|
| `.site-header` | `sticky top: 0` |
| `thead th` | `sticky top: 0` |
| `#cdTable` header | `sticky top: 0, z-index: 12` |
| `.club-detail-table .col-name` | `sticky left: 0` |
| `.submit-bar` | `sticky bottom: 0` |
| `#cdTable .tbl-scroll` | `max-height: calc(100vh - 300px)` scroll |

### 4.5 Scrollbar (webkit only)

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
```

---

## 5. Navigation Rules

### 5.1 Routing (URL-based, không có nav menu)

| URL | Mode | Init function |
|-----|------|---------------|
| `/` hoặc không có `clb` | Dashboard | `PQQ.initDashboard()` |
| `?clb=<keyword>` | Scoring | `PQQ.initScoring()` |

- Không có sidebar, tabs chuyển trang, hay breadcrumb
- Mode hiển thị qua `.mode-badge` trong header

### 5.2 Header content động

| Mode | `#headerSub` content |
|------|---------------------|
| Dashboard | `Thống kê Công Đức — Năm {year}` |
| Scoring (có data) | `CLB: {clubName}` |
| Scoring (không tìm thấy) | `Không tìm thấy CLB khớp với từ khóa: "..."` |

### 5.3 In-page navigation

| Pattern | Cơ chế |
|---------|--------|
| Club detail | Click `.btn-detail` → mở modal |
| Rubric guide | Toggle accordion `.rubric-card` |
| Rubric criteria tabs | CSS radio `:checked` — không JS |
| Table search | Filter rows bằng class `.hidden` |

### 5.4 Modal navigation

- Close: `#modalClose` button hoặc click backdrop
- Không có nested modal, không có modal history

---

## 6. State UI Rules

### 6.1 Loading states

| Context | UI |
|---------|-----|
| App init | Header badge: `fa-circle-notch fa-spin` + "Đang khởi tạo" |
| Table loading | `.loader-wrap` + `.spinner` trong `<td colspan="...">` |
| Modal loading | `.loader-wrap` trong `#modalBody` |
| Submit | Button → `.btn-muted` + `fa-circle-notch spin` + disabled + text "Đang gửi…" |

### 6.2 Dirty / Changed states (Scoring)

| Element | Class khi dirty | Visual |
|---------|-----------------|--------|
| Score input | `.score-input.dirty` | `color: var(--warning)` |
| Note textarea | `.note-input.dirty` | `border-color: var(--warning)`, `background: #fffaf3` |
| Table row | `tr.is-dirty` | `background: #fff8ef`, `box-shadow: inset 3px 0 0 var(--warning)` |

Submit button:
- `disabled` khi `cdDirty.size === 0`
- Hint text: `"{n} võ sinh sẽ được cập nhật."` hoặc `"Chưa có thay đổi để gửi."`

### 6.3 Empty states

| Context | Message | Style |
|---------|---------|-------|
| No students (scoring) | `PQQ.MESSAGES.NO_STUDENTS` | inline: `padding:36px; text-align:center; color:var(--muted)` |
| No students (club modal) | `PQQ.MESSAGES.NO_STUDENTS_TABLE` | `.club-table-empty` |
| Placeholder values | `—` | stat chips, KPI |

### 6.4 Error states

| Context | UI |
|---------|-----|
| API error (table) | Row full-width, `color:var(--danger)`, icon `fa-circle-exclamation` |
| API error (global) | `PQQ.toast('err', message)` |
| Validation (no changes) | `PQQ.toast('wrn', PQQ.MESSAGES.NO_CHANGES)` |

### 6.5 Success states

| Context | UI |
|---------|-----|
| Submit OK | `PQQ.toast('ok', PQQ.MESSAGES.SUBMIT_OK)` |
| Row save flash | CSS `.save-flash` animation `rowSave` — **đã định nghĩa, chưa gọi trong JS** |

### 6.6 Disabled states

- `.btn:disabled` → opacity `.6`, no hover transform
- Submit button disabled khi không có dirty rows hoặc đang submitting

### 6.7 Accordion state (Rubric)

- Closed: `.rubric-body { display: none }`, text "Xem thêm", `aria-expanded="false"`
- Open: `.rubric-card.is-open`, text "Thu gọn", chevron rotate 180°, `aria-expanded="true"`

---

## 7. Naming Convention

### 7.1 CSS Classes

- **kebab-case**: `.site-header`, `.stat-chip`, `.btn-detail`, `.score-input`, `.modal-backdrop`
- **BEM-like modifiers**: `.stat-chip.blue`, `.toast.ok`, `.score-bar-fill.high`
- **State classes**: `.is-open`, `.is-dirty`, `.is-empty`, `.dirty`, `.hidden`, `.open`
- **ID selectors cho page-specific**: `#cdTable`, `#chamdiem-section`, `#admin-dashboard`

### 7.2 JavaScript

| Loại | Convention | Ví dụ |
|------|------------|-------|
| Namespace | `PQQ` (PascalCase) | `window.PQQ` |
| Functions | camelCase | `renderScoringTable`, `openClubModal` |
| State keys | camelCase | `cdDirty`, `isSubmitting` |
| Constants | UPPER_SNAKE hoặc PascalCase object | `PQQ.SCORE_MAX`, `PQQ.MESSAGES` |
| Private helpers | camelCase + suffix `_` | `applySubmitSuccessToUi_`, `softRefreshScoringInBackground_` |
| DOM IDs | camelCase | `cdTableBody`, `btnBatchSubmit`, `modalBackdrop` |
| data-* attributes | camelCase | `data-student-id`, `data-club-name`, `data-field`, `data-total` |

### 7.3 File naming

| Type | Pattern |
|------|---------|
| CSS | `css/{domain}.css` — lowercase |
| JS modules | `js/{feature}.js`, `js/templates/{name}.js` |
| HTML | `index.html` (single entry) |

### 7.4 HTML template functions

- `PQQ.getDashboardHtml()`, `PQQ.getScoringHtml()`, `PQQ.getClubModalHtml()`
- Inject: `PQQ.injectDashboard()`, `PQQ.injectScoring()`, `PQQ.injectClubModal()`

---

## 8. Reusable UI Patterns

### 8.1 Patterns đang dùng lặp lại

| Pattern | Files | Mô tả |
|---------|-------|-------|
| Card + Table | dashboard, scoring | `.card` > `.card-header` + `.tbl-scroll` > `table` |
| Stat row KPI | scoring | 3× `.stat-chip` với icon + val + lbl |
| Modal stats grid | club modal | 3× `.m-stat` |
| Search filter | dashboard, scoring | Input → toggle `.hidden` trên `tr` |
| Loader in table | dashboard, scoring, modal | colspan row + `.loader-wrap` |
| Toast feedback | scoring, dashboard | `PQQ.toast(type, msg)` sau API |
| Sticky action bar | scoring | `.submit-bar` bottom |
| Header gradient | layout, modal | Red gradient brand |
| Inline color accent | dashboard.js, club.js | `style="color:var(--success)"` trên số liệu |

### 8.2 Render patterns (JS)

| Pattern | Cách làm |
|---------|----------|
| Static shell | Template string → `insertAdjacentHTML` once |
| Dynamic rows | `document.createElement('tr')` + `innerHTML` + `appendChild` |
| Partial update | `textContent` / `innerHTML` trên element cụ thể |
| Class toggle | `classList.toggle('dirty', condition)` |
| Event binding | `addEventListener` với guard `dataset.bound` |

### 8.3 Data display patterns

| Data | Format |
|------|--------|
| Điểm / số lớn | `PQQ.fmtScore(n)` → `toLocaleString('vi-VN')` |
| Tổng điểm row | `PQQ.formatTotal(sum)` → `<span class="total-num">` |
| Ngày cập nhật | `PQQ.formatUpdatedDisplay(raw)` → date + time spans |
| Label dài | `PQQ.truncateLabel(str, max)` cho chart |
| XSS safe text | `PQQ.esc(s)` trước khi inject HTML |

---

## 9. Things Must NOT Be Used

Dựa trên những gì **không có** trong project — tránh introduce khi build UI mới:

| ❌ Không dùng | Lý do (từ codebase) |
|--------------|---------------------|
| React, Vue, Angular, Svelte | Project dùng Vanilla JS |
| Tailwind, Bootstrap, UI framework CSS | CSS custom + variables |
| `type="module"` / ES modules | Comment trong `index.html`: cần chạy `file://` |
| CSS-in-JS | Styles trong file `.css` riêng |
| npm build step cho frontend | Static files, CDN cho FA + Chart.js |
| Custom icon font ngoài Font Awesome | Chỉ FA 6.4.0 + emoji (dashboard) |
| jQuery | Không có trong dependencies |
| Router library | URL param `?clb=` + display toggle |
| Global nav / sidebar | Không tồn tại trong design |
| Dark mode | Không có tokens hay styles |
| Form `<form>` submit | Buttons `type="button"`, submit qua JS fetch |
| Native `<dialog>` | Dùng custom `.modal-backdrop` |
| `alert()` / `confirm()` | Dùng toast + modal |

---

## 10. Missing UI Rules

Các mục **chưa được định nghĩa** trong project:

| Mục | Trạng thái |
|-----|------------|
| Dark mode / theme switching | ❌ Chưa có |
| Design system documentation trước đây | ❌ Chưa có (file này là lần đầu) |
| Form validation UI (inline errors dưới field) | ❌ Chỉ clamp score 0–10, toast khi no changes |
| Focus visible / keyboard navigation spec | ❌ Chưa định nghĩa (chỉ có aria trên rubric toggle + scoring search) |
| Print styles | ❌ Chưa có |
| Accessibility (WCAG) guideline | ❌ Chưa có, chỉ một số `aria-*` rời rạc |
| Animation guideline tổng thể | ❌ Chỉ có animation cụ thể (spin, mdIn, tIn/tOut, rowSave) |
| Typography scale hệ thống (h1–h6) | ❌ Không dùng heading hierarchy chuẩn |
| Spacing scale tokenized | ❌ Hardcode rem/px, không có `--space-*` |
| Button size variants (sm/lg) | ❌ Chỉ 1 size + override submit bar |
| `.btn-success`, `.btn-danger`, `.btn-warning` usage | ❌ CSS có, JS chưa dùng |
| `.stat-chip.red`, `.teal`, `.slate` usage | ❌ CSS có, HTML chưa dùng |
| `.rank-legend`, `.chart-wrap-sm` | ❌ CSS có, HTML/JS chưa dùng |
| `.save-flash` row animation | ❌ CSS có, JS chưa gọi |
| Component library / Storybook | ❌ Chưa có |
| i18n / multi-language | ❌ Chỉ tiếng Việt hardcode |
| Skeleton loading | ❌ Chỉ spinner |
| Confirm dialog trước submit | ❌ Submit trực tiếp |
| Offline / PWA UI | ❌ Chưa có |
| Consistent error inline style class | ❌ Dùng inline `style=` khác nhau (padding 30px vs 36px) |

### Nhiều cách implement cùng mục đích (cần lưu ý khi mở rộng)

| Mục đích | Cách 1 | Cách 2 |
|----------|--------|--------|
| Search input | `.search-wrap` compact | `.search-wrap-lg` enhanced |
| Màu accent số liệu | CSS class (`.font-mono`) | Inline `style="color:var(--success)"` |
| Icon tiêu đề | Font Awesome trong `.card-header i` | Emoji trong `<span>` (dashboard charts) |
| Table styling | Generic `table` + `table.css` | Page-specific `#cdTable`, `.club-detail-table` |
| Button | `.btn` + variant | `.btn-detail` standalone |
| Empty/error message | CSS class (`.club-table-empty`) | Inline styles trong `innerHTML` |

---

## 11. UI Consistency Checklist

Khi thêm UI mới, đối chiếu với project hiện tại:

- [ ] Dùng CSS variables từ `variables.css` cho màu chính (`--primary`, `--success`, `--danger`, `--warning`, `--muted`, `--text`, `--border`, `--surface`, `--bg`)
- [ ] Font stack: `'Segoe UI', system-ui, -apple-system, sans-serif`
- [ ] Số liệu có `font-variant-numeric: tabular-nums`
- [ ] Format số qua `PQQ.fmtScore()` / `toLocaleString('vi-VN')`
- [ ] Text user-generated qua `PQQ.esc()` trước `innerHTML`
- [ ] Container content trong `.page` (max-width 1200px, padding 0 20px)
- [ ] Card dùng `.card` + `.card-header` + `.tbl-scroll` nếu có table
- [ ] Table header: uppercase, `.72rem`, `font-weight: 700`, `color: var(--muted)`
- [ ] Button chính: `.btn.btn-primary` với icon FA bên trái
- [ ] Loading: `.loader-wrap` + `.spinner`, không spinner tự chế
- [ ] Feedback: `PQQ.toast('ok'|'err'|'wrn', msg)` — không `alert()`
- [ ] Icon: Font Awesome `fas fa-*` (trừ dashboard title đã dùng emoji)
- [ ] Header/modal header: gradient đỏ `var(--header-a)` → `var(--header-b)`
- [ ] Border radius card: `var(--radius)` (10px)
- [ ] Shadow card: `var(--shadow-sm)`
- [ ] Responsive: test tại 900px, 860px, 720px, 560px, 520px
- [ ] Sticky header site đã có z-index 200 — modal 10000, toast 9999
- [ ] Không thêm CSS framework hay JS framework
- [ ] Template HTML đặt trong `js/templates/` nếu là view lớn
- [ ] Logic render tách khỏi template string (theo `CLAUDE.md`)

---

## 12. Sample Prompt — Generate UI mới đúng project

```
Bạn đang làm việc trên hệ thống Phật Quang Quyền – Công đức (PQQ).
Stack: Vanilla HTML/CSS/JS, namespace global PQQ, không framework.

YÊU CẦU UI:
- [Mô tả màn hình / component cần tạo]

TUÂN THỦ DESIGN RULES:
1. CSS: dùng variables từ css/variables.css (--primary #0d6efd, --header-a/#8a1c14 brand red, --radius 10px, --shadow-sm)
2. Font: 'Segoe UI', system-ui, sans-serif. Số: tabular-nums + toLocaleString('vi-VN')
3. Layout: bọc trong .page (max-width 1200px, padding 0 20px, margin auto)
4. Card pattern: .card > .card-header (font-weight 700, icon FA màu --primary) > .tbl-scroll > table
5. Table: thead sticky, th uppercase .72rem muted, tbody hover #f5f7fa, td .88rem
6. Buttons: .btn.btn-primary (hoặc .btn-muted khi loading), icon fas bên trái, gap 6px
7. Loading: .loader-wrap + .spinner + text "Đang tải…"
8. Errors: toast PQQ.toast('err', msg) + table row color var(--danger) nếu cần
9. Header trang: không tạo header mới — dùng .site-header có sẵn trong index.html
10. Icons: Font Awesome 6 (fas), không SVG inline trừ khi chart
11. Template HTML: đặt trong js/templates/, inject qua insertAdjacentHTML
12. Logic: file js/ riêng, cập nhật DOM từ PQQ.state, esc() mọi user text
13. Responsive: grid collapse tại 900px/860px, mobile adjustments tại 560px
14. Không dùng: React, Tailwind, Bootstrap, type=module, alert(), native dialog

OUTPUT:
- CSS thêm vào file css/ phù hợp (hoặc file mới nếu domain mới)
- Template JS trong js/templates/
- Logic JS trong js/ với prefix PQQ.
- Không hardcode màu ngoài variables trừ khi pattern hiện tại đã làm (gradient KPI, score bar colors)
```

---

*Tài liệu generated từ source scan — 16/07/2026. Cập nhật lại khi có thay đổi UI đáng kể.*
