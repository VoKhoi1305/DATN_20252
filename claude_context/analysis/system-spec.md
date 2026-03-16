# SYSTEM SPEC — HỆ THỐNG QUẢN LÝ, THEO DÕI VÀ TRUY VẾT ĐỐI TƯỢNG
# Subject Management, Tracking & Tracing System (SMTTS)
# Phiên bản: 1.0 | Ngày: 15/03/2026 |

---

## 1. Thông tin dự án

| Trường          | Giá trị                                                        |
|-----------------|----------------------------------------------------------------|
| Tên hệ thống    | Hệ thống Quản lý, Theo dõi và Truy vết Đối tượng thuộc Diện Quản lý |
| Tên viết tắt    | SMTTS                                                          |
| Mô tả ngắn      | Hệ thống quản lý đối tượng thuộc diện quản lý — hỗ trợ trình báo online (NFC + Face), kịch bản linh hoạt, luồng Event → Alert → Case, truy vết GPS và phân tích |
| Đối tượng dùng  | Cán bộ cơ sở (Phường/Xã), Cán bộ quản lý (Quận/Huyện), Lãnh đạo (Tỉnh/TP), IT Admin |
| Nền tảng        | Web Responsive (React + Tailwind CSS) — Desktop + Mobile browser |
| Ngôn ngữ        | Tiếng Việt                                                      |
| Tech stack FE   | React + Tailwind CSS                                            |
| Tech stack BE   | Node.js (NestJS)                                                |
| Database        | PostgreSQL (chính) + PostgreSQL tách biệt (biometric)           |
| Bản đồ          | Google Maps API (chính), OpenStreetMap (fallback)               |

> **Lưu ý:** Hệ thống có 2 platform riêng biệt:
> - **Web Dashboard** (responsive) — dành cho cán bộ, đây là phạm vi của System Spec này
> - **Mobile App** (Android/Kotlin) — dành cho đối tượng bị quản lý, KHÔNG nằm trong System Spec này

---

## 2. Design Language & Tokens

> Phần này là nguồn sự thật duy nhất về visual identity.
> Tất cả màn hình PHẢI tuân theo — không được override.

### 2.1 Triết lý thiết kế

**"Serious · Dense · Trustworthy"** — Nghiêm túc, compact, gov-style. Đỏ-đen làm chủ đạo. Đỏ chỉ xuất hiện ~10-15% diện tích: accent bar, nút primary, active nav, số liệu khẩn cấp. Phần còn lại là đen/trắng/zinc.

### 2.2 Color Tokens

```css
/* PRIMARY — Đỏ trầm (KHÔNG dùng red-500, crimson — quá tươi) */
--color-primary:        #b91c1c;   /* red-700  — Nút CTA, accent bar, pagination active */
--color-primary-hover:  #991b1b;   /* red-800  — Hover state */
--color-primary-press:  #7f1d1d;   /* red-900  — Pressed state */
--color-primary-light:  #fee2e2;   /* red-100  — Badge bg, alert bg, row highlight nhẹ */
--color-primary-text:   #991b1b;   /* red-800  — Text đỏ trên nền sáng */

/* SURFACE — Zinc/Đen (KHÔNG dùng gray — zinc trung tính hơn) */
--color-surface-950:    #09090b;   /* zinc-950 — Topbar, sidebar sâu nhất */
--color-surface-900:    #18181b;   /* zinc-900 — Sidebar chính */
--color-surface-800:    #27272a;   /* zinc-800 — Hover sidebar, divider tối */
--color-surface-700:    #3f3f46;   /* zinc-700 — Disabled bg tối */
--color-surface-600:    #52525b;   /* zinc-600 — Text phụ trên nền tối */
--color-surface-400:    #a1a1aa;   /* zinc-400 — Placeholder, disabled text */
--color-surface-300:    #d4d4d8;   /* zinc-300 — Border mặc định */
--color-surface-200:    #e4e4e7;   /* zinc-200 — Border nhẹ, divider sáng */
--color-surface-100:    #f4f4f5;   /* zinc-100 — Table header bg, section bg */
--color-surface-50:     #fafafa;   /* zinc-50  — Card bg, input bg, page bg */

/* TEXT — Trên nền sáng */
--color-text-primary:   #09090b;   /* zinc-950 — Heading, body text chính */
--color-text-secondary: #52525b;   /* zinc-600 — Label, caption, text phụ */
--color-text-disabled:  #a1a1aa;   /* zinc-400 — Disabled state */
--color-text-inverse:   #fafafa;   /* zinc-50  — Text trên nền tối (sidebar, topbar) */
--color-text-muted:     #71717a;   /* zinc-500 — Timestamp, metadata */

/* SEMANTIC — Tông đậm, nghiêm túc (KHÔNG dùng -500 — quá tươi) */
--color-success:        #166534;   /* green-800  — Trạng thái hoàn thành */
--color-success-bg:     #dcfce7;   /* green-100  — Badge bg thành công */
--color-warning:        #854d0e;   /* amber-800  — Cảnh báo */
--color-warning-bg:     #fef9c3;   /* yellow-100 — Badge bg cảnh báo */
--color-error:          #b91c1c;   /* red-700    — Lỗi — dùng chung color-primary */
--color-error-bg:       #fee2e2;   /* red-100    — Dùng chung color-primary-light */
--color-info:           #1e40af;   /* blue-800   — Thông tin trung tính */
--color-info-bg:        #dbeafe;   /* blue-100   — Badge bg thông tin */
```

### 2.3 Signature Elements — Dùng đúng vị trí, không tùy tiện

| Token                 | Giá trị CSS                      | Vị trí duy nhất                         |
|-----------------------|----------------------------------|------------------------------------------|
| accent-bar            | height:3px; bg:#b91c1c           | border-top của toàn layout               |
| accent-nav-active     | border-left:2px solid #b91c1c    | Active nav item trong sidebar            |
| accent-topbar-bottom  | border-bottom:2px solid #b91c1c  | Dưới topbar                              |

### 2.4 Typography

```
Font chính:   IBM Plex Sans (wght 400, 500, 600)
Font mono:    IBM Plex Mono (wght 400) — dùng cho mã số, ID, CCCD
Google Fonts: https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500;600&display=swap

Tailwind config:
  fontFamily: {
    sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
    mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
  }

Scale — Compact:
  display:  20px / weight=600 / lh=1.25 — Tên hệ thống trong topbar
  h1:       18px / weight=600 / lh=1.3  — Tiêu đề trang
  h2:       15px / weight=600 / lh=1.4  — Tiêu đề section
  h3:       13px / weight=600 / lh=1.4  — Sub-heading, card title
  body:     13px / weight=400 / lh=1.55 — Body text chính
  body-sm:  12px / weight=400 / lh=1.5  — Caption, helper text
  label:    12px / weight=500 / lh=1.4  — Form label, column header
  caption:  11px / weight=400 / lh=1.4  — Timestamp, metadata
  mono:     12px / weight=400 / lh=1.4  — Mã hồ sơ, CCCD, ID
  upper:    10px / weight=600 / lh=1.4  — Section label trong sidebar (uppercase tracking-widest)
```

### 2.5 Spacing — Compact (base = 4px)

```
space-1:   4px   — Gap icon nhỏ, padding badge
space-2:   6px   — Padding cell compact
space-3:   8px   — Gap giữa elements
space-4:  10px   — Padding input, button sm
space-5:  12px   — Padding cell default
space-6:  16px   — Padding card, section
space-8:  20px   — Padding card lg
space-10: 28px   — Section gap lớn
space-12: 36px   — Page padding top
```

### 2.6 Border Radius

```
none:  0px   — Topbar, sidebar, accent bar
xs:    2px   — Badge, status tag
sm:    3px   — Chip nhỏ
md:    4px   — Button, Input, Card  ← DEFAULT (Tailwind "rounded")
lg:    6px   — Modal, Dropdown — dùng hạn chế
```

### 2.7 Shadows — Tối thiểu, chỉ 2 mức

```
shadow-xs:  0 1px 2px rgba(9,9,11,0.06)   — Card (dùng tiết kiệm)
shadow-sm:  0 1px 3px rgba(9,9,11,0.10)   — Dropdown, tooltip
(KHÔNG dùng: shadow, shadow-md, shadow-lg, shadow-xl)
```

### 2.8 Layout Constants

```
topbar-height:            40px
accent-bar-height:         3px
sidebar-width:           148px
sidebar-width-collapsed:  48px
content-max-width:      1200px
table-row-height:         36px
table-header-height:      34px
form-input-height:        36px
button-height-sm:         30px
button-height-md:         36px
button-height-lg:         40px
page-padding:             16px
card-padding:          14px 16px
```

### 2.9 Những gì TUYỆT ĐỐI không làm

```
✗ bg-blue-600, text-blue-600  → dùng primary #b91c1c hoặc zinc
✗ rounded-xl, rounded-2xl     → tối đa rounded (4px)
✗ shadow-md, shadow-lg        → dùng border hoặc shadow-xs
✗ font Inter, font Geist      → dùng IBM Plex Sans
✗ gradient bất kỳ             → flat color hoàn toàn
✗ padding quá thoáng          → compact density
✗ card shadow lớn             → card dùng border-1px zinc-200
✗ rounded-full interactive    → không bo tròn hoàn toàn cho button/input
```

---

## 3. Layout Hệ thống

### 3.1 Các loại layout

#### AppLayout — Dành cho tất cả màn hình SAU khi đăng nhập

```
┌──────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Accent bar: 3px bg-red-700
├──────────────────────────────────────────────────────────────┤
│  [Logo SMTTS]                 [Bell] [Tên cán bộ] [Avatar]  │ ← Topbar: h-10 bg-zinc-950
│                                border-bottom: 2px red-700   │
├────────────┬─────────────────────────────────────────────────┤
│  SIDEBAR   │  MAIN CONTENT                                  │
│  w-[148px] │  flex-1, overflow-y: auto                      │
│  bg-zinc-  │  padding: 16px                                 │
│  900       │  bg-zinc-50                                     │
│            │                                                 │
│ ┌────────┐ │  ┌─────────────────────────────────────────┐   │
│ │CHỨC    │ │  │ PageHeader                               │   │
│ │NĂNG    │ │  │ [Breadcrumb]                             │   │
│ │        │ │  │ [Title]           [Action buttons]       │   │
│ │• Tổng  │ │  └─────────────────────────────────────────┘   │
│ │  quan  │ │                                                 │
│ │• Hồ sơ │ │  ┌─────────────────────────────────────────┐   │
│ │• Event │ │  │ Content area                             │   │
│ │• Alert │ │  │ (Table / Form / Detail / Dashboard...)   │   │
│ │• Case  │ │  │                                          │   │
│ │• Yêu   │ │  │                                          │   │
│ │  cầu   │ │  └─────────────────────────────────────────┘   │
│ │• Truy  │ │                                                 │
│ │  vết   │ │                                                 │
│ │• Bản đồ│ │                                                 │
│ │• Kịch  │ │                                                 │
│ │  bản   │ │                                                 │
│ │• Báo   │ │                                                 │
│ │  cáo   │ │                                                 │
│ ├────────┤ │                                                 │
│ │QUẢN TRỊ│ │                                                 │
│ │• Tài   │ │                                                 │
│ │  khoản │ │                                                 │
│ │• Cấu   │ │                                                 │
│ │  hình  │ │                                                 │
│ │• Nhật  │ │                                                 │
│ │  ký    │ │                                                 │
│ ├────────┤ │                                                 │
│ │Đăng    │ │                                                 │
│ │xuất    │ │                                                 │
│ └────────┘ │                                                 │
└────────────┴─────────────────────────────────────────────────┘

Kích thước:
  Accent bar:   3px
  Topbar:      40px
  Sidebar:    148px (collapsed: 48px)
  Content pad: 16px
```

**React structure:**
```tsx
// <div className="flex flex-col h-screen bg-zinc-50">
//   <div className="h-[3px] bg-red-700 flex-none" />          ← accent bar
//   <header className="h-10 bg-zinc-950 border-b-2
//                      border-red-700 flex-none" />            ← topbar
//   <div className="flex flex-1 overflow-hidden">
//     <aside className="w-[148px] bg-zinc-900 flex-none
//                       overflow-y-auto" />                     ← sidebar
//     <main className="flex-1 overflow-y-auto p-4" />          ← content
//   </div>
// </div>
```

#### AuthLayout — Dành cho Đăng nhập / Quên mật khẩu / OTP

```
┌──────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Accent bar: 3px bg-red-700
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ PANEL TRÁI           │  │ PANEL PHẢI                   │ │
│  │ bg-zinc-950          │  │ bg-white                     │ │
│  │                      │  │                              │ │
│  │ Logo SMTTS           │  │ Form đăng nhập              │ │
│  │ Tên hệ thống         │  │ - Username                  │ │
│  │ Mô tả ngắn           │  │ - Password                  │ │
│  │                      │  │ - OTP (nếu cần)             │ │
│  │                      │  │ - [Đăng nhập]               │ │
│  │                      │  │                              │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

Mobile: Panel trái ẩn, chỉ hiện form + logo nhỏ phía trên.
```

#### FullscreenLayout — Dành cho in ấn, export

```
Không có sidebar, không có topbar.
Chỉ dùng cho: Màn in báo cáo (print view), Export PDF preview
```

### 3.2 Topbar — Chi tiết

```
Chiều cao:     40px (h-10)
Background:    #09090b (zinc-950)
Border-bottom: 2px solid #b91c1c (red-700)

Bên trái:  Logo (24x24px) + "SMTTS" text-display (20px/600) text-zinc-50
Bên phải:  [Bell icon — thông báo, badge đỏ nếu có]
           [Tên cán bộ — text-[13px] text-zinc-300]
           [Avatar/Initials — 28x28px bg-zinc-800 rounded text-zinc-50]
```

### 3.3 Sidebar — Chi tiết

```
Chiều rộng:  148px
Background:  #18181b (zinc-900)

Cấu trúc từ trên xuống:
  [1] Section label: "CHỨC NĂNG"
      → text-[10px] font-semibold uppercase tracking-widest text-zinc-500

  [2] Nav items (mỗi item):
      → height 34px, padding-left 12px, padding-right 8px
      → Dot indicator: 4px circle bên trái tên
      → default:  bg=transparent, text=zinc-400, dot=zinc-600
      → hover:    bg=zinc-800, text=zinc-200
      → active:   bg=zinc-800/50, border-left: 2px solid #b91c1c,
                  text=zinc-50, dot=#b91c1c

  [3] Divider: 1px solid zinc-800, margin 8px ngang

  [4] Section label: "QUẢN TRỊ" (hiện nếu role = Admin / Lãnh đạo)

  [5] Nav items Admin

  [6] Phần dưới: Đăng xuất — text-zinc-500, hover text-zinc-300

Nav items trong hệ thống này:

  CHỨC NĂNG:
    Tổng quan          → route: /dashboard
    Hồ sơ đối tượng    → route: /ho-so
    Sự kiện (Event)    → route: /events
    Cảnh báo (Alert)   → route: /alerts
    Vụ việc (Case)     → route: /cases
    Xét duyệt          → route: /xet-duyet
    Truy vết           → route: /truy-vet
    Bản đồ             → route: /ban-do
    Kịch bản           → route: /kich-ban
    Báo cáo            → route: /bao-cao

  ─── divider ───

  QUẢN TRỊ (Admin/Lãnh đạo):
    Tài khoản          → route: /admin/tai-khoan
    Cấu hình           → route: /admin/cau-hinh
    Nhật ký hệ thống   → route: /admin/nhat-ky

  ─── divider ───

    Đăng xuất          → action: logout
```

### 3.4 Content area — Cấu trúc chung

```
Mỗi màn hình trong AppLayout thường có:

  [PageHeader]       → Breadcrumb + Tiêu đề trang + action buttons
  [Stats row]        → Số liệu tổng quan (nếu có) — dùng CMP-CARD variant=stat
  [Filter bar]       → Bộ lọc: search + select + date range (nếu có)
  [Data area]        → Table / Form / Detail view / Map / Chart
  [Pagination]       → Nếu có danh sách — CMP-PAGE
```

---

## 4. Danh sách màn hình (Screen Inventory)

> Liệt kê TẤT CẢ màn hình của Web Dashboard.
> Mỗi màn có mã, tên, route, layout, mô tả ngắn.

### 4.1 Nhóm màn hình theo module

#### Module: Xác thực (Auth)

| Mã       | Tên màn hình               | Route                | Layout      | Mô tả ngắn                              |
|----------|----------------------------|----------------------|-------------|------------------------------------------|
| SCR-001  | Đăng nhập                  | /login               | AuthLayout  | Username + Password + OTP code           |
| SCR-002  | Xác thực OTP               | /login/otp           | AuthLayout  | Nhập mã OTP từ authenticator app         |
| SCR-003  | Cài đặt OTP lần đầu        | /setup-otp           | AuthLayout  | Quét QR code để link authenticator       |

#### Module: Tổng quan (Dashboard)

| Mã       | Tên màn hình               | Route                | Layout      | Mô tả ngắn                              |
|----------|----------------------------|----------------------|-------------|------------------------------------------|
| SCR-010  | Dashboard chính             | /dashboard           | AppLayout   | Tổng đối tượng, compliance rate, Event/Alert/Case hôm nay, scope theo địa bàn |
| SCR-011  | Dashboard điều hành         | /dashboard/executive | AppLayout   | Cấp quận/tỉnh: tổng hợp đa đơn vị, bản đồ nhiệt, so sánh compliance |

#### Module: Hồ sơ đối tượng

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-020  | Danh sách hồ sơ            | /ho-so                   | AppLayout   | Table + search + filter + scope địa bàn  |
| SCR-021  | Chi tiết hồ sơ             | /ho-so/:id               | AppLayout   | Tab: Thông tin, Kịch bản, Timeline, Tài liệu, Thiết bị |
| SCR-022  | Thêm hồ sơ mới             | /ho-so/them-moi          | AppLayout   | Form tạo hồ sơ đối tượng                |
| SCR-023  | Chỉnh sửa hồ sơ            | /ho-so/:id/chinh-sua     | AppLayout   | Form chỉnh sửa thông tin hồ sơ          |
| SCR-024  | Quản lý Enrollment          | /ho-so/enrollment        | AppLayout   | DS enrollment, thiết bị, duyệt đổi thiết bị |

#### Module: Sự kiện (Event)

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-030  | Danh sách Event             | /events                  | AppLayout   | Event Log: lọc theo đối tượng, loại, thời gian, khu vực |
| SCR-031  | Chi tiết Event              | /events/:id              | AppLayout   | Chi tiết: đối tượng, GPS, ảnh face, NFC data, match score, geofence |

#### Module: Cảnh báo (Alert)

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-040  | Dashboard Alert             | /alerts                  | AppLayout   | Alert đang mở: đối tượng, loại, mức độ, nguồn (mặc định/tùy chỉnh) |
| SCR-041  | Chi tiết Alert              | /alerts/:id              | AppLayout   | Event gốc, kịch bản trigger, mức độ, lịch sử xử lý, escalation info |
| SCR-042  | Lịch sử Alert              | /alerts/lich-su          | AppLayout   | Alert đã xử lý: ai, khi nào, ghi chú, kết quả |

#### Module: Vụ việc (Case)

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-050  | Dashboard Case              | /cases                   | AppLayout   | Case Mở + Case Đóng, lọc: trạng thái, đối tượng, mức độ |
| SCR-051  | Chi tiết Case               | /cases/:id               | AppLayout   | Nguồn tạo (auto/thủ công), Alert/Event liên quan, ghi chú thread, tài liệu |
| SCR-052  | Tạo Case mới (thủ công)     | /cases/tao-moi           | AppLayout   | Form tạo Case thủ công: đối tượng, mô tả, mức độ, tài liệu |

#### Module: Xét duyệt yêu cầu

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-060  | Hàng đợi yêu cầu           | /xet-duyet               | AppLayout   | DS yêu cầu từ đối tượng: đi xa, hoãn trình báo, đổi thiết bị, đổi nơi ở |
| SCR-061  | Chi tiết yêu cầu           | /xet-duyet/:id           | AppLayout   | Xem chi tiết + Duyệt/Từ chối + ghi chú  |

#### Module: Truy vết & Phân tích

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-070  | Timeline View               | /truy-vet/timeline       | AppLayout   | Lịch sử 1 đối tượng: Event, Alert, Case, kịch bản, trạng thái |
| SCR-071  | Spatial Trace               | /truy-vet/khong-gian     | AppLayout   | Bản đồ GPS từ trình báo, overlay geofence, theo thời gian |
| SCR-072  | Tìm kiếm chéo              | /truy-vet/tim-kiem-cheo  | AppLayout   | Tất cả đối tượng trình báo tại khu vực X trong thời gian Y |

#### Module: Bản đồ số (GIS)

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-080  | Bản đồ tương tác            | /ban-do                  | AppLayout   | Layers: vị trí trình báo, geofence, ranh giới hành chính |
| SCR-081  | Quản lý Geofence            | /ban-do/geofence         | AppLayout   | Tạo/sửa/xóa vùng geofence, vẽ polygon/circle |

#### Module: Kịch bản (Scenario)

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-090  | Danh sách kịch bản          | /kich-ban                | AppLayout   | 2 tab: Quản lý + Alert. Lọc trạng thái, người tạo. Số đối tượng, compliance |
| SCR-091  | Tạo kịch bản Quản lý        | /kich-ban/quan-ly/tao    | AppLayout   | Form: trình báo, giám sát, auto-transition, custom fields, thông báo |
| SCR-092  | Chỉnh sửa kịch bản Quản lý  | /kich-ban/quan-ly/:id    | AppLayout   | Chỉnh sửa + xem version history         |
| SCR-093  | Tạo/Chỉnh sửa kịch bản Alert| /kich-ban/alert/:id      | AppLayout   | Alert Rules mặc định (chỉnh tham số) + tùy chỉnh + auto-escalation |
| SCR-094  | Simulation kịch bản          | /kich-ban/:id/simulation | AppLayout   | "Nếu Event X → Alert gì? Auto-escalate không?" |
| SCR-095  | Gán kịch bản                | /kich-ban/:id/gan        | AppLayout   | Gán cá nhân / hàng loạt / theo nhóm      |

#### Module: Báo cáo

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-100  | Danh sách báo cáo           | /bao-cao                 | AppLayout   | Báo cáo định kỳ + tùy chỉnh             |
| SCR-101  | Xem báo cáo                 | /bao-cao/:id             | AppLayout   | Biểu đồ tương tác + xuất PDF/Excel      |

#### Module: Quản trị (Admin)

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-110  | Quản lý tài khoản cán bộ    | /admin/tai-khoan         | AppLayout   | CRUD, gán vai trò, gán địa bàn, cấu hình OTP |
| SCR-111  | Chi tiết tài khoản           | /admin/tai-khoan/:id     | AppLayout   | Thông tin + role + data scope + OTP status |
| SCR-112  | Cấu hình danh mục           | /admin/cau-hinh          | AppLayout   | Loại đối tượng, loại sự kiện, loại vi phạm, trạng thái, đơn vị hành chính |
| SCR-113  | Cấu hình Auto-escalation    | /admin/cau-hinh/escalation | AppLayout | Cấu hình system-wide: mức Alert nào auto-escalate |
| SCR-114  | Cấu hình Biometric           | /admin/cau-hinh/biometric | AppLayout  | Face match threshold, liveness params    |
| SCR-115  | Nhật ký hệ thống (Audit Log)| /admin/nhat-ky           | AppLayout   | Log mọi hành vi cán bộ, append-only, lọc + tìm kiếm |

#### Module: Cá nhân & Lỗi

| Mã       | Tên màn hình               | Route                    | Layout      | Mô tả ngắn                              |
|----------|----------------------------|--------------------------|-------------|------------------------------------------|
| SCR-120  | Hồ sơ cá nhân               | /profile                 | AppLayout   | Thông tin tài khoản, đổi mật khẩu, quản lý OTP |
| SCR-121  | Trang 403                   | /403                     | AppLayout   | Không đủ quyền truy cập                  |
| SCR-122  | Trang 404                   | /404                     | AppLayout   | Không tìm thấy trang                     |

### 4.2 Sơ đồ điều hướng tổng quát

```
/ (root) → redirect /dashboard
│
├─ /login ───────────────────────── SCR-001
│   ├─ /login/otp ───────────────── SCR-002
│   └─ (đăng nhập thành công) ──→  /dashboard
│
├─ /setup-otp ───────────────────── SCR-003 (lần đầu đăng nhập)
│
├─ /dashboard ───────────────────── SCR-010
│   └─ /dashboard/executive ─────── SCR-011
│
├─ /ho-so/
│   ├─ index ────────────────────── SCR-020 (danh sách)
│   ├─ them-moi ─────────────────── SCR-022 (thêm mới)
│   ├─ enrollment ───────────────── SCR-024 (quản lý enrollment)
│   ├─ :id ──────────────────────── SCR-021 (chi tiết)
│   └─ :id/chinh-sua ────────────── SCR-023 (chỉnh sửa)
│
├─ /events/
│   ├─ index ────────────────────── SCR-030 (danh sách)
│   └─ :id ──────────────────────── SCR-031 (chi tiết)
│
├─ /alerts/
│   ├─ index ────────────────────── SCR-040 (dashboard)
│   ├─ lich-su ──────────────────── SCR-042 (lịch sử)
│   └─ :id ──────────────────────── SCR-041 (chi tiết)
│
├─ /cases/
│   ├─ index ────────────────────── SCR-050 (dashboard)
│   ├─ tao-moi ──────────────────── SCR-052 (tạo mới)
│   └─ :id ──────────────────────── SCR-051 (chi tiết)
│
├─ /xet-duyet/
│   ├─ index ────────────────────── SCR-060 (hàng đợi)
│   └─ :id ──────────────────────── SCR-061 (chi tiết)
│
├─ /truy-vet/
│   ├─ timeline ─────────────────── SCR-070
│   ├─ khong-gian ───────────────── SCR-071
│   └─ tim-kiem-cheo ────────────── SCR-072
│
├─ /ban-do/
│   ├─ index ────────────────────── SCR-080 (bản đồ)
│   └─ geofence ─────────────────── SCR-081 (quản lý geofence)
│
├─ /kich-ban/
│   ├─ index ────────────────────── SCR-090 (danh sách)
│   ├─ quan-ly/tao ──────────────── SCR-091 (tạo kịch bản QL)
│   ├─ quan-ly/:id ──────────────── SCR-092 (sửa kịch bản QL)
│   ├─ alert/:id ────────────────── SCR-093 (tạo/sửa kịch bản Alert)
│   ├─ :id/simulation ───────────── SCR-094 (simulation)
│   └─ :id/gan ──────────────────── SCR-095 (gán)
│
├─ /bao-cao/
│   ├─ index ────────────────────── SCR-100 (danh sách)
│   └─ :id ──────────────────────── SCR-101 (xem)
│
├─ /admin/
│   ├─ tai-khoan/ ───────────────── SCR-110 (danh sách)
│   │   └─ :id ──────────────────── SCR-111 (chi tiết)
│   ├─ cau-hinh ─────────────────── SCR-112 (danh mục)
│   │   ├─ escalation ───────────── SCR-113
│   │   └─ biometric ────────────── SCR-114
│   └─ nhat-ky ──────────────────── SCR-115 (audit log)
│
├─ /profile ─────────────────────── SCR-120
├─ /403 ─────────────────────────── SCR-121
└─ /404 ─────────────────────────── SCR-122
```

### 4.3 Phân loại theo mức độ ưu tiên

```
P0 — Bắt buộc demo được (core flow):
  SCR-001 (Đăng nhập)
  SCR-002 (OTP)
  SCR-010 (Dashboard)
  SCR-020, SCR-021, SCR-022 (Hồ sơ: list, detail, thêm)
  SCR-030, SCR-031 (Event: list, detail)
  SCR-040, SCR-041 (Alert: dashboard, detail)
  SCR-050, SCR-051 (Case: dashboard, detail)
  SCR-060, SCR-061 (Xét duyệt)
  SCR-070 (Timeline)
  SCR-080 (Bản đồ)
  SCR-090, SCR-091 (Kịch bản: list, tạo)
  SCR-110 (Quản lý tài khoản)

P1 — Quan trọng, nên có đầy đủ:
  SCR-003 (Setup OTP)
  SCR-023 (Chỉnh sửa hồ sơ)
  SCR-024 (Enrollment)
  SCR-042 (Alert history)
  SCR-052 (Tạo Case thủ công)
  SCR-071 (Spatial Trace)
  SCR-081 (Quản lý Geofence)
  SCR-092, SCR-093 (Chỉnh sửa kịch bản)
  SCR-095 (Gán kịch bản)
  SCR-112, SCR-113 (Cấu hình)
  SCR-115 (Audit Log)
  SCR-120 (Hồ sơ cá nhân)

P2 — Hoàn thiện nếu còn thời gian:
  SCR-011 (Executive Dashboard)
  SCR-072 (Tìm kiếm chéo)
  SCR-094 (Simulation)
  SCR-100, SCR-101 (Báo cáo)
  SCR-114 (Cấu hình Biometric)
  SCR-121, SCR-122 (Error pages)
```

---

## 5. Component Library Tổng quát

> Mô tả NGẮN từng component dùng chung.
> Chi tiết (props, states, Tailwind classes) viết riêng trong 02-component-library.md theo skill uiux-spec-writer.

### 5.1 Danh sách components

#### Inputs & Forms

| Component   | Mã        | Dùng cho                                         | Variants chính                              |
|-------------|-----------|--------------------------------------------------|---------------------------------------------|
| Button      | CMP-BTN   | Mọi hành động                                   | primary / secondary / outline / ghost / danger-ghost |
| Input       | CMP-INPUT | Nhập liệu text, email, password, số, search     | text / password / search / monospace         |
| Select      | CMP-SEL   | Chọn từ danh sách cố định                        | default / multiple                           |
| Checkbox    | CMP-CHK   | Chọn nhiều, toggle on/off                        | default / indeterminate                      |
| Radio       | CMP-RAD   | Chọn một trong nhóm                              | default                                      |
| Textarea    | CMP-TXT   | Nhập văn bản dài (ghi chú Case, mô tả)          | default / resizable                          |
| DatePicker  | CMP-DATE  | Chọn ngày tháng (lọc, form)                     | single / range                               |
| FileUpload  | CMP-FILE  | Upload tài liệu, ảnh thực địa                   | default / camera (mobile)                    |
| SearchBar   | CMP-SEARCH| Tìm kiếm nhanh trên toolbar                     | default / advanced (query builder)           |

#### Display & Data

| Component   | Mã        | Dùng cho                                         | Variants chính                              |
|-------------|-----------|--------------------------------------------------|---------------------------------------------|
| Badge       | CMP-BADGE | Trạng thái, nhãn phân loại                       | urgent / processing / pending / done / warning / info / locked |
| Table       | CMP-TABLE | Hiển thị danh sách dữ liệu                       | default / compact                            |
| Pagination  | CMP-PAGE  | Phân trang                                       | default                                      |
| Card        | CMP-CARD  | Khung chứa nội dung                              | default / stat / detail                      |
| StatCard    | CMP-STAT  | Số liệu dashboard (tổng đối tượng, compliance...)| default / alert (viền đỏ)                    |
| Avatar      | CMP-AVT   | Ảnh đại diện / initials người dùng               | sm(24) / md(28) / lg(36)                     |
| Empty State | CMP-EMPTY | Khi danh sách không có dữ liệu                   | default                                      |
| Loading     | CMP-LOAD  | Trạng thái tải dữ liệu                           | spinner / skeleton                           |
| Timeline    | CMP-TLINE | Lịch sử sự kiện theo trục thời gian              | default (vertical)                           |
| Tag         | CMP-TAG   | Label phân loại nhỏ (loại đối tượng, loại event) | default / removable                          |

#### Feedback & Overlay

| Component   | Mã        | Dùng cho                                         | Variants chính                              |
|-------------|-----------|--------------------------------------------------|---------------------------------------------|
| Toast       | CMP-TOAST | Thông báo ngắn (success / error / info)          | success / error / warning / info             |
| Modal       | CMP-MODAL | Hộp thoại xác nhận, form popup                   | sm / md / lg                                 |
| Tooltip     | CMP-TIP   | Giải thích ngắn khi hover                        | default                                      |
| Confirm     | CMP-CFIRM | Xác nhận hành động nguy hiểm (xoá, escalate...) | default / danger                             |
| Alert       | CMP-ALERT | Thông báo cố định trên màn hình                  | info / warning / error                       |
| Drawer      | CMP-DRAWER| Panel trượt từ bên phải (detail nhanh)           | sm(320px) / md(480px)                        |

#### Layout & Navigation

| Component   | Mã         | Dùng cho                                         |
|-------------|------------|--------------------------------------------------|
| AppLayout   | LAY-APP    | Layout sau đăng nhập (accent + topbar + sidebar + main) |
| AuthLayout  | LAY-AUTH   | Layout trang đăng nhập / OTP                     |
| Topbar      | LAY-TOP    | Thanh trên cùng                                  |
| Sidebar     | LAY-SIDE   | Thanh điều hướng bên trái                        |
| PageHeader  | LAY-HDR    | Tiêu đề trang + breadcrumb + action buttons      |
| Breadcrumb  | CMP-BRD    | Đường dẫn điều hướng                              |
| Tabs        | CMP-TABS   | Chuyển đổi nội dung trong cùng màn (tab)          |
| FilterBar   | CMP-FILTER | Thanh lọc: search + select + date + nút lọc       |

#### Chuyên biệt (Domain-specific)

| Component       | Mã          | Dùng cho                                         |
|-----------------|-------------|--------------------------------------------------|
| MapView         | CMP-MAP     | Google Maps wrapper: markers, geofence, heatmap   |
| GeofenceEditor  | CMP-GEOEDIT | Vẽ polygon/circle geofence trên bản đồ           |
| NoteThread      | CMP-NOTES   | Thread ghi chú Case (nội dung + cán bộ + thời gian + ảnh) |
| AlertLevelBadge | CMP-ALVL    | Badge mức Alert: Thấp/Trung bình/Cao/Khẩn cấp   |
| EscalationInfo  | CMP-ESCINFO | Hiển thị thông tin escalation (auto/manual, ai, khi nào) |
| CameraCapture   | CMP-CAMERA  | Chụp ảnh thực địa qua HTML5 Media Capture (mobile browser) |
| QueryBuilder    | CMP-QBUILD  | Tìm kiếm nâng cao: AND/OR, các trường, =, ~, !=, !~ |

### 5.2 Quy tắc dùng component nhất quán

#### Button — Khi nào dùng variant nào

```
primary      → Hành động CHÍNH duy nhất trên mỗi khu vực
               (Lưu, Xác nhận, Đăng nhập, Tạo mới)
secondary    → Hành động quan trọng phụ (Xuất file, In)
outline      → Hành động phụ có cân nhắc (Xem chi tiết, Escalate)
ghost        → Hành động inline nhỏ trong table / card (icon actions, Sửa, Xem)
danger-ghost → Hành động phá huỷ (Xoá, Huỷ bỏ vĩnh viễn)

Quy tắc: Mỗi khu vực chỉ có TỐI ĐA 1 nút primary.
```

#### Badge — Khi nào dùng variant nào

```
urgent     → bg-red-100 text-red-800      — Trạng thái cần xử lý NGAY, Alert KHẨN CẤP
processing → bg-zinc-900 text-zinc-50      — Đang xử lý, đang chờ kết quả
pending    → bg-zinc-100 text-zinc-600     — Chờ duyệt, chờ phê duyệt (border zinc-300)
done       → bg-green-100 text-green-800   — Hoàn thành, đã xử lý, Case Đóng
warning    → bg-yellow-100 text-amber-800  — Cảnh báo, cần chú ý, Alert TRUNG BÌNH
info       → bg-blue-100 text-blue-800     — Thông tin trung tính
locked     → bg-zinc-800 text-zinc-400     — Bị khoá, không tương tác
```

#### AlertLevel — Mapping mức Alert vào Badge

```
THẤP       → variant=info       (bg-blue-100 text-blue-800)
TRUNG BÌNH → variant=warning    (bg-yellow-100 text-amber-800)
CAO        → variant=urgent     (bg-red-100 text-red-800)
KHẨN CẤP  → variant=processing (bg-zinc-900 text-zinc-50) + icon cảnh báo
```

#### Input monospace — Khi nào bắt buộc

```
Bắt buộc dùng font-mono cho:
  ✓ Mã hồ sơ: HS-2024-0047
  ✓ Số CCCD / CMND
  ✓ Số điện thoại (trong table)
  ✓ Mã đối tượng, mã kịch bản
  ✓ Mã Alert, mã Case, mã Event
  ✓ Mã nhân viên / cán bộ
  ✓ Token, mã xác nhận OTP
  ✓ Timestamp log hệ thống
```

#### Toast — Quy tắc hiển thị

```
Vị trí:    top-right, cách top 16px, cách right 16px
Duration:  success = 3000ms | error = 5000ms | warning = 4000ms | info = 3000ms
Stack:     Tối đa 3 toast cùng lúc
Z-index:   400
```

### 5.3 Khung & Viền (Border rules)

```
Card / Panel:
  border: 1px solid #e4e4e7 (zinc-200)
  border-radius: 4px (rounded)
  background: #ffffff hoặc #fafafa (zinc-50)
  KHÔNG shadow (hoặc shadow-xs tối đa)

Table:
  Wrapper: border 1px solid #e4e4e7 (zinc-200), rounded
  Header:  background #f4f4f5 (zinc-100), border-bottom 1px #e4e4e7
  Row:     border-bottom 1px #f4f4f5 (zinc-100)
  Row hover: background #fafafa (zinc-50)

Input / Select:
  border: 1px solid #d4d4d8 (zinc-300)
  border-radius: 4px
  focus: border #b91c1c (red-700), ring 2px rgba(185,28,28,0.15)

Divider:
  1px solid #e4e4e7 (zinc-200) — nằm ngang
  Không dùng divider dọc giữa content

Section separator:
  Chỉ dùng spacing (margin-top) thay divider trong form
```

---

## 6. Navigation & Routing

### 6.1 Auth guard

```
Route public (không cần đăng nhập):
  /login, /login/otp, /setup-otp

Route protected (cần đăng nhập + OTP đã verify):
  Tất cả routes còn lại → redirect /login nếu chưa có token

Route admin (cần role Admin hoặc Lãnh đạo):
  /admin/* → redirect /403 nếu không đủ quyền

Route executive (cần role Cán bộ quản lý / Lãnh đạo):
  /dashboard/executive → redirect /403 nếu không đủ quyền
  /kich-ban/*/tao, /kich-ban/*/gan → cần quyền quản lý kịch bản
```

### 6.2 Redirect logic

```
Truy cập / (root)            → redirect /dashboard
Đăng nhập thành công (no OTP) → redirect /login/otp
OTP verify thành công          → redirect /dashboard (hoặc returnUrl)
Chưa setup OTP lần đầu        → redirect /setup-otp
Đăng xuất                     → redirect /login, xoá token
Token hết hạn                 → redirect /login?session=expired
Không có quyền (403)          → màn hình SCR-121 (/403)
```

### 6.3 Breadcrumb rules

```
Dashboard:                  Dashboard
Module list:                Dashboard > [Tên module]
Detail/Edit:                Dashboard > [Tên module] > [Tên item / Mã số]
Admin:                      Dashboard > Quản trị > [Tên chức năng]
Không hiện breadcrumb:      Trang đăng nhập, OTP, 404, 403
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
  → Hiện ngay dưới field, text #b91c1c (red-700), font 12px
  → Kích hoạt khi: onBlur cho từng field + onSubmit cho toàn form

Lỗi API (4xx/5xx):
  → Toast variant=error, duration 5000ms
  → Form giữ nguyên data, KHÔNG xoá input
  → Message cụ thể theo status code:
    400: "[Message từ server]"
    401: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
    403: "Bạn không có quyền thực hiện hành động này."
    404: "Không tìm thấy dữ liệu yêu cầu."
    409: "Dữ liệu đã tồn tại trong hệ thống."
    429: "Quá nhiều yêu cầu. Vui lòng đợi ít phút."
    500: "Lỗi hệ thống. Vui lòng thử lại sau."

Lỗi mạng (offline):
  → Toast "Không có kết nối mạng. Vui lòng thử lại."

Session hết hạn (401):
  → Redirect /login?session=expired
  → Hiện thông báo "Phiên làm việc đã hết hạn"
```

### 7.3 Empty states

```
Mọi list/table đều PHẢI có empty state:
  Icon:    SVG icon phù hợp với context (outline, zinc-400)
  Title:   "Chưa có [tên đối tượng]" — VD: "Chưa có hồ sơ nào"
  Sub:     Hướng dẫn hành động tiếp theo
  CTA:     Button "Thêm [tên đối tượng]" (nếu user có quyền)

Ví dụ cụ thể cho SMTTS:
  Hồ sơ trống:       "Chưa có hồ sơ nào — Nhấn 'Thêm hồ sơ' để bắt đầu"
  Event trống:        "Chưa có sự kiện nào trong khoảng thời gian này"
  Alert trống:        "Không có cảnh báo đang mở — Hệ thống hoạt động bình thường"
  Case trống:         "Không có vụ việc đang mở"
  Yêu cầu trống:     "Không có yêu cầu nào đang chờ xử lý"
  Kết quả tìm kiếm:  "Không tìm thấy kết quả — Thử thay đổi bộ lọc"
  Không có quyền:     "Bạn không có quyền xem nội dung này"
```

### 7.4 Confirmation dialogs

```
Dùng CMP-CFIRM (modal xác nhận) khi:
  ✓ Xoá dữ liệu bất kỳ
  ✓ Escalate Alert thành Case
  ✓ Đóng Case (bắt buộc ghi chú)
  ✓ Thay đổi trạng thái quan trọng (khoá tài khoản, kết thúc quản lý)
  ✓ Gán/gỡ kịch bản
  ✓ Duyệt/Từ chối yêu cầu

Không cần confirm:
  ✗ Thêm mới (có thể xoá sau)
  ✗ Chỉnh sửa thông tin (có thể sửa lại)
  ✗ Thay đổi bộ lọc, search
  ✗ Acknowledge Alert (chỉ ghi chú)

Title confirm xoá:    "Xác nhận xoá [tên đối tượng]?"
Body:                 "Hành động này không thể hoàn tác. [Tên item] sẽ bị xoá vĩnh viễn."
Buttons:              [Huỷ bỏ (ghost)] [Xoá (danger-ghost)]

Title confirm escalate: "Escalate thành Vụ việc?"
Body:                   "Alert #[ID] sẽ được chuyển thành Case mới."
Buttons:                [Huỷ bỏ (ghost)] [Xác nhận escalate (primary)]
```

### 7.5 Form validation rules

```
Trigger:    onBlur cho từng field + onSubmit cho toàn form
Required:   Dấu * đỏ (#b91c1c) bên cạnh label, message "Vui lòng nhập [tên field]"
Min/Max:    "Tối thiểu [N] ký tự" / "Tối đa [N] ký tự"
Format:     "Định dạng không hợp lệ" (email, SĐT, CCCD...)
Duplicate:  "Đã tồn tại trong hệ thống" (check realtime hoặc khi submit)
CCCD:       12 ký tự số, monospace, check format
SĐT:        10 ký tự số, bắt đầu bằng 0
```

### 7.6 Permissions (Role-based)

```
Roles trong hệ thống (5 vai trò):

  IT_ADMIN:          Toàn quyền hệ thống + cấu hình + audit log
                     Data scope: toàn hệ thống

  LANH_DAO:          Phê duyệt kịch bản, xem báo cáo chiến lược,
                     xem executive dashboard
                     Data scope: theo cấp tỉnh/thành phố

  CAN_BO_QUAN_LY:    Xây kịch bản, gán kịch bản, giám sát tổng hợp,
                     truy vết, tìm kiếm mở rộng
                     Data scope: theo cấp quận/huyện

  CAN_BO_CO_SO:      Giám sát khu vực, xử lý Alert/Case, xét duyệt,
                     chụp ảnh/ghi chú thực địa, tra cứu
                     Data scope: theo cấp phường/xã

  VIEWER:            Chỉ xem, không tạo/sửa/xoá
                     Data scope: theo cấp được gán

Hiển thị dựa theo role:
  Nút "Thêm hồ sơ":      Hiện với CAN_BO_CO_SO, CAN_BO_QUAN_LY, IT_ADMIN
  Nút "Xoá":              Chỉ hiện với CAN_BO_QUAN_LY, IT_ADMIN
  Nút "Escalate":         Hiện với CAN_BO_CO_SO, CAN_BO_QUAN_LY
  Nút "Tạo kịch bản":    Hiện với CAN_BO_QUAN_LY, LANH_DAO
  Nút "Phê duyệt KB":    Chỉ hiện với LANH_DAO
  Menu /admin:            Chỉ hiện với IT_ADMIN, LANH_DAO
  Dashboard Executive:    Chỉ hiện với CAN_BO_QUAN_LY, LANH_DAO, IT_ADMIN
  Nút "Duyệt yêu cầu":  Hiện với CAN_BO_CO_SO, CAN_BO_QUAN_LY
```

### 7.7 Responsive behavior

```
Desktop (≥1024px):
  AppLayout đầy đủ — sidebar cố định 148px
  Table hiển thị tất cả cột
  Stats row 4 cột
  Toolbar 1 dòng

Tablet (640–1023px):
  Sidebar thu nhỏ (chỉ icon, 48px) hoặc overlay
  Table ẩn bớt cột ít quan trọng
  Stats row 2 cột
  Toolbar stacked

Mobile (<640px):
  Sidebar ẩn hoàn toàn — hamburger menu
  Table → Horizontal scroll hoặc card list
  Stats row 1 cột
  Modal → Full-screen
  CameraCapture (CMP-CAMERA) hoạt động đầy đủ
  Ghi chú thực địa tối ưu cho 1 tay
```

---

## 8. Ghi Chú Kỹ Thuật

### 8.1 State management

```
Global state (dùng Zustand hoặc React Context):
  - Auth: user info, token, permissions, role, data_scope
  - Sidebar: collapsed state, active nav item
  - Notifications: unread count, notification list

Local state (useState / React Hook Form):
  - Form values, loading, error của từng màn
  - UI state: modal open/close, selected rows, active tab
  - Filter state: search query, selected filters, date range
```

### 8.2 API conventions

```
Base URL:    /api/v1
Auth header: Authorization: Bearer {token}
Pagination:  ?page=[N]&limit=[N]  → { data: [], total: N, page: N, limit: N }
Sort:        ?sort=[field]&order=[asc|desc]
Filter:      ?status=[value]&type=[value]&from=[date]&to=[date]
Search:      ?q=[text] (fulltext nếu dùng =)
             ?q=~[text] (elastic nếu dùng ~)
             ?q=![text] (NOT chứa)
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
Hiển thị ngày:      DD/MM/YYYY  (VD: 15/03/2026)
Hiển thị giờ:       HH:mm       (VD: 09:47)
Hiển thị đầy đủ:    DD/MM/YYYY HH:mm
Timezone:           Asia/Ho_Chi_Minh (UTC+7)
Lưu database:       ISO 8601 / UTC
Relative time:      "5 phút trước", "2 giờ trước", "Hôm qua" (cho notification, event gần)
```

### 8.4 File upload

```
Định dạng cho phép:
  Tài liệu: .pdf, .docx, .xlsx, .jpg, .png
  Ảnh thực địa: .jpg, .png (từ camera mobile browser)
Kích thước tối đa:  10MB / file
Multiple files:     Có (cho Case notes, tài liệu hồ sơ)
Preview:            Có (ảnh, PDF trang đầu)
Metadata ảnh:       GPS + Timestamp + Tên cán bộ (tự động từ tài khoản)
```

### 8.5 Data scope logic

```
Nguyên tắc: Dashboard và danh sách mặc định chỉ hiện dữ liệu trong
            khu vực quản lý (data_scope) của cán bộ đăng nhập.

CAN_BO_CO_SO:     Mặc định thấy phường/xã được gán
CAN_BO_QUAN_LY:   Mặc định thấy quận/huyện (tổng hợp các phường/xã)
LANH_DAO:          Mặc định thấy tỉnh/TP (tổng hợp các quận/huyện)
IT_ADMIN:          Thấy toàn hệ thống

Tìm kiếm mở rộng: CAN_BO_QUAN_LY trở lên có thể tìm toàn hệ thống
                   (nút "Tìm kiếm mở rộng" hoặc toggle scope)
```

### 8.6 Realtime / Notification

```
Web notification (badge + dropdown trên Topbar):
  - Alert mới trong khu vực
  - Case mới (auto-escalate hoặc assign)
  - Yêu cầu mới từ đối tượng
  - Kịch bản cần phê duyệt

Polling interval: 30 giây (hoặc WebSocket nếu implement)
Badge count: Số thông báo chưa đọc, hiện trên icon Bell trong Topbar
```

---

## 9. Tổng hợp màn hình — Mô tả nhanh để dùng khi viết Screen Spec

> Copy section này + toàn bộ phần trên vào đầu prompt khi dùng uiux-spec-writer cho từng màn.

### SCR-001: Đăng nhập
- Layout: AuthLayout (panel trái tối + panel phải form)
- Fields: Username (text), Password (password)
- Action: Đăng nhập → API POST /api/v1/auth/login → nếu cần OTP → redirect /login/otp
- States: idle, loading, error (sai tài khoản/mật khẩu)

### SCR-002: Xác thực OTP
- Layout: AuthLayout
- Fields: OTP code (6 ký tự, monospace, auto-focus)
- Action: Xác thực → API POST /api/v1/auth/verify-otp → redirect /dashboard
- Có link "Dùng backup code"

### SCR-003: Cài đặt OTP lần đầu
- Layout: AuthLayout
- Hiển thị: QR code (để quét bằng Google Authenticator), secret key (text, monospace)
- Fields: Nhập OTP code xác nhận
- Lưu backup codes → hiện modal danh sách backup codes

### SCR-010: Dashboard chính
- Layout: AppLayout
- Stats row: 4 StatCard — Tổng đối tượng, Compliance %, Alert đang mở, Case đang mở
- Table: Event gần đây (5 dòng mới nhất)
- Table: Alert đang mở (ưu tiên mức cao/khẩn cấp)
- Chart nhỏ: Compliance trend 7 ngày
- Scope: hiện dữ liệu theo data_scope của cán bộ

### SCR-020: Danh sách hồ sơ
- Layout: AppLayout
- PageHeader: "Hồ sơ đối tượng" + nút [Thêm hồ sơ]
- FilterBar: Search (tên/CCCD) + Select (trạng thái) + Select (kịch bản) + DateRange
- Table: Mã HS (mono), Họ tên, CCCD (mono), Địa chỉ, Kịch bản, Trạng thái (Badge), Actions
- Pagination: 20 items/page
- Advanced Search: QueryBuilder (CMP-QBUILD) — AND/OR, =, ~, !=, !~

### SCR-021: Chi tiết hồ sơ
- Layout: AppLayout
- PageHeader: Breadcrumb + "HS-2024-0047" (mono) + [Chỉnh sửa] [Gán kịch bản]
- Tabs: Thông tin | Kịch bản | Timeline | Tài liệu | Thiết bị | Enrollment
- Tab Thông tin: Card nhân thân, Card gia đình, Card pháp lý
- Tab Kịch bản: Kịch bản QL + Alert đang áp dụng, compliance rate
- Tab Timeline: CMP-TLINE hiện Event/Alert/Case
- Tab Tài liệu: Upload/xem tài liệu đính kèm
- Tab Thiết bị: Thiết bị đang bind, lịch sử thiết bị

### SCR-022: Thêm hồ sơ mới
- Layout: AppLayout
- Form sections: Nhân thân, Gia đình, Pháp lý, Ghi chú
- Fields: Họ tên*, CCCD* (mono), Ngày sinh*, Giới tính*, Địa chỉ*, SĐT, Nơi đăng ký quản lý*
- Action: Lưu → POST /api/v1/subjects → redirect /ho-so/:id

### SCR-030: Danh sách Event
- Layout: AppLayout
- FilterBar: Search + Select (loại event) + Select (đối tượng) + DateRange + Select (khu vực)
- Table: Thời gian (muted), Mã Event (mono), Đối tượng, Loại, Kết quả (Badge), GPS, Actions
- Scope: theo data_scope mặc định

### SCR-031: Chi tiết Event
- Layout: AppLayout
- Card thông tin: Event ID (mono), Loại, Thời gian, Đối tượng (link), GPS, Geofence result
- Card biometric: Ảnh face capture, Match score, NFC data
- Bản đồ mini: Vị trí trình báo + geofence overlay
- Liên kết: Alert liên quan (nếu có)

### SCR-040: Dashboard Alert
- Layout: AppLayout
- Stats row: Alert đang mở (theo mức: Khẩn cấp, Cao, Trung bình, Thấp)
- FilterBar: Search + Select (mức độ) + Select (loại) + Select (nguồn: mặc định/tùy chỉnh)
- Table: Mã (mono), Đối tượng, Loại Alert, Mức độ (CMP-ALVL), Nguồn, Thời gian, Actions [Xem | Xử lý | Escalate]
- Responsive: hiển thị tốt trên mobile browser

### SCR-041: Chi tiết Alert
- Layout: AppLayout
- Card: Alert ID (mono), Mức độ (CMP-ALVL), Trạng thái (Badge)
- Card: Event gốc (link), Kịch bản trigger (mặc định/tùy chỉnh), Rule name
- Card: Escalation info (CMP-ESCINFO) — nếu đã escalate
- Actions: [Ghi chú + Đã xử lý] [Escalate thành Case (outline)]
- Lịch sử xử lý (timeline nhỏ)

### SCR-050: Dashboard Case
- Layout: AppLayout
- Tabs: Case Mở | Case Đóng
- FilterBar: Search + Select (mức độ) + Select (trạng thái) + DateRange
- Table: Mã Case (mono), Đối tượng, Nguồn tạo (auto/thủ công), Mức độ, Ngày tạo, Cán bộ phụ trách, Actions
- Responsive

### SCR-051: Chi tiết Case
- Layout: AppLayout
- Card header: Case ID (mono), Trạng thái (Badge), Mức độ
- Card: Nguồn tạo (CMP-ESCINFO) — auto/thủ công + Alert liên quan
- Card: Thông tin đối tượng (link)
- Section: Ghi chú thread (CMP-NOTES) — nội dung + cán bộ + thời gian + ảnh
- Form thêm ghi chú: Textarea + FileUpload (ảnh từ CMP-CAMERA trên mobile)
- Actions: [Đóng Case (require ghi chú)] — chỉ với Case Mở
- Case Đóng: chỉ xem, hiện cán bộ đóng + thời gian đóng + ghi chú đóng

### SCR-060: Hàng đợi yêu cầu
- Layout: AppLayout
- FilterBar: Select (loại yêu cầu: đi xa / hoãn / đổi thiết bị / đổi nơi ở) + Select (trạng thái)
- Table: Mã YC (mono), Đối tượng, Loại, Ngày gửi, Trạng thái (Badge), Actions [Xem]

### SCR-061: Chi tiết yêu cầu
- Layout: AppLayout
- Card: Thông tin yêu cầu (loại, lý do, chi tiết, ngày gửi)
- Card: Thông tin đối tượng
- Actions: [Duyệt (primary)] [Từ chối (danger-ghost)] + ghi chú bắt buộc

### SCR-070: Timeline View
- Layout: AppLayout
- Select đối tượng (search + select)
- FilterBar: loại event, khoảng thời gian
- CMP-TLINE: hiện Event, Alert, Case, thay đổi kịch bản theo trục thời gian

### SCR-080: Bản đồ tương tác
- Layout: AppLayout (content full-width, ẩn padding)
- CMP-MAP: Google Maps
- Layers toggle: vị trí trình báo, geofence, ranh giới hành chính
- Click marker → popup thông tin đối tượng/event
- Zoom mặc định: khu vực quản lý của cán bộ

### SCR-090: Danh sách kịch bản
- Layout: AppLayout
- Tabs: Kịch bản Quản lý | Kịch bản Alert
- Table: Mã KB (mono), Tên, Trạng thái (Badge), Số đối tượng, Compliance %, Người tạo, Actions
- Actions: [Xem] [Sửa] [Gán] [Simulation]

### SCR-091: Tạo kịch bản Quản lý
- Layout: AppLayout
- Form sections:
  - Thông tin chung: Tên*, Mã, Mô tả, Phạm vi
  - Quy tắc trình báo: Tần suất, Khung giờ, Grace period, Face threshold, NFC bắt buộc
  - Quy tắc giám sát: Geofence (select vùng), Giờ giới nghiêm
  - Chuyển trạng thái tự động: Điều kiện → Trạng thái mới
  - Trường dữ liệu bổ sung: Dynamic fields (tên + kiểu + bắt buộc?)
  - Cấu hình thông báo: Nhắc trước deadline, nhắc lại khi quá hạn
- Action: Lưu nháp | Gửi phê duyệt

### SCR-110: Quản lý tài khoản cán bộ
- Layout: AppLayout
- PageHeader: "Tài khoản cán bộ" + [Thêm tài khoản]
- Table: Username, Họ tên, Vai trò (Badge), Địa bàn, OTP (Đã cài/Chưa), Trạng thái, Actions
- Actions: [Xem] [Sửa] [Reset OTP] [Khoá/Mở khoá]

### SCR-115: Nhật ký hệ thống
- Layout: AppLayout
- FilterBar: Search + Select (loại hành động) + Select (cán bộ) + DateRange
- Table: Thời gian (mono), Cán bộ, Hành động, Đối tượng tác động, IP, Chi tiết
- Chỉ xem, không sửa/xoá (append-only)

### SCR-120: Hồ sơ cá nhân
- Layout: AppLayout
- Card: Thông tin tài khoản (tên, role, địa bàn, email)
- Section: Đổi mật khẩu (old, new, confirm)
- Section: Quản lý OTP (trạng thái, reset, xem backup codes)

---

## 10. Checklist hoàn thiện System Spec

### Thông tin cơ bản
- [x] Tên hệ thống, mô tả, đối tượng dùng
- [x] Tech stack FE + BE + DB đã điền

### Design Language
- [x] Tất cả color tokens có giá trị hex cụ thể
- [x] Font family + Google Fonts link
- [x] Font scale đầy đủ với size + weight
- [x] Danh sách cấm rõ ràng
- [x] Signature elements (accent bar, nav active, topbar border)

### Layout
- [x] ASCII art AppLayout đã vẽ với kích thước px cụ thể
- [x] AuthLayout có mô tả
- [x] React structure code cho AppLayout
- [x] Topbar: height, bg, border-bottom, nội dung
- [x] Sidebar: width, bg, nav items đầy đủ với routes

### Screen Inventory
- [x] Liệt kê đủ tất cả màn hình theo module (40+ màn)
- [x] Mỗi màn có: Mã, Tên, Route, Layout, Mô tả ngắn
- [x] Sơ đồ điều hướng đã vẽ
- [x] Phân loại P0/P1/P2
- [x] Mô tả nhanh từng màn (Section 9)

### Component Library
- [x] Đủ 5 nhóm: Inputs, Display, Feedback, Layout, Domain-specific
- [x] Quy tắc dùng Button variants
- [x] Quy tắc dùng Badge variants
- [x] Alert Level → Badge mapping
- [x] Monospace rules
- [x] Toast rules
- [x] Border rules (khung & viền)

### UX Rules
- [x] Loading states (< 300ms / 300ms-2s / > 2s)
- [x] Error handling (field / API / network / session)
- [x] Empty states cho mọi list
- [x] Confirm dialogs (khi nào cần / không cần)
- [x] Form validation trigger + messages
- [x] Roles và permissions (5 vai trò đầy đủ)
- [x] Responsive breakpoints (desktop / tablet / mobile)

### Kỹ thuật
- [x] State management approach
- [x] API base URL + auth header + error format + search
- [x] Date/time format + timezone
- [x] File upload specs
- [x] Data scope logic
- [x] Notification / realtime