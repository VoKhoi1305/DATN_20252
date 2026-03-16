# SCREEN: Dashboard Chính (SCR-010)

---

## Metadata

| Field         | Value                                                    |
|---------------|----------------------------------------------------------|
| Route         | /dashboard                                               |
| Page title    | "Tổng quan — SMTTS"                                     |
| Auth required | true (mọi role đều truy cập được)                       |
| Layout        | AppLayout (accent bar + topbar + sidebar + main content) |
| Redirect      | Nếu chưa login → /login · Nếu chưa OTP → /login/otp    |
| Priority      | P0 — Bắt buộc demo được                                 |
| Data scope    | Mặc định theo địa bàn quản lý của cán bộ đăng nhập      |

---

## AppLayout Structure (dùng chung mọi màn hình sau login)

```tsx
// <div className="flex flex-col h-screen bg-zinc-50">
//   <div className="h-[3px] bg-red-700 flex-none" />          ← accent bar
//   <header className="h-10 bg-zinc-950 border-b-2
//                      border-red-700 flex-none" />            ← topbar
//   <div className="flex flex-1 overflow-hidden">
//     <aside className="w-[148px] bg-zinc-900 flex-none
//                       overflow-y-auto" />                     ← sidebar (active: "Tổng quan")
//     <main className="flex-1 overflow-y-auto p-4" />          ← content
//   </div>
// </div>
```

---

## Layout của màn hình này

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Accent bar (3px bg-red-700)                                              │
├──────────────────────────────────────────────────────────────────────────┤
│ Topbar: [Logo SMTTS]                    [🔔 Bell] [Tên cán bộ] [Avt]   │
│ h-10 bg-zinc-950 border-b-2 border-red-700                              │
├──────────┬───────────────────────────────────────────────────────────────┤
│ Sidebar  │  MAIN CONTENT (p-4 bg-zinc-50)                               │
│ w-148px  │                                                               │
│ bg-zinc- │  ┌─────────────────────────────────────────────────────────┐ │
│ 900      │  │ PageHeader (LAY-HDR)                                     │ │
│          │  │ Breadcrumb: Dashboard                                    │ │
│ ● Tổng  │  │ Title: "Tổng quan"                                      │ │
│   quan   │  │ Subtitle: "Phường Bến Nghé, Quận 1" (data_scope)       │ │
│   ← actv │  └─────────────────────────────────────────────────────────┘ │
│ ○ Hồ sơ │                                                               │
│ ○ Event │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ ○ Alert │  │ StatCard │ │ StatCard │ │ StatCard │ │ StatCard │           │
│ ○ Case  │  │ Tổng ĐT │ │ Compli- │ │ Alert   │ │ Case    │           │
│ ○ Xét   │  │ 156      │ │ ance %  │ │ đang mở │ │ đang mở │           │
│   duyệt │  │          │ │ 87.5%   │ │ 12      │ │ 3       │           │
│ ○ Truy  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│   vết   │  grid-cols-4 gap-3 mb-4                                      │
│ ○ Bản đồ│                                                               │
│ ○ Kịch  │  ┌──────────────────────────────────────────────────────────┐│
│   bản   │  │ CMP-CARD: "Event gần đây"                    [Xem tất cả]││
│ ○ Báo   │  ├──────────────────────────────────────────────────────────┤│
│   cáo   │  │ CMP-TABLE (5 dòng mới nhất)                              ││
│          │  │ Thời gian│ Mã Event │ Đối tượng │ Loại    │ KQ (Badge) ││
│ ─────── │  │ 09:47    │ EVT-1234 │ Nguyễn A  │ Trình   │ ✓ Hợp lệ  ││
│ QUẢN TRỊ│  │ 09:32    │ EVT-1233 │ Trần B    │ báo     │ ✗ Vi phạm  ││
│ (Admin) │  │ ...      │ ...      │ ...       │         │ ...        ││
│          │  └──────────────────────────────────────────────────────────┘│
│          │                                                               │
│          │  ┌──────────────────────────────────────────────────────────┐│
│          │  │ CMP-CARD: "Alert đang mở"                    [Xem tất cả]││
│          │  ├──────────────────────────────────────────────────────────┤│
│          │  │ CMP-TABLE (5 dòng, ưu tiên mức Khẩn cấp / Cao)         ││
│          │  │ Mã Alert │ Đối tượng│ Loại Alert│ Mức độ   │ Thời gian ││
│          │  │ ALT-0089 │ Lê C     │ Quá hạn TB│ Khẩn cấp │ 08:15     ││
│          │  │ ALT-0088 │ Phạm D   │ Ngoài GF  │ Cao      │ 07:50     ││
│          │  │ ...      │ ...      │ ...       │ ...      │ ...       ││
│          │  └──────────────────────────────────────────────────────────┘│
│          │                                                               │
│          │  ┌──────────────────────────────────────────────────────────┐│
│          │  │ CMP-CARD: "Compliance 7 ngày gần nhất"                   ││
│          │  ├──────────────────────────────────────────────────────────┤│
│          │  │ [Mini bar chart — 7 cột cho 7 ngày]                      ││
│          │  │  Mo  Tu  We  Th  Fr  Sa  Su                              ││
│          │  │  92% 89% 87% 91% 85% 90% 88%                            ││
│          │  └──────────────────────────────────────────────────────────┘│
│          │                                                               │
└──────────┴───────────────────────────────────────────────────────────────┘
```

---

## Components sử dụng

| Component   | ID        | Variant          | Props đặc biệt                                                              |
|-------------|-----------|------------------|------------------------------------------------------------------------------|
| PageHeader  | LAY-HDR   | default          | breadcrumbs=[{label:'Dashboard'}], title="Tổng quan", subtitle="{data_scope}" |
| Breadcrumb  | CMP-BRD   | default          | items=[{label:'Dashboard'}] — chỉ 1 item, không click                       |
| StatCard    | CMP-STAT  | default          | label="Tổng đối tượng", value=156, change="↑ 3 so với tháng trước", changeType='positive' |
| StatCard    | CMP-STAT  | default          | label="Compliance rate", value="87.5%", change="↓ 2.1% so với tuần trước", changeType='negative' |
| StatCard    | CMP-STAT  | alert            | label="Alert đang mở", value=12, change="↑ 5 hôm nay", changeType='negative', onClick=navigate('/alerts') |
| StatCard    | CMP-STAT  | alert            | label="Case đang mở", value=3, change="1 mới hôm nay", changeType='neutral', onClick=navigate('/cases') |
| Card        | CMP-CARD  | default          | title="Event gần đây", titleAction=<Button variant='ghost' size='sm'>Xem tất cả</Button>, noPadding=true |
| Card        | CMP-CARD  | default          | title="Alert đang mở", titleAction=<Button variant='ghost' size='sm'>Xem tất cả</Button>, noPadding=true |
| Card        | CMP-CARD  | default          | title="Compliance 7 ngày gần nhất"                                          |
| Table       | CMP-TABLE | compact          | Bảng Event gần đây — 5 dòng, không pagination                                |
| Table       | CMP-TABLE | compact          | Bảng Alert đang mở — 5 dòng, không pagination, sort theo mức độ giảm dần     |
| Badge       | CMP-BADGE | done/urgent/warning/info | Trạng thái kết quả Event + Mức độ Alert                              |
| Loading     | CMP-LOAD  | skeleton         | Skeleton cho StatCards + Tables khi đang tải dữ liệu                          |
| EmptyState  | CMP-EMPTY | —                | Khi table Event hoặc Alert không có dữ liệu                                  |

---

## Chi tiết từng vùng nội dung

### Vùng 1 — PageHeader

- **Breadcrumb**: `[Dashboard]` — 1 item duy nhất, hiện dạng current (text-zinc-900 font-medium, không click)
- **Title**: "Tổng quan" — `<h1>` text-lg font-semibold text-zinc-900
- **Subtitle**: Hiện data_scope của cán bộ, VD: "Phường Bến Nghé, Quận 1" — text-[13px] text-zinc-500 mt-0.5
- **Actions**: Không có action button trên PageHeader Dashboard
- **Spacing**: mb-4 (16px) dưới PageHeader

### Vùng 2 — Stats Row (4 StatCards)

Container: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4`

| # | Label             | Value mẫu | Change mẫu               | changeType | variant | onClick        |
|---|-------------------|-----------|---------------------------|------------|---------|----------------|
| 1 | Tổng đối tượng    | 156       | ↑ 3 so với tháng trước    | positive   | default | —              |
| 2 | Compliance rate   | 87.5%     | ↓ 2.1% so với tuần trước  | negative   | default | —              |
| 3 | Alert đang mở     | 12        | ↑ 5 hôm nay               | negative   | alert   | → /alerts      |
| 4 | Case đang mở      | 3         | 1 mới hôm nay             | neutral    | alert   | → /cases       |

**Quy tắc changeType:**
- Tổng đối tượng tăng = positive (xanh #166534)
- Compliance giảm = negative (đỏ #b91c1c)
- Alert tăng = negative (đỏ #b91c1c) — nhiều alert = xấu
- Case: neutral (#a1a1aa) nếu ≤ 2 mới, negative nếu > 2 mới

**StatCard alert variant**: border-left 3px #b91c1c — dùng cho Alert đang mở và Case đang mở (số liệu cần chú ý ngay).

**Click behavior**: StatCard Alert và Case có `onClick` → navigate bằng `router.push` tới trang danh sách tương ứng. Cursor: pointer, hover:bg-zinc-50.

### Vùng 3 — Table "Event gần đây"

Nằm trong CMP-CARD, title="Event gần đây", titleAction=[Xem tất cả] (CMP-BTN ghost sm → navigate /events).

**Cấu trúc cột:**

| Cột         | Width   | Align | Style                                     | Mô tả                       |
|-------------|---------|-------|-------------------------------------------|------------------------------|
| Thời gian   | 90px    | left  | text-[12px] text-zinc-500 tabular-nums    | HH:mm hôm nay, DD/MM nếu trước hôm nay |
| Mã Event    | 110px   | left  | font-mono text-[12px] text-zinc-600 tracking-wide | Mã Event: EVT-XXXX  |
| Đối tượng   | flex    | left  | text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer | Tên đối tượng — click → /ho-so/:id |
| Loại        | 120px   | left  | text-[13px] text-zinc-900                 | Loại event: Trình báo, Check-in GPS, NFC scan... |
| Kết quả     | 100px   | left  | CMP-BADGE                                 | Badge variant theo kết quả   |

**Badge mapping cho cột Kết quả:**

| Kết quả         | Badge variant | Text hiển thị  |
|------------------|--------------|----------------|
| Hợp lệ          | done         | Hợp lệ         |
| Vi phạm          | urgent       | Vi phạm         |
| Quá hạn          | warning      | Quá hạn         |
| Đang xử lý       | processing   | Đang xử lý      |
| Chờ xác minh      | pending      | Chờ xác minh     |

**Behavior:**
- Hiển thị tối đa 5 dòng mới nhất trong scope
- Không có pagination (dùng nút "Xem tất cả" để vào danh sách đầy đủ)
- Sort mặc định: thời gian mới nhất trước
- Click Mã Event → navigate /events/:id
- Click Đối tượng → navigate /ho-so/:subjectId
- Table row height: 36px (h-9), hover:bg-zinc-50

### Vùng 4 — Table "Alert đang mở"

Nằm trong CMP-CARD, title="Alert đang mở", titleAction=[Xem tất cả] (CMP-BTN ghost sm → navigate /alerts).

**Cấu trúc cột:**

| Cột         | Width   | Align | Style                                     | Mô tả                       |
|-------------|---------|-------|-------------------------------------------|------------------------------|
| Mã Alert    | 110px   | left  | font-mono text-[12px] text-zinc-600 tracking-wide | Mã Alert: ALT-XXXX  |
| Đối tượng   | flex    | left  | text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer | Tên đối tượng — click → /ho-so/:id |
| Loại Alert  | 140px   | left  | text-[13px] text-zinc-900                 | VD: Quá hạn trình báo, Ngoài geofence... |
| Mức độ      | 100px   | left  | CMP-BADGE (Alert Level mapping)           | Badge mức độ Alert            |
| Thời gian   | 90px    | left  | text-[12px] text-zinc-500 tabular-nums    | HH:mm hoặc DD/MM             |

**Badge mapping cho cột Mức độ (AlertLevel → Badge):**

| Mức độ     | Badge variant | Hiển thị     |
|------------|--------------|--------------|
| KHẨN CẤP  | processing   | Khẩn cấp     |
| CAO        | urgent       | Cao          |
| TRUNG BÌNH | warning      | Trung bình   |
| THẤP       | info         | Thấp         |

**Behavior:**
- Hiển thị tối đa 5 dòng, ưu tiên mức Khẩn cấp → Cao → Trung bình → Thấp
- Sort: mức độ giảm dần, trong cùng mức thì thời gian mới nhất trước
- Click Mã Alert → navigate /alerts/:id
- Click Đối tượng → navigate /ho-so/:subjectId
- Không pagination — dùng "Xem tất cả"

### Vùng 5 — Compliance Chart (7 ngày)

Nằm trong CMP-CARD, title="Compliance 7 ngày gần nhất".

- **Loại chart**: Mini bar chart đơn giản — 7 thanh dọc cho 7 ngày gần nhất
- **Trục X**: Label ngày (T2, T3, T4, T5, T6, T7, CN hoặc DD/MM)
- **Trục Y**: Phần trăm compliance (0–100%)
- **Màu bar**: #b91c1c (red-700) cho ngày có compliance < 90%, #166534 (green-800) cho ngày ≥ 90%
- **Text trên mỗi bar**: phần trăm — text-[11px] text-zinc-600
- **Chiều cao chart**: ~120px (compact)
- **Implementation**: HTML5 Canvas hoặc SVG đơn giản, hoặc Recharts `<BarChart>` nếu dùng thư viện

---

## API Integration

### 1. Lấy dữ liệu Dashboard — GET /api/v1/dashboard/summary

- **Trigger**: Khi component mount (page load)
- **Request**: `GET /api/v1/dashboard/summary`
  - Headers: `Authorization: Bearer {token}`
  - Query params: không có (backend tự xác định scope từ token)
- **Response 200**:
  ```json
  {
    "stats": {
      "totalSubjects": 156,
      "totalSubjectsChange": "+3",
      "totalSubjectsChangePeriod": "tháng trước",
      "complianceRate": 87.5,
      "complianceRateChange": "-2.1",
      "complianceRateChangePeriod": "tuần trước",
      "openAlerts": 12,
      "openAlertsToday": 5,
      "openCases": 3,
      "openCasesToday": 1
    },
    "complianceTrend": [
      { "date": "2026-03-09", "rate": 92.0 },
      { "date": "2026-03-10", "rate": 89.0 },
      { "date": "2026-03-11", "rate": 87.0 },
      { "date": "2026-03-12", "rate": 91.0 },
      { "date": "2026-03-13", "rate": 85.0 },
      { "date": "2026-03-14", "rate": 90.0 },
      { "date": "2026-03-15", "rate": 88.0 }
    ],
    "scope": {
      "label": "Phường Bến Nghé, Quận 1",
      "level": "PHUONG",
      "id": "phuong_ben_nghe_q1"
    }
  }
  ```
- **Response errors**:

  | Status | Message hiển thị (Toast, variant=error)                     |
  |--------|-------------------------------------------------------------|
  | 401    | Redirect → /login?session=expired                           |
  | 403    | "Bạn không có quyền truy cập Dashboard."                    |
  | 500    | "Lỗi hệ thống. Vui lòng thử lại sau."                      |

### 2. Lấy Event gần đây — GET /api/v1/events/recent

- **Trigger**: Khi component mount (song song với API 1)
- **Request**: `GET /api/v1/events/recent?limit=5`
  - Headers: `Authorization: Bearer {token}`
- **Response 200**:
  ```json
  {
    "data": [
      {
        "id": "evt-uuid-1234",
        "code": "EVT-1234",
        "timestamp": "2026-03-15T09:47:00+07:00",
        "subject": {
          "id": "subj-uuid-001",
          "name": "Nguyễn Văn A",
          "code": "HS-2024-0047"
        },
        "type": "TRINH_BAO",
        "typeLabel": "Trình báo",
        "result": "VALID",
        "resultLabel": "Hợp lệ"
      }
    ]
  }
  ```
- **Response errors**: Xử lý tương tự API 1

### 3. Lấy Alert đang mở — GET /api/v1/alerts/open

- **Trigger**: Khi component mount (song song với API 1, 2)
- **Request**: `GET /api/v1/alerts/open?limit=5&sort=severity&order=desc`
  - Headers: `Authorization: Bearer {token}`
- **Response 200**:
  ```json
  {
    "data": [
      {
        "id": "alt-uuid-0089",
        "code": "ALT-0089",
        "subject": {
          "id": "subj-uuid-003",
          "name": "Lê Văn C",
          "code": "HS-2024-0112"
        },
        "type": "QUA_HAN_TRINH_BAO",
        "typeLabel": "Quá hạn trình báo",
        "severity": "KHAN_CAP",
        "severityLabel": "Khẩn cấp",
        "timestamp": "2026-03-15T08:15:00+07:00"
      }
    ]
  }
  ```
- **Response errors**: Xử lý tương tự API 1

### Chiến lược gọi API

- Gọi 3 API **song song** (Promise.all hoặc tương đương) để giảm thời gian chờ
- Mỗi section (Stats, Event table, Alert table) có loading state riêng — skeleton cho từng vùng
- Nếu 1 API fail, các section khác vẫn hiển thị bình thường
- Yêu cầu hiệu năng: Tải trang Dashboard ≤ 3 giây (NFR-PERF-005)
- Auto-refresh: Polling mỗi 60 giây cho stats + alert (hoặc WebSocket nếu implement)

---

## States màn hình

| State      | Mô tả                                                                           |
|------------|---------------------------------------------------------------------------------|
| loading    | Skeleton loader cho từng section: 4 skeleton cards + 2 skeleton tables + 1 skeleton chart. Áp dụng khi API > 300ms. |
| idle       | Dữ liệu đã tải xong, hiển thị đầy đủ stats + tables + chart                   |
| error      | Toast error hiện trên cùng. Section bị lỗi hiện retry: icon + "Không thể tải dữ liệu" + nút [Thử lại] |
| empty-events | Table Event: hiện CMP-EMPTY — icon=Activity, title="Chưa có sự kiện nào", sub="Chưa có sự kiện trong khoảng thời gian này" |
| empty-alerts | Table Alert: hiện CMP-EMPTY — icon=AlertTriangle, title="Không có cảnh báo đang mở", sub="Hệ thống hoạt động bình thường" |
| partial    | Một số API thành công, một số fail → hiển thị section đã có dữ liệu, section fail hiện error riêng |

### Loading detail (Skeleton)

```
StatCards:    4 skeleton cards — mỗi card có 3 skeleton bar (label, value, change)
              h-3 bg-zinc-200 rounded animate-pulse, width lần lượt 60%, 40%, 80%

Event table:  5 skeleton rows — h-9, mỗi row có 5 skeleton cells
              bar widths: 50px, 80px, 120px, 80px, 60px

Alert table:  5 skeleton rows — tương tự Event table

Chart:        1 skeleton rectangle h-[120px] bg-zinc-200 rounded animate-pulse
```

---

## Navigation

| Trigger                             | Destination               | Method       |
|-------------------------------------|---------------------------|--------------|
| Click StatCard "Alert đang mở"     | /alerts                   | router.push  |
| Click StatCard "Case đang mở"      | /cases                    | router.push  |
| Click "Xem tất cả" Event           | /events                   | router.push  |
| Click "Xem tất cả" Alert           | /alerts                   | router.push  |
| Click Mã Event (VD: EVT-1234)      | /events/:eventId          | router.push  |
| Click Mã Alert (VD: ALT-0089)      | /alerts/:alertId          | router.push  |
| Click Tên đối tượng trong Event     | /ho-so/:subjectId         | router.push  |
| Click Tên đối tượng trong Alert     | /ho-so/:subjectId         | router.push  |
| Sidebar "Tổng quan"                | /dashboard (current)      | —            |

---

## Responsive

| Breakpoint         | Thay đổi                                                                             |
|--------------------|---------------------------------------------------------------------------------------|
| Desktop ≥1024px    | Layout đầy đủ: sidebar 148px, stats 4 cột, tables hiện tất cả cột, chart hiện       |
| Tablet 640–1023px  | Sidebar collapsed (48px icon only). Stats grid-cols-2. Tables ẩn cột "Loại" và "Thời gian" |
| Mobile <640px      | Sidebar ẩn → hamburger. Stats grid-cols-1. Tables horizontal scroll hoặc chuyển sang card list. Chart full-width. Content padding 12px |

### Chi tiết responsive table (Mobile)

**Event table mobile** — chuyển thành card list:
```
┌─────────────────────────────────┐
│ EVT-1234  (mono)    09:47       │
│ Nguyễn Văn A                    │
│ Trình báo          [Hợp lệ]    │
└─────────────────────────────────┘
```

**Alert table mobile** — chuyển thành card list:
```
┌─────────────────────────────────┐
│ ALT-0089  (mono)    08:15       │
│ Lê Văn C                        │
│ Quá hạn trình báo  [Khẩn cấp]  │
└─────────────────────────────────┘
```

---

## Edge Cases

| Tình huống                                 | Cách xử lý                                                                      |
|--------------------------------------------|---------------------------------------------------------------------------------|
| Cán bộ mới, chưa có đối tượng nào          | Stats hiện 0. Tables hiện empty state. Chart hiện "Chưa có dữ liệu"            |
| Data scope rộng (cấp quận/tỉnh)           | Stats tổng hợp nhiều phường. Link "Dashboard điều hành" hiện cho CAN_BO_QUAN_LY, LANH_DAO |
| Compliance = 0% (không ai trình báo)       | Hiển thị 0% bình thường, changeType='negative'                                 |
| Compliance = 100%                          | Hiển thị 100%, changeType='positive'                                            |
| Alert đang mở > 99                        | Hiển thị "99+" hoặc số thực (VD: 156). StatCard alert variant nổi bật          |
| Token hết hạn giữa chừng (401 khi polling) | Redirect /login?session=expired, hiện toast "Phiên làm việc đã hết hạn"        |
| Mạng chậm / timeout                       | Skeleton hiện tối đa 10 giây → sau đó hiện error state + nút Thử lại           |
| API trả data nhưng scope trống            | Hiện thông báo: "Tài khoản chưa được gán địa bàn. Liên hệ quản trị viên."     |
| Nhiều tab cùng mở Dashboard               | Mỗi tab polling riêng. Không conflict — chỉ đọc dữ liệu                        |
| Role VIEWER                               | Hiển thị đầy đủ stats + tables. Không có action buttons. Click vẫn navigate xem chi tiết |
| Real-time Alert mới xuất hiện             | Polling 60s cập nhật stats + alert table. Bell icon trên topbar có badge count mới |

---

## Permissions theo Role

| Thành phần               | IT_ADMIN | LANH_DAO | CAN_BO_QUAN_LY | CAN_BO_CO_SO | VIEWER |
|--------------------------|----------|----------|-----------------|--------------|--------|
| Xem Dashboard            | ✅       | ✅       | ✅              | ✅           | ✅     |
| Stats hiện đầy đủ        | ✅       | ✅       | ✅              | ✅           | ✅     |
| Click navigate chi tiết  | ✅       | ✅       | ✅              | ✅           | ✅     |
| Data scope               | Toàn HT | Tỉnh/TP | Quận/Huyện      | Phường/Xã    | Được gán |
| Link "Dashboard điều hành" | ✅     | ✅       | ✅              | ✗            | ✗      |

---

## Ghi chú kỹ thuật

### State management
```typescript
// Dashboard page state (local)
interface DashboardState {
  stats: DashboardStats | null;
  recentEvents: Event[];
  openAlerts: Alert[];
  complianceTrend: ComplianceTrendItem[];
  loading: {
    stats: boolean;
    events: boolean;
    alerts: boolean;
  };
  error: {
    stats: string | null;
    events: string | null;
    alerts: string | null;
  };
}
```

### Polling
```
Interval: 60 giây
Scope: stats + openAlerts (Event ít cần realtime hơn)
Cách: setInterval hoặc react-query refetchInterval
Cleanup: clearInterval khi unmount / navigate away
```

### Performance
- API response cache: 30 giây (stale-while-revalidate)
- Dashboard load time target: ≤ 3 giây (NFR-PERF-005)
- Skeleton hiển thị ngay tức thì, không delay

---

## Figma Reference

- Frame: `SCR/010-Dashboard/Desktop`
- Frame: `SCR/010-Dashboard/Tablet`
- Frame: `SCR/010-Dashboard/Mobile`
