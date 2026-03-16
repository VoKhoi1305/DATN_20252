# 02 — COMPONENT LIBRARY (ĐỢT 1: FOUNDATION)
# Hệ thống SMTTS — Subject Management, Tracking & Tracing System
# Design language: Đỏ-Đen · Nghiêm túc · Gov-style · Compact
# Phiên bản: 1.0 | Ngày: 15/03/2026

---

> **Quy ước đọc file này:**
> - Mỗi component có đủ: Mô tả → Variants → Sizes → States (hex cụ thể) → Props → Layout → Behavior → Accessibility → Tailwind classes
> - Tailwind classes viết sẵn để **copy-paste trực tiếp** vào code React/TypeScript
> - Hex values là **giá trị cuối cùng** — không thay đổi khi sinh code
> - Mọi component tuân theo design tokens đã định nghĩa trong system-spec.md

---

# COMPONENT: Button (CMP-BTN)

## Mô tả
Nút hành động dùng cho mọi tương tác trong hệ thống. Có 5 variants phân biệt theo mức độ quan trọng và ngữ cảnh. Mỗi khu vực UI chỉ có tối đa 1 nút `primary`.

## Variants
primary | secondary | outline | ghost | danger-ghost

## Khi nào dùng variant nào
```
primary      → Hành động CHÍNH duy nhất trên mỗi khu vực
               VD: Đăng nhập, Lưu hồ sơ, Xác nhận, Tạo mới
secondary    → Hành động quan trọng phụ, cần nổi bật nhưng không phải CTA chính
               VD: Xuất file, In báo cáo, Gán kịch bản
outline      → Hành động phụ có cân nhắc, cần thu hút nhưng nhẹ hơn primary
               VD: Xem chi tiết, Escalate Alert, Chỉnh sửa
ghost        → Hành động inline nhỏ, trong table row hoặc card
               VD: Icon actions (edit, view), nút phụ trong toolbar
danger-ghost → Hành động phá huỷ, nguy hiểm
               VD: Xoá hồ sơ, Huỷ bỏ, Khoá tài khoản
```

## Sizes
| Size | Height | Padding X | Font  | Tailwind          | Dùng cho                    |
|------|--------|-----------|-------|-------------------|-----------------------------|
| sm   | 30px   | 10px      | 12px  | h-[30px] px-[10px] text-xs | Toolbar, inline actions, table row |
| md   | 36px   | 14px      | 13px  | h-9 px-[14px] text-[13px]  | Default — form, card, modal |
| lg   | 40px   | 20px      | 13px  | h-10 px-5 text-[13px]      | Form submit chính, CTA lớn  |

## States — variant=primary
| State    | Background | Text    | Ring                    | Cursor      |
|----------|------------|---------|-------------------------|-------------|
| default  | #b91c1c    | #fafafa | —                       | pointer     |
| hover    | #991b1b    | #fafafa | —                       | pointer     |
| active   | #7f1d1d    | #fafafa | —                       | pointer     |
| focus    | #b91c1c    | #fafafa | 2px #b91c1c/30, offset 2| pointer     |
| disabled | #f4f4f5    | #a1a1aa | —                       | not-allowed |
| loading  | #b91c1c    | #fafafa + spinner       | —           | not-allowed |

## States — variant=secondary (đen)
| State    | Background | Text    | Ring                    | Cursor      |
|----------|------------|---------|-------------------------|-------------|
| default  | #18181b    | #fafafa | —                       | pointer     |
| hover    | #09090b    | #fafafa | —                       | pointer     |
| active   | #000000    | #fafafa | —                       | pointer     |
| focus    | #18181b    | #fafafa | 2px #18181b/30, offset 2| pointer     |
| disabled | #f4f4f5    | #a1a1aa | —                       | not-allowed |
| loading  | #18181b    | #fafafa + spinner       | —           | not-allowed |

## States — variant=outline
| State    | Border  | Text    | Background  | Ring                    | Cursor      |
|----------|---------|---------|-------------|-------------------------|-------------|
| default  | #b91c1c | #b91c1c | transparent | —                       | pointer     |
| hover    | #991b1b | #991b1b | #fee2e2     | —                       | pointer     |
| active   | #7f1d1d | #7f1d1d | #fecaca     | —                       | pointer     |
| focus    | #b91c1c | #b91c1c | transparent | 2px #b91c1c/20, offset 2| pointer     |
| disabled | #d4d4d8 | #a1a1aa | transparent | —                       | not-allowed |
| loading  | #b91c1c | #b91c1c + spinner | transparent | —           | not-allowed |

## States — variant=ghost
| State    | Text    | Background  | Ring                    | Cursor      |
|----------|---------|-------------|-------------------------|-------------|
| default  | #52525b | transparent | —                       | pointer     |
| hover    | #09090b | #f4f4f5     | —                       | pointer     |
| active   | #09090b | #e4e4e7     | —                       | pointer     |
| focus    | #52525b | transparent | 2px #a1a1aa/30, offset 2| pointer     |
| disabled | #d4d4d8 | transparent | —                       | not-allowed |

## States — variant=danger-ghost
| State    | Text    | Background  | Ring                    | Cursor      |
|----------|---------|-------------|-------------------------|-------------|
| default  | #b91c1c | transparent | —                       | pointer     |
| hover    | #991b1b | #fee2e2     | —                       | pointer     |
| active   | #7f1d1d | #fecaca     | —                       | pointer     |
| focus    | #b91c1c | transparent | 2px #b91c1c/20, offset 2| pointer     |
| disabled | #d4d4d8 | transparent | —                       | not-allowed |

## Props
| Prop       | Type                                                           | Default     | Mô tả                              |
|------------|----------------------------------------------------------------|-------------|-------------------------------------|
| variant    | 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger-ghost' | 'primary'   | Visual variant                      |
| size       | 'sm' \| 'md' \| 'lg'                                          | 'md'        | Kích thước                          |
| disabled   | boolean                                                        | false       | Vô hiệu hoá                         |
| loading    | boolean                                                        | false       | Hiện spinner, tự disabled           |
| fullWidth  | boolean                                                        | false       | width 100%                          |
| leftIcon   | ReactNode                                                      | undefined   | Icon bên trái text                  |
| rightIcon  | ReactNode                                                      | undefined   | Icon bên phải text                  |
| onClick    | () => void                                                     | —           | Handler click                       |
| type       | 'button' \| 'submit' \| 'reset'                               | 'button'    | HTML button type                    |
| children   | ReactNode                                                      | —           | Nội dung nút                        |
| className  | string                                                         | undefined   | Custom classes bổ sung              |

## Layout
```
[leftIcon?] [spinner? | children] [rightIcon?]
  gap-2 giữa icon và text
  spinner thay thế leftIcon khi loading (giữ text)
```

## Behavior
- `loading=true` → hiện spinner bên trái (thay leftIcon), giữ text, `disabled=true` tự động
- `fullWidth=true` → `w-full`
- Chỉ 1 nút `primary` trên mỗi khu vực logic (PageHeader, Modal footer, Form)
- Spinner element: `<span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />`

## Accessibility
- `aria-busy="true"` khi loading
- `aria-disabled="true"` khi disabled
- `role="button"` (mặc định của `<button>`)
- Enter + Space trigger onClick
- Focus visible bằng ring (không dùng outline)

## Tailwind classes
```tsx
// ═══ BASE (áp dụng mọi variant) ═══
const base = `
  inline-flex items-center justify-center gap-2
  font-medium font-sans whitespace-nowrap select-none
  transition-colors duration-150 rounded
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:cursor-not-allowed
`;

// ═══ SIZES ═══
const sizes = {
  sm: "h-[30px] px-[10px] text-xs",
  md: "h-9 px-[14px] text-[13px]",
  lg: "h-10 px-5 text-[13px]",
};

// ═══ VARIANTS ═══
const variants = {
  primary: `
    bg-red-700 text-zinc-50
    hover:bg-red-800 active:bg-red-900
    focus-visible:ring-red-700/30
    disabled:bg-zinc-100 disabled:text-zinc-400
  `,
  secondary: `
    bg-zinc-900 text-zinc-50
    hover:bg-zinc-950 active:bg-black
    focus-visible:ring-zinc-900/30
    disabled:bg-zinc-100 disabled:text-zinc-400
  `,
  outline: `
    border border-red-700 text-red-700 bg-transparent
    hover:bg-red-50 hover:text-red-800 active:bg-red-100
    focus-visible:ring-red-700/20
    disabled:border-zinc-300 disabled:text-zinc-400 disabled:bg-transparent
  `,
  ghost: `
    text-zinc-600 bg-transparent
    hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200
    focus-visible:ring-zinc-400/30
    disabled:text-zinc-300 disabled:bg-transparent
  `,
  "danger-ghost": `
    text-red-700 bg-transparent
    hover:bg-red-50 hover:text-red-800 active:bg-red-100
    focus-visible:ring-red-700/20
    disabled:text-zinc-300 disabled:bg-transparent
  `,
};

// ═══ FULLWIDTH ═══
const fullWidth = "w-full";

// ═══ SPINNER ═══
const spinner = "h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin";
```

---

# COMPONENT: Input (CMP-INPUT)

## Mô tả
Trường nhập liệu dùng cho mọi form trong hệ thống. Hỗ trợ label, error/helper text, icon trái/phải, và chế độ monospace cho mã số định danh (CCCD, mã hồ sơ, mã kịch bản).

## Variants
text | email | password | number | search | tel

## Sizes
| Size | Height | Padding X | Font  | Tailwind              | Dùng cho                          |
|------|--------|-----------|-------|-----------------------|-----------------------------------|
| md   | 36px   | 12px      | 13px  | h-9 px-3 text-[13px]  | Default — mọi form trong hệ thống |

> Input chỉ có 1 size (md = 36px) để giữ nhất quán trong toàn bộ hệ thống. Không cần size sm/lg.

## States
| State    | Border             | Background | Ring              | Text        | Cursor      |
|----------|--------------------|------------|-------------------|-------------|-------------|
| default  | 1px #d4d4d8        | #ffffff    | —                 | #09090b     | text        |
| hover    | 1px #71717a        | #ffffff    | —                 | #09090b     | text        |
| focus    | 1px #b91c1c        | #ffffff    | 2px #b91c1c/15    | #09090b     | text        |
| filled   | 1px #d4d4d8        | #ffffff    | —                 | #09090b     | text        |
| disabled | 1px #e4e4e7        | #f4f4f5    | —                 | #a1a1aa     | not-allowed |
| error    | 1px #b91c1c        | #fef2f2    | 2px #b91c1c/15    | #09090b     | text        |

## Props
| Prop        | Type                | Default   | Mô tả                                       |
|-------------|---------------------|-----------|----------------------------------------------|
| label       | string              | undefined | Label phía trên input                        |
| placeholder | string              | ''        | Placeholder text                             |
| type        | string              | 'text'    | HTML input type                              |
| value       | string              | —         | Controlled value                             |
| onChange    | (value: string) => void | —     | Change handler                               |
| onBlur      | () => void          | undefined | Blur handler (trigger validation)            |
| error       | string              | undefined | Error message → border đỏ + text bên dưới   |
| helperText  | string              | undefined | Helper text (zinc-500) bên dưới input        |
| disabled    | boolean             | false     | Vô hiệu hoá                                  |
| required    | boolean             | false     | Thêm dấu * đỏ bên cạnh label                |
| leftIcon    | ReactNode           | undefined | Icon bên trái trong input                    |
| rightIcon   | ReactNode           | undefined | Icon bên phải (eye toggle cho password)      |
| monospace   | boolean             | false     | Font-mono cho mã số, CCCD, ID               |
| id          | string              | auto-gen  | HTML id, liên kết label                      |
| name        | string              | undefined | HTML name cho form                           |
| maxLength   | number              | undefined | Giới hạn ký tự                               |
| className   | string              | undefined | Custom classes bổ sung cho wrapper           |

## Layout
```
┌─────────────────────────────────────────────────────┐
│ [Label text] [* đỏ nếu required]                    │  ← text-xs font-medium text-zinc-800
├─────────────────────────────────────────────────────┤
│ [leftIcon?] │ input text                 │ [rightIcon?] │  ← h-9 (36px), border zinc-300, rounded
├─────────────────────────────────────────────────────┤
│ [error text HOẶC helper text]                        │  ← text-xs mt-1
└─────────────────────────────────────────────────────┘

Khoảng cách:
  Label → Input:    gap-1 (4px)
  Input → Helper:   mt-1 (4px)
  leftIcon:         pl-9 cho input (icon absolute left-3)
  rightIcon:        pr-9 cho input (icon absolute right-3)
  Icon size:        16x16 (h-4 w-4), color zinc-400
```

## Behavior
- `error` có giá trị → border chuyển red-700, bg chuyển red-50, hiện error text bên dưới (thay helper text)
- `required=true` → dấu `*` màu `text-red-700 ml-0.5` bên cạnh label
- `type="password"` → rightIcon mặc định là eye toggle (click chuyển password ↔ text)
- `monospace=true` → input text chuyển sang `font-mono text-[12px] tracking-wide text-zinc-600`
- `type="search"` → leftIcon mặc định là search icon, có nút clear (X) bên phải khi có value
- Label và input liên kết qua `htmlFor` / `id`
- Error text và helper text KHÔNG hiện đồng thời — error ưu tiên hơn

## Accessibility
- `<label htmlFor={id}>` liên kết input qua id duy nhất
- `aria-invalid="true"` khi có error
- `aria-describedby={helperTextId | errorTextId}` trỏ tới text mô tả bên dưới
- `aria-required="true"` khi required
- `role="textbox"` (mặc định của `<input>`)
- Tab navigation: focus vào input, Tab để chuyển field tiếp theo

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "flex flex-col gap-1";

// ═══ LABEL ═══
const label = "text-xs font-medium text-zinc-800";
const requiredMark = "text-red-700 ml-0.5";  // dấu *

// ═══ INPUT CONTAINER (relative, cho icon positioning) ═══
const inputContainer = "relative";

// ═══ INPUT BASE ═══
const inputBase = `
  w-full h-9 px-3 text-[13px] text-zinc-900 bg-white
  border border-zinc-300 rounded font-sans
  placeholder:text-zinc-400
  transition-colors duration-150
  hover:border-zinc-500
  focus:border-red-700 focus:ring-2 focus:ring-red-700/15 focus:outline-none
  disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed
`;

// ═══ INPUT WITH ICONS ═══
const inputWithLeftIcon = "pl-9";   // khi có leftIcon
const inputWithRightIcon = "pr-9";  // khi có rightIcon

// ═══ MONOSPACE VARIANT ═══
const inputMonospace = "font-mono text-[12px] tracking-wide text-zinc-600";

// ═══ ERROR STATE (override border + bg) ═══
const inputError = "border-red-700 bg-red-50 focus:ring-red-700/15";

// ═══ ICON POSITIONING ═══
const iconLeft = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none";
const iconRight = "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400";
// iconRight cho password eye toggle: bỏ pointer-events-none, thêm cursor-pointer

// ═══ ERROR TEXT ═══
const errorText = "text-xs text-red-700 mt-1";

// ═══ HELPER TEXT ═══
const helperText = "text-xs text-zinc-500 mt-1";
```

---

# COMPONENT: Select (CMP-SEL)

## Mô tả
Dropdown chọn giá trị từ danh sách cố định. Dùng cho bộ lọc (FilterBar), form field (trạng thái, loại, khu vực...). Hỗ trợ single select và multiple select. Visual style đồng bộ hoàn toàn với CMP-INPUT.

## Variants
default | multiple

## Sizes
| Size | Height | Padding X | Font  | Tailwind              | Dùng cho          |
|------|--------|-----------|-------|-----------------------|-------------------|
| md   | 36px   | 12px      | 13px  | h-9 px-3 text-[13px]  | Default — mọi nơi |

> Chỉ 1 size (md = 36px) — đồng bộ với CMP-INPUT.

## States
| State    | Border             | Background | Ring              | Text        | Cursor      |
|----------|--------------------|------------|-------------------|-------------|-------------|
| default  | 1px #d4d4d8        | #ffffff    | —                 | #09090b     | pointer     |
| hover    | 1px #71717a        | #ffffff    | —                 | #09090b     | pointer     |
| focus    | 1px #b91c1c        | #ffffff    | 2px #b91c1c/15    | #09090b     | pointer     |
| open     | 1px #b91c1c        | #ffffff    | 2px #b91c1c/15    | #09090b     | pointer     |
| disabled | 1px #e4e4e7        | #f4f4f5    | —                 | #a1a1aa     | not-allowed |
| error    | 1px #b91c1c        | #fef2f2    | 2px #b91c1c/15    | #09090b     | pointer     |

## Dropdown States (option list)
| Element            | Background | Text    | Border             |
|--------------------|------------|---------|--------------------|
| Dropdown container | #ffffff    | —       | 1px #e4e4e7, shadow-sm, rounded |
| Option default     | transparent| #09090b | —                  |
| Option hover       | #f4f4f5    | #09090b | —                  |
| Option selected    | #fee2e2    | #991b1b | —                  |
| Option disabled    | transparent| #a1a1aa | —                  |

## Props
| Prop         | Type                     | Default   | Mô tả                                    |
|--------------|--------------------------|-----------|-------------------------------------------|
| label        | string                   | undefined | Label phía trên select                    |
| placeholder  | string                   | 'Chọn...'| Placeholder khi chưa chọn                |
| options      | Array<{value, label, disabled?}> | []  | Danh sách options                         |
| value        | string \| string[]       | —         | Giá trị đã chọn (controlled)             |
| onChange     | (value) => void          | —         | Change handler                            |
| multiple     | boolean                  | false     | Cho phép chọn nhiều                       |
| searchable   | boolean                  | false     | Có ô tìm kiếm trong dropdown             |
| disabled     | boolean                  | false     | Vô hiệu hoá                               |
| required     | boolean                  | false     | Dấu * đỏ                                  |
| error        | string                   | undefined | Error message                             |
| helperText   | string                   | undefined | Helper text                               |
| clearable    | boolean                  | false     | Hiện nút X để clear selection             |
| id           | string                   | auto-gen  | HTML id                                   |
| className    | string                   | undefined | Custom classes bổ sung                    |

## Layout
```
┌─────────────────────────────────────────────────────┐
│ [Label text] [* đỏ nếu required]                    │  ← text-xs font-medium text-zinc-800
├─────────────────────────────────────────────────────┤
│ [Selected value / Placeholder]     [chevron ▼]       │  ← h-9 (36px), border zinc-300, rounded
├─────────────────────────────────────────────────────┤
│ [error text HOẶC helper text]                        │  ← text-xs mt-1
└─────────────────────────────────────────────────────┘

Dropdown khi mở (dưới trigger):
┌─────────────────────────────────────────────────────┐
│ [Search input] (nếu searchable)                      │  ← px-2 py-2, border-b zinc-200
├─────────────────────────────────────────────────────┤
│ [Option 1]                                           │  ← h-8, px-3, text-[13px]
│ [Option 2 — selected] ✓                              │  ← bg-red-50, text-red-800
│ [Option 3]                                           │
│ [Option 4 — disabled]                                │  ← text-zinc-400
└─────────────────────────────────────────────────────┘

Multiple select — selected hiện dạng tag:
┌─────────────────────────────────────────────────────┐
│ [Tag 1 ✕] [Tag 2 ✕] [Tag 3 ✕]        [chevron ▼]   │  ← min-h-9, flex-wrap
└─────────────────────────────────────────────────────┘
  Tag: bg-zinc-100 text-zinc-700 text-[11px] px-1.5 py-0.5 rounded-[2px]
  Tag X: hover:bg-zinc-200, cursor-pointer
```

## Behavior
- Click trigger → mở dropdown bên dưới, focus ring hiện
- Click option → chọn giá trị, đóng dropdown (single) hoặc giữ mở (multiple)
- Click outside / Escape → đóng dropdown
- `searchable=true` → ô search trên cùng trong dropdown, filter options theo text
- `multiple=true` → selected hiện dạng tag chips trong trigger, click X trên tag để bỏ chọn
- `clearable=true` + có value → hiện icon X bên trái chevron, click để clear
- Dropdown position: mặc định dưới trigger, nếu không đủ chỗ → hiện phía trên
- Max height dropdown: 240px (overflow-y-auto, scrollbar thin)

## Accessibility
- `role="combobox"` cho trigger
- `role="listbox"` cho dropdown
- `role="option"` cho mỗi option, `aria-selected="true"` khi chọn
- `aria-expanded="true/false"` trên trigger
- `aria-haspopup="listbox"` trên trigger
- `aria-required="true"` khi required
- `aria-invalid="true"` khi error
- Keyboard: Arrow Up/Down di chuyển, Enter chọn, Escape đóng, Tab chuyển focus ra ngoài

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "flex flex-col gap-1";

// ═══ LABEL (giống CMP-INPUT) ═══
const label = "text-xs font-medium text-zinc-800";
const requiredMark = "text-red-700 ml-0.5";

// ═══ TRIGGER ═══
const trigger = `
  relative w-full h-9 px-3 pr-8 text-[13px] text-zinc-900 bg-white
  border border-zinc-300 rounded font-sans
  flex items-center cursor-pointer
  transition-colors duration-150
  hover:border-zinc-500
`;

const triggerOpen = "border-red-700 ring-2 ring-red-700/15";
const triggerError = "border-red-700 bg-red-50";
const triggerDisabled = "bg-zinc-100 text-zinc-400 cursor-not-allowed";

// ═══ TRIGGER — Multiple (cho tags) ═══
const triggerMultiple = `
  relative w-full min-h-9 px-2 pr-8 py-1
  text-[13px] text-zinc-900 bg-white
  border border-zinc-300 rounded font-sans
  flex items-center flex-wrap gap-1 cursor-pointer
  transition-colors duration-150
  hover:border-zinc-500
`;

// ═══ PLACEHOLDER ═══
const placeholder = "text-zinc-400";

// ═══ CHEVRON ICON ═══
const chevron = "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none";
const chevronOpen = "rotate-180 transition-transform duration-150";

// ═══ CLEAR BUTTON ═══
const clearBtn = "absolute right-7 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-zinc-600 cursor-pointer";

// ═══ DROPDOWN ═══
const dropdown = `
  absolute z-[100] mt-1 w-full
  bg-white border border-zinc-200 rounded shadow-sm
  max-h-[240px] overflow-y-auto
`;

// ═══ SEARCH INPUT (trong dropdown) ═══
const searchInput = "w-full px-3 py-2 text-[13px] border-b border-zinc-200 outline-none placeholder:text-zinc-400";

// ═══ OPTION ═══
const option = "h-8 px-3 text-[13px] text-zinc-900 flex items-center cursor-pointer hover:bg-zinc-100";
const optionSelected = "bg-red-50 text-red-800 font-medium";
const optionDisabled = "text-zinc-400 cursor-not-allowed hover:bg-transparent";

// ═══ SELECTED TAG (multiple) ═══
const selectedTag = `
  inline-flex items-center gap-1
  bg-zinc-100 text-zinc-700 text-[11px] font-medium
  px-1.5 py-0.5 rounded-[2px]
`;
const selectedTagRemove = "h-3 w-3 text-zinc-400 hover:text-zinc-600 cursor-pointer";

// ═══ ERROR & HELPER TEXT (giống CMP-INPUT) ═══
const errorText = "text-xs text-red-700 mt-1";
const helperText = "text-xs text-zinc-500 mt-1";
```

---

# COMPONENT: Badge / Status (CMP-BADGE)

## Mô tả
Nhãn trạng thái dùng trong table, card, detail view. Bảng màu cố định theo ngữ nghĩa — KHÔNG được tự ý thay đổi hex values. Mỗi trạng thái nghiệp vụ trong SMTTS được map cố định vào 1 variant duy nhất.

## Variants
urgent | processing | pending | done | warning | info | locked

## Bảng màu cố định — KHÔNG tự ý thay đổi

| Variant     | Background | Text     | Border    | Dùng khi trong SMTTS                         |
|-------------|------------|----------|-----------|-----------------------------------------------|
| urgent      | #fee2e2    | #991b1b  | —         | Alert KHẨN CẤP, Alert CAO, Case khẩn cấp     |
| processing  | #18181b    | #fafafa  | —         | Đang xử lý, Đang điều tra, Enrollment đang tiến hành |
| pending     | #f4f4f5    | #52525b  | #d4d4d8   | Chờ duyệt, Chờ phê duyệt, Yêu cầu chờ       |
| done        | #dcfce7    | #166534  | —         | Hoàn thành, Đã xử lý, Case Đóng, Alert đã xử lý |
| warning     | #fef9c3    | #854d0e  | —         | Alert TRUNG BÌNH, Cảnh báo, Sắp hết hạn       |
| info        | #dbeafe    | #1e40af  | —         | Alert THẤP, Thông tin, Đang quản lý            |
| locked      | #27272a    | #a1a1aa  | —         | Bị khoá, Tạm dừng, Kết thúc quản lý           |

## Mapping trạng thái nghiệp vụ SMTTS → Badge variant

```
═══ HỒ SƠ ĐỐI TƯỢNG ═══
Khởi tạo        → pending
Enrollment       → processing
Đang quản lý    → info
Tái hòa nhập    → warning
Kết thúc        → locked

═══ ALERT ═══
Mức THẤP        → info
Mức TRUNG BÌNH  → warning
Mức CAO         → urgent
Mức KHẨN CẤP   → urgent (font-semibold, thêm icon ⚠)
Đã xử lý       → done

═══ CASE ═══
Case Mở         → processing
Case Đóng       → done

═══ YÊU CẦU ═══
Chờ duyệt      → pending
Đã duyệt       → done
Từ chối         → urgent

═══ KỊCH BẢN ═══
Nháp            → pending
Chờ phê duyệt  → warning
Hiệu lực       → done
Tạm dừng       → locked
Hết hạn         → locked

═══ TÀI KHOẢN ═══
Hoạt động       → done
Bị khoá         → locked
OTP đã cài      → done (sm)
OTP chưa cài    → pending (sm)
```

## Sizes
| Size | Padding     | Font  | Radius | Tailwind                              | Dùng cho             |
|------|-------------|-------|--------|---------------------------------------|----------------------|
| sm   | 1px 6px     | 10px  | 2px    | px-1.5 py-px text-[10px] rounded-[2px] | Inline, trong text, table compact |
| md   | 2px 8px     | 11px  | 2px    | px-2 py-0.5 text-[11px] rounded-[2px]  | Default — table, card, detail |

## Props
| Prop      | Type                                                              | Default | Mô tả                     |
|-----------|-------------------------------------------------------------------|---------|----------------------------|
| variant   | 'urgent' \| 'processing' \| 'pending' \| 'done' \| 'warning' \| 'info' \| 'locked' | — (bắt buộc) | Visual variant   |
| size      | 'sm' \| 'md'                                                     | 'md'    | Kích thước                 |
| children  | ReactNode                                                         | —       | Text nội dung              |
| leftIcon  | ReactNode                                                         | undefined | Icon bên trái text        |
| className | string                                                            | undefined | Custom classes bổ sung     |

## Behavior
- Badge là static display, không có interactive state (no hover, no click)
- Text luôn single line, không wrap (`whitespace-nowrap`)
- Khi variant=urgent + mức KHẨN CẤP → thêm icon cảnh báo (⚠) bên trái, font-semibold

## Accessibility
- `role="status"` (cho screen reader biết đây là thông tin trạng thái)
- Không cần keyboard interaction (không phải interactive element)

## Tailwind classes
```tsx
// ═══ BASE ═══
const base = "inline-flex items-center gap-1 font-medium font-sans whitespace-nowrap select-none";

// ═══ SIZES ═══
const sizes = {
  sm: "px-1.5 py-px text-[10px] rounded-[2px]",
  md: "px-2 py-0.5 text-[11px] rounded-[2px]",
};

// ═══ VARIANTS ═══
const variants = {
  urgent:     "bg-red-100 text-red-800",
  processing: "bg-zinc-900 text-zinc-50",
  pending:    "bg-zinc-100 text-zinc-600 border border-zinc-300",
  done:       "bg-green-100 text-green-800",
  warning:    "bg-yellow-100 text-amber-800",
  info:       "bg-blue-100 text-blue-800",
  locked:     "bg-zinc-800 text-zinc-400",
};

// ═══ ICON (bên trái text) ═══
const icon = "h-3 w-3 flex-shrink-0";  // size sm: h-2.5 w-2.5
```

---

# COMPONENT: Data Table (CMP-TABLE)

## Mô tả
Bảng dữ liệu chính dùng cho mọi danh sách trong hệ thống: hồ sơ, events, alerts, cases, yêu cầu, kịch bản, tài khoản, audit log. Hỗ trợ sorting, row selection, responsive horizontal scroll. Header compact kiểu uppercase tracking-widest. Row height 36px.

## Variants
default | compact

| Variant | Row height | Header height | Dùng cho                      |
|---------|-----------|---------------|-------------------------------|
| default | 36px      | 34px          | Mọi table chính               |
| compact | 30px      | 30px          | Table nhỏ trong detail, modal |

## Cấu trúc HTML
```tsx
<div className="table-wrapper">        ← border, rounded, overflow-hidden
  <table>
    <thead>                              ← bg-zinc-100, border-b
      <tr>
        <th>                             ← h-[34px], uppercase, tracking-widest
    <tbody>
      <tr>                               ← h-9, hover:bg-zinc-50, border-b
        <td>                             ← px-[10px], text-[13px]
```

## Column Types — Quy tắc hiển thị từng loại dữ liệu

| Loại cột              | Font          | Size  | Color   | Tailwind bắt buộc                                    |
|-----------------------|---------------|-------|---------|-------------------------------------------------------|
| Text thường           | IBM Plex Sans | 13px  | zinc-900| `text-[13px] text-zinc-900`                           |
| Mã số (ID, CCCD, HS) | IBM Plex Mono | 12px  | zinc-600| `font-mono text-[12px] text-zinc-600 tracking-wide`   |
| Ngày / Thời gian      | IBM Plex Sans | 12px  | zinc-500| `text-[12px] text-zinc-500 tabular-nums`              |
| Trạng thái            | —             | —     | —       | Dùng CMP-BADGE (variant theo mapping nghiệp vụ)       |
| Actions               | —             | —     | —       | `text-right`, dùng CMP-BTN variant=ghost size=sm       |
| Link (tên đối tượng)  | IBM Plex Sans | 13px  | red-700 | `text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer` |

## States
| State          | Mô tả                                                          |
|----------------|----------------------------------------------------------------|
| default        | Table hiện dữ liệu bình thường                                |
| loading        | Skeleton loader: 5 dòng placeholder animation (pulse)         |
| empty          | CMP-EMPTY hiện thay table body                                |
| row-hover      | bg-zinc-50 trên row đang hover                                |
| row-selected   | bg-red-50 trên row đã chọn (checkbox), border-l-2 red-700     |
| sorting        | Header column đang sort hiện icon ▲/▼, text-zinc-900 (đậm hơn)|

## Props
| Prop            | Type                          | Default   | Mô tả                              |
|-----------------|-------------------------------|-----------|-------------------------------------|
| columns         | Array<ColumnDef>              | —         | Định nghĩa cột (key, label, width, type, sortable) |
| data            | Array<Record>                 | []        | Dữ liệu                            |
| loading         | boolean                       | false     | Hiện skeleton                       |
| emptyMessage    | string                        | 'Chưa có dữ liệu' | Text khi empty           |
| emptyAction     | ReactNode                     | undefined | CTA button trong empty state        |
| selectable      | boolean                       | false     | Hiện checkbox chọn row              |
| selectedRows    | string[]                      | []        | IDs đã chọn                         |
| onRowSelect     | (ids: string[]) => void       | undefined | Handler chọn row                    |
| sortField       | string                        | undefined | Field đang sort                     |
| sortOrder       | 'asc' \| 'desc'               | undefined | Hướng sort                          |
| onSort          | (field, order) => void        | undefined | Handler sort                        |
| onRowClick      | (record) => void              | undefined | Click vào row (navigate)            |
| variant         | 'default' \| 'compact'        | 'default' | Kích thước row                      |
| className       | string                        | undefined | Custom classes bổ sung              |

## ColumnDef Interface
```typescript
interface ColumnDef {
  key: string;                    // field key trong data
  label: string;                  // Header text hiển thị
  width?: string;                 // VD: '120px', '20%', 'auto'
  type?: 'text' | 'mono' | 'date' | 'badge' | 'actions' | 'link';
  sortable?: boolean;             // Cho phép sort cột này
  align?: 'left' | 'center' | 'right';
  render?: (value, record) => ReactNode;  // Custom render
}
```

## Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ ☐ │  MÃ HỒ SƠ  │  HỌ TÊN      │  CCCD         │ TRẠNG THÁI │  ← thead
├───┼──────────────┼──────────────┼───────────────┼────────────┤
│ ☐ │ HS-2024-001 │ Nguyễn Văn A │ 012345678901  │ ●Đang QL   │  ← tbody row
│ ☐ │ HS-2024-002 │ Trần Thị B   │ 098765432100  │ ●Chờ duyệt │
│ ☐ │ HS-2024-003 │ Lê Văn C     │ 034567890123  │ ●Kết thúc  │
└───┴──────────────┴──────────────┴───────────────┴────────────┘

Header: UPPERCASE, tracking-widest, text-[10px], font-semibold, text-zinc-600
Mono cols: font-mono, text-[12px], text-zinc-600
Badge cols: CMP-BADGE phù hợp
Checkbox: 16x16, border zinc-300, checked bg-red-700
Sort icon: ▲▼ bên phải label, 12x12, text-zinc-400 (inactive) / text-zinc-900 (active)
```

## Behavior
- Click header có `sortable=true` → toggle sort asc → desc → none
- Click row (nếu `onRowClick`) → navigate tới detail
- Hover row → bg-zinc-50
- Checkbox header (select all) → chọn/bỏ chọn tất cả rows trong page hiện tại
- Loading → hiện 5 skeleton rows (no header change)
- Empty → ẩn tbody, hiện CMP-EMPTY component
- Responsive mobile → horizontal scroll (overflow-x-auto trên wrapper)

## Accessibility
- `<table role="grid">` cho screen reader
- `<th scope="col">` cho mỗi header cell
- `aria-sort="ascending" | "descending" | "none"` cho cột đang sort
- Checkbox: `aria-label="Chọn tất cả"` (header) / `aria-label="Chọn [tên]"` (row)
- `aria-busy="true"` khi loading

## Tailwind classes
```tsx
// ═══ TABLE WRAPPER ═══
const tableWrapper = "w-full border border-zinc-200 rounded overflow-hidden";
const tableWrapperResponsive = "overflow-x-auto";  // thêm khi cần horizontal scroll

// ═══ TABLE ═══
const table = "w-full border-collapse";

// ═══ THEAD ═══
const thead = "bg-zinc-100 border-b border-zinc-200";

// ═══ TH ═══
const th = `
  h-[34px] px-[10px] text-left
  text-[10px] font-semibold uppercase tracking-widest text-zinc-600
  whitespace-nowrap
`;
const thSortable = "cursor-pointer hover:text-zinc-900 select-none";
const thSortActive = "text-zinc-900";  // đang sort cột này
const thCompact = "h-[30px]";          // variant=compact

// ═══ TBODY TR ═══
const tr = `
  h-9 border-b border-zinc-100
  hover:bg-zinc-50 transition-colors duration-100
`;
const trSelected = "bg-red-50 border-l-2 border-l-red-700";
const trClickable = "cursor-pointer";
const trCompact = "h-[30px]";

// ═══ TD ═══
const tdBase = "px-[10px] py-[7px] text-[13px] text-zinc-900";
const tdMono = "px-[10px] py-[7px] text-[12px] font-mono text-zinc-600 tracking-wide";
const tdMuted = "px-[10px] py-[7px] text-[12px] text-zinc-500 tabular-nums";
const tdActions = "px-[10px] py-[7px] text-right";
const tdLink = "px-[10px] py-[7px] text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer";
const tdCompact = "py-[5px]";

// ═══ CHECKBOX (trong table) ═══
const checkbox = `
  h-4 w-4 rounded-[2px]
  border border-zinc-300
  text-red-700 focus:ring-red-700/20 focus:ring-2 focus:ring-offset-0
`;

// ═══ SORT ICON ═══
const sortIcon = "inline-block ml-1 h-3 w-3";
const sortIconInactive = "text-zinc-400";
const sortIconActive = "text-zinc-900";

// ═══ SKELETON ROW (loading) ═══
const skeletonRow = "h-9 border-b border-zinc-100";
const skeletonCell = "px-[10px] py-[7px]";
const skeletonBar = "h-3 bg-zinc-200 rounded animate-pulse";  // width varies per column
```

---

# COMPONENT: Pagination (CMP-PAGE)

## Mô tả
Phân trang cho mọi danh sách/table trong hệ thống. Hiển thị thông tin tổng + điều hướng trang. Compact, luôn nằm dưới table, đồng bộ visual style với hệ thống đỏ-đen.

## Variants
default (chỉ 1 variant)

## Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ Hiển thị 1-20 trên 156 kết quả        [◀] [1] [2] [3] ... [8] [▶] │
│                                                                    │
│ ← phần trái: text info                ← phần phải: page buttons → │
└──────────────────────────────────────────────────────────────────┘

Text info:   text-[12px] text-zinc-500
Page button: h-8 w-8, text-[12px], rounded
Active page: bg-red-700 text-zinc-50
Inactive:    bg-transparent text-zinc-600 hover:bg-zinc-100
Disabled:    text-zinc-300 cursor-not-allowed
Ellipsis:    text-zinc-400 (không click được)
```

## States — Page Button
| State    | Background  | Text     | Border    | Cursor      |
|----------|-------------|----------|-----------|-------------|
| default  | transparent | #52525b  | —         | pointer     |
| hover    | #f4f4f5     | #09090b  | —         | pointer     |
| active   | #b91c1c     | #fafafa  | —         | default     |
| disabled | transparent | #d4d4d8  | —         | not-allowed |

## Props
| Prop          | Type                    | Default | Mô tả                                |
|---------------|-------------------------|---------|---------------------------------------|
| currentPage   | number                  | 1       | Trang hiện tại                        |
| totalItems    | number                  | 0       | Tổng số items                         |
| itemsPerPage  | number                  | 20      | Số items mỗi trang                    |
| onPageChange  | (page: number) => void  | —       | Handler chuyển trang                  |
| showInfo      | boolean                 | true    | Hiện text "Hiển thị X-Y trên Z"      |
| maxButtons    | number                  | 7       | Số nút page tối đa hiển thị          |
| className     | string                  | undefined | Custom classes                       |

## Behavior
- Tổng pages = Math.ceil(totalItems / itemsPerPage)
- Nếu totalItems ≤ itemsPerPage → KHÔNG hiện pagination
- Nút ◀ (prev): disabled khi currentPage === 1
- Nút ▶ (next): disabled khi currentPage === totalPages
- Ellipsis (...) hiện khi tổng pages > maxButtons
- Logic hiện page buttons:
  - Luôn hiện trang 1 và trang cuối
  - Hiện currentPage ± 1 (hoặc ± 2 nếu đủ chỗ)
  - Ellipsis thay thế khoảng trống
  - VD: [1] ... [4] [5] [6] ... [20]
- Text info: "Hiển thị {from}-{to} trên {total} kết quả"
  - from = (currentPage - 1) * itemsPerPage + 1
  - to = min(currentPage * itemsPerPage, totalItems)
- Responsive mobile: ẩn text info, chỉ hiện page buttons (center)

## Accessibility
- `<nav aria-label="Phân trang">` wrapper
- `aria-current="page"` cho trang active
- `aria-disabled="true"` cho prev/next disabled
- `aria-label="Trang [N]"` cho mỗi page button
- `aria-label="Trang trước"` / `"Trang sau"` cho prev/next

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "flex items-center justify-between py-3";
const wrapperMobile = "flex items-center justify-center py-3";  // mobile: chỉ buttons

// ═══ INFO TEXT ═══
const infoText = "text-[12px] text-zinc-500";

// ═══ BUTTONS CONTAINER ═══
const buttonsContainer = "flex items-center gap-1";

// ═══ PAGE BUTTON ═══
const pageButton = `
  h-8 min-w-[32px] px-2
  text-[12px] font-medium font-sans
  rounded flex items-center justify-center
  transition-colors duration-150
  select-none
`;
const pageButtonDefault = "text-zinc-600 hover:bg-zinc-100 cursor-pointer";
const pageButtonActive = "bg-red-700 text-zinc-50 cursor-default";
const pageButtonDisabled = "text-zinc-300 cursor-not-allowed";

// ═══ PREV / NEXT BUTTON ═══
const navButton = `
  h-8 w-8 flex items-center justify-center
  rounded transition-colors duration-150
`;
const navButtonDefault = "text-zinc-600 hover:bg-zinc-100 cursor-pointer";
const navButtonDisabled = "text-zinc-300 cursor-not-allowed";

// ═══ ELLIPSIS ═══
const ellipsis = "h-8 min-w-[32px] flex items-center justify-center text-[12px] text-zinc-400 select-none";

// ═══ NAV ICON (◀ ▶) ═══
const navIcon = "h-4 w-4";  // chevron-left / chevron-right
```

---

# TỔNG KẾT ĐỢT 1

## Checklist hoàn thiện

| Component  | Mã        | Variants | Sizes | States (hex) | Props | Tailwind | Status |
|------------|-----------|----------|-------|--------------|-------|----------|--------|
| Button     | CMP-BTN   | 5        | 3     | ✅ 5 variants đầy đủ | ✅ 11 props | ✅ | Done |
| Input      | CMP-INPUT | 6 types  | 1     | ✅ 6 states   | ✅ 15 props  | ✅ | Done |
| Select     | CMP-SEL   | 2        | 1     | ✅ 6 states + dropdown | ✅ 14 props | ✅ | Done |
| Badge      | CMP-BADGE | 7        | 2     | ✅ Static     | ✅ 5 props   | ✅ | Done |
| Data Table | CMP-TABLE | 2        | —     | ✅ 6 states   | ✅ 12 props + ColumnDef | ✅ | Done |
| Pagination | CMP-PAGE  | 1        | —     | ✅ 4 states   | ✅ 7 props   | ✅ | Done |

## Quy tắc dùng chung xuyên suốt Đợt 1

```
1. Font: IBM Plex Sans (sans) cho mọi text. IBM Plex Mono (mono) cho mã số.
2. Primary: #b91c1c (red-700). KHÔNG blue-600 hay màu khác.
3. Border radius: tối đa 4px (rounded). KHÔNG rounded-lg, rounded-xl.
4. Input/Select height: 36px (h-9). KHÔNG 40px.
5. Table row: 36px (h-9). Header: 34px. KHÔNG cao hơn.
6. KHÔNG shadow-md, shadow-lg. Chỉ border 1px hoặc shadow-xs/shadow-sm.
7. KHÔNG gradient. Flat color.
8. Compact density: body text 13px, label 12px, caption 11px.
9. Error color = Primary color (#b91c1c) — dùng chung.
10. Disabled: bg-zinc-100 (#f4f4f5) + text-zinc-400 (#a1a1aa) — nhất quán mọi component.
```

## Đợt tiếp theo

```
Đợt 2 — Layout: LAY-APP, LAY-AUTH, LAY-TOP, LAY-SIDE, LAY-HDR, CMP-BRD
Đợt 3 — Feedback & Forms: CMP-TOAST, CMP-MODAL, CMP-CFIRM, CMP-DATE, CMP-TXT, CMP-FILE, CMP-CHK, CMP-RAD
Đợt 4 — Display: CMP-CARD, CMP-STAT, CMP-EMPTY, CMP-LOAD, CMP-TLINE, CMP-TAG, CMP-AVT, CMP-TABS, CMP-DRAWER, CMP-FILTER
Đợt 5 — Domain: CMP-MAP, CMP-NOTES, CMP-ALVL, CMP-ESCINFO, CMP-CAMERA, CMP-QBUILD, CMP-GEOEDIT
```
