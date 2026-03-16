# SCREEN: Quản lý Enrollment (SCR-024)

---

## Metadata

| Field         | Value                                                      |
|---------------|------------------------------------------------------------|
| Route         | `/ho-so/enrollment`                                        |
| Page title    | `"Quản lý Enrollment — SMTTS"`                             |
| Auth required | true                                                       |
| Roles allowed | `officer_base`, `officer_manager`, `admin`                 |
| Layout        | AppLayout (LAY-APP)                                        |
| Parent route  | `/ho-so` (Module Hồ sơ)                                   |
| Priority      | P1 — Quan trọng, nên có đầy đủ                            |
| Liên quan SRS | FR-AUTH-001, FR-AUTH-004, FR-REQ-001, FR-REQ-002           |
| Liên quan SAD | POST `/auth/enrollment`, SubjectModule, RequestModule      |

---

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

---

## Layout của màn hình này

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [accent bar 3px bg-red-700]                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ TOPBAR  h-10  bg-zinc-950  border-b-2 border-red-700                   │
│ Logo SMTTS ◄──────────────────────────────► [User] [▼]                 │
├────────────┬────────────────────────────────────────────────────────────┤
│ SIDEBAR    │ CONTENT AREA  (p-4, overflow-y-auto)                      │
│ w-[148px]  │                                                           │
│ bg-zinc-900│ ┌──────────────────────────────────────────────────────┐  │
│            │ │ PageHeader (LAY-HDR)                                 │  │
│ ▸ Dashboard│ │ Breadcrumb: Hồ sơ / Quản lý Enrollment              │  │
│ ▸ Hồ sơ   │ │ Title: "Quản lý Enrollment"                          │  │
│   ● active │ │ Actions: [Xuất Excel ◻]                              │  │
│ ▸ Events   │ └──────────────────────────────────────────────────────┘  │
│ ▸ Alerts   │                                                           │
│ ▸ Cases    │ ┌──────────────────────────────────────────────────────┐  │
│ ▸ Xét duyệt│ │ Stats Row — 4x CMP-STAT                             │  │
│ ▸ Truy vết │ │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐            │  │
│ ▸ Bản đồ   │ │ │Tổng   │ │Chờ XN │ │Hoàn   │ │Đổi TB │            │  │
│ ▸ Kịch bản │ │ │enroll │ │       │ │thành  │ │chờ    │            │  │
│ ▸ Báo cáo  │ │ │  156  │ │  12   │ │  138  │ │   6   │            │  │
│ ▸ Quản trị │ │ └───────┘ └───────┘ └───────┘ └───────┘            │  │
│            │ └──────────────────────────────────────────────────────┘  │
│            │                                                           │
│            │ ┌──────────────────────────────────────────────────────┐  │
│            │ │ CMP-TABS                                             │  │
│            │ │ [Danh sách Enrollment (156)] [Yêu cầu đổi TB (6)]   │  │
│            │ └──────────────────────────────────────────────────────┘  │
│            │                                                           │
│            │ ═══════════════ TAB 1: DS ENROLLMENT ═══════════════════  │
│            │                                                           │
│            │ ┌──────────────────────────────────────────────────────┐  │
│            │ │ FilterBar (CMP-FILTER)                               │  │
│            │ │ [🔍 Tìm kiếm...] [Trạng thái ▼] [Khu vực ▼]        │  │
│            │ │                                         [Lọc] [Xóa] │  │
│            │ └──────────────────────────────────────────────────────┘  │
│            │                                                           │
│            │ ┌──────────────────────────────────────────────────────┐  │
│            │ │ CMP-TABLE: Danh sách Enrollment                      │  │
│            │ │┌────────────────────────────────────────────────────┐│  │
│            │ ││ MÃ HS    │ HỌ TÊN     │ CCCD        │ TRẠNG THÁI ││  │
│            │ ││          │            │             │            ││  │
│            │ ││          │ THIẾT BỊ   │ NGÀY ENROLL │ ACTIONS    ││  │
│            │ │├────────────────────────────────────────────────────┤│  │
│            │ ││ HS-2024  │ Nguyễn     │ 0123456789  │ [Hoàn      ││  │
│            │ ││ -0047    │ Văn A      │ 01234       │  thành]    ││  │
│            │ ││ (mono)   │            │ (mono)      │            ││  │
│            │ ││          │ Samsung    │ 15/03/2026  │ [Xem] [↻]  ││  │
│            │ ││          │ Galaxy A14 │ (muted)     │            ││  │
│            │ │├────────────────────────────────────────────────────┤│  │
│            │ ││ HS-2024  │ Trần       │ 0987654321  │ [Chờ XN]   ││  │
│            │ ││ -0052    │ Thị B      │ 09876       │            ││  │
│            │ ││ (mono)   │            │ (mono)      │            ││  │
│            │ ││          │ Xiaomi     │ 16/03/2026  │[Xem][✓][✗] ││  │
│            │ ││          │ Redmi 12   │ (muted)     │            ││  │
│            │ │└────────────────────────────────────────────────────┘│  │
│            │ │                                                      │  │
│            │ │ Hiển thị 1-20 trên 156         [◀][1][2]...[8][▶]   │  │
│            │ └──────────────────────────────────────────────────────┘  │
│            │                                                           │
│            │ ═══════════════ TAB 2: YÊU CẦU ĐỔI TB ═════════════════  │
│            │                                                           │
│            │ ┌──────────────────────────────────────────────────────┐  │
│            │ │ FilterBar (CMP-FILTER)                               │  │
│            │ │ [🔍 Tìm kiếm...] [Trạng thái ▼]     [Lọc] [Xóa]   │  │
│            │ └──────────────────────────────────────────────────────┘  │
│            │                                                           │
│            │ ┌──────────────────────────────────────────────────────┐  │
│            │ │ CMP-TABLE: Yêu cầu đổi thiết bị                     │  │
│            │ │┌────────────────────────────────────────────────────┐│  │
│            │ ││ MÃ YC    │ ĐỐI TƯỢNG  │ TB CŨ       │ TB MỚI     ││  │
│            │ ││          │            │             │            ││  │
│            │ ││ LÝ DO    │ NGÀY GỬI   │ TRẠNG THÁI │ ACTIONS    ││  │
│            │ │├────────────────────────────────────────────────────┤│  │
│            │ ││ YC-0012  │ Nguyễn     │ Samsung     │ iPhone 15  ││  │
│            │ ││ (mono)   │ Văn A      │ Galaxy A14  │            ││  │
│            │ ││ Hỏng TB  │ 14/03/2026 │ [Chờ duyệt]│[Duyệt][Từ  ││  │
│            │ ││          │ (muted)    │             │ chối]      ││  │
│            │ │└────────────────────────────────────────────────────┘│  │
│            │ │                                                      │  │
│            │ │ Hiển thị 1-6 trên 6             [◀][1][▶]           │  │
│            │ └──────────────────────────────────────────────────────┘  │
│            │                                                           │
└────────────┴────────────────────────────────────────────────────────────┘
```

---

## Components sử dụng

| Component      | ID          | Variant / Size          | Props đặc biệt                                                                                 |
|----------------|-------------|-------------------------|-------------------------------------------------------------------------------------------------|
| PageHeader     | LAY-HDR     | default                 | `title="Quản lý Enrollment"`, `actions=[Xuất Excel]`                                           |
| Breadcrumb     | CMP-BRD     | default                 | `items=[{label:"Hồ sơ", href:"/ho-so"}, {label:"Quản lý Enrollment"}]`                        |
| StatCard       | CMP-STAT    | default + alert         | 4 cards: Tổng enrollment, Chờ xác nhận, Hoàn thành, Đổi TB chờ duyệt                          |
| Tabs           | CMP-TABS    | default + count badge   | `tabs=[{label:"Danh sách Enrollment", count:156}, {label:"Yêu cầu đổi thiết bị", count:6}]`   |
| FilterBar      | CMP-FILTER  | composite               | Cấu hình riêng mỗi tab (xem chi tiết bên dưới)                                                |
| Data Table     | CMP-TABLE   | default                 | `sortable`, `onRowClick` → navigate chi tiết hồ sơ                                             |
| Badge          | CMP-BADGE   | processing/pending/done | Mapping trạng thái enrollment + trạng thái yêu cầu đổi TB                                     |
| Pagination     | CMP-PAGE    | default                 | `pageSize=20`, `total` từ API                                                                  |
| Button         | CMP-BTN     | outline / ghost / primary / danger-ghost | Actions: Xuất Excel, Xem, Xác nhận, Reset, Duyệt, Từ chối                     |
| Modal          | CMP-MODAL   | sm                      | Modal xác nhận enrollment, Modal chi tiết thiết bị                                              |
| Confirm Dialog | CMP-CFIRM   | default / danger        | Xác nhận duyệt / từ chối đổi thiết bị, reset enrollment                                       |
| Toast          | CMP-TOAST   | success / error         | Thông báo sau hành động                                                                        |
| Empty State    | CMP-EMPTY   | default                 | Khi danh sách trống                                                                            |
| Loading        | CMP-LOAD    | skeleton                | 5 dòng skeleton trong table khi loading                                                        |

---

## Chi tiết StatCard Row

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Tổng enrollment  │  │ Chờ xác nhận    │  │ Hoàn thành      │  │ Đổi TB chờ duyệt│
│                  │  │                  │  │                  │  │                  │
│    156           │  │    12            │  │    138           │  │    6             │
│  ▲ +8 tháng này  │  │                  │  │                  │  │  variant=alert   │
│                  │  │  variant=default │  │  variant=default │  │  (border-left    │
│ variant=default  │  │  click → filter  │  │  click → filter  │  │   2px red-700)   │
│                  │  │  tab1 chờ XN     │  │  tab1 hoàn thành │  │  click → tab2    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

| Card                | Value Source                    | Label             | variant   | Change indicator    | Click action                              |
|---------------------|---------------------------------|-------------------|-----------|---------------------|-------------------------------------------|
| Tổng enrollment     | `stats.total_enrollments`       | "Tổng enrollment" | default   | `+N tháng này`      | —                                         |
| Chờ xác nhận        | `stats.pending_confirmation`    | "Chờ xác nhận"    | default   | —                   | Chuyển Tab 1, filter `status=pending`     |
| Hoàn thành          | `stats.completed`               | "Hoàn thành"      | default   | —                   | Chuyển Tab 1, filter `status=completed`   |
| Đổi TB chờ duyệt   | `stats.device_change_pending`   | "Đổi TB chờ duyệt"| alert     | —                   | Chuyển Tab 2                              |

---

## Tab 1 — Danh sách Enrollment

### FilterBar Config (Tab 1)

| Filter        | Component   | Type     | Placeholder / Options                                    | API param     |
|---------------|-------------|----------|----------------------------------------------------------|---------------|
| Tìm kiếm      | CMP-INPUT   | search   | `"Tìm theo tên, CCCD, mã hồ sơ..."`                    | `search`      |
| Trạng thái    | CMP-SEL     | single   | Tất cả / Chờ xác nhận / Hoàn thành / Đang tiến hành     | `status`      |
| Khu vực       | CMP-SEL     | single   | Tất cả / [danh sách địa bàn theo scope]                  | `area_id`     |

### Cấu trúc Table — Enrollment

| #  | Column header    | Key              | Width   | Type      | Sortable | Render                                                                                    |
|----|------------------|------------------|---------|-----------|----------|-------------------------------------------------------------------------------------------|
| 1  | MÃ HỒ SƠ        | `subject_code`   | 110px   | mono      | true     | `font-mono text-[12px] text-zinc-600 tracking-wide`                                      |
| 2  | HỌ TÊN          | `full_name`      | flex    | link      | true     | `text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer` → SCR-021   |
| 3  | SỐ CCCD          | `cccd_number`    | 130px   | mono      | false    | `font-mono text-[12px] text-zinc-600 tracking-wide` — hiện 4 số cuối, ẩn phần còn lại: `***-****-1234` |
| 4  | THIẾT BỊ         | `device_name`    | 140px   | text      | false    | `text-[13px] text-zinc-900` — Tên model thiết bị (VD: Samsung Galaxy A14)                 |
| 5  | NGÀY ENROLL      | `enrolled_at`    | 100px   | date      | true     | `text-[12px] text-zinc-500 tabular-nums` — format `DD/MM/YYYY`                           |
| 6  | TRẠNG THÁI       | `status`         | 110px   | badge     | true     | CMP-BADGE theo mapping bên dưới                                                          |
| 7  | ACTIONS          | —                | 100px   | actions   | false    | `text-right` — Xem / Xác nhận / Reset (tùy trạng thái)                                  |

### Badge mapping — Enrollment status

| Status API value      | Label hiển thị        | CMP-BADGE variant  |
|-----------------------|-----------------------|--------------------|
| `pending`             | Chờ xác nhận          | `pending`          |
| `in_progress`         | Đang tiến hành        | `processing`       |
| `completed`           | Hoàn thành            | `done`             |
| `failed`              | Thất bại              | `urgent`           |
| `suspended`           | Tạm dừng              | `locked`           |

### Actions theo trạng thái — Enrollment

| Trạng thái    | Actions hiển thị                                                                                         |
|---------------|----------------------------------------------------------------------------------------------------------|
| `pending`     | **Xem** (ghost, sm) · **Xác nhận** (outline, sm, text-red-700) · **Từ chối** (danger-ghost, sm)        |
| `in_progress` | **Xem** (ghost, sm)                                                                                     |
| `completed`   | **Xem** (ghost, sm) · **Reset** (danger-ghost, sm) — mở CMP-CFIRM trước khi thực hiện                 |
| `failed`      | **Xem** (ghost, sm) · **Retry** (outline, sm)                                                           |
| `suspended`   | **Xem** (ghost, sm) · **Kích hoạt lại** (outline, sm)                                                   |

---

## Tab 2 — Yêu cầu đổi Thiết bị

### FilterBar Config (Tab 2)

| Filter        | Component   | Type     | Placeholder / Options                              | API param     |
|---------------|-------------|----------|----------------------------------------------------|---------------|
| Tìm kiếm      | CMP-INPUT   | search   | `"Tìm theo tên, mã yêu cầu..."`                  | `search`      |
| Trạng thái    | CMP-SEL     | single   | Tất cả / Chờ duyệt / Đã duyệt / Từ chối           | `status`      |

### Cấu trúc Table — Yêu cầu đổi Thiết bị

| #  | Column header    | Key               | Width   | Type      | Sortable | Render                                                                                   |
|----|------------------|--------------------|---------|-----------|----------|------------------------------------------------------------------------------------------|
| 1  | MÃ YÊU CẦU      | `request_code`     | 100px   | mono      | true     | `font-mono text-[12px] text-zinc-600 tracking-wide`                                     |
| 2  | ĐỐI TƯỢNG       | `subject_name`     | flex    | link      | true     | `text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer` → SCR-021  |
| 3  | THIẾT BỊ CŨ     | `old_device_name`  | 130px   | text      | false    | `text-[13px] text-zinc-900`                                                              |
| 4  | THIẾT BỊ MỚI    | `new_device_name`  | 130px   | text      | false    | `text-[13px] text-zinc-900`                                                              |
| 5  | LÝ DO           | `reason`           | 150px   | text      | false    | `text-[13px] text-zinc-600` — truncate nếu dài, tooltip hiện đầy đủ                     |
| 6  | NGÀY GỬI        | `created_at`       | 100px   | date      | true     | `text-[12px] text-zinc-500 tabular-nums` — format `DD/MM/YYYY`                          |
| 7  | TRẠNG THÁI      | `status`           | 100px   | badge     | true     | CMP-BADGE theo mapping bên dưới                                                         |
| 8  | ACTIONS          | —                  | 130px   | actions   | false    | `text-right`                                                                             |

### Badge mapping — Device change request status

| Status API value      | Label hiển thị   | CMP-BADGE variant  |
|-----------------------|------------------|--------------------|
| `pending`             | Chờ duyệt        | `pending`          |
| `approved`            | Đã duyệt         | `done`             |
| `rejected`            | Từ chối           | `urgent`           |

### Actions theo trạng thái — Đổi thiết bị

| Trạng thái | Actions hiển thị                                                                              |
|------------|-----------------------------------------------------------------------------------------------|
| `pending`  | **Xem** (ghost, sm) · **Duyệt** (primary, sm) · **Từ chối** (danger-ghost, sm)              |
| `approved` | **Xem** (ghost, sm)                                                                          |
| `rejected` | **Xem** (ghost, sm)                                                                          |

---

## Modal: Xác nhận Enrollment (CMP-MODAL size=md)

> Mở khi cán bộ nhấn **Xác nhận** trên enrollment có trạng thái `pending`.

### Layout Modal

```
┌──────────────────────────────────────────────────────────┐
│ Xác nhận Enrollment                              [✕]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ CMP-CARD: Thông tin Enrollment                      │   │
│ │                                                      │   │
│ │ Đối tượng:   Nguyễn Văn A                           │   │
│ │ Số CCCD:     ***-****-1234  (mono)                   │   │
│ │ Thiết bị:    Samsung Galaxy A14                      │   │
│ │ Device ID:   a1b2c3d4  (mono)                        │   │
│ │ NFC status:  ✓ Hợp lệ (Passive Auth OK)             │   │
│ │ Face match:  ✓ 0.96 (threshold: 0.85)               │   │
│ │ Ngày enroll: 16/03/2026 14:30                        │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Ghi chú (không bắt buộc):                           │   │
│ │ ┌──────────────────────────────────────────────┐    │   │
│ │ │ textarea h-20, placeholder: "Ghi chú..."     │    │   │
│ │ └──────────────────────────────────────────────┘    │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│                        [Hủy bỏ]  [Xác nhận enrollment]   │
│                        outline    primary                 │
└──────────────────────────────────────────────────────────┘
```

### Form Fields — Modal Xác nhận Enrollment

#### Ghi chú (note)
- Component: CMP-TXT (textarea)
- label: `"Ghi chú"`
- placeholder: `"Ghi chú xác nhận (không bắt buộc)..."`
- monospace: false
- validation: không bắt buộc, maxLength 500 ký tự

---

## Confirm Dialog: Duyệt đổi Thiết bị (CMP-CFIRM variant=default)

> Mở khi cán bộ nhấn **Duyệt** trên yêu cầu đổi thiết bị có trạng thái `pending`.

```
┌──────────────────────────────────────────────────────┐
│ ⚠  Duyệt yêu cầu đổi thiết bị                       │
│                                                       │
│ Xác nhận duyệt yêu cầu đổi thiết bị cho              │
│ Nguyễn Văn A?                                         │
│                                                       │
│ • Thiết bị cũ: Samsung Galaxy A14 sẽ bị UNBIND       │
│ • Thiết bị mới: iPhone 15 sẽ được BIND               │
│                                                       │
│ ┌──────────────────────────────────────────────┐      │
│ │ Ghi chú: [textarea]                          │      │
│ │ placeholder: "Lý do duyệt (không bắt buộc)"  │      │
│ └──────────────────────────────────────────────┘      │
│                                                       │
│                         [Hủy bỏ]  [Xác nhận duyệt]   │
│                         outline    primary             │
└──────────────────────────────────────────────────────┘
```

---

## Confirm Dialog: Từ chối đổi Thiết bị (CMP-CFIRM variant=danger)

> Mở khi cán bộ nhấn **Từ chối** trên yêu cầu đổi thiết bị có trạng thái `pending`.

```
┌──────────────────────────────────────────────────────┐
│ ✕  Từ chối yêu cầu đổi thiết bị                      │
│                                                       │
│ Từ chối yêu cầu đổi thiết bị của                      │
│ Nguyễn Văn A?                                         │
│                                                       │
│ ┌──────────────────────────────────────────────┐      │
│ │ Lý do từ chối *: [textarea]                   │      │
│ │ placeholder: "Nhập lý do từ chối..."           │      │
│ └──────────────────────────────────────────────┘      │
│                                                       │
│                         [Hủy bỏ]  [Từ chối]          │
│                         outline    danger-ghost (đỏ)  │
└──────────────────────────────────────────────────────┘
```

### Form Field — Lý do từ chối (reject_reason)
- Component: CMP-TXT (textarea)
- label: `"Lý do từ chối"` (có dấu * đỏ)
- placeholder: `"Nhập lý do từ chối..."`
- required: true → `"Vui lòng nhập lý do từ chối"`
- maxLength: 500 → `"Lý do không được quá 500 ký tự"`

---

## Confirm Dialog: Reset Enrollment (CMP-CFIRM variant=danger)

> Mở khi cán bộ nhấn **Reset** trên enrollment đã `completed`. Dùng khi đối tượng cần re-enroll (thay CCCD mới, 2 hồ sơ merge, v.v.)

```
┌──────────────────────────────────────────────────────┐
│ ⚠  Reset Enrollment                                   │
│                                                       │
│ Reset enrollment sẽ:                                   │
│ • Unbind thiết bị hiện tại                             │
│ • Xóa face embedding & NFC hash                        │
│ • Đối tượng cần enroll lại từ đầu                     │
│                                                       │
│ ┌──────────────────────────────────────────────┐      │
│ │ Lý do reset *: [textarea]                     │      │
│ │ placeholder: "Nhập lý do reset enrollment..."  │      │
│ └──────────────────────────────────────────────┘      │
│                                                       │
│                         [Hủy bỏ]  [Reset Enrollment]  │
│                         outline    danger-ghost (đỏ)   │
└──────────────────────────────────────────────────────┘
```

### Form Field — Lý do reset (reset_reason)
- Component: CMP-TXT (textarea)
- label: `"Lý do reset"` (có dấu * đỏ)
- placeholder: `"Nhập lý do reset enrollment..."`
- required: true → `"Vui lòng nhập lý do reset"`
- maxLength: 500

---

## API Integration

### 1. Lấy thống kê Enrollment — GET `/api/v1/subjects/enrollment/stats`

- **Trigger:** Mount màn hình, sau mỗi action thành công
- **Request:** Query params theo `data_scope` của cán bộ (tự động từ token)
  ```
  GET /api/v1/subjects/enrollment/stats
  Authorization: Bearer {jwt}
  ```
- **Response 200:**
  ```json
  {
    "total_enrollments": 156,
    "pending_confirmation": 12,
    "completed": 138,
    "in_progress": 4,
    "failed": 2,
    "device_change_pending": 6,
    "new_this_month": 8
  }
  ```
- **Response errors:**

  | Status | Toast message                                   |
  |--------|-------------------------------------------------|
  | 401    | `"Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."` |
  | 403    | `"Bạn không có quyền truy cập mục này."`       |
  | 500    | `"Lỗi hệ thống. Vui lòng thử lại sau."`       |

---

### 2. Danh sách Enrollment — GET `/api/v1/subjects/enrollments`

- **Trigger:** Mount Tab 1, thay đổi filter/sort/page
- **Request:**
  ```
  GET /api/v1/subjects/enrollments?page=1&limit=20&sort=enrolled_at&order=desc&search=&status=&area_id=
  Authorization: Bearer {jwt}
  ```
- **Query Params:**

  | Param     | Type    | Default        | Mô tả                                                 |
  |-----------|---------|----------------|--------------------------------------------------------|
  | page      | number  | 1              | Trang hiện tại                                         |
  | limit     | number  | 20             | Số bản ghi / trang                                     |
  | sort      | string  | `enrolled_at`  | Trường sort: `subject_code`, `full_name`, `enrolled_at`, `status` |
  | order     | string  | `desc`         | `asc` / `desc`                                         |
  | search    | string  | `""`           | Fulltext: tên, CCCD, mã hồ sơ                         |
  | status    | string  | `""`           | Filter: `pending` / `in_progress` / `completed` / `failed` / `suspended` |
  | area_id   | string  | `""`           | Filter theo khu vực (scope tự giới hạn)               |

- **Response 200:**
  ```json
  {
    "data": [
      {
        "id": "enr-uuid-001",
        "subject_id": "sub-uuid-001",
        "subject_code": "HS-2024-0047",
        "full_name": "Nguyễn Văn A",
        "cccd_number": "***-****-1234",
        "device_name": "Samsung Galaxy A14",
        "device_id": "a1b2c3d4",
        "enrolled_at": "2026-03-15T14:30:00Z",
        "status": "completed",
        "confirmed_by": "officer-uuid",
        "confirmed_at": "2026-03-15T15:00:00Z",
        "nfc_status": "valid",
        "face_match_score": 0.96,
        "area_name": "Phường Bến Nghé"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "total_pages": 8
    }
  }
  ```
- **Response errors:** Như mục 1

---

### 3. Chi tiết Enrollment — GET `/api/v1/subjects/enrollments/:id`

- **Trigger:** Click **Xem** trong table hoặc mở Modal xác nhận
- **Request:**
  ```
  GET /api/v1/subjects/enrollments/{enrollment_id}
  Authorization: Bearer {jwt}
  ```
- **Response 200:**
  ```json
  {
    "id": "enr-uuid-001",
    "subject_id": "sub-uuid-001",
    "subject_code": "HS-2024-0047",
    "full_name": "Nguyễn Văn A",
    "cccd_number": "***-****-1234",
    "cccd_full": null,
    "device_name": "Samsung Galaxy A14",
    "device_id": "a1b2c3d4",
    "device_os": "Android 13",
    "device_model": "SM-A145F",
    "enrolled_at": "2026-03-15T14:30:00Z",
    "status": "pending",
    "nfc_status": "valid",
    "nfc_pa_result": "PASSED",
    "face_match_score": 0.96,
    "face_threshold": 0.85,
    "confirmed_by": null,
    "confirmed_at": null,
    "note": null,
    "area_name": "Phường Bến Nghé",
    "officer_name": "Trần Văn C"
  }
  ```
- **Response errors:**

  | Status | Toast message                                         |
  |--------|-------------------------------------------------------|
  | 404    | `"Không tìm thấy thông tin enrollment."`             |
  | 401/403/500 | Như mục 1                                       |

---

### 4. Xác nhận Enrollment — PATCH `/api/v1/subjects/enrollments/:id/confirm`

- **Trigger:** Cán bộ nhấn **Xác nhận enrollment** trong Modal xác nhận
- **Request:**
  ```json
  PATCH /api/v1/subjects/enrollments/{enrollment_id}/confirm
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "note": "Đã kiểm tra trực tiếp, thông tin hợp lệ."
  }
  ```
- **Response 200:**
  ```json
  {
    "id": "enr-uuid-001",
    "status": "completed",
    "confirmed_by": "officer-uuid",
    "confirmed_at": "2026-03-16T10:00:00Z"
  }
  ```
- **Xử lý thành công:**
  - Đóng Modal
  - Toast success: `"Xác nhận enrollment thành công."`
  - Reload danh sách enrollment + stats
- **Response errors:**

  | Status | Toast message                                                    |
  |--------|------------------------------------------------------------------|
  | 400    | `"Enrollment không ở trạng thái chờ xác nhận."`                 |
  | 404    | `"Không tìm thấy enrollment."`                                  |
  | 409    | `"Enrollment đã được xác nhận bởi cán bộ khác."`               |
  | 401/403/500 | Như mục 1                                                  |

---

### 5. Từ chối Enrollment — PATCH `/api/v1/subjects/enrollments/:id/reject`

- **Trigger:** Cán bộ nhấn **Từ chối** trên enrollment `pending`
- **Request:**
  ```json
  PATCH /api/v1/subjects/enrollments/{enrollment_id}/reject
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "reason": "Ảnh face không khớp, cần enroll lại."
  }
  ```
- **Response 200:**
  ```json
  {
    "id": "enr-uuid-001",
    "status": "failed",
    "rejected_by": "officer-uuid",
    "rejected_at": "2026-03-16T10:05:00Z"
  }
  ```
- **Xử lý thành công:**
  - Đóng Confirm
  - Toast success: `"Đã từ chối enrollment."`
  - Reload danh sách + stats

---

### 6. Reset Enrollment — PATCH `/api/v1/subjects/enrollments/:id/reset`

- **Trigger:** Cán bộ xác nhận Reset trong CMP-CFIRM
- **Request:**
  ```json
  PATCH /api/v1/subjects/enrollments/{enrollment_id}/reset
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "reason": "Đối tượng thay CCCD mới, cần re-enroll."
  }
  ```
- **Response 200:**
  ```json
  {
    "id": "enr-uuid-001",
    "status": "pending",
    "device_unbound": true,
    "biometric_cleared": true
  }
  ```
- **Xử lý thành công:**
  - Đóng Confirm
  - Toast success: `"Reset enrollment thành công. Đối tượng cần enroll lại."`
  - Reload danh sách + stats
- **Response errors:**

  | Status | Toast message                                            |
  |--------|----------------------------------------------------------|
  | 400    | `"Không thể reset enrollment ở trạng thái hiện tại."`   |
  | 401/403/404/500 | Như các mục trên                              |

---

### 7. Danh sách yêu cầu đổi Thiết bị — GET `/api/v1/requests?type=device_change`

- **Trigger:** Mount Tab 2, thay đổi filter/sort/page
- **Request:**
  ```
  GET /api/v1/requests?type=device_change&page=1&limit=20&sort=created_at&order=desc&search=&status=
  Authorization: Bearer {jwt}
  ```
- **Query Params:**

  | Param     | Type    | Default        | Mô tả                                |
  |-----------|---------|----------------|---------------------------------------|
  | type      | string  | `device_change`| Cố định, lọc loại yêu cầu            |
  | page      | number  | 1              | Trang hiện tại                        |
  | limit     | number  | 20             | Số bản ghi / trang                    |
  | sort      | string  | `created_at`   | `request_code`, `subject_name`, `created_at`, `status` |
  | order     | string  | `desc`         | `asc` / `desc`                        |
  | search    | string  | `""`           | Fulltext: tên, mã yêu cầu            |
  | status    | string  | `""`           | `pending` / `approved` / `rejected`   |

- **Response 200:**
  ```json
  {
    "data": [
      {
        "id": "req-uuid-001",
        "request_code": "YC-0012",
        "type": "device_change",
        "subject_id": "sub-uuid-001",
        "subject_name": "Nguyễn Văn A",
        "subject_code": "HS-2024-0047",
        "old_device_name": "Samsung Galaxy A14",
        "old_device_id": "a1b2c3d4",
        "new_device_name": "iPhone 15",
        "new_device_id": "e5f6g7h8",
        "reason": "Thiết bị cũ bị hỏng màn hình, không sử dụng được.",
        "created_at": "2026-03-14T09:00:00Z",
        "status": "pending",
        "processed_by": null,
        "processed_at": null,
        "process_note": null
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 6,
      "total_pages": 1
    }
  }
  ```

---

### 8. Duyệt yêu cầu đổi Thiết bị — PATCH `/api/v1/requests/:id/approve`

- **Trigger:** Cán bộ xác nhận Duyệt trong CMP-CFIRM
- **Request:**
  ```json
  PATCH /api/v1/requests/{request_id}/approve
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "note": "Đã xác minh thiết bị mới."
  }
  ```
- **Response 200:**
  ```json
  {
    "id": "req-uuid-001",
    "status": "approved",
    "old_device_unbound": true,
    "new_device_bound": true,
    "processed_by": "officer-uuid",
    "processed_at": "2026-03-16T10:30:00Z"
  }
  ```
- **Xử lý thành công:**
  - Đóng Confirm
  - Toast success: `"Đã duyệt yêu cầu đổi thiết bị. Thiết bị mới đã được bind."`
  - Reload danh sách yêu cầu + stats
- **Response errors:**

  | Status | Toast message                                                     |
  |--------|-------------------------------------------------------------------|
  | 400    | `"Yêu cầu không ở trạng thái chờ duyệt."`                      |
  | 409    | `"Yêu cầu đã được xử lý bởi cán bộ khác."`                     |
  | 401/403/404/500 | Như các mục trên                                       |

---

### 9. Từ chối yêu cầu đổi Thiết bị — PATCH `/api/v1/requests/:id/reject`

- **Trigger:** Cán bộ xác nhận Từ chối trong CMP-CFIRM
- **Request:**
  ```json
  PATCH /api/v1/requests/{request_id}/reject
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "reason": "Thiết bị cũ vẫn hoạt động bình thường."
  }
  ```
- **Response 200:**
  ```json
  {
    "id": "req-uuid-001",
    "status": "rejected",
    "processed_by": "officer-uuid",
    "processed_at": "2026-03-16T10:35:00Z"
  }
  ```
- **Xử lý thành công:**
  - Đóng Confirm
  - Toast success: `"Đã từ chối yêu cầu đổi thiết bị."`
  - Push notification tới đối tượng kèm lý do (backend xử lý)
  - Reload danh sách yêu cầu + stats

---

### 10. Xuất danh sách Enrollment — GET `/api/v1/subjects/enrollments/export`

- **Trigger:** Click nút **Xuất Excel** trên PageHeader
- **Request:**
  ```
  GET /api/v1/subjects/enrollments/export?format=xlsx&status=&area_id=
  Authorization: Bearer {jwt}
  Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  ```
- **Response 200:** Binary file (xlsx), trigger browser download
- **Xử lý thành công:**
  - Toast info: `"Đang tải file..."`
  - Browser download file: `enrollment_YYYYMMDD.xlsx`

---

## States màn hình

| State      | Mô tả                                                                           |
|------------|----------------------------------------------------------------------------------|
| idle       | StatCards hiện số liệu. Tab active hiện table với data. Filter ở trạng thái mặc định. |
| loading    | Mount lần đầu: StatCards hiện skeleton (pulse). Table hiện 5 dòng skeleton loader (CMP-LOAD variant=skeleton). Filter disabled. |
| success    | Sau action (xác nhận, duyệt, từ chối, reset): Toast success, reload data.       |
| error      | API lỗi: Toast error hiện trên cùng (CMP-TOAST variant=error, duration=4000ms). Table/Stats giữ dữ liệu cũ. |
| empty      | Tab 1 không có enrollment: CMP-EMPTY icon=clipboard, text=`"Chưa có enrollment nào."` |
|            | Tab 2 không có yêu cầu: CMP-EMPTY icon=inbox, text=`"Không có yêu cầu đổi thiết bị."` |

---

## Navigation

| Trigger                                      | Destination                         | Method          |
|----------------------------------------------|-------------------------------------|-----------------|
| Click tên đối tượng trong table              | `/ho-so/{subject_id}`               | `router.push`   |
| Click **Xem** (enrollment detail)            | Mở Modal chi tiết enrollment        | state (modal)   |
| Click **Xem** (yêu cầu đổi TB)              | `/xet-duyet/{request_id}`           | `router.push`   |
| Breadcrumb "Hồ sơ"                           | `/ho-so`                            | `router.push`   |
| Sidebar "Hồ sơ" → submenu "Enrollment"      | `/ho-so/enrollment`                 | `router.push`   |
| Click StatCard "Đổi TB chờ duyệt"           | Chuyển sang Tab 2                   | state (tab)     |
| Click StatCard "Chờ xác nhận"               | Chuyển Tab 1, filter status=pending | state (tab + filter) |
| Xác nhận enrollment thành công               | Reload trang (giữ tab + filter)     | refetch data    |
| Duyệt/Từ chối đổi TB thành công             | Reload trang (giữ tab + filter)     | refetch data    |

---

## Responsive

| Breakpoint        | Thay đổi                                                                                         |
|-------------------|---------------------------------------------------------------------------------------------------|
| Desktop (≥1024px) | AppLayout đầy đủ. StatCards 4 cột. Table hiện tất cả columns.                                   |
| Tablet (640-1023px)| Sidebar ẩn → hamburger menu. StatCards 2x2 grid. Table hiện tất cả columns, horizontal scroll.  |
| Mobile (<640px)   | Sidebar ẩn → hamburger. Content full-width, padding 12px. StatCards stack 1 cột. Table horizontal scroll. Filter fields stack vertical. Actions trong table chuyển thành icon-only (tooltip hover). Tabs chuyển full-width. |

---

## Edge Cases

| # | Tình huống                                    | Xử lý                                                                                                          |
|---|-----------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| 1 | Enrollment đã xác nhận bởi cán bộ khác (409)  | Toast error: `"Enrollment đã được xác nhận bởi cán bộ khác."` Reload danh sách.                                |
| 2 | Yêu cầu đổi TB đã xử lý bởi cán bộ khác (409)| Toast error: `"Yêu cầu đã được xử lý bởi cán bộ khác."` Reload danh sách.                                     |
| 3 | Đối tượng đã bị soft delete                    | Row hiện tag [Đã xóa] (CMP-BADGE variant=locked). Actions disabled.                                            |
| 4 | CCCD hiển thị — bảo mật                        | Chỉ hiện 4 số cuối trong table: `***-****-1234`. Full CCCD chỉ hiện trong Modal chi tiết (quyền officer+).     |
| 5 | Nhiều yêu cầu đổi TB pending cùng đối tượng   | API chỉ cho phép 1 yêu cầu pending / đối tượng. Nếu frontend hiện >1 do stale data → reload sẽ normalize.     |
| 6 | Reset enrollment cho đối tượng đang có kịch bản| Backend tự suspend kịch bản. Frontend hiện cảnh báo trong CMP-CFIRM: "Kịch bản đang áp dụng sẽ bị tạm dừng." |
| 7 | Export Excel khi danh sách trống               | Toast info: `"Không có dữ liệu để xuất."` Không trigger download.                                              |
| 8 | Filter không có kết quả                        | Table chuyển CMP-EMPTY: `"Không tìm thấy kết quả phù hợp."` + nút `"Xóa bộ lọc"` (ghost).                    |
| 9 | Network timeout khi xác nhận/duyệt            | Toast error: `"Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại."` Modal/Confirm giữ nguyên, button re-enable. |
| 10| Face match score thấp (< threshold nhưng > 0.7)| Modal xác nhận hiện cảnh báo vàng: "⚠ Face match score thấp (0.78). Vui lòng kiểm tra kỹ trước khi xác nhận." |
| 11| Đối tượng chưa có hồ sơ (enrollment orphan)   | Hiện trạng thái `failed` + tooltip: "Hồ sơ chưa được tạo trên Web."                                           |
| 12| Device ID trùng (thiết bị đã bind cho người khác) | Backend reject với 400. Toast: `"Thiết bị đã được đăng ký cho đối tượng khác."`                             |

---

## Quy tắc nghiệp vụ áp dụng

| Mã       | Quy tắc                                                          | Áp dụng tại                      |
|----------|-------------------------------------------------------------------|-----------------------------------|
| SBR-01   | CCCD chip NFC hợp lệ = bắt buộc enrollment                      | Hiện NFC status trong Modal       |
| SBR-02   | Enrollment phải có cán bộ xác nhận                                | Nút Xác nhận trên Tab 1          |
| SBR-03   | Bind 1 thiết bị duy nhất                                         | Duyệt đổi TB = unbind cũ + bind mới |
| SBR-16   | Soft delete only                                                  | Enrollment không bị xóa vĩnh viễn |
| SBR-17   | Audit trail cho mọi thay đổi                                     | Mọi action đều ghi Event log     |
| SBR-18   | Biometric data mã hóa, lưu tách biệt                            | Reset enrollment → xóa biometric |

---

## Accessibility

- Table có `role="grid"`, header `scope="col"`, `aria-sort` cho cột sort
- Mọi button có `aria-label` rõ ràng: `"Xác nhận enrollment cho Nguyễn Văn A"`
- Modal: `aria-modal="true"`, focus trap, Escape đóng modal
- Tabs: `role="tablist"` + `role="tab"` + `aria-selected` + keyboard arrow navigation
- Badge: `aria-label` chứa text trạng thái (VD: `aria-label="Trạng thái: Chờ xác nhận"`)
- Toast: `role="alert"` + `aria-live="polite"`
- Filter fields có `<label htmlFor>` liên kết

---

## Figma Reference

- Frame: `SCR/024-QuanLyEnrollment/Desktop`
- Frame: `SCR/024-QuanLyEnrollment/Mobile`
- Frame: `SCR/024-QuanLyEnrollment/Modal-XacNhan`
- Frame: `SCR/024-QuanLyEnrollment/Confirm-DuyetDoiTB`
- Frame: `SCR/024-QuanLyEnrollment/Confirm-Reset`
