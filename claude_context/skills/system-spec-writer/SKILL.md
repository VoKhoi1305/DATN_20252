---
name: system-spec-writer
description: >
  Tạo tài liệu System UI Specification tổng quát cho toàn bộ phần mềm — mô tả design system, danh sách màn hình, layout chung, component library, và quy tắc nhất quán — trước khi viết spec từng màn hình riêng. Kích hoạt khi người dùng muốn: lập danh sách màn hình, mô tả tổng thể UI hệ thống, định nghĩa component dùng chung, viết system overview cho đồ án, hoặc chuẩn bị context nền để paste vào screen spec. Dùng skill này TRƯỚC KHI dùng uiux-spec-writer cho từng màn hình cụ thể.
---

# System UI Specification Writer
## Tài liệu tổng quan hệ thống — Viết một lần, dùng cho tất cả màn hình

Skill này tạo **System Spec** — tài liệu gốc mô tả toàn bộ cấu trúc UI của hệ thống. Sau khi có file này, bạn paste nó vào đầu mỗi prompt khi dùng `uiux-spec-writer` để viết màn hình cụ thể. Claude sẽ không cần hỏi lại về layout, màu sắc, hay component chung nữa.

---

## Quy trình sử dụng

```
Bước 1 — Dùng skill này
         Viết system-spec.md một lần cho toàn dự án
         (design language, danh sách màn, layout, components)
              ↓
Bước 2 — Dùng uiux-spec-writer
         Paste system-spec.md + yêu cầu màn hình cụ thể
         → Claude viết screen spec đúng context ngay
              ↓
Bước 3 — Sinh code
         Paste system-spec.md + screen spec → Next.js code
```

---

## Cấu trúc tài liệu System Spec

```
system-spec.md
├── 1. Thông tin dự án
├── 2. Design language & Tokens
├── 3. Layout hệ thống (AppLayout)
├── 4. Danh sách màn hình (Screen Inventory)
├── 5. Component Library tổng quát
├── 6. Navigation & Routing
├── 7. Quy tắc UX toàn cục
└── 8. Ghi chú kỹ thuật
```

---

## TEMPLATE ĐẦY ĐỦ — Copy và điền thông tin dự án của bạn

```markdown
# SYSTEM SPEC — [Tên hệ thống]
# Phiên bản: 1.0 | Ngày: [DD/MM/YYYY] | Tác giả: [Tên]

---

## 1. Thông tin dự án

| Trường          | Giá trị                                      |
|-----------------|----------------------------------------------|
| Tên hệ thống    | [VD: Hệ thống Quản lý Hồ sơ Nghiệp vụ]      |
| Tên viết tắt    | [VD: HSQN]                                   |
| Mô tả ngắn      | [1-2 câu mô tả phần mềm làm gì]              |
| Đối tượng dùng  | [VD: Cán bộ điều tra, Trưởng phòng, Admin]   |
| Nền tảng        | Web (Next.js) / Mobile / Desktop              |
| Ngôn ngữ        | Tiếng Việt                                    |
| Tech stack FE   | Next.js 14 App Router + Tailwind CSS          |
| Tech stack BE   | [VD: Node.js/Express, Spring Boot, FastAPI]   |
| Database        | [VD: PostgreSQL, MongoDB]                     |

---

## 2. Design Language & Tokens

> Phần này là nguồn sự thật duy nhất về visual identity.
> Tất cả màn hình PHẢI tuân theo — không được override.

### 2.1 Triết lý thiết kế
[Mô tả ngắn: VD "Nghiêm túc, compact, gov-style. Đỏ-đen làm chủ đạo."]

### 2.2 Color Tokens
```css
/* PRIMARY */
--color-primary:        [hex];   /* Nút CTA, accent, active */
--color-primary-hover:  [hex];   /* Hover */
--color-primary-press:  [hex];   /* Pressed */
--color-primary-light:  [hex];   /* Badge bg, highlight */

/* SURFACE (nền đen/tối) */
--color-surface-950:    [hex];   /* Topbar, sidebar sâu */
--color-surface-900:    [hex];   /* Sidebar chính */
--color-surface-800:    [hex];   /* Hover sidebar */
--color-surface-300:    [hex];   /* Border default */
--color-surface-200:    [hex];   /* Border nhẹ */
--color-surface-100:    [hex];   /* Table header, section bg */
--color-surface-50:     [hex];   /* Card bg, page bg */

/* TEXT */
--color-text-primary:   [hex];   /* Body, heading */
--color-text-secondary: [hex];   /* Label, phụ */
--color-text-disabled:  [hex];   /* Disabled */
--color-text-inverse:   [hex];   /* Trên nền tối */
--color-text-muted:     [hex];   /* Timestamp */

/* SEMANTIC */
--color-success:        [hex];   /* Hoàn thành */
--color-success-bg:     [hex];
--color-warning:        [hex];   /* Cảnh báo */
--color-warning-bg:     [hex];
--color-error:          [hex];   /* Lỗi */
--color-error-bg:       [hex];
--color-info:           [hex];   /* Thông tin */
--color-info-bg:        [hex];
```

### 2.3 Typography
```
Font chính:   [VD: IBM Plex Sans]
Font mono:    [VD: IBM Plex Mono] — dùng cho mã số, ID, CCCD
Google Fonts: [link]

Scale:
  display: [size]px / weight=[w] — [dùng cho]
  h1:      [size]px / weight=[w] — [dùng cho]
  h2:      [size]px / weight=[w] — [dùng cho]
  h3:      [size]px / weight=[w] — [dùng cho]
  body:    [size]px / weight=[w] — [dùng cho]
  body-sm: [size]px / weight=[w] — [dùng cho]
  label:   [size]px / weight=[w] — [dùng cho]
  caption: [size]px / weight=[w] — [dùng cho]
  mono:    [size]px / weight=[w] — mã số, ID
```

### 2.4 Spacing
```
Base unit: [4]px
xs:   [4]px   sm:   [8]px   md:  [12]px
lg:  [16]px   xl:  [20]px   2xl: [28]px
```

### 2.5 Border Radius
```
none:  0px    — Topbar, sidebar
xs:    2px    — Badge, tag
sm:    3px    — Chip
md:    4px    — Button, Input, Card  ← DEFAULT
lg:    6px    — Modal (dùng hạn chế)
```

### 2.6 Shadows
```
xs:  0 1px 2px rgba(0,0,0,.06)   — Card subtle
sm:  0 1px 3px rgba(0,0,0,.10)   — Dropdown
(KHÔNG dùng shadow-md, shadow-lg)
```

### 2.7 Những gì TUYỆT ĐỐI không làm
```
✗ [màu cấm 1]  → thay bằng [màu đúng]
✗ rounded-xl   → tối đa [4px]
✗ font [cấm]   → dùng [font đúng]
✗ gradient     → flat color
✗ shadow lớn   → border 1px
```

---

## 3. Layout Hệ thống

### 3.1 Các loại layout

#### AppLayout — Dành cho tất cả màn hình SAU khi đăng nhập
```
┌──────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Accent bar: [Npx] [màu]
├──────────────────────────────────────────────────────┤
│  [Logo] [Tên hệ thống]            [User] [Thông báo]│ ← Topbar: h=[px] bg=[màu]
│                                    border-bottom=[màu]│
├──────────────┬───────────────────────────────────────┤
│  SIDEBAR     │  MAIN CONTENT                         │
│  w=[px]      │  flex-1, overflow-y: auto             │
│  bg=[màu]    │  padding: [px]                        │
│              │  bg=[màu]                             │
│  Nav items   │                                       │
│  Stats       │                                       │
└──────────────┴───────────────────────────────────────┘

Kích thước:
  Accent bar:  [N]px
  Topbar:      [N]px
  Sidebar:     [N]px (collapsed: [N]px)
  Content pad: [N]px
```

#### AuthLayout — Dành cho màn đăng nhập / quên mật khẩu
```
┌──────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│                                                      │
│  [Panel trái — bg tối]    [Panel phải — Form]        │
│  Logo + mô tả hệ thống    Fields + Submit button     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### FullscreenLayout — Màn toàn màn (nếu có: báo cáo, in ấn)
```
Không có sidebar, không có topbar.
Chỉ dùng cho: [liệt kê màn dùng layout này nếu có]
```

### 3.2 Topbar — Chi tiết
```
Chiều cao:    [N]px
Background:   [màu]
Border-bottom: [N]px solid [màu]

Bên trái:  Logo [kích thước] + Tên hệ thống
Bên phải:  [Thông báo icon] [Tên user] [Avatar/initials]
Font:      [size]px / weight=[w] / color=[màu]
```

### 3.3 Sidebar — Chi tiết
```
Chiều rộng:  [N]px
Background:  [màu]

Cấu trúc từ trên xuống:
  [1] Section label: "CHỨC NĂNG"
      → font [size]px uppercase tracking-widest color=[màu]
  [2] Nav items (mỗi item):
      → height [N]px, padding [px]
      → default: bg=transparent, text=[màu], dot=[màu]
      → hover:   bg=[màu]
      → active:  bg=[màu], border-left [N]px [màu], text=[màu]
  [3] Divider: 1px [màu], margin [px] ngang
  [4] Section label: "THỐNG KÊ" (nếu có)
  [5] Stat blocks (nếu có)
  [6] Phần dưới: Cài đặt, Đăng xuất

Nav items trong hệ thống này:
  [Tên nav 1] → route: /[path]
  [Tên nav 2] → route: /[path]
  [Tên nav 3] → route: /[path]
  ... (thêm đủ)
```

### 3.4 Content area — Cấu trúc chung
```
Mỗi màn hình trong AppLayout thường có:

  [Toolbar]          → Tiêu đề trang + action buttons + search
  [Stats row]        → Số liệu tổng quan (nếu có)
  [Filter bar]       → Bộ lọc (nếu có)
  [Data table / List / Form]
  [Pagination]       → Nếu có danh sách
```

---

## 4. Danh sách màn hình (Screen Inventory)

> Liệt kê TẤT CẢ màn hình của hệ thống.
> Đây là mục quan trọng nhất — hội đồng sẽ kiểm tra có đủ không.

### 4.1 Nhóm màn hình theo module

#### Module: Xác thực (Auth)
| Mã    | Tên màn hình        | Route              | Layout      | Mô tả ngắn                    |
|-------|---------------------|--------------------|-------------|--------------------------------|
| SCR-001 | Đăng nhập         | /login             | AuthLayout  | Form đăng nhập hệ thống        |
| SCR-002 | Quên mật khẩu     | /forgot-password   | AuthLayout  | Nhập email để reset mật khẩu  |
| SCR-003 | Đặt lại mật khẩu  | /reset-password    | AuthLayout  | Nhập mật khẩu mới             |

#### Module: [Tên module 2]
| Mã    | Tên màn hình        | Route              | Layout      | Mô tả ngắn                    |
|-------|---------------------|--------------------|-------------|--------------------------------|
| SCR-010 | [Tên]             | /[path]            | AppLayout   | [Mô tả]                        |
| SCR-011 | [Tên]             | /[path]            | AppLayout   | [Mô tả]                        |

#### Module: [Tên module 3]
| Mã    | Tên màn hình        | Route              | Layout      | Mô tả ngắn                    |
|-------|---------------------|--------------------|-------------|--------------------------------|
| SCR-020 | [Tên]             | /[path]            | AppLayout   | [Mô tả]                        |

#### Module: Quản trị (Admin)
| Mã    | Tên màn hình        | Route              | Layout      | Mô tả ngắn                    |
|-------|---------------------|--------------------|-------------|--------------------------------|
| SCR-090 | Quản lý người dùng| /admin/users       | AppLayout   | CRUD tài khoản cán bộ          |
| SCR-091 | Phân quyền        | /admin/roles       | AppLayout   | Gán role, phân quyền           |
| SCR-092 | Nhật ký hệ thống  | /admin/logs        | AppLayout   | Audit log                      |

### 4.2 Sơ đồ điều hướng tổng quát
```
/ (root)
│
├─ /login ──────────────────────── SCR-001
│   └─ (đăng nhập thành công) ──→  /dashboard
│
├─ /dashboard ──────────────────── SCR-010
│
├─ /[module-1]/
│   ├─ index ────────────────────── SCR-0XX (danh sách)
│   ├─ new ──────────────────────── SCR-0XX (thêm mới)
│   └─ [id] ─────────────────────── SCR-0XX (chi tiết / sửa)
│
├─ /[module-2]/
│   └─ ...
│
└─ /admin/
    └─ ...
```

### 4.3 Phân loại theo mức độ ưu tiên
```
P0 — Bắt buộc demo được (core flow):
  SCR-001, SCR-010, [thêm]

P1 — Quan trọng, nên có đầy đủ:
  [liệt kê]

P2 — Hoàn thiện nếu còn thời gian:
  [liệt kê]
```

---

## 5. Component Library Tổng quát

> Mô tả NGẮN từng component dùng chung.
> Chi tiết (props, states, Tailwind classes) viết riêng trong 02-component-library.md

### 5.1 Danh sách components

#### Inputs & Forms
| Component   | Mã        | Dùng cho                                   | Variants chính              |
|-------------|-----------|--------------------------------------------|-----------------------------|
| Button      | CMP-BTN   | Mọi hành động                              | primary / secondary / outline / ghost |
| Input       | CMP-INPUT | Nhập liệu text, email, password, số        | text / password / search / monospace |
| Select      | CMP-SEL   | Chọn từ danh sách cố định                  | default / multiple          |
| Checkbox    | CMP-CHK   | Chọn nhiều, toggle                         | default / indeterminate     |
| Radio       | CMP-RAD   | Chọn một trong nhóm                        | default                     |
| Textarea    | CMP-TXT   | Nhập văn bản dài                           | default / resizable         |
| DatePicker  | CMP-DATE  | Chọn ngày tháng                            | single / range              |

#### Display & Data
| Component   | Mã        | Dùng cho                                   | Variants chính              |
|-------------|-----------|--------------------------------------------|-----------------------------|
| Badge       | CMP-BADGE | Trạng thái, nhãn phân loại                 | urgent / processing / pending / done / warning |
| Table       | CMP-TABLE | Hiển thị danh sách dữ liệu                 | default / compact           |
| Pagination  | CMP-PAGE  | Phân trang                                 | default                     |
| Card        | CMP-CARD  | Khung chứa nội dung                        | default / stat / detail     |
| Avatar      | CMP-AVT   | Ảnh đại diện / initials người dùng         | sm / md / lg                |
| Empty State | CMP-EMPTY | Khi danh sách không có dữ liệu             | default                     |
| Loading     | CMP-LOAD  | Trạng thái tải dữ liệu                     | spinner / skeleton          |

#### Feedback & Overlay
| Component   | Mã        | Dùng cho                                   | Variants chính              |
|-------------|-----------|--------------------------------------------|-----------------------------|
| Toast       | CMP-TOAST | Thông báo ngắn (success / error / info)    | success / error / warning / info |
| Modal       | CMP-MODAL | Hộp thoại xác nhận, form popup             | sm / md / lg                |
| Tooltip     | CMP-TIP   | Giải thích ngắn khi hover                  | default                     |
| Confirm     | CMP-CFIRM | Xác nhận hành động nguy hiểm (xoá...)      | default                     |
| Alert       | CMP-ALERT | Thông báo cố định trên màn hình            | info / warning / error      |

#### Layout & Navigation
| Component   | Mã        | Dùng cho                                   |
|-------------|-----------|---------------------------------------------|
| AppLayout   | LAY-APP   | Layout sau đăng nhập (topbar + sidebar + main) |
| AuthLayout  | LAY-AUTH  | Layout trang đăng nhập                     |
| Topbar      | LAY-TOP   | Thanh trên cùng                            |
| Sidebar     | LAY-SIDE  | Thanh điều hướng bên trái                  |
| PageHeader  | LAY-HDR   | Tiêu đề trang + breadcrumb + actions       |
| Breadcrumb  | CMP-BRD   | Đường dẫn điều hướng                       |

### 5.2 Quy tắc dùng component nhất quán

#### Button — Khi nào dùng variant nào
```
primary   → Hành động CHÍNH duy nhất trên mỗi màn (Lưu, Xác nhận, Đăng nhập)
secondary → Hành động quan trọng phụ (Xuất file, In)
outline   → Hành động phụ có cân nhắc (Xem chi tiết, Chỉnh sửa)
ghost     → Hành động inline nhỏ trong table / card (icon actions)
danger    → Hành động phá huỷ (Xoá, Huỷ bỏ vĩnh viễn)

Quy tắc: Mỗi khu vực chỉ có TỐI ĐA 1 nút primary.
```

#### Badge — Khi nào dùng variant nào
```
urgent     → Trạng thái cần xử lý NGAY, mức độ nguy hiểm cao
processing → Đang trong quy trình xử lý, chờ kết quả
pending    → Chờ ai đó duyệt / phê duyệt
done       → Đã hoàn thành, không cần thêm hành động
warning    → Cần chú ý, không khẩn cấp nhưng cần xem lại
locked     → Bị khoá, không thể tương tác
```

#### Input monospace — Khi nào bắt buộc
```
Bắt buộc dùng font-mono cho:
  ✓ Mã hồ sơ, mã vụ án, mã định danh bất kỳ
  ✓ CCCD / CMND
  ✓ Số điện thoại (trong table)
  ✓ Mã nhân viên, mã đơn vị
  ✓ Token, mã xác nhận OTP
```

#### Toast — Quy tắc hiển thị
```
Vị trí:    top-right, cách top [N]px, cách right [N]px
Duration:  success = [N]ms | error = [N]ms | warning = [N]ms
Stack:     Tối đa [N] toast cùng lúc
Z-index:   [N]
```

### 5.3 Khung & Viền (Border rules)

```
Card / Panel:
  border: 1px solid [color-surface-200]
  border-radius: [N]px (radius-md)
  background: #fff (hoặc color-surface-50)
  KHÔNG shadow (hoặc shadow-xs tối đa)

Table:
  Wrapper: border 1px solid [color-surface-200], radius [N]px
  Header:  background [color-surface-100], border-bottom 1px [color-surface-200]
  Row:     border-bottom 1px [color-surface-100]
  Row hover: background [color-surface-50]

Input / Select:
  border: 1px solid [color-surface-300]
  border-radius: [N]px
  focus: border [color-primary], ring 2px [color-primary]/15

Divider:
  1px solid [color-surface-200] — nằm ngang
  Không dùng divider dọc giữa content

Section separator:
  Chỉ dùng spacing (margin-top) thay divider trong form
```

---

## 6. Navigation & Routing

### 6.1 Auth guard
```
Route public (không cần đăng nhập):
  /login, /forgot-password, /reset-password

Route protected (cần đăng nhập):
  Tất cả routes còn lại → redirect /login nếu chưa có token

Route admin (cần role Admin):
  /admin/* → redirect /403 nếu không đủ quyền
```

### 6.2 Redirect logic
```
Truy cập / (root)       → redirect /dashboard
Đăng nhập thành công   → redirect /dashboard (hoặc returnUrl)
Đăng xuất              → redirect /login, xoá token
Token hết hạn          → redirect /login?session=expired
Không có quyền (403)   → màn hình 403 hoặc redirect /dashboard
```

### 6.3 Breadcrumb rules
```
Dashboard:              Dashboard
Module list:            Dashboard > [Tên module]
Detail/Edit:            Dashboard > [Tên module] > [Tên item / Mã số]
Không hiện breadcrumb:  Trang đăng nhập, trang 404/403
```

---

## 7. Quy tắc UX Toàn Cục

### 7.1 Loading states
```
Gọi API < 300ms:   Không cần loading indicator
Gọi API 300ms–2s:  Button loading (spinner thay text, disabled)
Gọi API > 2s:      Skeleton loader cho vùng data
Tải trang đầu:     Skeleton loader (không dùng spinner toàn màn)
```

### 7.2 Error handling
```
Lỗi field (validation):
  → Hiện ngay dưới field, text [color-error], font [N]px
  → Kích hoạt khi: onBlur hoặc onSubmit (chọn 1 cách và nhất quán)

Lỗi API (4xx/5xx):
  → Toast [variant=error], duration [N]ms
  → Form giữ nguyên data, KHÔNG xoá input
  → Message cụ thể theo status code (xem bảng trong screen spec)

Lỗi mạng (offline):
  → Toast "Không có kết nối mạng. Vui lòng thử lại."

Session hết hạn (401):
  → Redirect /login?session=expired
  → Hiện thông báo "Phiên làm việc đã hết hạn"
```

### 7.3 Empty states
```
Mọi list/table đều PHẢI có empty state:
  Icon:    [SVG icon phù hợp với context]
  Title:   "Chưa có [tên đối tượng]" — VD: "Chưa có hồ sơ nào"
  Sub:     Hướng dẫn hành động tiếp theo
  CTA:     Button "Thêm [tên đối tượng]" (nếu user có quyền)

Ví dụ:
  Danh sách trống:    "Chưa có hồ sơ nào — Nhấn 'Thêm hồ sơ' để bắt đầu"
  Kết quả tìm kiếm:   "Không tìm thấy kết quả — Thử thay đổi từ khoá"
  Không có quyền:     "Bạn không có quyền xem nội dung này"
```

### 7.4 Confirmation dialogs
```
Dùng CMP-CONFIRM (modal xác nhận) khi:
  ✓ Xoá dữ liệu bất kỳ
  ✓ Hành động không thể hoàn tác
  ✓ Thay đổi trạng thái quan trọng (VD: khoá tài khoản)

Không cần confirm:
  ✗ Thêm mới (có thể xoá sau)
  ✗ Chỉnh sửa thông tin (có thể sửa lại)
  ✗ Thay đổi bộ lọc, search

Title confirm xoá:    "Xác nhận xoá [tên đối tượng]?"
Body:                 "Hành động này không thể hoàn tác. [Tên item] sẽ bị xoá vĩnh viễn."
Buttons:              [Huỷ bỏ (ghost)] [Xoá (danger)]
```

### 7.5 Form validation rules
```
Trigger:    onBlur cho từng field + onSubmit cho toàn form
Required:   Dấu * đỏ bên cạnh label, message "Vui lòng nhập [tên field]"
Min/Max:    "Tối thiểu [N] ký tự" / "Tối đa [N] ký tự"
Format:     "Định dạng không hợp lệ" (email, SĐT, CCCD...)
Duplicate:  "Đã tồn tại trong hệ thống" (check realtime hoặc khi submit)
```

### 7.6 Permissions (Role-based)
```
Roles trong hệ thống:
  [ROLE_1]: [Mô tả quyền — VD: Xem và tạo hồ sơ]
  [ROLE_2]: [Mô tả quyền — VD: Xem, tạo, duyệt]
  [ROLE_3]: [Mô tả quyền — VD: Toàn quyền + admin]

Hiển thị dựa theo role:
  Nút "Thêm mới":   Hiện với [ROLE_2], [ROLE_3]
  Nút "Xoá":        Chỉ hiện với [ROLE_3]
  Menu /admin:      Chỉ hiện với [ROLE_3]
  Nút "Duyệt":      Chỉ hiện với [ROLE_2], [ROLE_3]
```

### 7.7 Responsive behavior
```
Desktop (≥1024px): AppLayout đầy đủ — sidebar cố định
Tablet (640–1023px): Sidebar thu nhỏ (chỉ icon) hoặc overlay
Mobile (<640px): Sidebar ẩn hoàn toàn — hamburger menu

Các thành phần thay đổi trên mobile:
  - Table → Horizontal scroll hoặc card list
  - Stats row → 2 cột (thay 4 cột)
  - Toolbar → Stacked (search xuống dòng)
  - Modal → Full-screen
```

---

## 8. Ghi Chú Kỹ Thuật

### 8.1 State management
```
Global state (dùng [Zustand / Redux / Context]):
  - Auth: user info, token, permissions
  - [State global khác nếu có]

Local state (useState):
  - Form values, loading, error của từng màn
  - UI state: modal open/close, selected rows
```

### 8.2 API conventions
```
Base URL:    [VD: /api/v1]
Auth header: Authorization: Bearer {token}
Pagination:  ?page=[N]&limit=[N]  → { data: [], total: N, page: N }
Error format: { code: "ERROR_CODE", message: "...", details?: {} }

HTTP status codes dùng trong hệ thống:
  200 OK             → Thành công
  201 Created        → Tạo mới thành công
  400 Bad Request    → Dữ liệu không hợp lệ
  401 Unauthorized   → Chưa đăng nhập / token hết hạn
  403 Forbidden      → Không đủ quyền
  404 Not Found      → Không tìm thấy
  409 Conflict       → Trùng lặp dữ liệu
  429 Too Many Req   → Rate limit
  500 Server Error   → Lỗi hệ thống
```

### 8.3 Date / Time format
```
Hiển thị ngày:      DD/MM/YYYY  (VD: 15/03/2024)
Hiển thị giờ:       HH:mm       (VD: 09:47)
Hiển thị đầy đủ:    DD/MM/YYYY HH:mm
Timezone:           Asia/Ho_Chi_Minh (UTC+7)
Lưu database:       ISO 8601 / UTC
```

### 8.4 File upload (nếu có)
```
Định dạng cho phép: [VD: .pdf, .jpg, .png, .docx]
Kích thước tối đa:  [VD: 10MB / file]
Multiple files:     [Có / Không]
Preview:            [Có / Không]
```
```

---

## Hướng dẫn điền thông tin

### Bước 1 — Điền phần cứng trước
Bắt đầu với những phần không thay đổi: tên dự án, tech stack, design tokens (copy từ phần design language đã định nghĩa), layout constants.

### Bước 2 — Liệt kê màn hình
Đây là phần quan trọng nhất. Cố gắng liệt kê **toàn bộ** màn hình ngay từ đầu, kể cả màn chưa làm. Hội đồng sẽ kiểm tra tính đầy đủ.

Gợi ý cấu trúc màn hình theo loại hệ thống:

**Hệ thống quản lý (CRUD):** Với mỗi entity chính thường có:
```
[Entity] list     → Danh sách + search + filter
[Entity] new      → Form thêm mới
[Entity] detail   → Xem chi tiết
[Entity] edit     → Form chỉnh sửa (hoặc gộp với detail)
[Entity] delete   → Confirm dialog (không cần màn riêng)
```

**Các màn dùng chung bắt buộc:**
```
Login, Forgot password               → Auth
Dashboard / Home                     → Trang chủ sau login
Profile / Đổi mật khẩu              → Cài đặt cá nhân
404, 403                             → Error pages
Admin: Users, Roles, Logs            → Quản trị
```

### Bước 3 — Điền component library
Chỉ cần liệt kê và mô tả ngắn ở đây. Chi tiết (props, states, Tailwind classes) viết trong file `02-component-library.md` riêng theo skill `uiux-spec-writer`.

### Bước 4 — Điền UX rules
Phần này giúp nhất quán xuyên suốt — quyết định một lần (VD: validate onBlur hay onSubmit) rồi tất cả màn hình làm đúng theo đó.

---

## Cách dùng file này khi viết screen spec

Khi muốn viết spec cho một màn hình cụ thể, paste nội dung file này vào đầu prompt:

```
[SYSTEM SPEC — paste toàn bộ file system-spec.md vào đây]

---

Dựa vào System Spec trên, hãy viết Screen Spec chi tiết cho:
Màn hình: [Tên màn hình] (SCR-[NNN])
Chức năng: [Mô tả ngắn màn này làm gì]

Yêu cầu:
- Tuân theo đúng design tokens và layout đã định nghĩa trong System Spec
- Component dùng theo CMP-* đã liệt kê
- Viết theo template screen spec chuẩn (AppLayout / AuthLayout)
```

---

## Checklist hoàn thiện System Spec

### Thông tin cơ bản
- [ ] Tên hệ thống, mô tả, đối tượng dùng
- [ ] Tech stack FE + BE + DB đã điền

### Design Language
- [ ] Tất cả color tokens có giá trị hex cụ thể
- [ ] Font family + Google Fonts link
- [ ] Font scale đầy đủ với size + weight
- [ ] Danh sách cấm rõ ràng

### Layout
- [ ] ASCII art AppLayout đã vẽ với kích thước px cụ thể
- [ ] AuthLayout có mô tả
- [ ] Topbar: height, bg, border-bottom, nội dung
- [ ] Sidebar: width, bg, nav items đầy đủ với routes

### Screen Inventory
- [ ] Liệt kê đủ tất cả màn hình theo module
- [ ] Mỗi màn có: Mã, Tên, Route, Layout, Mô tả ngắn
- [ ] Sơ đồ điều hướng đã vẽ
- [ ] Phân loại P0/P1/P2

### Component Library
- [ ] Đủ 4 nhóm: Inputs, Display, Feedback, Layout
- [ ] Quy tắc dùng Button variants
- [ ] Quy tắc dùng Badge variants
- [ ] Rules về border, shadow, khung viền

### UX Rules
- [ ] Loading states (< 300ms / 300ms-2s / > 2s)
- [ ] Error handling (field / API / network / session)
- [ ] Empty states cho mọi list
- [ ] Confirm dialogs (khi nào cần / không cần)
- [ ] Form validation trigger + messages
- [ ] Roles và permissions
- [ ] Responsive breakpoints

### Kỹ thuật
- [ ] State management approach
- [ ] API base URL + auth header + error format
- [ ] Date/time format
