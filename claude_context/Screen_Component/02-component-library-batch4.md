# 02 — COMPONENT LIBRARY (ĐỢT 4: DISPLAY)
# Hệ thống SMTTS — Subject Management, Tracking & Tracing System
# Design language: Đỏ-Đen · Nghiêm túc · Gov-style · Compact
# Phiên bản: 1.0 | Ngày: 15/03/2026

---

> **File này chứa 10 Display components.**
> Khi viết screen spec, chỉ paste component mà màn đó dùng.

---

# COMPONENT: Card (CMP-CARD)

## Mô tả
Khung chứa nội dung chung. Dùng để nhóm thông tin trong detail view, form sections, dashboard panels. Không shadow — chỉ dùng border 1px zinc-200. Là building block cơ bản nhất cho mọi màn detail.

## Variants
default | outline-only

| Variant      | Background | Border         | Shadow | Dùng cho                           |
|--------------|------------|----------------|--------|------------------------------------|
| default      | #ffffff    | 1px #e4e4e7    | —      | Card thông tin, form section       |
| outline-only | transparent| 1px #e4e4e7    | —      | Nhóm nhẹ, không cần bg riêng      |

## Layout

```
┌─────────────────────────────────────────────────────┐
│ [Card Title]                       [Action icon?]    │  ← header (nếu có): px-4 py-3 border-b
├─────────────────────────────────────────────────────┤
│                                                      │
│ {children}                                           │  ← body: px-4 py-3
│                                                      │
└─────────────────────────────────────────────────────┘

Card padding: 14px 16px (system-spec card-padding)
Border-radius: 4px (rounded)
```

## Props
| Prop       | Type        | Default   | Mô tả                                  |
|------------|-------------|-----------|------------------------------------------|
| title      | string      | undefined | Tiêu đề card (header)                  |
| titleAction| ReactNode   | undefined | Action button/icon ở header bên phải    |
| variant    | 'default' \| 'outline-only' | 'default' | Visual variant           |
| children   | ReactNode   | —         | Nội dung body                           |
| noPadding  | boolean     | false     | Bỏ padding body (cho table bên trong)   |
| className  | string      | undefined | Custom classes                          |

## Tailwind classes
```tsx
// ═══ CARD ═══
const card = "bg-white border border-zinc-200 rounded";
const cardOutlineOnly = "bg-transparent border border-zinc-200 rounded";

// ═══ HEADER (nếu có title) ═══
const header = "px-4 py-3 border-b border-zinc-200 flex items-center justify-between";
const headerTitle = "text-[13px] font-semibold text-zinc-900";
const headerAction = "flex-shrink-0";

// ═══ BODY ═══
const body = "px-4 py-3";
const bodyNoPadding = "p-0";
```

---

# COMPONENT: StatCard (CMP-STAT)

## Mô tả
Thẻ số liệu tổng quan trên Dashboard. Hiển thị 1 metric chính (số + label). Hỗ trợ variant alert cho số liệu cần chú ý (viền đỏ). Dùng thành hàng 4 cột (desktop) / 2 cột (tablet) / 1 cột (mobile).

## Variants
default | alert

| Variant | Border-left    | Dùng khi                                        |
|---------|----------------|-------------------------------------------------|
| default | —              | Tổng đối tượng, Compliance %, Case đóng          |
| alert   | 3px #b91c1c    | Alert đang mở, Case đang mở, số liệu cần chú ý |

## Layout

```
Default:                          Alert:
┌────────────────────────┐        ┌────────────────────────┐
│ Tổng đối tượng         │        │▌Alert đang mở          │  ← border-left 3px red
│                        │        │▌                       │
│ 156                    │        │▌ 12                    │
│ ↑ 3 so với tháng trước │        │▌ ↑ 5 hôm nay          │
└────────────────────────┘        └────────────────────────┘

Label:   text-[12px] text-zinc-500
Value:   text-[24px] font-semibold text-zinc-900
Change:  text-[11px] — xanh nếu tốt, đỏ nếu xấu
```

## Props
| Prop      | Type                    | Default   | Mô tả                                |
|-----------|-------------------------|-----------|---------------------------------------|
| label     | string                  | —         | Tên metric (VD: "Tổng đối tượng")   |
| value     | string \| number        | —         | Giá trị chính (VD: 156)              |
| change    | string                  | undefined | Thay đổi (VD: "↑ 3 so với tháng trước") |
| changeType| 'positive' \| 'negative' \| 'neutral' | 'neutral' | Màu change text |
| variant   | 'default' \| 'alert'    | 'default' | Visual variant                        |
| icon      | ReactNode               | undefined | Icon bên trái label                  |
| onClick   | () => void              | undefined | Click navigate (VD: click Alert → /alerts) |
| className | string                  | undefined | Custom classes                        |

## Tailwind classes
```tsx
// ═══ CARD ═══
const statCard = "bg-white border border-zinc-200 rounded px-4 py-3";
const statCardAlert = "bg-white border border-zinc-200 rounded px-4 py-3 border-l-[3px] border-l-red-700";
const statCardClickable = "cursor-pointer hover:bg-zinc-50 transition-colors duration-150";

// ═══ LABEL ═══
const label = "text-[12px] text-zinc-500 flex items-center gap-1.5";
const labelIcon = "h-4 w-4 text-zinc-400";

// ═══ VALUE ═══
const value = "text-[24px] font-semibold text-zinc-900 mt-1";

// ═══ CHANGE ═══
const change = "text-[11px] mt-1";
const changePositive = "text-green-800";
const changeNegative = "text-red-700";
const changeNeutral = "text-zinc-400";

// ═══ STATS ROW (container cho nhiều StatCards) ═══
const statsRow = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4";
```

---

# COMPONENT: Empty State (CMP-EMPTY)

## Mô tả
Hiển thị khi danh sách / table không có dữ liệu. Mọi list/table trong SMTTS PHẢI có empty state. Gồm icon + title + mô tả + CTA button (nếu user có quyền tạo mới).

## Layout

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              [📋 icon — h-12 w-12 zinc-300]          │
│                                                      │
│           Chưa có hồ sơ nào                          │  ← title
│                                                      │
│    Nhấn "Thêm hồ sơ" để bắt đầu quản lý            │  ← subtitle
│                                                      │
│            [+ Thêm hồ sơ]                            │  ← CTA (nếu có)
│                                                      │
└──────────────────────────────────────────────────────┘

Center, py-12
```

## Mapping SMTTS

```
Hồ sơ:     icon=Users,          title="Chưa có hồ sơ nào",          sub="Nhấn 'Thêm hồ sơ' để bắt đầu"
Event:      icon=Activity,       title="Chưa có sự kiện nào",        sub="Chưa có sự kiện trong khoảng thời gian này"
Alert:      icon=AlertTriangle,  title="Không có cảnh báo đang mở",  sub="Hệ thống hoạt động bình thường"
Case:       icon=Briefcase,      title="Không có vụ việc đang mở",   sub=""
Yêu cầu:   icon=CheckSquare,    title="Không có yêu cầu chờ xử lý", sub=""
Kịch bản:   icon=Settings2,      title="Chưa có kịch bản nào",      sub="Tạo kịch bản để bắt đầu quản lý"
Tìm kiếm:  icon=Search,         title="Không tìm thấy kết quả",     sub="Thử thay đổi bộ lọc hoặc từ khoá"
Audit log:  icon=FileText,       title="Không có nhật ký",           sub=""
```

## Props
| Prop     | Type        | Default                 | Mô tả                          |
|----------|-------------|-------------------------|---------------------------------|
| icon     | ReactNode   | undefined               | Lucide icon component          |
| title    | string      | 'Chưa có dữ liệu'      | Tiêu đề                        |
| subtitle | string      | undefined               | Mô tả phụ / hướng dẫn         |
| action   | ReactNode   | undefined               | CTA button (CMP-BTN)           |

## Tailwind classes
```tsx
const wrapper = "py-12 flex flex-col items-center justify-center text-center";
const icon = "h-12 w-12 text-zinc-300 mb-3";
const title = "text-[15px] font-semibold text-zinc-900 mb-1";
const subtitle = "text-[13px] text-zinc-500 mb-4 max-w-[320px]";
const action = "";  // CMP-BTN variant=primary hoặc outline
```

---

# COMPONENT: Loading / Skeleton (CMP-LOAD)

## Mô tả
Trạng thái tải dữ liệu. Có 2 loại: spinner (cho button, inline) và skeleton (cho page content, table). Skeleton loader ưu tiên hơn spinner toàn màn — giữ cấu trúc layout để giảm layout shift.

## Variants
spinner | skeleton

## Spinner
```
Dùng cho: button loading, inline loading nhỏ
Size: sm(16px) | md(20px) | lg(32px)

Tailwind:
  "h-[size] w-[size] border-2 border-current border-t-transparent rounded-full animate-spin"
  Color: inherit từ parent (text-zinc-50 trong button primary, text-zinc-400 khi standalone)
```

## Skeleton Patterns

```
Page skeleton (dashboard, detail):
┌──────────────────────────────────────────────────────┐
│ [████████ 40%]                      [████ 15%]       │  ← PageHeader skeleton
├──────────────────────────────────────────────────────┤
│ [████ 25%] [████ 25%] [████ 25%] [████ 25%]        │  ← Stats row skeleton
├──────────────────────────────────────────────────────┤
│ [████████████████████████████████████████████████]    │  ← Table header skeleton
│ [████████ 60%]  [████ 30%]  [██ 15%]  [██ 10%]      │  ← Row 1
│ [██████ 50%]    [████ 35%]  [███ 20%] [██ 10%]      │  ← Row 2
│ [████████ 65%]  [███ 25%]   [██ 15%]  [██ 10%]      │  ← Row 3
│ [██████ 55%]    [████ 30%]  [██ 15%]  [██ 10%]      │  ← Row 4
│ [████████ 45%]  [████ 35%]  [███ 20%] [██ 10%]      │  ← Row 5
└──────────────────────────────────────────────────────┘

Mỗi skeleton bar: bg-zinc-200 rounded animate-pulse, height 12-14px
Vary width mỗi row để trông tự nhiên
```

## Props
| Prop    | Type                  | Default  | Mô tả                          |
|---------|-----------------------|----------|---------------------------------|
| variant | 'spinner' \| 'skeleton' | 'skeleton' | Loại loading                |
| size    | 'sm' \| 'md' \| 'lg' | 'md'     | Spinner size                    |
| rows    | number                | 5        | Số skeleton rows (table)       |
| type    | 'page' \| 'table' \| 'card' \| 'text' | 'table' | Skeleton pattern     |

## Tailwind classes
```tsx
// ═══ SPINNER ═══
const spinnerBase = "border-2 border-current border-t-transparent rounded-full animate-spin";
const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};
const spinnerColor = "text-zinc-400";  // standalone
// Trong button: inherit text color

// ═══ SKELETON BAR ═══
const skeletonBar = "bg-zinc-200 rounded animate-pulse";

// ═══ TABLE SKELETON ═══
const skeletonTableRow = "h-9 flex items-center gap-4 px-[10px] border-b border-zinc-100";
const skeletonCell = "h-3 bg-zinc-200 rounded animate-pulse";
// Width varies: w-[40%], w-[25%], w-[15%], w-[10%] etc.

// ═══ CARD SKELETON ═══
const skeletonCard = "bg-white border border-zinc-200 rounded px-4 py-3";
const skeletonCardTitle = "h-3 w-[40%] bg-zinc-200 rounded animate-pulse mb-3";
const skeletonCardLine = "h-3 bg-zinc-200 rounded animate-pulse mb-2";

// ═══ TEXT SKELETON ═══
const skeletonTextLine = "h-3 bg-zinc-200 rounded animate-pulse mb-2";
// Last line: w-[60%]

// ═══ PAGE SKELETON ═══
const skeletonPageHeader = "h-6 w-[30%] bg-zinc-200 rounded animate-pulse mb-4";
const skeletonStatsRow = "grid grid-cols-4 gap-3 mb-4";
const skeletonStatCard = "h-[80px] bg-zinc-200 rounded animate-pulse";
```

---

# COMPONENT: Timeline (CMP-TLINE)

## Mô tả
Lịch sử sự kiện theo trục thời gian dọc. Dùng trong: SCR-070 (Timeline View), SCR-021 (tab Timeline hồ sơ), SCR-041 (lịch sử xử lý Alert), SCR-051 (Case timeline). Mỗi entry gồm timestamp + icon loại + nội dung + liên kết.

## Layout

```
│
├── 15/03/2026 09:47                              ← ngày giờ
│   ● [Event] Trình báo thành công                ← dot + type badge + title
│     GPS: 10.762, 106.682 — Trong geofence       ← detail text
│     Face match: 94.2%                            ← detail text
│
├── 14/03/2026 15:30
│   ▲ [Alert] Face mismatch liên tiếp — CAO       ← alert = triangle icon
│     Rule: D2 — Face mismatch ≥ 3 lần
│     → Escalated by: Nguyễn Văn B                ← link to Case
│
├── 14/03/2026 15:31
│   ■ [Case] Case #CS-2024-089 — Mở              ← case = square icon
│     Tạo bởi: Nguyễn Văn B (thủ công)
│     [Xem Case →]
│
├── 10/03/2026 08:00
│   ○ [Kịch bản] Gán "Quản chế Cơ bản"          ← kịch bản = circle outline
│     Bởi: Trần Thị C
│
│

Timeline line: 2px solid zinc-200, left offset 8px
Dot: 8x8, trên line, màu theo loại
```

## Entry Types & Colors

| Type        | Dot shape | Dot color | Badge variant | Icon      |
|-------------|-----------|-----------|---------------|-----------|
| event       | ● circle  | #1e40af   | info          | Activity  |
| event-error | ● circle  | #b91c1c   | urgent        | XCircle   |
| alert       | ▲ triangle| #854d0e   | warning       | AlertTriangle |
| alert-critical | ▲ triangle | #b91c1c | urgent     | AlertTriangle |
| case        | ■ square  | #18181b   | processing    | Briefcase |
| case-closed | ■ square  | #166534   | done          | CheckCircle |
| scenario    | ○ outline | #52525b   | pending       | Settings2 |
| request     | ◇ diamond | #52525b   | pending       | FileQuestion |
| system      | ★ star    | #71717a   | info          | Info      |

## Props
| Prop     | Type             | Default   | Mô tả                            |
|----------|------------------|-----------|-----------------------------------|
| entries  | TimelineEntry[]  | []        | Danh sách entries                 |
| loading  | boolean          | false     | Skeleton loading                  |
| empty    | ReactNode        | undefined | Empty state khi không có entries  |
| maxItems | number           | undefined | Giới hạn hiển thị + "Xem thêm"  |

## TimelineEntry Interface
```typescript
interface TimelineEntry {
  id: string;
  timestamp: string;         // ISO date
  type: 'event' | 'event-error' | 'alert' | 'alert-critical' | 'case' | 'case-closed' | 'scenario' | 'request' | 'system';
  title: string;             // VD: "Trình báo thành công"
  badge?: string;            // VD: "Event", "Alert CAO"
  details?: string[];        // Dòng detail bên dưới title
  link?: { label: string; href: string };  // VD: "Xem Case →"
  actor?: string;            // Tên người thực hiện
}
```

## Tailwind classes
```tsx
// ═══ TIMELINE CONTAINER ═══
const container = "relative";

// ═══ VERTICAL LINE ═══
const line = "absolute left-[7px] top-0 bottom-0 w-0.5 bg-zinc-200";

// ═══ ENTRY ═══
const entry = "relative pl-7 pb-6 last:pb-0";

// ═══ DOT (trên line) ═══
const dotBase = "absolute left-0 top-1 h-[14px] w-[14px] rounded-full border-2 border-white flex items-center justify-center";
const dotEvent = "bg-blue-800";
const dotEventError = "bg-red-700";
const dotAlert = "bg-amber-800";
const dotAlertCritical = "bg-red-700";
const dotCase = "bg-zinc-900";
const dotCaseClosed = "bg-green-800";
const dotScenario = "bg-transparent border-2 border-zinc-500";
const dotRequest = "bg-transparent border-2 border-zinc-500";
const dotSystem = "bg-zinc-500";

// ═══ TIMESTAMP ═══
const timestamp = "text-[11px] text-zinc-400 font-mono tabular-nums mb-0.5";

// ═══ TITLE ROW ═══
const titleRow = "flex items-center gap-2";
const title = "text-[13px] font-medium text-zinc-900";
// Badge: dùng CMP-BADGE size=sm

// ═══ DETAILS ═══
const detail = "text-[12px] text-zinc-500 mt-0.5 leading-relaxed";

// ═══ LINK ═══
const link = "text-[12px] text-red-700 hover:text-red-800 hover:underline mt-1 inline-block cursor-pointer";

// ═══ ACTOR ═══
const actor = "text-[11px] text-zinc-400 mt-0.5";

// ═══ SHOW MORE ═══
const showMore = "pl-7 pt-2";
const showMoreBtn = "text-[12px] text-red-700 hover:text-red-800 cursor-pointer font-medium";
```

---

# COMPONENT: Tag (CMP-TAG)

## Mô tả
Label phân loại nhỏ, compact hơn Badge. Dùng cho: loại đối tượng, loại event, nhãn filter đã chọn, tags kịch bản. Hỗ trợ removable (có nút X).

## Variants
default | removable

## Layout
```
Default:           Removable:
[Quản chế]         [Quản chế ✕]
```

## Props
| Prop      | Type          | Default   | Mô tả                    |
|-----------|---------------|-----------|---------------------------|
| children  | string        | —         | Text nội dung             |
| removable | boolean       | false     | Hiện nút X               |
| onRemove  | () => void    | undefined | Handler remove            |
| color     | string        | 'zinc'    | Color theme (zinc/red)    |
| className | string        | undefined | Custom classes            |

## Tailwind classes
```tsx
const tag = `
  inline-flex items-center gap-1
  h-[22px] px-2
  text-[11px] font-medium font-sans
  rounded-[2px] select-none whitespace-nowrap
`;
const tagDefault = "bg-zinc-100 text-zinc-700";
const tagRed = "bg-red-50 text-red-800";
const removeBtn = "h-3 w-3 text-zinc-400 hover:text-zinc-600 cursor-pointer ml-0.5";
```

---

# COMPONENT: Avatar (CMP-AVT)

## Mô tả
Ảnh đại diện hoặc initials. Dùng trong: Topbar (user hiện tại), table cột cán bộ, Case note thread (tác giả ghi chú), detail hồ sơ. Nền tối (zinc-800), chữ sáng.

## Sizes
| Size | Dimension | Font  | Tailwind     | Dùng cho                  |
|------|-----------|-------|--------------|---------------------------|
| sm   | 24x24     | 10px  | h-6 w-6     | Table row, inline         |
| md   | 28x28     | 11px  | h-7 w-7     | Topbar, list item         |
| lg   | 36x36     | 13px  | h-9 w-9     | Detail, profile           |
| xl   | 48x48     | 15px  | h-12 w-12   | Hồ sơ đối tượng header   |

## Props
| Prop     | Type      | Default   | Mô tả                          |
|----------|-----------|-----------|---------------------------------|
| src      | string    | undefined | URL ảnh (nếu có)               |
| initials | string    | —         | Initials fallback (VD: "NV")   |
| size     | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Kích thước          |
| alt      | string    | ''        | Alt text cho ảnh               |

## Tailwind classes
```tsx
const avatarBase = "rounded flex items-center justify-center font-semibold font-sans flex-shrink-0 select-none";
const avatarBg = "bg-zinc-800 text-zinc-50";

const sizes = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[11px]",
  lg: "h-9 w-9 text-[13px]",
  xl: "h-12 w-12 text-[15px]",
};

const image = "rounded object-cover";
// Image size matches avatar size: h-6 w-6 / h-7 w-7 / h-9 w-9 / h-12 w-12
```

---

# COMPONENT: Tabs (CMP-TABS)

## Mô tả
Chuyển đổi nội dung trong cùng 1 màn hình. Dùng trong: SCR-021 (chi tiết hồ sơ — 6 tabs), SCR-050 (Case Mở / Đóng), SCR-090 (Kịch bản QL / Alert). Tab dạng underline compact, đồng bộ màu đỏ cho active.

## Layout

```
┌──────────────────────────────────────────────────────┐
│ [Thông tin] [Kịch bản] [Timeline] [Tài liệu] [TB]   │
│  ═══════                                              │  ← active: border-b 2px red-700
│  border-b 1px zinc-200 toàn thanh                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ {Tab content hiện tại}                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Tab Item States
| State    | Text       | Border-bottom    | Background  |
|----------|------------|------------------|-------------|
| default  | #71717a    | —                | transparent |
| hover    | #09090b    | —                | transparent |
| active   | #b91c1c    | 2px #b91c1c     | transparent |
| disabled | #a1a1aa    | —                | transparent |

## Props
| Prop       | Type                            | Default   | Mô tả                    |
|------------|---------------------------------|-----------|---------------------------|
| tabs       | Array<{key, label, disabled?, count?}> | — | Danh sách tabs           |
| activeTab  | string                          | —         | Key tab đang active       |
| onChange   | (key: string) => void           | —         | Handler chuyển tab        |
| children   | ReactNode                       | —         | Nội dung tab active       |
| className  | string                          | undefined | Custom classes            |

## Behavior
- Click tab → chuyển activeTab, render content mới
- `count` → hiện badge số bên cạnh label (VD: "Alert (12)")
- Tab nhiều trên mobile → horizontal scroll (overflow-x-auto, không wrap)
- Không lazy load mặc định — render tab content khi active

## Tailwind classes
```tsx
// ═══ TAB LIST ═══
const tabList = "flex border-b border-zinc-200 overflow-x-auto scrollbar-none";

// ═══ TAB ITEM ═══
const tabItem = `
  px-4 py-2.5
  text-[13px] font-medium
  cursor-pointer select-none whitespace-nowrap
  transition-colors duration-150
  border-b-2 border-transparent
  -mb-px
`;
const tabItemDefault = "text-zinc-500 hover:text-zinc-900";
const tabItemActive = "text-red-700 border-b-red-700";
const tabItemDisabled = "text-zinc-400 cursor-not-allowed";

// ═══ TAB COUNT BADGE ═══
const tabCount = "ml-1.5 text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-px rounded-[2px] font-semibold";
const tabCountActive = "bg-red-50 text-red-700";

// ═══ TAB CONTENT ═══
const tabContent = "pt-4";
```

---

# COMPONENT: Drawer (CMP-DRAWER)

## Mô tả
Panel trượt từ bên phải. Dùng cho: xem chi tiết nhanh (click row table → drawer hiện detail thay vì navigate), filter nâng cao, form nhanh. Nhẹ hơn Modal — không lock toàn bộ page, chỉ overlay phần content.

## Sizes
| Size | Width  | Dùng cho                          |
|------|--------|-----------------------------------|
| sm   | 320px  | Quick preview, filter panel       |
| md   | 480px  | Detail view, form đơn giản        |

## Layout

```
┌──────────────────────────────┬────────────────────────┐
│ PAGE CONTENT (behind)        │ DRAWER                 │
│ (backdrop: bg-black/30)      │ bg-white, shadow-lg    │
│                              │                        │
│                              │ ┌──────────────────┐  │
│                              │ │ HEADER     [✕]   │  │  ← border-b
│                              │ │ [Title]          │  │
│                              │ └──────────────────┘  │
│                              │ ┌──────────────────┐  │
│                              │ │ BODY             │  │  ← overflow-y-auto
│                              │ │ {children}       │  │
│                              │ │                  │  │
│                              │ └──────────────────┘  │
│                              │ ┌──────────────────┐  │
│                              │ │ FOOTER?          │  │  ← optional
│                              │ │ [Buttons]        │  │
│                              │ └──────────────────┘  │
│                              │                        │
└──────────────────────────────┴────────────────────────┘

Mobile (<640px): Drawer full-width
```

## Props
| Prop      | Type        | Default   | Mô tả                             |
|-----------|-------------|-----------|-------------------------------------|
| open      | boolean     | false     | Hiện/ẩn drawer                     |
| onClose   | () => void  | —         | Handler đóng                       |
| title     | string      | —         | Tiêu đề header                    |
| size      | 'sm' \| 'md' | 'md'    | Kích thước width                   |
| children  | ReactNode   | —         | Nội dung body                      |
| footer    | ReactNode   | undefined | Footer buttons                     |

## Behavior
- Mở: slide-in từ phải (200ms ease-out)
- Đóng: slide-out sang phải (150ms ease-in)
- Backdrop: click → đóng. Escape → đóng.
- Body overflow-y: scroll riêng
- Mobile: full-width, vẫn slide từ phải

## Tailwind classes
```tsx
// ═══ BACKDROP ═══
const backdrop = "fixed inset-0 z-[250] bg-black/30";

// ═══ DRAWER CONTAINER ═══
const drawer = "fixed inset-y-0 right-0 z-[300] bg-white shadow-lg flex flex-col";
const drawerSizes = {
  sm: "w-[320px]",
  md: "w-[480px]",
};
const drawerMobile = "w-full";

// ═══ ENTER / EXIT ═══
const drawerEnter = "animate-[slideInRight_200ms_ease-out]";
const drawerExit = "animate-[slideOutRight_150ms_ease-in]";

// ═══ HEADER ═══
const header = "px-5 py-4 border-b border-zinc-200 flex items-center justify-between flex-shrink-0";
const headerTitle = "text-[15px] font-semibold text-zinc-900";
const headerCloseBtn = "h-5 w-5 text-zinc-400 hover:text-zinc-600 cursor-pointer transition-colors";

// ═══ BODY ═══
const body = "flex-1 overflow-y-auto px-5 py-4";

// ═══ FOOTER ═══
const footer = "px-5 py-3 border-t border-zinc-200 flex items-center justify-end gap-2 flex-shrink-0";
```

---

# COMPONENT: FilterBar (CMP-FILTER)

## Mô tả
Thanh lọc dữ liệu nằm giữa PageHeader và Table/Content. Chứa search input + select filters + date range + nút lọc. Là component composite dùng CMP-INPUT (search), CMP-SEL, CMP-DATE từ batch trước.

## Layout

```
Desktop (1 dòng):
┌──────────────────────────────────────────────────────────────────┐
│ [🔍 Search ________] [Trạng thái ▼] [Loại ▼] [Từ — Đến] [Lọc]  │
│                                                                   │
│ flex items-center gap-2, mb-3                                    │
└──────────────────────────────────────────────────────────────────┘

Tablet/Mobile (wrap):
┌────────────────────────────────────────────────┐
│ [🔍 Search ________________________________]   │
│ [Trạng thái ▼]  [Loại ▼]  [Từ — Đến]  [Lọc]  │
└────────────────────────────────────────────────┘

Active filters (tags dưới FilterBar):
┌──────────────────────────────────────────────────────────────────┐
│ [Trạng thái: Đang QL ✕] [Loại: Quản chế ✕]  Xoá tất cả bộ lọc │
└──────────────────────────────────────────────────────────────────┘
```

## Props
| Prop          | Type                 | Default   | Mô tả                                  |
|---------------|----------------------|-----------|------------------------------------------|
| searchPlaceholder | string           | 'Tìm kiếm...' | Placeholder ô search             |
| searchValue   | string               | ''        | Giá trị search (controlled)              |
| onSearchChange | (value: string) => void | —    | Handler search                           |
| filters       | FilterConfig[]       | []        | Cấu hình các select/date filters        |
| filterValues  | Record<string, any>  | {}        | Giá trị đã chọn (controlled)            |
| onFilterChange | (key, value) => void | —        | Handler filter change                    |
| onApply       | () => void           | undefined | Handler nút Lọc (nếu cần apply manual) |
| onClearAll    | () => void           | undefined | Handler xoá tất cả filters              |
| showActiveFilters | boolean          | true      | Hiện tag active filters bên dưới        |
| className     | string               | undefined | Custom classes                           |

## FilterConfig Interface
```typescript
interface FilterConfig {
  key: string;                  // field key
  label: string;                // Display label
  type: 'select' | 'date-range' | 'multi-select';
  options?: Array<{value: string; label: string}>;  // cho select
  placeholder?: string;
  width?: string;               // VD: 'w-[180px]'
}
```

## Behavior
- Search: gõ text → debounce 300ms → trigger onSearchChange
- Select/Date: thay đổi → trigger onFilterChange ngay (hoặc chờ nút Lọc nếu onApply)
- Active filter tags: mỗi filter đang active hiện dạng CMP-TAG removable, click X → reset filter đó
- "Xoá tất cả bộ lọc" → reset mọi filter + search về default
- Responsive: search full-width, filters wrap dòng dưới

## Tailwind classes
```tsx
// ═══ CONTAINER ═══
const container = "mb-3";

// ═══ FILTER ROW ═══
const filterRow = "flex items-center gap-2 flex-wrap";

// ═══ SEARCH INPUT ═══
const searchInput = "w-[240px]";  // dùng CMP-INPUT type=search
const searchInputMobile = "w-full";

// ═══ FILTER SELECT ═══
const filterSelect = "w-[180px]";  // dùng CMP-SEL
// Mỗi filter chiếm cố định width theo config

// ═══ APPLY BUTTON ═══
// Dùng CMP-BTN variant=secondary size=sm, "Lọc"

// ═══ ACTIVE FILTERS ROW ═══
const activeFiltersRow = "flex items-center gap-2 mt-2 flex-wrap";
// Dùng CMP-TAG removable cho mỗi filter active

// ═══ CLEAR ALL ═══
const clearAll = "text-[12px] text-red-700 hover:text-red-800 cursor-pointer font-medium ml-2";
```

---

# TỔNG KẾT ĐỢT 4

## Checklist hoàn thiện

| Component  | Mã         | Variants    | Props  | Tailwind | Status |
|------------|------------|-------------|--------|----------|--------|
| Card       | CMP-CARD   | 2           | ✅ 6   | ✅       | Done   |
| StatCard   | CMP-STAT   | 2 + change  | ✅ 8   | ✅       | Done   |
| Empty State| CMP-EMPTY  | — + 8 SMTTS mappings | ✅ 4 | ✅ | Done   |
| Loading    | CMP-LOAD   | 2 (spinner+skeleton) | ✅ 4 | ✅ | Done   |
| Timeline   | CMP-TLINE  | 9 entry types | ✅ 4 + Entry interface | ✅ | Done |
| Tag        | CMP-TAG    | 2           | ✅ 5   | ✅       | Done   |
| Avatar     | CMP-AVT    | 4 sizes     | ✅ 4   | ✅       | Done   |
| Tabs       | CMP-TABS   | — + count badge | ✅ 5 | ✅     | Done   |
| Drawer     | CMP-DRAWER | 2 sizes     | ✅ 6   | ✅       | Done   |
| FilterBar  | CMP-FILTER | composite   | ✅ 9 + FilterConfig | ✅ | Done |

## Tổng tiến độ Component Library

```
✅ Đợt 1 (Foundation):  6 components — CMP-BTN, CMP-INPUT, CMP-SEL, CMP-BADGE, CMP-TABLE, CMP-PAGE
✅ Đợt 2 (Layout):      6 components — LAY-APP, LAY-AUTH, LAY-TOP, LAY-SIDE, LAY-HDR, CMP-BRD
✅ Đợt 3 (Feedback):    8 components — CMP-TOAST, CMP-MODAL, CMP-CFIRM, CMP-DATE, CMP-TXT, CMP-FILE, CMP-CHK, CMP-RAD
✅ Đợt 4 (Display):    10 components — CMP-CARD, CMP-STAT, CMP-EMPTY, CMP-LOAD, CMP-TLINE, CMP-TAG, CMP-AVT, CMP-TABS, CMP-DRAWER, CMP-FILTER
⬜ Đợt 5 (Domain):      7 components — CMP-MAP, CMP-NOTES, CMP-ALVL, CMP-ESCINFO, CMP-CAMERA, CMP-QBUILD, CMP-GEOEDIT
─────────────────────────────────
Đã xong: 30/37 components (81%)
```

## Ví dụ kết hợp cho Screen Spec

```
SCR-010 (Dashboard):
  LAY-HDR + CMP-STAT (4 cards) + CMP-TABLE + CMP-BADGE + CMP-LOAD (skeleton)

SCR-020 (DS Hồ sơ):
  LAY-HDR + CMP-FILTER + CMP-TABLE + CMP-BADGE + CMP-PAGE + CMP-EMPTY + CMP-LOAD

SCR-021 (Chi tiết hồ sơ):
  LAY-HDR + CMP-TABS (6 tabs) + CMP-CARD + CMP-BADGE + CMP-TLINE + CMP-AVT + CMP-TAG

SCR-051 (Chi tiết Case):
  LAY-HDR + CMP-CARD + CMP-BADGE + CMP-TLINE + CMP-AVT + CMP-DRAWER
```

## Đợt tiếp theo

```
Đợt 5 — Domain-specific:
  CMP-MAP, CMP-NOTES, CMP-ALVL, CMP-ESCINFO, CMP-CAMERA, CMP-QBUILD, CMP-GEOEDIT
```
