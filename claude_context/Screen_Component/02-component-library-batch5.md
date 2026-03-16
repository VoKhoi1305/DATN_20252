# 02 — COMPONENT LIBRARY (ĐỢT 5: DOMAIN-SPECIFIC)
# Hệ thống SMTTS — Subject Management, Tracking & Tracing System
# Design language: Đỏ-Đen · Nghiêm túc · Gov-style · Compact
# Phiên bản: 1.0 | Ngày: 15/03/2026

---

> **File này chứa 7 Domain-specific components — chỉ dùng trong SMTTS.**
> Các component này phụ thuộc vào components ở Đợt 1-4.

---

# COMPONENT: MapView (CMP-MAP)

## Mô tả
Google Maps wrapper cho toàn hệ thống. Dùng trong: SCR-080 (Bản đồ tương tác), SCR-071 (Spatial Trace), SCR-031 (mini map Event detail), SCR-081 (Geofence management). Hỗ trợ markers, geofence polygons, heatmap, layer toggle. Fallback OpenStreetMap nếu không có Google Maps API key.

## Layout

```
Full-size (SCR-080):
┌──────────────────────────────────────────────────────────┐
│ MAP (flex-1, chiếm toàn content area)                    │
│                                                          │
│  ┌──────────────────┐                                   │
│  │ LAYER TOGGLE     │  ← top-left overlay               │
│  │ ☑ Vị trí TB      │    bg-white border rounded         │
│  │ ☑ Geofence       │    shadow-sm, z-10                 │
│  │ ☐ Heatmap        │                                    │
│  │ ☐ Ranh giới HC   │                                    │
│  └──────────────────┘                                   │
│                                                          │
│               📍 marker                                  │
│            📍    📍                                      │
│     [geofence polygon — fill red-100/30, stroke red-700] │
│                                                          │
│                                         ┌──────────────┐│
│                                         │ ZOOM +/-     ││
│                                         └──────────────┘│
└──────────────────────────────────────────────────────────┘

Mini-size (SCR-031 Event detail):
┌──────────────────────────────┐
│ MAP (h-[200px], rounded)      │
│                               │
│          📍 marker            │
│    [geofence circle]          │
│                               │
└──────────────────────────────┘
```

## Marker Types

| Type             | Icon/Color      | Dùng khi                                      |
|------------------|-----------------|------------------------------------------------|
| report-success   | 📍 green-700    | Trình báo thành công, trong geofence           |
| report-outside   | 📍 amber-700    | Trình báo thành công, ngoài geofence           |
| report-fail      | 📍 red-700      | Trình báo thất bại (NFC/Face fail)             |
| subject-home     | 🏠 zinc-700     | Nơi cư trú đối tượng                           |
| alert-location   | ⚠ red-700       | Vị trí phát sinh Alert                         |
| selected         | 📍 zinc-900 (lớn)| Marker đang được chọn/highlight               |

## Geofence Display

```
Polygon / Circle:
  Fill:   rgba(185, 28, 28, 0.08)  — red-700 ở opacity rất thấp
  Stroke: #b91c1c (red-700), 2px
  Stroke (hover): #991b1b (red-800), 3px

Vùng cấm (nếu có):
  Fill:   rgba(185, 28, 28, 0.15)  — đậm hơn
  Stroke: #b91c1c, 2px dashed
```

## Props
| Prop           | Type                          | Default    | Mô tả                                  |
|----------------|-------------------------------|------------|------------------------------------------|
| center         | {lat: number; lng: number}    | auto       | Tâm bản đồ (mặc định: khu vực user)    |
| zoom           | number                        | 14         | Zoom level                               |
| markers        | MapMarker[]                   | []         | Danh sách markers                        |
| geofences      | Geofence[]                    | []         | Danh sách geofence polygons/circles      |
| heatmapData    | HeatmapPoint[]                | []         | Dữ liệu heatmap                         |
| layers         | LayerConfig[]                 | []         | Cấu hình layers toggle                  |
| onMarkerClick  | (marker: MapMarker) => void   | undefined  | Click marker → popup/navigate            |
| onMapClick     | (latlng) => void              | undefined  | Click bản đồ (cho GeofenceEditor)       |
| height         | string                        | '100%'     | Chiều cao (mini map: '200px')            |
| showControls   | boolean                       | true       | Hiện zoom controls                       |
| showLayerToggle| boolean                       | true       | Hiện layer toggle panel                  |
| className      | string                        | undefined  | Custom classes                           |

## Interfaces
```typescript
interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'report-success' | 'report-outside' | 'report-fail' | 'subject-home' | 'alert-location' | 'selected';
  label?: string;          // Tooltip text
  popup?: ReactNode;       // Custom popup content
}

interface Geofence {
  id: string;
  name: string;
  type: 'polygon' | 'circle';
  coordinates?: [number, number][];  // polygon points
  center?: { lat: number; lng: number };  // circle center
  radius?: number;                        // circle radius (meters)
  variant?: 'default' | 'restricted';     // restricted = vùng cấm
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;  // 0-1
}

interface LayerConfig {
  key: string;
  label: string;       // VD: "Vị trí trình báo"
  visible: boolean;
  onChange: (visible: boolean) => void;
}
```

## Tailwind classes
```tsx
// ═══ MAP CONTAINER ═══
const mapContainer = "relative w-full rounded overflow-hidden border border-zinc-200";
const mapContainerFull = "relative w-full h-full";  // full content area

// ═══ LAYER TOGGLE PANEL ═══
const layerPanel = `
  absolute top-3 left-3 z-10
  bg-white border border-zinc-200 rounded shadow-sm
  px-3 py-2
`;
const layerTitle = "text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2";
const layerItem = "flex items-center gap-2 py-1";
const layerCheckbox = "h-3.5 w-3.5 rounded-[2px] border-zinc-300 text-red-700 focus:ring-red-700/20";
const layerLabel = "text-[12px] text-zinc-700";

// ═══ MARKER POPUP ═══
const popup = "bg-white border border-zinc-200 rounded shadow-sm px-3 py-2 max-w-[240px]";
const popupTitle = "text-[13px] font-semibold text-zinc-900";
const popupDetail = "text-[12px] text-zinc-500 mt-0.5";
const popupLink = "text-[12px] text-red-700 hover:underline mt-1 inline-block cursor-pointer";
```

---

# COMPONENT: GeofenceEditor (CMP-GEOEDIT)

## Mô tả
Công cụ vẽ/chỉnh sửa vùng geofence trên bản đồ. Dùng trong SCR-081 (Quản lý Geofence) và SCR-091 (Tạo kịch bản — chọn geofence). Hỗ trợ vẽ polygon (click từng điểm) và circle (click tâm + kéo bán kính).

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ TOOLBAR                                                  │
│ [📐 Polygon] [⭕ Circle] [✋ Pan] [🗑 Xoá] │ Tên: [___] │
├──────────────────────────────────────────────────────────┤
│ MAP (CMP-MAP bên trong)                                  │
│                                                          │
│   Click để thêm điểm polygon                            │
│   Kéo điểm để chỉnh sửa                                │
│   Double-click để hoàn thành polygon                     │
│                                                          │
│   Đang vẽ:                                              │
│     stroke: #b91c1c dashed 2px                          │
│     fill: rgba(185,28,28,0.1)                           │
│     vertices: ● đỏ 8x8, draggable                      │
│                                                          │
└──────────────────────────────────────────────────────────┘

Toolbar: h-10, bg-white, border-b zinc-200, flex items-center px-3 gap-2
Tool button: CMP-BTN variant=ghost size=sm, active → bg-zinc-100 text-zinc-900
Name input: CMP-INPUT inline, w-[200px]
```

## Props
| Prop          | Type                      | Default   | Mô tả                                 |
|---------------|---------------------------|-----------|----------------------------------------|
| value         | Geofence \| null          | null      | Geofence hiện tại (edit mode)         |
| onChange      | (geofence: Geofence) => void | —      | Handler lưu geofence                  |
| existingFences| Geofence[]                | []        | Geofence đã tồn tại (hiện trên map)  |
| mapCenter     | {lat, lng}                | auto      | Tâm bản đồ mặc định                  |
| mapZoom       | number                    | 14        | Zoom mặc định                        |

## Behavior
- Mode Polygon: click thêm vertex → double-click hoàn thành → polygon closed
- Mode Circle: click chọn tâm → kéo để chọn bán kính → release hoàn thành
- Mode Pan: di chuyển bản đồ (không vẽ)
- Xoá: xoá geofence đang vẽ/edit, confirm trước khi xoá
- Edit: click geofence đã vẽ → vertices hiện lại → kéo vertex để chỉnh sửa
- Hiện bán kính (meters) khi vẽ circle
- Hiện diện tích (m²) khi vẽ polygon
- existingFences hiện dạng ghost (opacity thấp, không editable)

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "flex flex-col border border-zinc-200 rounded overflow-hidden";

// ═══ TOOLBAR ═══
const toolbar = "h-10 bg-white border-b border-zinc-200 flex items-center px-3 gap-2";
const toolBtn = "h-8 w-8 flex items-center justify-center rounded hover:bg-zinc-100 cursor-pointer text-zinc-600";
const toolBtnActive = "bg-zinc-100 text-zinc-900";
const toolDivider = "w-px h-5 bg-zinc-200 mx-1";
const nameInput = "w-[200px]";  // dùng CMP-INPUT size nhỏ

// ═══ MAP AREA ═══
const mapArea = "flex-1 min-h-[400px]";  // CMP-MAP render trong đây

// ═══ INFO OVERLAY (diện tích / bán kính) ═══
const infoOverlay = `
  absolute bottom-3 left-3 z-10
  bg-white/90 border border-zinc-200 rounded
  px-2 py-1 text-[11px] text-zinc-600 font-mono
`;
```

---

# COMPONENT: NoteThread (CMP-NOTES)

## Mô tả
Thread ghi chú dạng chat cho Case. Mỗi note gồm: nội dung text + cán bộ tạo + thời gian + ảnh đính kèm (nếu có). Hiện theo thứ tự thời gian (cũ → mới). Form thêm ghi chú nằm dưới cùng. Dùng trong SCR-051 (Chi tiết Case).

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ GHI CHÚ (3)                                              │  ← section title + count
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─ Note 1 ─────────────────────────────────────────────┐│
│ │ [AV] Nguyễn Văn B · Cán bộ cơ sở · 14/03 15:30     ││  ← avatar + name + role + time
│ │                                                       ││
│ │ Đã đến hiện trường xác minh. Đối tượng không có      ││  ← content text
│ │ mặt tại địa chỉ đăng ký.                             ││
│ │                                                       ││
│ │ [🖼 hien-truong-1.jpg] [🖼 hien-truong-2.jpg]       ││  ← ảnh đính kèm (thumbnails)
│ └───────────────────────────────────────────────────────┘│
│                                                          │
│ ┌─ Note 2 ─────────────────────────────────────────────┐│
│ │ [AV] SYSTEM · 14/03 15:31                            ││  ← system note (auto)
│ │                                                       ││
│ │ Case tạo tự động — Auto-escalate từ Alert #AL-089.   ││
│ │ Kịch bản: Quản chế Cơ bản, Quy tắc: D2.            ││
│ └───────────────────────────────────────────────────────┘│
│                                                          │
│ ┌─ Note 3 (đóng Case) ─────────────────────────────────┐│
│ │ [AV] Trần Thị C · Cán bộ quản lý · 15/03 09:00     ││
│ │                                                       ││
│ │ Đã xác minh và xử lý. Đối tượng đã trở về.          ││
│ │ Kết quả: Nhắc nhở, ghi nhận vi phạm lần 1.          ││
│ │                                                       ││
│ │ ── CASE ĐÓNG bởi Trần Thị C ──                      ││  ← close marker
│ └───────────────────────────────────────────────────────┘│
│                                                          │
├──────────────────────────────────────────────────────────┤
│ FORM THÊM GHI CHÚ (chỉ hiện khi Case Mở)              │
│                                                          │
│ [Textarea: Nhập ghi chú...]                    h=80px   │
│                                                          │
│ [📷 Chụp ảnh] [📎 Đính kèm]           [Gửi ghi chú]   │
│   ↑camera mobile  ↑file upload           ↑CMP-BTN primary│
└──────────────────────────────────────────────────────────┘
```

## Note Types

| Type    | Avatar          | Name style        | Dùng khi                     |
|---------|-----------------|--------------------|-----------------------------|
| officer | CMP-AVT initials| Tên + role + time  | Cán bộ ghi chú thủ công     |
| system  | CMP-AVT "SYS"  | "SYSTEM" + time    | Hệ thống ghi tự động        |
| close   | CMP-AVT initials| Tên + role + time  | Ghi chú đóng Case           |

## Props
| Prop       | Type                          | Default   | Mô tả                              |
|------------|-------------------------------|-----------|--------------------------------------|
| notes      | CaseNote[]                    | []        | Danh sách ghi chú                  |
| caseStatus | 'open' \| 'closed'            | 'open'    | Trạng thái Case (ẩn form nếu closed)|
| onSubmit   | (note: NewNote) => void       | —         | Handler gửi ghi chú mới            |
| loading    | boolean                       | false     | Loading state cho form submit       |

## Interfaces
```typescript
interface CaseNote {
  id: string;
  type: 'officer' | 'system' | 'close';
  author: {
    name: string;
    role?: string;        // VD: "Cán bộ cơ sở"
    initials: string;
  };
  timestamp: string;       // ISO date
  content: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: 'image' | 'document';
    thumbnailUrl?: string;
  }>;
}

interface NewNote {
  content: string;
  attachments?: File[];
}
```

## Tailwind classes
```tsx
// ═══ SECTION ═══
const section = "";

const sectionTitle = "text-[13px] font-semibold text-zinc-900 mb-3";
const noteCount = "text-zinc-500 font-normal ml-1";

// ═══ NOTE ITEM ═══
const noteItem = "flex gap-3 pb-4 mb-4 border-b border-zinc-100 last:border-b-0 last:mb-0 last:pb-0";
const noteItemSystem = "flex gap-3 pb-4 mb-4 border-b border-zinc-100 bg-zinc-50 -mx-4 px-4 py-3 rounded";

// ═══ NOTE HEADER ═══
const noteHeader = "flex items-center gap-2 mb-1.5 flex-wrap";
const noteAuthor = "text-[13px] font-medium text-zinc-900";
const noteRole = "text-[11px] text-zinc-500";
const noteTime = "text-[11px] text-zinc-400 font-mono tabular-nums";
const noteDot = "text-zinc-300";  // separator dot "·"

// ═══ NOTE CONTENT ═══
const noteContent = "text-[13px] text-zinc-700 leading-relaxed";

// ═══ NOTE ATTACHMENTS ═══
const attachments = "flex gap-2 mt-2 flex-wrap";
const attachmentThumb = "h-16 w-16 rounded border border-zinc-200 object-cover cursor-pointer hover:opacity-80";
const attachmentFile = `
  flex items-center gap-2 h-8 px-2
  border border-zinc-200 rounded
  text-[11px] text-zinc-600
  hover:bg-zinc-50 cursor-pointer
`;

// ═══ CLOSE MARKER ═══
const closeMarker = `
  mt-3 pt-3 border-t border-dashed border-zinc-300
  text-[11px] text-zinc-500 font-medium text-center uppercase tracking-wide
`;

// ═══ FORM (thêm ghi chú) ═══
const form = "mt-4 pt-4 border-t border-zinc-200";
const formTextarea = "";  // CMP-TXT, rows=3, placeholder="Nhập ghi chú..."
const formActions = "flex items-center justify-between mt-2";
const formAttachBtns = "flex items-center gap-2";
// Camera: CMP-BTN ghost size=sm, icon Camera
// Attach: CMP-BTN ghost size=sm, icon Paperclip
// Submit: CMP-BTN primary size=sm, "Gửi ghi chú"
```

---

# COMPONENT: AlertLevelBadge (CMP-ALVL)

## Mô tả
Badge chuyên biệt hiển thị mức độ Alert. Dựa trên CMP-BADGE nhưng có logic mapping cố định 4 mức → 4 visual styles + icon cho KHẨN CẤP. Dùng trong SCR-040 (Alert dashboard), SCR-041 (Alert detail), SCR-050 (Case dashboard).

## Mapping cố định — KHÔNG thay đổi

| Mức Alert   | Badge variant | Text hiển thị | Icon             | Tailwind override     |
|-------------|---------------|---------------|------------------|-----------------------|
| THAP        | info          | Thấp          | —                | —                     |
| TRUNG_BINH  | warning       | Trung bình    | —                | —                     |
| CAO         | urgent        | Cao           | —                | —                     |
| KHAN_CAP    | urgent        | Khẩn cấp      | AlertTriangle ⚠  | font-semibold + icon  |

## Props
| Prop   | Type                                           | Default | Mô tả         |
|--------|------------------------------------------------|---------|----------------|
| level  | 'THAP' \| 'TRUNG_BINH' \| 'CAO' \| 'KHAN_CAP' | —       | Mức Alert      |
| size   | 'sm' \| 'md'                                   | 'md'    | Kích thước     |

## Tailwind classes
```tsx
// Dùng CMP-BADGE làm nền, chỉ mapping:

const levelMap = {
  THAP: {
    variant: 'info',
    label: 'Thấp',
    icon: null,
    extraClass: '',
  },
  TRUNG_BINH: {
    variant: 'warning',
    label: 'Trung bình',
    icon: null,
    extraClass: '',
  },
  CAO: {
    variant: 'urgent',
    label: 'Cao',
    icon: null,
    extraClass: '',
  },
  KHAN_CAP: {
    variant: 'urgent',
    label: 'Khẩn cấp',
    icon: 'AlertTriangle',  // Lucide icon, h-3 w-3
    extraClass: 'font-semibold',
  },
};

// KHAN_CAP rendering:
// <Badge variant="urgent" size={size} leftIcon={<AlertTriangle className="h-3 w-3" />} className="font-semibold">
//   Khẩn cấp
// </Badge>
```

---

# COMPONENT: EscalationInfo (CMP-ESCINFO)

## Mô tả
Hiển thị thông tin nguồn tạo / escalation của Alert hoặc Case. Cho biết: auto hay thủ công, ai hoặc hệ thống, khi nào, từ Alert nào, quy tắc nào. Dùng trong SCR-041 (Alert detail) và SCR-051 (Case detail).

## Layout

```
Auto-escalate:
┌──────────────────────────────────────────────────────────┐
│ ⚡ Escalated tự động bởi hệ thống                       │  ← icon + title
│                                                          │
│ Nguồn:     Alert #AL-2024-089                           │  ← link
│ Kịch bản:  Quản chế Cơ bản                              │
│ Quy tắc:   D2 — Face mismatch ≥ 3 lần liên tiếp       │
│ Thời gian:  14/03/2026 15:31                            │  ← mono, muted
└──────────────────────────────────────────────────────────┘

Thủ công bởi cán bộ:
┌──────────────────────────────────────────────────────────┐
│ 👤 Escalated thủ công bởi Nguyễn Văn B                  │
│                                                          │
│ Nguồn:     Alert #AL-2024-089                           │
│ Thời gian:  14/03/2026 15:32                            │
└──────────────────────────────────────────────────────────┘

Tạo thủ công (không từ Alert):
┌──────────────────────────────────────────────────────────┐
│ 👤 Tạo thủ công bởi Nguyễn Văn B                        │
│                                                          │
│ Lý do:     Phát hiện vi phạm ngoài hệ thống            │
│ Thời gian:  14/03/2026 16:00                            │
└──────────────────────────────────────────────────────────┘

Wrapper: CMP-CARD, bg tuỳ type (xem bên dưới)
```

## Types

| Type          | Icon     | Bg          | Border-left    | Title prefix                 |
|---------------|----------|-------------|----------------|------------------------------|
| auto-system   | ⚡ Zap   | #f4f4f5     | 3px #71717a    | "Escalated tự động bởi hệ thống" |
| manual-officer| 👤 User  | #ffffff     | 3px #b91c1c    | "Escalated thủ công bởi [tên]"   |
| manual-new    | 👤 User  | #ffffff     | 3px #b91c1c    | "Tạo thủ công bởi [tên]"         |

## Props
| Prop         | Type                                 | Default | Mô tả                        |
|--------------|--------------------------------------|---------|-------------------------------|
| type         | 'auto-system' \| 'manual-officer' \| 'manual-new' | — | Loại escalation   |
| actor        | string                               | undefined | Tên cán bộ (manual)        |
| alertId      | string                               | undefined | Mã Alert nguồn (link)      |
| alertLink    | string                               | undefined | URL Alert detail            |
| scenarioName | string                               | undefined | Tên kịch bản (auto)        |
| ruleName     | string                               | undefined | Tên quy tắc Alert (auto)   |
| reason       | string                               | undefined | Lý do (manual-new)          |
| timestamp    | string                               | —         | ISO date                    |

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "border border-zinc-200 rounded px-4 py-3";
const wrapperAuto = "bg-zinc-50 border-l-[3px] border-l-zinc-500";
const wrapperManual = "bg-white border-l-[3px] border-l-red-700";

// ═══ TITLE ROW ═══
const titleRow = "flex items-center gap-2 mb-2";
const titleIcon = "h-4 w-4 flex-shrink-0";
const titleIconAuto = "text-zinc-500";
const titleIconManual = "text-red-700";
const titleText = "text-[13px] font-semibold text-zinc-900";

// ═══ DETAIL ROWS ═══
const detailRow = "flex items-baseline gap-2 mt-1";
const detailLabel = "text-[12px] text-zinc-500 w-[80px] flex-shrink-0";
const detailValue = "text-[13px] text-zinc-900";
const detailLink = "text-[13px] text-red-700 hover:underline cursor-pointer font-mono text-[12px]";
const detailTimestamp = "text-[12px] text-zinc-400 font-mono tabular-nums";
```

---

# COMPONENT: CameraCapture (CMP-CAMERA)

## Mô tả
Chụp ảnh thực địa từ camera thiết bị qua trình duyệt mobile (HTML5 Media Capture). Tự động gắn metadata: GPS (navigator.geolocation), timestamp (Date.now()), tên cán bộ (từ auth context). Dùng trong SCR-051 (Case note — mobile), W-29/W-30. Khác CMP-FILE variant=camera ở chỗ component này render preview + metadata ngay sau chụp.

## Layout

```
Trước khi chụp:
┌──────────────────────────────────────┐
│        [📷 Camera — h-10 w-10]      │
│                                      │
│        Chụp ảnh thực địa            │
│                                      │
│        [📷 Mở camera]               │  ← CMP-BTN outline
└──────────────────────────────────────┘

Sau khi chụp (preview):
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐│
│ │ [Preview ảnh vừa chụp]          ││  ← aspect-video, object-cover, rounded
│ │                                  ││
│ └──────────────────────────────────┘│
│                                      │
│ 📍 10.762622, 106.682354            │  ← GPS (mono)
│ 🕐 15/03/2026 09:47:23             │  ← Timestamp (mono)
│ 👤 Nguyễn Văn B                    │  ← Cán bộ
│                                      │
│ [Chụp lại]  [Sử dụng ảnh này]      │
└──────────────────────────────────────┘
```

## Props
| Prop          | Type                             | Default | Mô tả                              |
|---------------|----------------------------------|---------|--------------------------------------|
| onCapture     | (photo: CapturedPhoto) => void   | —       | Handler khi chấp nhận ảnh          |
| officerName   | string                           | —       | Tên cán bộ (từ auth)               |
| disabled      | boolean                          | false   | Vô hiệu hoá                        |

## CapturedPhoto Interface
```typescript
interface CapturedPhoto {
  file: File;                // File ảnh gốc
  previewUrl: string;        // URL.createObjectURL cho preview
  metadata: {
    gps: { lat: number; lng: number; accuracy: number } | null;
    timestamp: string;       // ISO date
    officer: string;         // Tên cán bộ
  };
}
```

## Behavior
- Click "Mở camera" → trigger `<input type="file" accept="image/*" capture="environment">` (camera sau)
- Sau khi chụp → hiện preview + lấy GPS (navigator.geolocation.getCurrentPosition)
- GPS fail → hiện "Không thể lấy vị trí GPS" (warning text), vẫn cho phép dùng ảnh
- "Chụp lại" → reset, mở camera lại
- "Sử dụng ảnh này" → gọi onCapture với đầy đủ metadata
- Desktop: component vẫn hiện nhưng dùng file picker thay camera

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "border border-zinc-200 rounded p-4";

// ═══ EMPTY STATE (chưa chụp) ═══
const emptyState = "flex flex-col items-center justify-center py-6 text-center";
const emptyIcon = "h-10 w-10 text-zinc-300 mb-2";
const emptyText = "text-[13px] text-zinc-600 mb-3";
// Button: CMP-BTN variant=outline, icon Camera

// ═══ PREVIEW STATE (đã chụp) ═══
const preview = "";
const previewImage = "w-full aspect-video object-cover rounded border border-zinc-200 mb-3";

const metadataRow = "flex items-center gap-2 text-[12px] text-zinc-600 mt-1";
const metadataIcon = "h-3.5 w-3.5 text-zinc-400 flex-shrink-0";
const metadataValue = "font-mono text-[11px] text-zinc-500";
const metadataGpsWarn = "text-[11px] text-amber-800";

const previewActions = "flex items-center gap-2 mt-3";
// Chụp lại: CMP-BTN ghost size=sm
// Sử dụng: CMP-BTN primary size=sm
```

---

# COMPONENT: QueryBuilder (CMP-QBUILD)

## Mô tả
Tìm kiếm nâng cao bằng cách xây dựng query từ các điều kiện AND/OR. Mỗi điều kiện gồm: trường dữ liệu + toán tử (=, ~, !=, !~) + giá trị. Dùng trong SCR-020 (Danh sách hồ sơ — advanced search), SCR-072 (Tìm kiếm chéo).

## Toán tử

| Toán tử | Ý nghĩa                | Backend mapping          |
|---------|-------------------------|--------------------------|
| `=`     | Bằng chính xác          | WHERE field = value      |
| `~`     | Chứa (fulltext/elastic) | WHERE field LIKE %value% |
| `!=`    | Không bằng              | WHERE field != value     |
| `!~`    | Không chứa              | WHERE field NOT LIKE %value% |

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ TÌM KIẾM NÂNG CAO                                [Đóng ✕]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Điều kiện 1:                                               │
│  [Họ tên     ▼] [chứa (~)   ▼] [Nguyễn________] [✕ xoá]  │
│                                                              │
│  [AND ▼]  ← connector toggle (AND / OR)                    │
│                                                              │
│  Điều kiện 2:                                               │
│  [Trạng thái ▼] [bằng (=)   ▼] [Đang quản lý  ▼] [✕ xoá] │
│                                                              │
│  [AND ▼]                                                    │
│                                                              │
│  Điều kiện 3:                                               │
│  [Kịch bản   ▼] [không chứa (!~) ▼] [Tái hòa nhập__] [✕]  │
│                                                              │
│  [+ Thêm điều kiện]                                        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Preview query:                                              │
│  ho_ten ~ "Nguyễn" AND trang_thai = "dang_quan_ly"          │  ← mono, bg-zinc-50
│  AND kich_ban !~ "tai_hoa_nhap"                             │
│                                                              │
│                        [Xoá tất cả]  [Tìm kiếm]            │
└──────────────────────────────────────────────────────────────┘

Mỗi condition row: flex items-center gap-2, h-9
Field select: w-[160px]  CMP-SEL
Operator select: w-[140px]  CMP-SEL
Value input: flex-1  CMP-INPUT hoặc CMP-SEL (tùy field type)
Remove: CMP-BTN ghost size=sm, icon X
Connector: CMP-SEL w-[80px], options: AND / OR
```

## Available Fields (SMTTS)

```typescript
const queryFields: QueryField[] = [
  { key: 'ho_ten',      label: 'Họ tên',          type: 'text',   operators: ['=', '~', '!=', '!~'] },
  { key: 'cccd',        label: 'CCCD',            type: 'text',   operators: ['=', '!='],  monospace: true },
  { key: 'ma_ho_so',    label: 'Mã hồ sơ',       type: 'text',   operators: ['=', '!='],  monospace: true },
  { key: 'trang_thai',  label: 'Trạng thái',      type: 'select', operators: ['=', '!='],  options: [...] },
  { key: 'kich_ban',    label: 'Kịch bản',        type: 'select', operators: ['=', '!=', '~', '!~'], options: [...] },
  { key: 'dia_ban',     label: 'Địa bàn',         type: 'select', operators: ['=', '!='],  options: [...] },
  { key: 'ngay_tao',    label: 'Ngày tạo',        type: 'date',   operators: ['=', '!='] },
  { key: 'sdt',         label: 'Số điện thoại',   type: 'text',   operators: ['=', '~'],   monospace: true },
];
```

## Props
| Prop       | Type                                | Default | Mô tả                              |
|------------|-------------------------------------|---------|--------------------------------------|
| fields     | QueryField[]                        | —       | Danh sách trường cho phép query     |
| conditions | QueryCondition[]                    | []      | Danh sách điều kiện (controlled)    |
| onChange   | (conditions: QueryCondition[]) => void | —    | Handler thay đổi điều kiện         |
| onSearch   | () => void                          | —       | Handler nút Tìm kiếm               |
| onClear    | () => void                          | —       | Handler xoá tất cả                 |
| open       | boolean                             | false   | Hiện/ẩn panel                      |
| onClose    | () => void                          | —       | Đóng panel                         |

## Interfaces
```typescript
interface QueryField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  operators: ('=' | '~' | '!=' | '!~')[];
  options?: Array<{value: string; label: string}>;  // cho type=select
  monospace?: boolean;
}

interface QueryCondition {
  id: string;               // unique id
  field: string;            // field key
  operator: '=' | '~' | '!=' | '!~';
  value: string;
  connector: 'AND' | 'OR'; // connector VỚI điều kiện TIẾP THEO
}
```

## Behavior
- "Thêm điều kiện" → thêm 1 row trống, connector mặc định AND
- Xoá condition → remove row, cập nhật connector
- Field select thay đổi → reset operator + value (vì operators khác nhau mỗi field)
- Field type=select → value input chuyển thành CMP-SEL
- Field monospace=true → value input có prop monospace=true
- Preview query: build string từ conditions, hiện trong box mono bg-zinc-50
- "Tìm kiếm" → gọi onSearch, parent build query string gửi API
- "Xoá tất cả" → reset conditions = [], gọi onClear

## Tailwind classes
```tsx
// ═══ PANEL ═══
const panel = "border border-zinc-200 rounded bg-white";

const panelHeader = "px-4 py-3 border-b border-zinc-200 flex items-center justify-between";
const panelTitle = "text-[13px] font-semibold text-zinc-900";
const panelCloseBtn = "h-4 w-4 text-zinc-400 hover:text-zinc-600 cursor-pointer";

const panelBody = "px-4 py-3";

// ═══ CONDITION ROW ═══
const conditionRow = "flex items-center gap-2 mb-2";
const fieldSelect = "w-[160px]";       // CMP-SEL
const operatorSelect = "w-[140px]";    // CMP-SEL
const valueInput = "flex-1 min-w-[120px]";  // CMP-INPUT hoặc CMP-SEL
const removeBtn = "";  // CMP-BTN ghost size=sm, icon X

// ═══ CONNECTOR ═══
const connectorRow = "flex items-center pl-2 mb-2";
const connectorSelect = "w-[80px]";  // CMP-SEL, options: AND / OR
// Connector select: text-[11px], h-7, bg-zinc-50

// ═══ ADD CONDITION ═══
const addBtn = "mt-1 mb-3";  // CMP-BTN ghost size=sm, icon Plus, "Thêm điều kiện"

// ═══ PREVIEW ═══
const preview = "bg-zinc-50 border border-zinc-200 rounded px-3 py-2 mt-2";
const previewLabel = "text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1";
const previewCode = "text-[12px] font-mono text-zinc-700 leading-relaxed whitespace-pre-wrap";

// ═══ FOOTER ═══
const panelFooter = "px-4 py-3 border-t border-zinc-200 flex items-center justify-end gap-2";
// Xoá tất cả: CMP-BTN ghost size=sm
// Tìm kiếm: CMP-BTN primary size=sm
```

---

# TỔNG KẾT ĐỢT 5

## Checklist hoàn thiện

| Component      | Mã          | Interfaces | Props  | Tailwind | Status |
|----------------|-------------|------------|--------|----------|--------|
| MapView        | CMP-MAP     | ✅ MapMarker + Geofence + Heatmap + Layer | ✅ 12 | ✅ | Done |
| GeofenceEditor | CMP-GEOEDIT | ✅ Geofence                | ✅ 5   | ✅       | Done   |
| NoteThread     | CMP-NOTES   | ✅ CaseNote + NewNote      | ✅ 4   | ✅       | Done   |
| AlertLevelBadge| CMP-ALVL    | ✅ 4 mức mapping cố định   | ✅ 2   | ✅       | Done   |
| EscalationInfo | CMP-ESCINFO | ✅ 3 types                 | ✅ 8   | ✅       | Done   |
| CameraCapture  | CMP-CAMERA  | ✅ CapturedPhoto           | ✅ 3   | ✅       | Done   |
| QueryBuilder   | CMP-QBUILD  | ✅ QueryField + QueryCondition + 8 SMTTS fields | ✅ 7 | ✅ | Done |

---

# TỔNG KẾT TOÀN BỘ COMPONENT LIBRARY

## Tất cả 37 components — 5 đợt

```
✅ Đợt 1 — Foundation (6):
   CMP-BTN · CMP-INPUT · CMP-SEL · CMP-BADGE · CMP-TABLE · CMP-PAGE

✅ Đợt 2 — Layout (6):
   LAY-APP · LAY-AUTH · LAY-TOP · LAY-SIDE · LAY-HDR · CMP-BRD

✅ Đợt 3 — Feedback & Forms (8):
   CMP-TOAST · CMP-MODAL · CMP-CFIRM · CMP-DATE · CMP-TXT · CMP-FILE · CMP-CHK · CMP-RAD

✅ Đợt 4 — Display (10):
   CMP-CARD · CMP-STAT · CMP-EMPTY · CMP-LOAD · CMP-TLINE · CMP-TAG · CMP-AVT · CMP-TABS · CMP-DRAWER · CMP-FILTER

✅ Đợt 5 — Domain-specific (7):
   CMP-MAP · CMP-GEOEDIT · CMP-NOTES · CMP-ALVL · CMP-ESCINFO · CMP-CAMERA · CMP-QBUILD
```

## Hướng dẫn paste cho Screen Spec

```
BƯỚC 1: Paste system-spec.md phần 1-2 (tokens + layout)    ~200 dòng
BƯỚC 2: Paste components MÀ MÀN ĐÓ DÙNG (3-8 cái)        ~200-400 dòng
BƯỚC 3: Viết yêu cầu màn hình                               ~30 dòng
         TỔNG: ~430-630 dòng → Claude xử lý chính xác

VÍ DỤ:
  SCR-001 (Login):       LAY-AUTH + CMP-BTN + CMP-INPUT
  SCR-010 (Dashboard):   LAY-HDR + CMP-STAT + CMP-TABLE + CMP-BADGE + CMP-LOAD
  SCR-020 (DS Hồ sơ):   LAY-HDR + CMP-FILTER + CMP-TABLE + CMP-BADGE + CMP-PAGE + CMP-EMPTY + CMP-QBUILD
  SCR-021 (Chi tiết HS): LAY-HDR + CMP-TABS + CMP-CARD + CMP-BADGE + CMP-TLINE + CMP-AVT + CMP-TAG
  SCR-040 (Alert):       LAY-HDR + CMP-FILTER + CMP-TABLE + CMP-ALVL + CMP-PAGE + CMP-STAT
  SCR-041 (Alert detail):LAY-HDR + CMP-CARD + CMP-ALVL + CMP-ESCINFO + CMP-CFIRM + CMP-TLINE
  SCR-051 (Case detail): LAY-HDR + CMP-CARD + CMP-NOTES + CMP-ESCINFO + CMP-BADGE + CMP-FILE + CMP-CFIRM
  SCR-080 (Bản đồ):     CMP-MAP + CMP-BADGE
  SCR-081 (Geofence):    CMP-GEOEDIT + CMP-MAP
  SCR-091 (Tạo KB):      LAY-HDR + CMP-CARD + CMP-INPUT + CMP-SEL + CMP-DATE + CMP-TXT + CMP-CHK + CMP-RAD
```
