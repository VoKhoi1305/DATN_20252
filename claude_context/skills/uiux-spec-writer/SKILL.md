---
name: uiux-spec-writer
description: >
  Tạo tài liệu UI/UX Specification đầy đủ, chuẩn AI-ready cho dự án React/Next.js, tối ưu để sinh code trực tiếp và nộp báo cáo hội đồng. Kích hoạt skill này khi người dùng muốn: viết UI spec, viết UX spec, tạo design specification, viết tài liệu giao diện, mô tả component, định nghĩa design tokens, viết screen spec, hoặc cần tài liệu để đưa cho AI sinh code React/Next.js. Dùng skill này ngay cả khi người dùng chỉ nói "viết spec cho màn hình X", "mô tả component Y", "tạo design system cho đồ án", hay "tôi có Figma, viết spec để code".
---

# UI/UX Specification Writer
## React/Next.js · Tailwind CSS · Tông Đỏ-Đen · Nghiêm túc / Gov-style

Skill này tạo tài liệu UI/UX Spec theo chuẩn **AI-ready** — đủ chi tiết để Claude sinh code React/Next.js + Tailwind CSS đúng ngay lần đầu, giữ nhất quán identity đỏ-đen nghiêm túc xuyên suốt toàn hệ thống.

---

## Triết lý thiết kế bắt buộc

Đây là **design language cố định**. Claude KHÔNG được tự ý thay đổi màu sắc, font, hay border-radius khi sinh code dựa vào spec này.

### Nguyên tắc "Serious · Dense · Trustworthy"
- **Màu đỏ là điểm nhấn duy nhất** — chỉ xuất hiện ~10–15% diện tích: accent bar trên cùng, nút primary, active nav indicator, số liệu khẩn cấp. Phần còn lại là đen/trắng/zinc.
- **Không bo góc lớn** — tối đa `rounded` (4px). Tuyệt đối không dùng `rounded-xl`, `rounded-2xl`, `rounded-full` cho interactive elements.
- **Không shadow nổi** — dùng `border 1px` thay shadow. Chỉ dùng `shadow-xs` nếu thật sự cần thiết.
- **Font IBM Plex Sans** — không dùng Inter, Geist. IBM Plex Mono cho mọi mã số định danh.
- **Spacing compact** — body text 13px (không phải 16px mặc định). Table row height 36px.
- **Sidebar tối** — `bg-zinc-900`, text zinc-50, active item có `border-left: 2px solid #b91c1c`.
- **Topbar đen + border-bottom đỏ** — signature của toàn hệ thống.

### Danh sách cấm tuyệt đối
```
✗ bg-blue-600, text-blue-600  → dùng primary #b91c1c hoặc zinc
✗ rounded-xl, rounded-2xl     → tối đa rounded (4px)
✗ shadow-md, shadow-lg        → dùng border hoặc shadow-xs
✗ font Inter, font Geist      → dùng IBM Plex Sans
✗ gradient bất kỳ             → flat color hoàn toàn
✗ padding quá thoáng          → compact density
✗ card shadow lớn             → card dùng border-1px zinc-200
```

---

## Cấu trúc tài liệu

```
ui-ux-spec/
├── 01-design-tokens.md         ← Viết TRƯỚC TIÊN
├── 02-component-library.md     ← Viết THỨ HAI
├── 03-screens/
│   ├── SCR-001-login.md
│   ├── SCR-002-dashboard.md
│   └── ...
├── 04-user-flows.md
└── 05-responsive-accessibility.md
```

---

## Phần 1 — Design Tokens

```markdown
# DESIGN TOKENS — [Tên dự án]
# Design language: Đỏ-Đen · Nghiêm túc · Gov-style

---

## 1. Colors

### Primary — Đỏ trầm (KHÔNG dùng red-500, crimson — quá tươi)
| Token                 | Hex       | Tailwind  | Dùng cho                                   |
|-----------------------|-----------|-----------|--------------------------------------------|
| color-primary         | #b91c1c   | red-700   | Nút CTA, accent bar, pagination active     |
| color-primary-hover   | #991b1b   | red-800   | Hover state của primary                    |
| color-primary-pressed | #7f1d1d   | red-900   | Active/pressed state                       |
| color-primary-light   | #fee2e2   | red-100   | Badge bg, alert bg, row highlight nhẹ      |
| color-primary-text    | #991b1b   | red-800   | Text đỏ trên nền sáng                      |

### Surface — Zinc/Đen (KHÔNG dùng gray — zinc trung tính hơn)
| Token                 | Hex       | Tailwind   | Dùng cho                                  |
|-----------------------|-----------|------------|-------------------------------------------|
| color-surface-950     | #09090b   | zinc-950   | Topbar, sidebar sâu nhất                  |
| color-surface-900     | #18181b   | zinc-900   | Sidebar chính                             |
| color-surface-800     | #27272a   | zinc-800   | Hover sidebar, divider tối                |
| color-surface-700     | #3f3f46   | zinc-700   | Disabled bg tối                           |
| color-surface-600     | #52525b   | zinc-600   | Text phụ trên nền tối                     |
| color-surface-400     | #a1a1aa   | zinc-400   | Placeholder, disabled text                |
| color-surface-300     | #d4d4d8   | zinc-300   | Border mặc định                           |
| color-surface-200     | #e4e4e7   | zinc-200   | Border nhẹ, divider sáng                  |
| color-surface-100     | #f4f4f5   | zinc-100   | Table header bg, section bg               |
| color-surface-50      | #fafafa   | zinc-50    | Card bg, input bg, page bg                |

### Text — Trên nền sáng
| Token                 | Hex       | Tailwind   | Dùng cho                                  |
|-----------------------|-----------|------------|-------------------------------------------|
| color-text-primary    | #09090b   | zinc-950   | Heading, body text chính                  |
| color-text-secondary  | #52525b   | zinc-600   | Label, caption, text phụ                 |
| color-text-disabled   | #a1a1aa   | zinc-400   | Disabled state                            |
| color-text-inverse    | #fafafa   | zinc-50    | Text trên nền tối (sidebar, topbar)       |
| color-text-muted      | #71717a   | zinc-500   | Timestamp, metadata                       |

### Semantic — Tông đậm, nghiêm túc (KHÔNG dùng -500 — quá tươi)
| Token                 | Hex       | Tailwind   | Dùng cho                                  |
|-----------------------|-----------|------------|-------------------------------------------|
| color-success         | #166534   | green-800  | Trạng thái hoàn thành                     |
| color-success-bg      | #dcfce7   | green-100  | Badge bg thành công                       |
| color-warning         | #854d0e   | amber-800  | Cảnh báo                                  |
| color-warning-bg      | #fef9c3   | yellow-100 | Badge bg cảnh báo                         |
| color-error           | #b91c1c   | red-700    | Lỗi — dùng chung color-primary            |
| color-error-bg        | #fee2e2   | red-100    | Dùng chung color-primary-light            |
| color-info            | #1e40af   | blue-800   | Thông tin trung tính                      |
| color-info-bg         | #dbeafe   | blue-100   | Badge bg thông tin                        |

### Signature elements — Dùng đúng vị trí, không tùy tiện
| Token                 | Giá trị CSS                      | Vị trí duy nhất                         |
|-----------------------|----------------------------------|------------------------------------------|
| accent-bar            | height:3px; bg:#b91c1c           | border-top của toàn layout               |
| accent-nav-active     | border-left:2px solid #b91c1c    | Active nav item trong sidebar            |
| accent-topbar-bottom  | border-bottom:2px solid #b91c1c  | Dưới topbar                              |

---

## 2. Typography

### Font stack — KHÔNG thay thế
```css
--font-sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
--font-mono: 'IBM Plex Mono', 'Courier New', monospace;
```

Google Fonts import (thêm vào layout.tsx):
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

Tailwind config:
```js
fontFamily: {
  sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
  mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
}
```

### Scale — Compact
| Token        | Size  | Weight | Line-height | Tailwind approx.          | Dùng cho                         |
|--------------|-------|--------|-------------|---------------------------|----------------------------------|
| text-display | 20px  | 600    | 1.25        | text-xl font-semibold     | Tên hệ thống trong topbar        |
| text-h1      | 18px  | 600    | 1.3         | text-lg font-semibold     | Tiêu đề trang                    |
| text-h2      | 15px  | 600    | 1.4         | text-[15px] font-semibold | Tiêu đề section                  |
| text-h3      | 13px  | 600    | 1.4         | text-[13px] font-semibold | Sub-heading, card title          |
| text-body    | 13px  | 400    | 1.55        | text-[13px]               | Body text chính                  |
| text-body-sm | 12px  | 400    | 1.5         | text-xs                   | Caption, helper text             |
| text-label   | 12px  | 500    | 1.4         | text-xs font-medium       | Form label, column header        |
| text-caption | 11px  | 400    | 1.4         | text-[11px]               | Timestamp, metadata              |
| text-mono    | 12px  | 400    | 1.4         | text-xs font-mono         | Mã hồ sơ, CCCD, ID định danh    |
| text-upper   | 10px  | 600    | 1.4         | text-[10px] font-semibold uppercase tracking-widest | Section label trong sidebar |

### Quy tắc dùng font-mono (IBM Plex Mono)
Bắt buộc dùng cho mọi dữ liệu định danh:
- Mã hồ sơ: `HS-2024-0047`
- Số CCCD / CMND
- Số điện thoại trong data table
- Mã đối tượng, mã vụ án
- Timestamp log hệ thống, phiên bản

---

## 3. Spacing — Compact (base = 4px)

| Token    | Value | Tailwind gần nhất | Dùng cho                          |
|----------|-------|-------------------|-----------------------------------|
| space-1  | 4px   | p-1               | Gap icon nhỏ, padding badge       |
| space-2  | 6px   | p-1.5             | Padding cell compact              |
| space-3  | 8px   | p-2               | Gap giữa elements                 |
| space-4  | 10px  | p-2.5             | Padding input, button sm          |
| space-5  | 12px  | p-3               | Padding cell default              |
| space-6  | 16px  | p-4               | Padding card, section             |
| space-8  | 20px  | p-5               | Padding card lg                   |
| space-10 | 28px  | p-7               | Section gap lớn                   |
| space-12 | 36px  | p-9               | Page padding top                  |

---

## 4. Border Radius — Square feel, tối giản

| Token       | Value | Tailwind      | Dùng cho                              |
|-------------|-------|---------------|---------------------------------------|
| radius-none | 0px   | rounded-none  | Topbar, sidebar, accent bar           |
| radius-xs   | 2px   | (custom)      | Badge, status tag                     |
| radius-sm   | 3px   | (custom)      | Chip nhỏ                              |
| radius-md   | 4px   | rounded       | Button, Input, Card — DEFAULT         |
| radius-lg   | 6px   | rounded-md    | Modal, Dropdown — dùng hạn chế       |

```js
// tailwind.config.js
borderRadius: {
  none: '0',
  xs: '2px',
  sm: '3px',
  DEFAULT: '4px',
  md: '4px',
  lg: '6px',
}
```

---

## 5. Shadows — Tối thiểu, chỉ 2 mức

| Token     | Value                               | Dùng cho                  |
|-----------|-------------------------------------|---------------------------|
| shadow-xs | 0 1px 2px rgba(9,9,11,0.06)         | Card (dùng tiết kiệm)     |
| shadow-sm | 0 1px 3px rgba(9,9,11,0.10)         | Dropdown, tooltip         |

KHÔNG dùng: `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`.

---

## 6. Layout Constants

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
card-padding:             14px 16px
```

---

## 7. Breakpoints

| Token   | Value    | Tailwind prefix |
|---------|----------|-----------------|
| mobile  | < 640px  | (default)       |
| tablet  | ≥ 640px  | sm:             |
| desktop | ≥ 1024px | lg:             |
| wide    | ≥ 1280px | xl:             |

---

## 8. Z-index

| Layer    | Value |
|----------|-------|
| base     | 0     |
| dropdown | 100   |
| sticky   | 200   |
| modal    | 300   |
| toast    | 400   |
| tooltip  | 500   |
```

---

## Phần 2 — Component Library

### Template chuẩn cho 1 component

```markdown
# COMPONENT: [Tên] (CMP-[CODE])

## Mô tả
[1-2 câu]

## Variants
[variant-1] | [variant-2] | [variant-3]

## Sizes
| Size | Height | Padding X | Font  | Dùng cho        |
|------|--------|-----------|-------|-----------------|
| sm   | 30px   | 10px      | 12px  | Toolbar, inline |
| md   | 36px   | 14px      | 13px  | Default         |
| lg   | 40px   | 20px      | 13px  | Form submit     |

## States
| State    | Background   | Text/Border        | Cursor       |
|----------|--------------|--------------------|--------------|
| default  | [hex cụ thể] | [hex cụ thể]       | pointer      |
| hover    | [hex cụ thể] | —                  | pointer      |
| active   | [hex cụ thể] | —                  | pointer      |
| focus    | —            | ring 2px #b91c1c/20| pointer      |
| disabled | #f4f4f5      | #a1a1aa            | not-allowed  |
| loading  | [= default]  | spinner + text     | not-allowed  |
| error    | #fee2e2      | border #b91c1c     | pointer      |

## Props
| Prop     | Type    | Default  | Mô tả |
|----------|---------|----------|-------|
| ...      | ...     | ...      | ...   |

## Behavior
- [behavior 1]
- [behavior 2]

## Accessibility
- [aria attributes]
- keyboard: [phím tắt]

## Tailwind classes
```tsx
// base (áp dụng mọi variant)
"inline-flex items-center justify-center gap-2 font-medium font-sans
 transition-colors duration-150 rounded
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
 disabled:cursor-not-allowed select-none"
// variant: primary
"bg-red-700 text-zinc-50 hover:bg-red-800 active:bg-red-900
 focus-visible:ring-red-700/20"
```
```

---

### Component: Button (CMP-BTN)

```markdown
# COMPONENT: Button (CMP-BTN)

## Variants
primary | secondary | outline | ghost | danger-ghost

## Sizes
| Size | Height | Padding X | Font  |
|------|--------|-----------|-------|
| sm   | 30px   | 10px      | 12px  |
| md   | 36px   | 14px      | 13px  |
| lg   | 40px   | 20px      | 13px  |

## States — variant=primary
| State    | Background | Text    | Ring                   |
|----------|------------|---------|------------------------|
| default  | #b91c1c    | #fafafa | —                      |
| hover    | #991b1b    | #fafafa | —                      |
| active   | #7f1d1d    | #fafafa | —                      |
| focus    | #b91c1c    | #fafafa | 2px #b91c1c/30, offset 2|
| disabled | #f4f4f5    | #a1a1aa | —                      |
| loading  | #b91c1c    | #fafafa + spinner | —          |

## States — variant=secondary (đen)
| State    | Background | Text    |
|----------|------------|---------|
| default  | #18181b    | #fafafa |
| hover    | #09090b    | #fafafa |
| disabled | #f4f4f5    | #a1a1aa |

## States — variant=outline
| State    | Border  | Text    | Background  |
|----------|---------|---------|-------------|
| default  | #b91c1c | #b91c1c | transparent |
| hover    | #991b1b | #991b1b | #fee2e2     |
| disabled | #d4d4d8 | #a1a1aa | transparent |

## Props
| Prop       | Type                                                   | Default   |
|------------|--------------------------------------------------------|-----------|
| variant    | 'primary'\|'secondary'\|'outline'\|'ghost'\|'danger-ghost' | 'primary' |
| size       | 'sm'\|'md'\|'lg'                                       | 'md'      |
| disabled   | boolean                                                | false     |
| loading    | boolean                                                | false     |
| fullWidth  | boolean                                                | false     |
| leftIcon   | ReactNode                                              | undefined |
| rightIcon  | ReactNode                                              | undefined |
| onClick    | () => void                                             | —         |
| type       | 'button'\|'submit'\|'reset'                            | 'button'  |

## Behavior
- `loading=true` → hiện spinner (animate-spin, border-current), giữ text, `disabled=true` tự động
- `fullWidth=true` → `w-full`
- Spinner: `h-3 w-3 border border-current border-t-transparent rounded-full animate-spin`

## Accessibility
- `aria-busy="true"` khi loading
- `aria-disabled="true"` khi disabled
- Enter + Space trigger onClick

## Tailwind classes
```tsx
// Base
"inline-flex items-center justify-center gap-2 font-medium font-sans
 transition-colors duration-150 rounded select-none
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
 disabled:cursor-not-allowed"

// Size sm
"h-[30px] px-[10px] text-xs"
// Size md
"h-9 px-[14px] text-[13px]"
// Size lg
"h-10 px-5 text-[13px]"

// primary
"bg-red-700 text-zinc-50 hover:bg-red-800 active:bg-red-900
 focus-visible:ring-red-700/30 disabled:bg-zinc-100 disabled:text-zinc-400"

// secondary
"bg-zinc-900 text-zinc-50 hover:bg-zinc-950 active:bg-black
 focus-visible:ring-zinc-900/30 disabled:bg-zinc-100 disabled:text-zinc-400"

// outline
"border border-red-700 text-red-700 bg-transparent
 hover:bg-red-50 active:bg-red-100
 focus-visible:ring-red-700/20
 disabled:border-zinc-300 disabled:text-zinc-400"

// ghost
"text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200
 focus-visible:ring-zinc-400/30 disabled:text-zinc-300"

// fullWidth
"w-full"
```
```

---

### Component: Input (CMP-INPUT)

```markdown
# COMPONENT: Input (CMP-INPUT)

## Variants
text | email | password | number | search | tel | textarea

## States
| State    | Border        | Background | Ring                |
|----------|---------------|------------|---------------------|
| default  | zinc-300 1px  | white      | —                   |
| hover    | zinc-500 1px  | white      | —                   |
| focus    | red-700 1px   | white      | 2px red-700/15      |
| filled   | zinc-300 1px  | white      | —                   |
| disabled | zinc-200 1px  | zinc-100   | —                   |
| error    | red-700 1px   | red-50     | 2px red-700/15      |

## Props
| Prop        | Type      | Default   | Mô tả                                   |
|-------------|-----------|-----------|------------------------------------------|
| label       | string    | undefined | Label trên input                         |
| placeholder | string    | ''        | Placeholder                              |
| type        | string    | 'text'    | HTML input type                          |
| value       | string    | —         | Controlled                               |
| onChange    | fn        | —         | Handler                                  |
| error       | string    | undefined | Error msg → border đỏ + text bên dưới   |
| helperText  | string    | undefined | Helper text (zinc-500)                   |
| disabled    | boolean   | false     |                                          |
| required    | boolean   | false     | Thêm dấu * đỏ vào label                 |
| leftIcon    | ReactNode | undefined | Icon bên trái                            |
| rightIcon   | ReactNode | undefined | Icon bên phải (eye toggle cho password) |
| monospace   | boolean   | false     | Font-mono cho mã số, CCCD, ID           |

## Layout
```
[Label]  [* đỏ nếu required]              text-xs font-medium zinc-800
[icon? | input                 | icon?]   h-9 (36px), border zinc-300
[error text hoặc helper text]             text-xs mt-1
```

## Behavior
- `error` có giá trị → border red-700, bg red-50, error text bên dưới
- `required=true` → dấu * `text-red-700 ml-0.5`
- password type → eye icon bên phải toggle `type=password/text`
- `monospace=true` → `font-mono text-[12px] tracking-wide` (mã số, CCCD...)

## Accessibility
- `<label htmlFor={id}>` liên kết input qua id
- `aria-invalid="true"` khi có error
- `aria-describedby` trỏ tới error/helper text id
- `aria-required="true"` khi required

## Tailwind classes
```tsx
// Wrapper
"flex flex-col gap-1"

// Label
"text-xs font-medium text-zinc-800"

// Input base
"w-full h-9 px-3 text-[13px] text-zinc-900 bg-white
 border border-zinc-300 rounded font-sans
 placeholder:text-zinc-400 transition-colors duration-150
 hover:border-zinc-500
 focus:border-red-700 focus:ring-2 focus:ring-red-700/15 focus:outline-none
 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"

// Monospace variant
"font-mono text-[12px] tracking-wide"

// Error state
"border-red-700 bg-red-50 focus:ring-red-700/15"

// Error text
"text-xs text-red-700 mt-1"

// Helper text
"text-xs text-zinc-500 mt-1"
```
```

---

### Component: Badge / Status (CMP-BADGE)

```markdown
# COMPONENT: Badge (CMP-BADGE)

## Bảng màu sắc cố định — KHÔNG tự ý thay đổi

| Variant     | Background | Text     | Border    | Dùng khi               |
|-------------|------------|----------|-----------|------------------------|
| urgent      | #fee2e2    | #991b1b  | —         | Khẩn cấp, nguy hiểm    |
| processing  | #18181b    | #fafafa  | —         | Đang xử lý             |
| pending     | #f4f4f5    | #52525b  | #d4d4d8   | Chờ duyệt, chờ xử lý   |
| done        | #dcfce7    | #166534  | —         | Hoàn thành             |
| warning     | #fef9c3    | #854d0e  | —         | Cảnh báo               |
| info        | #dbeafe    | #1e40af  | —         | Thông tin              |
| locked      | #27272a    | #a1a1aa  | —         | Bị khoá                |

## Sizes
| Size | Padding  | Font  | Radius |
|------|----------|-------|--------|
| sm   | 1px 6px  | 10px  | 2px    |
| md   | 2px 8px  | 11px  | 2px    |

## Tailwind classes
```tsx
// Base
"inline-flex items-center font-medium font-sans whitespace-nowrap select-none"
// sm
"px-1.5 py-px text-[10px] rounded-[2px]"
// md (default)
"px-2 py-0.5 text-[11px] rounded-[2px]"
// urgent
"bg-red-100 text-red-800"
// processing
"bg-zinc-900 text-zinc-50"
// pending
"bg-zinc-100 text-zinc-600 border border-zinc-300"
// done
"bg-green-100 text-green-800"
// warning
"bg-yellow-100 text-amber-800"
// info
"bg-blue-100 text-blue-800"
// locked
"bg-zinc-800 text-zinc-400"
```
```

---

### Component: Data Table (CMP-TABLE)

```markdown
# COMPONENT: Data Table (CMP-TABLE)

## Cấu trúc
```tsx
<table>
  <thead>  ← bg-zinc-100, text-[10px] font-semibold uppercase tracking-widest zinc-600
    <tr>
      <th> ← h-[34px], px-[10px], text-left, border-b zinc-200
  <tbody>
    <tr>   ← h-9 (36px), hover:bg-zinc-50, border-b zinc-100
      <td> ← px-[10px], py-[7px], text-[13px] zinc-900
```

## Quy tắc column đặc biệt
- Cột mã số (CCCD, mã HS, ID): bắt buộc `font-mono text-[12px] text-zinc-600`
- Cột trạng thái: dùng CMP-BADGE
- Cột ngày: `text-[12px] text-zinc-500 tabular-nums`
- Cột actions: `text-right`, dùng CMP-BTN variant=ghost size=sm

## Tailwind classes
```tsx
// Table wrapper
"w-full border border-zinc-200 rounded overflow-hidden"

// thead
"bg-zinc-100 border-b border-zinc-200"

// th
"h-[34px] px-[10px] text-left text-[10px] font-semibold
 uppercase tracking-widest text-zinc-600 whitespace-nowrap"

// tbody tr
"border-b border-zinc-100 hover:bg-zinc-50 transition-colors duration-100"

// td base
"px-[10px] py-[7px] text-[13px] text-zinc-900"

// td mono (mã số)
"px-[10px] py-[7px] text-[12px] font-mono text-zinc-600 tracking-wide"

// td muted (ngày, metadata)
"px-[10px] py-[7px] text-[12px] text-zinc-500 tabular-nums"
```
```

---

## Phần 3 — Screen Spec (Template chuẩn)

```markdown
# SCREEN: [Tên] (SCR-[NNN])

## Metadata
| Field         | Value                                     |
|---------------|-------------------------------------------|
| Route         | /[path]                                   |
| Page title    | "[Tên] — [Tên hệ thống]"                 |
| Auth required | true / false                              |
| Layout        | AppLayout / AuthLayout / FullscreenLayout |
| Redirect      | Nếu đã login → /dashboard                |

## AppLayout structure (dùng cho mọi màn hình sau login)
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

## Layout của màn hình này
```
[ASCII art mô tả layout cụ thể]
```

## Components sử dụng
| Component  | ID        | Variant   | Props đặc biệt               |
|------------|-----------|-----------|------------------------------|
| [Tên]      | CMP-[ID]  | [variant] | [ghi chú]                    |

## Form Fields (nếu có)

### [Tên field]
- Component: CMP-INPUT
- type: [text / email / password / number]
- label: "[Label]"
- placeholder: "[placeholder]"
- monospace: true ← nếu là mã số, CCCD, ID
- validation:
  - required → "[message]"
  - [rule] → "[message]"

## API Integration

### [Tên action] — [METHOD] [/api/endpoint]
- Trigger: [khi nào gọi]
- Request body:
  ```json
  { "field": "value" }
  ```
- Response 2xx:
  - Action: [lưu token / navigate / update state]
  - Navigate: [/path] bằng router.replace / router.push
- Response errors:
  | Status | Message hiển thị (Toast, variant=error, duration=4000ms) |
  |--------|----------------------------------------------------------|
  | 400    | "[message]"                                              |
  | 401    | "[message]"                                              |
  | 403    | "[message]"                                              |
  | 429    | "Quá nhiều lần thử. Vui lòng đợi [X] phút."             |
  | 500    | "Lỗi hệ thống. Vui lòng thử lại sau."                   |

## States màn hình

| State   | Mô tả                                                 |
|---------|-------------------------------------------------------|
| idle    | Trạng thái mặc định                                   |
| loading | API call: buttons disabled, spinner thay text nút     |
| success | [mô tả hành động]                                     |
| error   | Toast error hiện trên cùng, form giữ nguyên data      |
| empty   | [Nếu có list] Hiện empty state: icon + text "Chưa có dữ liệu" |

## Navigation
| Trigger               | Destination   | Method          |
|-----------------------|---------------|-----------------|
| [action]              | /[path]       | router.push     |
| [action thành công]   | /[path]       | router.replace  |

## Responsive
| Breakpoint | Thay đổi                                              |
|------------|-------------------------------------------------------|
| mobile     | Sidebar ẩn → hamburger, content full-width, padding 12px |
| desktop    | AppLayout đầy đủ                                      |

## Edge Cases
- [trường hợp đặc biệt → cách xử lý]

## Figma Reference
- Frame: `SCR/[NNN]-[Tên]/Desktop`
```

---

## Phần 4 — User Flow

```markdown
# USER FLOW: [Tên] (UF-[NNN])

## Trigger
[Điều kiện bắt đầu luồng]

## Happy Path
1. [SCR-XXX] User [action]
2. Hệ thống [xử lý]
3. → [SCR-YYY]

## Alternative Flows
- Nếu [điều kiện A] → [xử lý A]
- Nếu [lỗi B] → [xử lý B]

## End State
[Trạng thái cuối]
```

---

## Phần 5 — Figma → Spec

### Naming convention trong Figma
```
Variables:    Colors/primary, Colors/surface-900, Typography/body
Components:   CMP/Button/Primary/Default
              CMP/Button/Primary/Hover
              CMP/Input/Default
              CMP/Input/Error
              CMP/Badge/Urgent
Screens:      SCR/001-Login/Desktop
              SCR/002-Dashboard/Default
```

### Export từ Figma Dev Mode (Ctrl+Alt+D)
1. Chọn element → Inspect panel
2. Copy: Fill hex, font size + weight, padding px, border-radius, border color
3. Map: `#b91c1c` → `color-primary` · `4px` → `radius-md` · `IBM Plex Sans` → `font-sans`
4. Điền vào component template theo format bên dưới

### Format paste Figma values cho Claude
```
--- FIGMA EXPORT: [Tên component] ---
Height:        36px
Padding:       0 14px
Border-radius: 4px
Fill:          #b91c1c
Text:          #fafafa / IBM Plex Sans / 13px / weight=500
Border:        none
Shadow:        none
Hover fill:    #991b1b
Disabled fill: #f4f4f5 / text #a1a1aa
--- END ---
```

---

## Prompt mẫu để Claude sinh code đúng design language

### Sinh 1 component
```
Viết React component [Tên] theo spec bên dưới.
Design language: Đỏ-Đen, nghiêm túc, gov-style.

RÀNG BUỘC BẮT BUỘC — không được thay đổi:
- Font: IBM Plex Sans (sans), IBM Plex Mono (mono) — KHÔNG Inter, KHÔNG Geist
- Primary: #b91c1c — KHÔNG blue-600 hay màu khác
- Border radius: tối đa 4px (Tailwind "rounded") — KHÔNG rounded-lg, rounded-xl
- Height md: 36px — KHÔNG 40px
- KHÔNG shadow-md, shadow-lg, KHÔNG gradient
- Compact: font-size body = 13px

[Paste design-tokens]
[Paste component spec]

Output: TypeScript + Tailwind CSS + cva, đủ tất cả variants và states, export interface Props.
```

### Sinh 1 màn hình
```
Viết trang Next.js App Router cho màn hình [Tên].
Design language: Đỏ-Đen, nghiêm túc như GOV.UK, compact density.

RÀNG BUỘC BẮT BUỘC — giữ ĐÚNG, không tự ý đổi:
1. primary: #b91c1c — KHÔNG thay bằng màu khác
2. Topbar: bg-zinc-950 h-10, border-bottom-2 border-red-700
3. Accent bar: h-[3px] bg-red-700 phía trên topbar
4. Sidebar: bg-zinc-900, active item border-left-2 border-red-700, text zinc-50
5. Border radius: tối đa 4px (rounded) — KHÔNG rounded-lg, rounded-xl
6. Font: IBM Plex Sans — KHÔNG Inter, KHÔNG Geist
7. Mã số / CCCD / ID: bắt buộc font-mono (IBM Plex Mono), text-zinc-600
8. Card: border border-zinc-200, KHÔNG shadow-md/lg
9. Table row: h-9, header h-[34px] bg-zinc-100 uppercase tracking-widest
10. KHÔNG gradient, KHÔNG màu background rực

[Paste design-tokens]
[Paste component specs đã dùng]
[Paste screen spec]

Output: Next.js App Router ('use client' nếu cần), React Hook Form + Zod, fetch/axios,
đủ states: idle / loading / success / error / empty.
```

---

## Checklist trước khi nộp tài liệu

### Design Tokens
- [ ] Colors đủ: primary (đỏ), surface (zinc), text, semantic, signature elements
- [ ] Primary = #b91c1c, surface dùng zinc (không gray)
- [ ] Font = IBM Plex Sans + IBM Plex Mono (có Google Fonts link)
- [ ] Radius tối đa 4px — không có giá trị 8px, 12px, 16px trong tokens
- [ ] Layout constants đầy đủ (topbar, sidebar, row heights)

### Component Library
- [ ] Mỗi component có đủ 5 states với hex values cụ thể
- [ ] Tailwind classes đầy đủ (copy-paste được ngay vào code)
- [ ] Badge dùng đúng bảng màu semantic đậm (green-800, amber-800...)
- [ ] Input có `monospace` prop cho mã số

### Screen Specs
- [ ] Dùng AppLayout structure với accent bar + topbar đen + border đỏ
- [ ] Mọi field mã số ghi rõ `monospace: true`
- [ ] API integration có đủ: endpoint, method, body, error mapping
- [ ] Có empty state cho list/table
- [ ] Responsive: sidebar ẩn trên mobile

### Prompt cho Claude
- [ ] Paste design tokens vào đầu mỗi prompt
- [ ] Có ràng buộc: "KHÔNG blue-600, KHÔNG rounded-xl, KHÔNG Inter"
- [ ] Ghi rõ: "primary #b91c1c, IBM Plex Sans, gov-style, compact"