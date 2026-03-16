# 02 — COMPONENT LIBRARY (ĐỢT 3: FEEDBACK & FORMS)
# Hệ thống SMTTS — Subject Management, Tracking & Tracing System
# Design language: Đỏ-Đen · Nghiêm túc · Gov-style · Compact
# Phiên bản: 1.0 | Ngày: 15/03/2026

---

> **File này chứa 8 Feedback & Form components.**
> Khi viết screen spec, chỉ paste component mà màn đó dùng.

---

# COMPONENT: Toast (CMP-TOAST)

## Mô tả
Thông báo ngắn hiện góc trên phải rồi tự biến mất. Dùng sau mọi hành động API: thành công, lỗi, cảnh báo, thông tin. Tối đa 3 toast cùng lúc, stack từ trên xuống.

## Variants
success | error | warning | info

## Bảng màu + Thời gian hiển thị

| Variant | Icon       | Bg       | Border-left   | Text     | Duration |
|---------|------------|----------|---------------|----------|----------|
| success | CheckCircle| #f0fdf4  | 3px #166534   | #166534  | 3000ms   |
| error   | XCircle    | #fef2f2  | 3px #b91c1c   | #b91c1c  | 5000ms   |
| warning | AlertTriangle | #fefce8 | 3px #854d0e | #854d0e  | 4000ms   |
| info    | Info       | #eff6ff  | 3px #1e40af   | #1e40af  | 3000ms   |

## Layout

```
Vị trí: fixed top-4 right-4, z-[400]
Stack: toast mới nhất ở trên, max 3, cách nhau gap-2

┌────────────────────────────────────────────────┐
│ ▌ [✓ icon] Lưu hồ sơ thành công          [✕]  │
│ ▌                                              │
│   border-left: 3px                             │
│   w-[360px], px-4 py-3, rounded               │
│   shadow-sm, border 1px zinc-200              │
└────────────────────────────────────────────────┘
```

## Props
| Prop      | Type                                    | Default   | Mô tả                    |
|-----------|-----------------------------------------|-----------|---------------------------|
| variant   | 'success' \| 'error' \| 'warning' \| 'info' | 'info' | Loại toast             |
| message   | string                                  | —         | Nội dung thông báo        |
| duration  | number                                  | auto      | ms — auto theo variant    |
| onClose   | () => void                              | —         | Handler đóng              |
| closable  | boolean                                 | true      | Hiện nút X               |

## Behavior
- Hiện bằng animation: slide-in từ phải + fade-in (200ms)
- Biến mất: fade-out + slide-out (200ms) sau khi hết duration
- Hover toast → tạm dừng countdown (không tự biến mất khi đang hover)
- Click X → đóng ngay
- Quá 3 toast → toast cũ nhất bị đẩy ra (remove)
- Toast manager: dùng global state (Zustand) hoặc context, gọi `toast.success("msg")` từ bất kỳ đâu

## Accessibility
- `role="alert"` cho error/warning, `role="status"` cho success/info
- `aria-live="assertive"` cho error, `aria-live="polite"` cho còn lại
- Nút X: `aria-label="Đóng thông báo"`

## Tailwind classes
```tsx
// ═══ TOAST CONTAINER (chứa tất cả toasts) ═══
const container = "fixed top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none";

// ═══ TOAST ITEM ═══
const toastBase = `
  w-[360px] max-w-[calc(100vw-32px)]
  px-4 py-3 rounded
  border border-zinc-200 shadow-sm
  flex items-start gap-3
  pointer-events-auto
`;

// ═══ VARIANTS ═══
const variants = {
  success: "bg-green-50  border-l-[3px] border-l-green-800",
  error:   "bg-red-50    border-l-[3px] border-l-red-700",
  warning: "bg-yellow-50 border-l-[3px] border-l-amber-800",
  info:    "bg-blue-50   border-l-[3px] border-l-blue-800",
};

// ═══ ICON ═══
const iconSize = "h-5 w-5 flex-shrink-0 mt-0.5";
const iconColor = {
  success: "text-green-800",
  error:   "text-red-700",
  warning: "text-amber-800",
  info:    "text-blue-800",
};

// ═══ MESSAGE TEXT ═══
const message = "text-[13px] font-sans flex-1";
const messageColor = {
  success: "text-green-800",
  error:   "text-red-700",
  warning: "text-amber-800",
  info:    "text-blue-800",
};

// ═══ CLOSE BUTTON ═══
const closeBtn = "h-4 w-4 flex-shrink-0 mt-0.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity";

// ═══ ANIMATION ═══
const enterAnimation = "animate-[slideInRight_200ms_ease-out]";
const exitAnimation = "animate-[fadeOutRight_200ms_ease-in]";
// Định nghĩa keyframes trong tailwind.config.js hoặc global CSS
```

---

# COMPONENT: Modal (CMP-MODAL)

## Mô tả
Hộp thoại nổi lên trên nội dung chính. Dùng cho: form popup nhanh (thêm ghi chú Case, chỉnh Alert Rules), xem chi tiết nhanh, confirm action. Có backdrop tối, center giữa màn hình. Mobile → full-screen.

## Sizes
| Size | Width    | Tailwind         | Dùng cho                              |
|------|----------|------------------|---------------------------------------|
| sm   | 400px    | max-w-[400px]    | Confirm dialog, form đơn giản         |
| md   | 560px    | max-w-[560px]    | Form trung bình, detail nhanh         |
| lg   | 720px    | max-w-[720px]    | Form phức tạp, bảng so sánh           |

## Layout

```
Desktop:
┌──────────── BACKDROP (fixed, inset-0, bg-black/50, z-300) ──────────┐
│                                                                      │
│            ┌─────────────────────────────────────────┐              │
│            │ MODAL CONTAINER                         │              │
│            │ bg-white, rounded, border zinc-200      │              │
│            │ shadow-sm, w-full, max-w-[size]         │              │
│            │                                         │              │
│            │ ┌─────────────────────────────────────┐ │              │
│            │ │ HEADER                     [✕ btn]  │ │  ← h-auto px-5 py-4
│            │ │ [Title]                             │ │    border-b zinc-200
│            │ │ [Subtitle?]                         │ │
│            │ └─────────────────────────────────────┘ │              │
│            │ ┌─────────────────────────────────────┐ │              │
│            │ │ BODY                                │ │  ← px-5 py-4
│            │ │ {children}                          │ │    overflow-y-auto
│            │ │                                     │ │    max-h-[60vh]
│            │ └─────────────────────────────────────┘ │              │
│            │ ┌─────────────────────────────────────┐ │              │
│            │ │ FOOTER                              │ │  ← px-5 py-3
│            │ │        [Huỷ bỏ]  [Xác nhận]        │ │    border-t zinc-200
│            │ └─────────────────────────────────────┘ │    flex justify-end gap-2
│            └─────────────────────────────────────────┘              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Mobile (<640px):
  Modal → full-screen: inset-0, rounded-none, max-h-screen
  Body → flex-1 overflow-y-auto (no max-h limit)
```

## Props
| Prop       | Type        | Default   | Mô tả                                     |
|------------|-------------|-----------|---------------------------------------------|
| open       | boolean     | false     | Hiện/ẩn modal                               |
| onClose    | () => void  | —         | Handler đóng (backdrop click, X, Escape)    |
| title      | string      | —         | Tiêu đề header                              |
| subtitle   | string      | undefined | Mô tả phụ dưới title                        |
| size       | 'sm' \| 'md' \| 'lg' | 'md' | Kích thước                            |
| children   | ReactNode   | —         | Nội dung body                               |
| footer     | ReactNode   | undefined | Nội dung footer (buttons)                   |
| closable   | boolean     | true      | Hiện nút X ở header                        |
| closeOnBackdrop | boolean | true     | Click backdrop → đóng                      |
| className  | string      | undefined | Custom classes cho modal container          |

## States
| State     | Mô tả                                                |
|-----------|-------------------------------------------------------|
| closed    | Ẩn hoàn toàn, không render backdrop                  |
| opening   | Backdrop fade-in + modal scale-in (150ms)            |
| open      | Hiện đầy đủ                                          |
| closing   | Backdrop fade-out + modal scale-out (100ms) → closed |

## Behavior
- Mở modal → scroll body bị lock (`overflow: hidden` trên `<html>`)
- Đóng: click backdrop (nếu closeOnBackdrop) / click X / Escape key
- Body overflow: nếu nội dung dài → body scroll riêng (max-h-[60vh] desktop)
- Footer: thường chứa 2 button — [Huỷ bỏ (ghost)] + [Action (primary/danger)]
- Focus trap: Tab key chỉ di chuyển trong modal, không ra ngoài
- Đóng modal → trả focus về element đã trigger mở modal

## Accessibility
- `role="dialog"` + `aria-modal="true"`
- `aria-labelledby` → title id
- `aria-describedby` → subtitle id (nếu có)
- Focus trap bên trong modal
- Escape → đóng modal
- Nút X: `aria-label="Đóng"`

## Tailwind classes
```tsx
// ═══ BACKDROP ═══
const backdrop = "fixed inset-0 z-[300] bg-black/50";
const backdropEnter = "animate-[fadeIn_150ms_ease-out]";
const backdropExit = "animate-[fadeOut_100ms_ease-in]";

// ═══ MODAL WRAPPER (centering) ═══
const wrapper = "fixed inset-0 z-[300] flex items-center justify-center p-4";
const wrapperMobile = "fixed inset-0 z-[300]";  // mobile: no padding, full screen

// ═══ MODAL CONTAINER ═══
const modal = `
  bg-white rounded border border-zinc-200 shadow-sm
  w-full flex flex-col
`;
const modalEnter = "animate-[scaleIn_150ms_ease-out]";
const modalExit = "animate-[scaleOut_100ms_ease-in]";

const modalSizes = {
  sm: "max-w-[400px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};
const modalMobile = "inset-0 rounded-none max-w-none max-h-none h-full";

// ═══ HEADER ═══
const header = "px-5 py-4 border-b border-zinc-200 flex items-start justify-between";
const headerTitle = "text-[15px] font-semibold text-zinc-900";
const headerSubtitle = "text-[13px] text-zinc-500 mt-0.5";
const headerCloseBtn = `
  h-5 w-5 text-zinc-400 cursor-pointer
  hover:text-zinc-600 transition-colors duration-150
  flex-shrink-0 mt-0.5
`;

// ═══ BODY ═══
const body = "px-5 py-4 overflow-y-auto";
const bodyMaxHeight = "max-h-[60vh]";  // desktop only
const bodyMobile = "flex-1 overflow-y-auto";  // mobile: fill remaining space

// ═══ FOOTER ═══
const footer = "px-5 py-3 border-t border-zinc-200 flex items-center justify-end gap-2";
```

---

# COMPONENT: Confirm Dialog (CMP-CFIRM)

## Mô tả
Modal xác nhận trước hành động nguy hiểm. Dựa trên CMP-MODAL size=sm nhưng có layout cố định: icon cảnh báo + title + body + 2 buttons. Dùng khi: xoá, escalate, đóng Case, khoá tài khoản, duyệt/từ chối.

## Variants
default | danger

| Variant | Icon color | Confirm button     | Dùng khi                       |
|---------|------------|--------------------|--------------------------------|
| default | #b91c1c    | CMP-BTN primary    | Escalate, Duyệt, Gán kịch bản |
| danger  | #b91c1c    | CMP-BTN danger-ghost | Xoá, Khoá, Từ chối           |

## Layout

```
┌──────────────────────────────────────┐
│                                      │
│           [⚠ icon 40x40]            │
│                                      │
│     Xác nhận xoá hồ sơ?             │  ← title: text-[15px] font-semibold center
│                                      │
│     Hành động này không thể          │  ← body: text-[13px] text-zinc-500 center
│     hoàn tác. Hồ sơ HS-2024-047    │
│     sẽ bị xoá vĩnh viễn.           │
│                                      │
│     [Textarea?] — nếu cần ghi chú  │  ← requireNote=true → hiện textarea
│                                      │
│         [Huỷ bỏ]  [Xoá]            │  ← footer: gap-2, justify-center
│                                      │
└──────────────────────────────────────┘

Modal size=sm (max-w-[400px]), center content
```

## Props
| Prop         | Type        | Default   | Mô tả                                     |
|--------------|-------------|-----------|---------------------------------------------|
| open         | boolean     | false     | Hiện/ẩn                                    |
| onClose      | () => void  | —         | Handler đóng (cancel)                      |
| onConfirm    | (note?: string) => void | — | Handler xác nhận (có thể kèm ghi chú) |
| variant      | 'default' \| 'danger' | 'default' | Visual variant                      |
| title        | string      | —         | Tiêu đề xác nhận                           |
| body         | string      | —         | Mô tả chi tiết                             |
| confirmLabel | string      | 'Xác nhận'| Text nút confirm                           |
| cancelLabel  | string      | 'Huỷ bỏ' | Text nút cancel                            |
| requireNote  | boolean     | false     | Bắt buộc ghi chú trước confirm (VD: đóng Case) |
| notePlaceholder | string  | 'Nhập ghi chú...' | Placeholder textarea          |
| loading      | boolean     | false     | Nút confirm loading                        |

## Behavior
- Mở → focus vào nút Cancel (không focus Confirm để tránh xác nhận nhầm)
- `requireNote=true` → hiện textarea, nút Confirm disabled cho đến khi có text
- Escape / click backdrop → đóng (giống cancel)
- Confirm click → gọi `onConfirm(note)`, loading state trên nút confirm
- Không đóng tự động sau confirm — đợi parent component đóng (sau khi API thành công)

## Mapping hành động SMTTS → Confirm

```
Xoá hồ sơ:
  variant=danger, title="Xác nhận xoá hồ sơ?",
  body="Hành động này không thể hoàn tác. Hồ sơ [mã] sẽ bị xoá vĩnh viễn.",
  confirmLabel="Xoá"

Escalate Alert:
  variant=default, title="Escalate thành Vụ việc?",
  body="Alert #[ID] sẽ được chuyển thành Case mới.",
  confirmLabel="Xác nhận escalate"

Đóng Case:
  variant=default, title="Đóng vụ việc?",
  body="Case #[ID] sẽ chuyển sang trạng thái Đóng, không thể chỉnh sửa.",
  requireNote=true, notePlaceholder="Nhập kết quả xử lý...",
  confirmLabel="Đóng Case"

Duyệt yêu cầu:
  variant=default, title="Duyệt yêu cầu?",
  body="Yêu cầu [loại] của [đối tượng] sẽ được phê duyệt.",
  confirmLabel="Duyệt"

Từ chối yêu cầu:
  variant=danger, title="Từ chối yêu cầu?",
  body="Yêu cầu [loại] của [đối tượng] sẽ bị từ chối.",
  requireNote=true, notePlaceholder="Nhập lý do từ chối...",
  confirmLabel="Từ chối"

Khoá tài khoản:
  variant=danger, title="Khoá tài khoản?",
  body="Cán bộ [tên] sẽ không thể đăng nhập hệ thống.",
  confirmLabel="Khoá"
```

## Tailwind classes
```tsx
// Dùng CMP-MODAL size=sm làm nền, override nội dung:

// ═══ CONTENT WRAPPER (thay body của modal) ═══
const content = "px-5 py-6 flex flex-col items-center text-center";

// ═══ ICON ═══
const icon = "h-10 w-10 text-red-700 mb-3";  // cả default và danger đều dùng đỏ

// ═══ TITLE ═══
const title = "text-[15px] font-semibold text-zinc-900 mb-2";

// ═══ BODY TEXT ═══
const body = "text-[13px] text-zinc-500 leading-relaxed max-w-[320px]";

// ═══ TEXTAREA (khi requireNote=true) ═══
const noteTextarea = `
  w-full mt-4 px-3 py-2
  text-[13px] text-zinc-900 bg-white
  border border-zinc-300 rounded font-sans
  placeholder:text-zinc-400
  focus:border-red-700 focus:ring-2 focus:ring-red-700/15 focus:outline-none
  resize-none
`;
const noteTextareaHeight = "h-20";  // 5 lines

// ═══ FOOTER ═══
const footer = "px-5 py-3 border-t border-zinc-200 flex items-center justify-center gap-3";
// Cancel: CMP-BTN variant=ghost
// Confirm default: CMP-BTN variant=primary
// Confirm danger: CMP-BTN variant=danger-ghost
```

---

# COMPONENT: DatePicker (CMP-DATE)

## Mô tả
Chọn ngày hoặc khoảng ngày. Dùng trong FilterBar (lọc theo thời gian) và form fields (ngày sinh, ngày hiệu lực kịch bản, ngày hẹn). Trigger trông giống CMP-INPUT, mở calendar dropdown khi click.

## Variants
single | range

## Layout

```
Trigger (giống CMP-INPUT):
┌────────────────────────────────────────────────────┐
│ [📅 icon] 15/03/2026                    [clear ✕?] │  ← h-9, border zinc-300
└────────────────────────────────────────────────────┘

Trigger range:
┌────────────────────────────────────────────────────┐
│ [📅] 01/03/2026 — 15/03/2026            [clear ✕] │
└────────────────────────────────────────────────────┘

Calendar dropdown:
┌────────────────────────────────────────┐
│ [◀]     Tháng 3, 2026           [▶]   │  ← header: nav tháng
├────────────────────────────────────────┤
│  CN   T2   T3   T4   T5   T6   T7    │  ← weekday labels
├────────────────────────────────────────┤
│       1    2    3    4    5    6       │
│  7    8    9   10   11   12   13      │
│ 14  [15]  16   17   18   19   20      │  ← [15] = selected / today
│ 21   22   23   24   25   26   27      │
│ 28   29   30   31                     │
├────────────────────────────────────────┤
│ [Hôm nay]                   [Xoá]    │  ← footer shortcuts
└────────────────────────────────────────┘

Calendar size: w-[280px]
Day cell: h-8 w-8 text-[13px], rounded
```

## Day Cell States
| State      | Background  | Text     | Border          |
|------------|-------------|----------|-----------------|
| default    | transparent | #09090b  | —               |
| hover      | #f4f4f5     | #09090b  | —               |
| today      | transparent | #b91c1c  | 1px #b91c1c     |
| selected   | #b91c1c     | #fafafa  | —               |
| range-mid  | #fee2e2     | #991b1b  | —               |
| other-month| transparent | #a1a1aa  | —               |
| disabled   | transparent | #d4d4d8  | —               |

## Props
| Prop        | Type                            | Default    | Mô tả                                 |
|-------------|---------------------------------|------------|----------------------------------------|
| label       | string                          | undefined  | Label phía trên                        |
| value       | Date \| null                    | null       | Single selected date                   |
| startDate   | Date \| null                    | null       | Range start (variant=range)            |
| endDate     | Date \| null                    | null       | Range end (variant=range)              |
| onChange    | (date: Date \| null) => void    | —          | Handler single                          |
| onRangeChange | (start, end) => void         | —          | Handler range                          |
| variant     | 'single' \| 'range'             | 'single'  | Loại datepicker                        |
| placeholder | string                          | 'DD/MM/YYYY' | Placeholder                        |
| disabled    | boolean                         | false      | Vô hiệu hoá                            |
| required    | boolean                         | false      | Dấu * đỏ                              |
| error       | string                          | undefined  | Error message                          |
| minDate     | Date                            | undefined  | Ngày nhỏ nhất cho phép chọn           |
| maxDate     | Date                            | undefined  | Ngày lớn nhất cho phép chọn           |
| clearable   | boolean                         | true       | Cho phép xoá giá trị                  |

## Behavior
- Display format: DD/MM/YYYY (Asia/Ho_Chi_Minh)
- Click trigger → mở calendar dropdown dưới trigger
- Click day → chọn ngày (single) / chọn start rồi end (range)
- Range: click ngày 1 = start, click ngày 2 = end. Giữa 2 ngày highlight (range-mid)
- "Hôm nay" shortcut → chọn ngày hiện tại
- "Xoá" → clear selection
- Click outside / Escape → đóng dropdown
- ◀▶ buttons: chuyển tháng trước/sau
- minDate/maxDate: ngày ngoài phạm vi hiện disabled

## Tailwind classes
```tsx
// ═══ TRIGGER (giống CMP-INPUT) ═══
const trigger = `
  w-full h-9 px-3 pr-8 text-[13px] text-zinc-900 bg-white
  border border-zinc-300 rounded font-sans
  flex items-center gap-2 cursor-pointer
  transition-colors duration-150
  hover:border-zinc-500
`;
const triggerOpen = "border-red-700 ring-2 ring-red-700/15";
const triggerIcon = "h-4 w-4 text-zinc-400 flex-shrink-0";

// ═══ CALENDAR DROPDOWN ═══
const calendar = `
  absolute z-[100] mt-1
  w-[280px] bg-white border border-zinc-200 rounded shadow-sm
  p-3
`;

// ═══ CALENDAR HEADER ═══
const calHeader = "flex items-center justify-between mb-2";
const calNavBtn = "h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-100 cursor-pointer text-zinc-600";
const calMonthLabel = "text-[13px] font-semibold text-zinc-900";

// ═══ WEEKDAY LABELS ═══
const weekdayRow = "grid grid-cols-7 mb-1";
const weekdayLabel = "h-8 flex items-center justify-center text-[10px] font-semibold uppercase text-zinc-500";

// ═══ DAYS GRID ═══
const daysGrid = "grid grid-cols-7";

// ═══ DAY CELL ═══
const dayCell = "h-8 w-8 flex items-center justify-center text-[13px] rounded cursor-pointer transition-colors duration-100";
const dayCellHover = "hover:bg-zinc-100";
const dayCellToday = "text-red-700 border border-red-700";
const dayCellSelected = "bg-red-700 text-zinc-50 hover:bg-red-800";
const dayCellRangeMid = "bg-red-100 text-red-800 rounded-none";
const dayCellRangeStart = "bg-red-700 text-zinc-50 rounded-l rounded-r-none";
const dayCellRangeEnd = "bg-red-700 text-zinc-50 rounded-r rounded-l-none";
const dayCellOtherMonth = "text-zinc-400";
const dayCellDisabled = "text-zinc-300 cursor-not-allowed hover:bg-transparent";

// ═══ FOOTER ═══
const calFooter = "flex items-center justify-between mt-2 pt-2 border-t border-zinc-200";
const calFooterBtn = "text-[12px] text-red-700 hover:text-red-800 cursor-pointer font-medium";
```

---

# COMPONENT: Textarea (CMP-TXT)

## Mô tả
Trường nhập văn bản nhiều dòng. Dùng cho: ghi chú Case, mô tả kịch bản, lý do từ chối, phản hồi. Visual style đồng bộ với CMP-INPUT.

## Variants
default | resizable

## Props
| Prop        | Type                      | Default   | Mô tả                                   |
|-------------|---------------------------|-----------|------------------------------------------|
| label       | string                    | undefined | Label phía trên                          |
| placeholder | string                    | ''        | Placeholder                              |
| value       | string                    | —         | Controlled value                         |
| onChange    | (value: string) => void   | —         | Change handler                           |
| onBlur      | () => void                | undefined | Blur handler                             |
| error       | string                    | undefined | Error message                            |
| helperText  | string                    | undefined | Helper text                              |
| disabled    | boolean                   | false     | Vô hiệu hoá                              |
| required    | boolean                   | false     | Dấu * đỏ                                |
| rows        | number                    | 4         | Số dòng mặc định                         |
| maxLength   | number                    | undefined | Giới hạn ký tự (hiện counter)            |
| resizable   | boolean                   | false     | Cho phép kéo resize dọc                  |
| id          | string                    | auto-gen  | HTML id                                  |
| className   | string                    | undefined | Custom classes                           |

## States
| State    | Border        | Background | Ring           |
|----------|---------------|------------|----------------|
| default  | 1px #d4d4d8   | #ffffff    | —              |
| hover    | 1px #71717a   | #ffffff    | —              |
| focus    | 1px #b91c1c   | #ffffff    | 2px #b91c1c/15 |
| disabled | 1px #e4e4e7   | #f4f4f5    | —              |
| error    | 1px #b91c1c   | #fef2f2    | 2px #b91c1c/15 |

## Layout
```
┌─────────────────────────────────────────────────────┐
│ [Label text] [* đỏ nếu required]                    │
├─────────────────────────────────────────────────────┤
│ textarea content                                     │
│                                                      │  ← rows x line-height
│                                                      │
├─────────────────────────────────────────────────────┤
│ [error/helper text]              [0/500 ký tự]       │  ← maxLength counter
└─────────────────────────────────────────────────────┘
```

## Behavior
- `maxLength` → hiện counter góc dưới phải: "[current]/[max] ký tự"
- Counter color: text-zinc-400 bình thường, text-amber-800 khi ≥ 90%, text-red-700 khi đạt max
- `resizable=true` → `resize-y`, `resizable=false` → `resize-none`
- Error / helper text: giống CMP-INPUT — error ưu tiên hơn

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "flex flex-col gap-1";

// ═══ LABEL (giống CMP-INPUT) ═══
const label = "text-xs font-medium text-zinc-800";
const requiredMark = "text-red-700 ml-0.5";

// ═══ TEXTAREA BASE ═══
const textarea = `
  w-full px-3 py-2 text-[13px] text-zinc-900 bg-white
  border border-zinc-300 rounded font-sans
  placeholder:text-zinc-400
  transition-colors duration-150
  hover:border-zinc-500
  focus:border-red-700 focus:ring-2 focus:ring-red-700/15 focus:outline-none
  disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed
`;
const textareaResize = "resize-y";
const textareaNoResize = "resize-none";
const textareaError = "border-red-700 bg-red-50";

// ═══ FOOTER ROW (error/helper + counter) ═══
const footerRow = "flex items-start justify-between mt-1";
const errorText = "text-xs text-red-700";
const helperText = "text-xs text-zinc-500";
const charCounter = "text-xs text-zinc-400 ml-auto";
const charCounterWarn = "text-amber-800";
const charCounterMax = "text-red-700";
```

---

# COMPONENT: FileUpload (CMP-FILE)

## Mô tả
Upload tài liệu và ảnh. Dùng cho: đính kèm tài liệu hồ sơ, ảnh thực địa (mobile camera), ảnh chụp Case note. Hỗ trợ drag-and-drop, multiple files, preview ảnh, và chụp camera trên mobile.

## Variants
default | camera

| Variant | Dùng khi                                              |
|---------|-------------------------------------------------------|
| default | Upload tài liệu/ảnh từ máy tính (drag & drop)        |
| camera  | Chụp ảnh từ camera mobile browser (HTML5 Media Capture) |

## Layout

```
Default (drag & drop zone):
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                                                      │
│           [Upload icon — h-8 w-8 zinc-400]          │  ← dashed border
│                                                      │    border-zinc-300
│      Kéo thả file vào đây hoặc nhấn để chọn        │    rounded
│      PDF, DOCX, JPG, PNG — tối đa 10MB             │    bg-zinc-50
│                                                      │    hover: border-zinc-400
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘    bg-zinc-100

Dragging over:
  border: 2px dashed #b91c1c, bg-red-50

File list (dưới drop zone):
┌────────────────────────────────────────────────┐
│ [📄] ban-an-2024.pdf    1.2 MB          [✕]   │  ← h-10, border-b zinc-100
│ [🖼] hien-truong.jpg    340 KB   [👁]   [✕]   │     preview cho ảnh
│ [📄] quyet-dinh.docx    890 KB          [✕]   │
└────────────────────────────────────────────────┘

Camera (mobile):
┌────────────────────────────────────────────────┐
│         [📷 Camera icon — h-8 w-8]            │
│                                                 │
│          Chụp ảnh từ camera                    │
│          GPS + Timestamp tự động               │
│                                                 │
│          [Chụp ảnh]  CMP-BTN outline          │
└────────────────────────────────────────────────┘
```

## Props
| Prop           | Type                           | Default   | Mô tả                                    |
|----------------|--------------------------------|-----------|-------------------------------------------|
| label          | string                         | undefined | Label phía trên                           |
| variant        | 'default' \| 'camera'          | 'default' | Loại upload                               |
| accept         | string                         | '.pdf,.docx,.jpg,.png' | File types cho phép  |
| maxSize        | number                         | 10485760  | Max file size (bytes, default 10MB)       |
| multiple       | boolean                        | true      | Cho phép nhiều file                       |
| files          | File[]                         | []        | Danh sách file đã chọn                    |
| onChange       | (files: File[]) => void        | —         | Handler file change                       |
| onRemove       | (index: number) => void        | —         | Handler xoá file                          |
| error          | string                         | undefined | Error message                             |
| disabled       | boolean                        | false     | Vô hiệu hoá                               |
| required       | boolean                        | false     | Dấu * đỏ                                 |
| showPreview    | boolean                        | true      | Hiện thumbnail cho ảnh                    |
| className      | string                         | undefined | Custom classes                            |

## Behavior
- `variant=default`: click → mở file picker HOẶC drag file vào zone
- `variant=camera`: click → mở camera native (HTML5 `<input type="file" capture="environment">`)
- Camera variant tự gắn metadata: GPS (navigator.geolocation), timestamp (Date.now()), tên cán bộ (từ auth context)
- File validation: kiểm tra type + size ngay client-side, hiện error nếu không hợp lệ
- Preview: ảnh .jpg/.png hiện thumbnail 40x40 trong file list
- Multiple: mỗi file 1 row trong list, click X để remove
- Drag state: border chuyển đỏ dashed, bg chuyển red-50

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "flex flex-col gap-1";

// ═══ DROP ZONE ═══
const dropZone = `
  w-full py-6 px-4
  border-2 border-dashed border-zinc-300 rounded
  bg-zinc-50
  flex flex-col items-center justify-center gap-2
  cursor-pointer
  transition-colors duration-150
  hover:border-zinc-400 hover:bg-zinc-100
`;
const dropZoneDragging = "border-red-700 bg-red-50";
const dropZoneDisabled = "opacity-50 cursor-not-allowed hover:border-zinc-300 hover:bg-zinc-50";

const dropIcon = "h-8 w-8 text-zinc-400";
const dropText = "text-[13px] text-zinc-600 text-center";
const dropHint = "text-[11px] text-zinc-400";

// ═══ CAMERA ZONE ═══
const cameraZone = `
  w-full py-6 px-4
  border border-zinc-200 rounded
  bg-zinc-50
  flex flex-col items-center justify-center gap-3
`;
const cameraIcon = "h-8 w-8 text-zinc-400";
const cameraText = "text-[13px] text-zinc-600 text-center";
const cameraHint = "text-[11px] text-zinc-400";
// Camera button: CMP-BTN variant=outline size=sm

// ═══ FILE LIST ═══
const fileList = "mt-2";
const fileItem = `
  h-10 px-3
  flex items-center gap-3
  border-b border-zinc-100
  text-[13px] text-zinc-900
`;
const fileIcon = "h-5 w-5 text-zinc-400 flex-shrink-0";
const fileName = "flex-1 truncate";
const fileSize = "text-[11px] text-zinc-400 flex-shrink-0";
const filePreview = "h-8 w-8 rounded object-cover flex-shrink-0";
const filePreviewBtn = "h-4 w-4 text-zinc-400 hover:text-zinc-600 cursor-pointer";
const fileRemoveBtn = "h-4 w-4 text-zinc-400 hover:text-red-700 cursor-pointer";

// ═══ ERROR TEXT ═══
const errorText = "text-xs text-red-700 mt-1";
```

---

# COMPONENT: Checkbox (CMP-CHK)

## Mô tả
Ô chọn nhiều giá trị hoặc toggle on/off. Dùng trong: table row selection, form multi-choice, settings toggle. Visual style compact, đồng bộ màu đỏ khi checked.

## Variants
default | indeterminate

## States
| State          | Border      | Background  | Check color | Cursor      |
|----------------|-------------|-------------|-------------|-------------|
| unchecked      | 1px #d4d4d8 | #ffffff     | —           | pointer     |
| hover          | 1px #b91c1c | #ffffff     | —           | pointer     |
| checked        | —           | #b91c1c     | #fafafa     | pointer     |
| indeterminate  | —           | #b91c1c     | #fafafa (—) | pointer     |
| disabled       | 1px #e4e4e7 | #f4f4f5     | #a1a1aa     | not-allowed |
| disabled+checked | —         | #d4d4d8     | #fafafa     | not-allowed |
| error          | 1px #b91c1c | #ffffff     | —           | pointer     |

## Layout
```
[☐/☑] [Label text]                     ← inline-flex items-center gap-2
        [Helper text / Error text]       ← text-xs, ml-6 (indent under label)
```

## Props
| Prop          | Type                    | Default   | Mô tả                              |
|---------------|-------------------------|-----------|--------------------------------------|
| checked       | boolean                 | false     | Trạng thái checked                  |
| indeterminate | boolean                 | false     | Trạng thái trung gian (select all)  |
| onChange      | (checked: boolean) => void | —      | Change handler                      |
| label         | string                  | undefined | Label bên phải checkbox             |
| helperText    | string                  | undefined | Helper text dưới label              |
| error         | string                  | undefined | Error text                          |
| disabled      | boolean                 | false     | Vô hiệu hoá                         |
| id            | string                  | auto-gen  | HTML id                             |
| className     | string                  | undefined | Custom classes                      |

## Behavior
- Click label hoặc checkbox → toggle checked
- `indeterminate` → hiện dấu "—" thay check mark (dùng cho "select all" trong table khi chọn 1 phần)
- Error: border checkbox chuyển đỏ, hiện error text

## Accessibility
- `<input type="checkbox">` native
- `<label htmlFor={id}>` liên kết
- `aria-checked="mixed"` khi indeterminate
- `aria-invalid="true"` khi error
- Space key toggle

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "inline-flex items-start gap-2";

// ═══ CHECKBOX ═══
const checkbox = `
  h-4 w-4 rounded-[2px]
  border border-zinc-300
  text-red-700
  transition-colors duration-150
  cursor-pointer
  focus:ring-2 focus:ring-red-700/20 focus:ring-offset-0 focus:outline-none
`;
const checkboxChecked = "bg-red-700 border-red-700";
const checkboxDisabled = "border-zinc-200 bg-zinc-100 cursor-not-allowed";
const checkboxDisabledChecked = "bg-zinc-300 border-zinc-300";
const checkboxError = "border-red-700";

// ═══ LABEL ═══
const label = "text-[13px] text-zinc-900 cursor-pointer select-none";
const labelDisabled = "text-zinc-400 cursor-not-allowed";

// ═══ HELPER / ERROR TEXT ═══
const helperText = "text-xs text-zinc-500 ml-6 mt-0.5";
const errorText = "text-xs text-red-700 ml-6 mt-0.5";
```

---

# COMPONENT: Radio (CMP-RAD)

## Mô tả
Chọn một giá trị trong nhóm. Dùng cho: chọn mức độ Alert, chọn loại kịch bản, chọn hành động xử lý. Visual style compact, đồng bộ màu đỏ.

## States
| State          | Border      | Background  | Dot color   | Cursor      |
|----------------|-------------|-------------|-------------|-------------|
| unchecked      | 2px #d4d4d8 | #ffffff     | —           | pointer     |
| hover          | 2px #b91c1c | #ffffff     | —           | pointer     |
| checked        | 2px #b91c1c | #ffffff     | #b91c1c     | pointer     |
| disabled       | 2px #e4e4e7 | #f4f4f5     | —           | not-allowed |
| disabled+checked | 2px #d4d4d8 | #ffffff   | #a1a1aa     | not-allowed |

## Layout
```
Radio Group (vertical):
  ( ) Mức THẤP                      ← gap-3 giữa các options
  (●) Mức TRUNG BÌNH                ← selected: dot đỏ bên trong
  ( ) Mức CAO
  ( ) Mức KHẨN CẤP

Radio Group (horizontal):
  ( ) Quản lý   (●) Alert           ← gap-6, flex-row
```

## Props — RadioGroup
| Prop       | Type                          | Default    | Mô tả                          |
|------------|-------------------------------|------------|---------------------------------|
| name       | string                        | —          | HTML name (nhóm)               |
| value      | string                        | —          | Giá trị đang chọn (controlled) |
| onChange   | (value: string) => void       | —          | Change handler                  |
| options    | Array<{value, label, disabled?}> | —       | Danh sách options               |
| direction  | 'vertical' \| 'horizontal'    | 'vertical' | Hướng sắp xếp                 |
| label      | string                        | undefined  | Label cho cả group              |
| error      | string                        | undefined  | Error text                      |
| disabled   | boolean                       | false      | Disable toàn group              |
| className  | string                        | undefined  | Custom classes                  |

## Behavior
- Click label hoặc radio → select option đó, deselect các option khác
- Disabled option: không click được nhưng vẫn hiện
- Error: hiện error text dưới group

## Accessibility
- `role="radiogroup"` cho wrapper
- `<input type="radio">` native cho mỗi option
- `<label htmlFor>` liên kết
- Arrow Up/Down di chuyển selection trong group

## Tailwind classes
```tsx
// ═══ GROUP WRAPPER ═══
const group = "flex flex-col gap-1";
const groupLabel = "text-xs font-medium text-zinc-800 mb-1";

// ═══ OPTIONS CONTAINER ═══
const optionsVertical = "flex flex-col gap-3";
const optionsHorizontal = "flex flex-row gap-6";

// ═══ OPTION WRAPPER ═══
const option = "inline-flex items-center gap-2 cursor-pointer";
const optionDisabled = "cursor-not-allowed opacity-60";

// ═══ RADIO CIRCLE ═══
const radio = `
  h-4 w-4 rounded-full
  border-2 border-zinc-300
  flex items-center justify-center
  transition-colors duration-150
  cursor-pointer
`;
const radioHover = "hover:border-red-700";
const radioChecked = "border-red-700";
const radioDisabled = "border-zinc-200 bg-zinc-100 cursor-not-allowed";

// ═══ RADIO DOT (inner, khi checked) ═══
const radioDot = "h-2 w-2 rounded-full bg-red-700";
const radioDotDisabled = "bg-zinc-400";

// ═══ LABEL ═══
const label = "text-[13px] text-zinc-900 select-none";
const labelDisabled = "text-zinc-400";

// ═══ ERROR TEXT ═══
const errorText = "text-xs text-red-700 mt-1";
```

---

# TỔNG KẾT ĐỢT 3

## Checklist hoàn thiện

| Component    | Mã        | Variants | States (hex) | Props  | Tailwind | Status |
|--------------|-----------|----------|--------------|--------|----------|--------|
| Toast        | CMP-TOAST | 4        | ✅ 4 variant colors + duration | ✅ 5 props | ✅ | Done |
| Modal        | CMP-MODAL | 3 sizes  | ✅ 4 states (open/close anim) | ✅ 10 props | ✅ | Done |
| Confirm      | CMP-CFIRM | 2        | ✅ + SMTTS mapping 6 hành động | ✅ 11 props | ✅ | Done |
| DatePicker   | CMP-DATE  | 2        | ✅ 7 day cell states | ✅ 14 props | ✅ | Done |
| Textarea     | CMP-TXT   | 2        | ✅ 5 states | ✅ 12 props | ✅ | Done |
| FileUpload   | CMP-FILE  | 2        | ✅ drag/camera states | ✅ 13 props | ✅ | Done |
| Checkbox     | CMP-CHK   | 2        | ✅ 7 states | ✅ 9 props | ✅ | Done |
| Radio        | CMP-RAD   | —        | ✅ 5 states | ✅ 9 group props | ✅ | Done |

## Ví dụ cách dùng khi viết Screen Spec

```
SCR-001 (Đăng nhập)     → CMP-BTN + CMP-INPUT                  (từ batch1)
SCR-022 (Thêm hồ sơ)    → CMP-BTN + CMP-INPUT + CMP-SEL + CMP-DATE + CMP-TXT + CMP-CHK
SCR-051 (Chi tiết Case)  → CMP-BTN + CMP-TXT + CMP-FILE (camera) + CMP-CFIRM (đóng case)
SCR-041 (Chi tiết Alert) → CMP-BTN + CMP-CFIRM (escalate) + CMP-TOAST
SCR-061 (Xét duyệt)     → CMP-BTN + CMP-TXT + CMP-CFIRM (duyệt/từ chối) + CMP-TOAST
```

## Đợt tiếp theo

```
Đợt 4 — Display: CMP-CARD, CMP-STAT, CMP-EMPTY, CMP-LOAD, CMP-TLINE, CMP-TAG,
                  CMP-AVT, CMP-TABS, CMP-DRAWER, CMP-FILTER
Đợt 5 — Domain:  CMP-MAP, CMP-NOTES, CMP-ALVL, CMP-ESCINFO, CMP-CAMERA,
                  CMP-QBUILD, CMP-GEOEDIT
```
