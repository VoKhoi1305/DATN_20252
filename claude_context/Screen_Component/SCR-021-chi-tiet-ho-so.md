# SCREEN: Chi tiết hồ sơ (SCR-021)

---

## Metadata

| Field         | Value                                              |
|---------------|----------------------------------------------------|
| Route         | `/ho-so/:id`                                       |
| Page title    | `"Chi tiết hồ sơ — SMTTS"`                        |
| Auth required | true                                               |
| Roles allowed | `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`, `LANH_DAO`, `IT_ADMIN`, `VIEWER` |
| Layout        | AppLayout (LAY-APP)                                |
| Priority      | P0 — Core flow                                     |
| Redirect      | Chưa login → `/login`; Không quyền → `/403`; ID không tồn tại → `/404` |
| Data scope    | Chỉ hiện hồ sơ trong khu vực quản lý (data_scope) của cán bộ, trừ `CAN_BO_QUAN_LY` trở lên có thể tìm toàn hệ thống |

---

## Layout của màn hình này

```
┌──────────────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ h=3px accent bar
├──────────────────────────────────────────────────────────────────────────┤
│ [SMTTS]                                    [Bell] [Tên CB] [Avatar]     │ h=40px topbar
│                                           border-bottom: 2px #b91c1c    │
├───────────┬──────────────────────────────────────────────────────────────┤
│ SIDEBAR   │ MAIN CONTENT (p-4, bg-zinc-50, overflow-y-auto)            │
│ w=148px   │                                                             │
│ bg=       │ ┌──────────────────────────────────────────────────────┐   │
│ #18181b   │ │ PageHeader (LAY-HDR)                                  │   │
│           │ │ [Dashboard] / [Hồ sơ đối tượng] / HS-2024-0047       │   │
│           │ │                                                        │   │
│           │ │ HS-2024-0047              [Chỉnh sửa] [Gán kịch bản] │   │
│           │ │ (font-mono)               (outline)    (secondary)    │   │
│           │ │ Nguyễn Văn A · Đang quản lý  ← subtitle               │   │
│           │ └──────────────────────────────────────────────────────┘   │
│           │                                                             │
│           │ ┌──────────────────────────────────────────────────────┐   │
│           │ │ CMP-TABS (6 tabs)                                     │   │
│           │ │ [Thông tin] [Kịch bản] [Timeline] [Tài liệu] [TB] [EN]│  │
│           │ │  ═══════                                               │   │
│           │ ├──────────────────────────────────────────────────────┤   │
│           │ │                                                        │   │
│           │ │ {Tab Content — thay đổi theo tab active}              │   │
│           │ │                                                        │   │
│           │ │                                                        │   │
│           │ └──────────────────────────────────────────────────────┘   │
│           │                                                             │
└───────────┴──────────────────────────────────────────────────────────────┘
```

---

## Components sử dụng

| Component       | ID          | Variant/Size           | Props đặc biệt                                             |
|-----------------|-------------|------------------------|-------------------------------------------------------------|
| AppLayout       | LAY-APP     | —                      | activeNav="/ho-so"                                          |
| PageHeader      | LAY-HDR     | —                      | breadcrumbs, title=mã HS (mono), subtitle=tên+trạng thái, actions |
| Breadcrumb      | CMP-BRD     | —                      | items cuối `mono=true` (mã hồ sơ)                          |
| Tabs            | CMP-TABS    | —                      | 6 tabs: thong-tin, kich-ban, timeline, tai-lieu, thiet-bi, enrollment |
| Card            | CMP-CARD    | default                | title, titleAction (nút ghost "Sửa" nếu có quyền)         |
| Badge           | CMP-BADGE   | done/processing/pending/urgent/locked | Trạng thái hồ sơ, trạng thái kịch bản, alert severity |
| AlertLevelBadge | CMP-ALVL    | —                      | Trong tab Kịch bản — mức Alert đang mở                     |
| Timeline        | CMP-TLINE   | —                      | Tab Timeline — entries: event/alert/case/scenario           |
| Table           | CMP-TABLE   | compact                | Tab Thiết bị, Tab Tài liệu                                 |
| Tag             | CMP-TAG     | default                | Loại đối tượng, nhãn kịch bản                              |
| Avatar          | CMP-AVT     | xl (48x48)             | Ảnh chân dung đối tượng trong Tab Thông tin                 |
| Button          | CMP-BTN     | outline, secondary, ghost | Actions trong PageHeader và các tab                       |
| FileUpload      | CMP-FILE    | default                | Tab Tài liệu — upload tài liệu đính kèm                   |
| Empty State     | CMP-EMPTY   | —                      | Khi tab không có dữ liệu                                   |
| Loading         | CMP-LOAD    | skeleton               | Khi đang fetch dữ liệu hồ sơ                               |
| Toast           | CMP-TOAST   | success/error          | Sau khi gán kịch bản, upload tài liệu                      |
| Confirm         | CMP-CFIRM   | default                | Xác nhận gán/gỡ kịch bản                                   |
| Pagination      | CMP-PAGE    | —                      | Tab Timeline nếu entries > 20                               |

---

## PageHeader — Chi tiết

### Breadcrumb
```
[Dashboard] / [Hồ sơ đối tượng] / HS-2024-0047
   ↑ href=/dashboard  ↑ href=/ho-so       ↑ current, mono=true
```

### Title row
```
┌───────────────────────────────────────────────────────────────────┐
│ [Avatar xl] HS-2024-0047          [Chỉnh sửa] [Gán kịch bản]    │
│             ↑ font-mono            ↑ outline     ↑ secondary     │
│             text-lg font-semibold  size=md        size=md         │
│                                                                    │
│ Nguyễn Văn A · [Đang quản lý]                                    │
│ ↑ subtitle      ↑ CMP-BADGE variant theo status                  │
│ text-[13px]                                                        │
│ text-zinc-500                                                      │
└───────────────────────────────────────────────────────────────────┘
```

### Mapping trạng thái hồ sơ → Badge variant
| Status         | Display text     | Badge variant  |
|----------------|------------------|----------------|
| INIT           | Khởi tạo         | pending        |
| ENROLLED       | Đã enrollment    | info           |
| ACTIVE         | Đang quản lý     | processing     |
| REINTEGRATE    | Tái hòa nhập     | warning        |
| ENDED          | Kết thúc         | done           |

### Actions (hiển thị theo role)

| Action          | Variant    | Hiện khi                                                 |
|-----------------|------------|----------------------------------------------------------|
| Chỉnh sửa      | outline    | Role ≠ VIEWER, status ≠ ENDED                            |
| Gán kịch bản   | secondary  | Role = `CAN_BO_QUAN_LY`, `LANH_DAO`, `IT_ADMIN`; status = ACTIVE |

---

## Tab 1: Thông tin

### Layout Tab Thông tin
```
┌──────────────────────────────────────────────────────────────────┐
│ [Card: Nhân thân]                                                │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Nhân thân                                         [Sửa ✎]   │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ ┌──────────┐                                                 │ │
│ │ │ Avatar   │  Họ tên:        Nguyễn Văn A                   │ │
│ │ │ xl 48x48 │  CCCD:          001099012345  ← font-mono      │ │
│ │ │ (ảnh     │  Ngày sinh:     15/03/1990                     │ │
│ │ │  chân    │  Giới tính:     Nam                            │ │
│ │ │  dung)   │  SĐT:           0901234567   ← font-mono      │ │
│ │ └──────────┘  Địa chỉ:       123 Nguyễn Trãi, P.BN, Q.1   │ │
│ │               Nơi ĐKQL:      Phường Bến Nghé, Quận 1       │ │
│ │               Loại ĐT:       [Quản chế] ← CMP-TAG          │ │
│ │               Cán bộ PT:     Trần Thị B                     │ │
│ │               Trạng thái:    [Đang quản lý] ← CMP-BADGE    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ gap-4 (16px)                                                     │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Gia đình                                          [Sửa ✎]   │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ Cha:          Nguyễn Văn C — 0901111222 (mono)              │ │
│ │ Mẹ:           Lê Thị D — 0901111333 (mono)                 │ │
│ │ Vợ/Chồng:    Phạm Thị E — 0901111444 (mono)               │ │
│ │ Ghi chú GĐ:  Gia đình ở cùng địa chỉ                      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Pháp lý                                           [Sửa ✎]   │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ Tội danh:     Mô tả tội danh                                │ │
│ │ Điều luật:    Điều 248, Bộ luật Hình sự                    │ │
│ │ Bản án:       Số 123/2023/HS — 15/06/2023 (mono ngày)      │ │
│ │ Hình phạt:    3 năm quản chế                                │ │
│ │ Bắt đầu QL:  01/01/2024                                    │ │
│ │ Kết thúc QL:  31/12/2026                                    │ │
│ │ Ghi chú PL:   Không                                         │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Chi tiết hiển thị dữ liệu trong Card

**Card Nhân thân — Field display**

| Field         | Label            | Hiển thị                                           | Format        |
|---------------|------------------|----------------------------------------------------|---------------|
| photo_url     | —                | CMP-AVT size=xl, ảnh chân dung, bên trái          | image         |
| full_name     | Họ tên           | text-[13px] font-semibold text-zinc-900            | text          |
| cccd          | CCCD             | font-mono text-[12px] text-zinc-600 tracking-wide  | monospace     |
| date_of_birth | Ngày sinh        | DD/MM/YYYY                                          | date          |
| gender        | Giới tính        | Nam / Nữ                                            | text          |
| phone         | SĐT              | font-mono text-[12px] text-zinc-600                | monospace     |
| address       | Địa chỉ          | text-[13px] text-zinc-900                          | text          |
| area          | Nơi ĐKQL         | text-[13px] text-zinc-900                          | text          |
| subject_type  | Loại ĐT          | CMP-TAG                                             | tag           |
| officer       | Cán bộ phụ trách | text-[13px] text-zinc-900                          | text          |
| status        | Trạng thái       | CMP-BADGE theo mapping trạng thái                  | badge         |

**Layout field rows:**
```
Label:  text-[12px] font-medium text-zinc-500  w-[120px] flex-shrink-0
Value:  text-[13px] text-zinc-900  flex-1
Row:    flex items-start gap-3, py-1.5
```

**Card Gia đình — Field display**

| Field          | Label       | Hiển thị                                    |
|----------------|-------------|---------------------------------------------|
| father_name    | Cha         | Tên — SĐT (mono)                           |
| mother_name    | Mẹ          | Tên — SĐT (mono)                           |
| spouse_name    | Vợ/Chồng   | Tên — SĐT (mono)                           |
| family_note    | Ghi chú GĐ | text-[13px]                                 |

**Card Pháp lý — Field display**

| Field           | Label       | Hiển thị                                   |
|-----------------|-------------|---------------------------------------------|
| crime_desc      | Tội danh    | text-[13px]                                 |
| law_article     | Điều luật   | text-[13px]                                 |
| sentence_number | Bản án      | Số/Năm — font-mono cho số bản án           |
| sentence_desc   | Hình phạt   | text-[13px]                                 |
| mgmt_start_date | Bắt đầu QL | DD/MM/YYYY                                  |
| mgmt_end_date   | Kết thúc QL | DD/MM/YYYY                                  |
| legal_note      | Ghi chú PL  | text-[13px]                                 |

---

## Tab 2: Kịch bản

### Layout Tab Kịch bản
```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Kịch bản Quản lý đang áp dụng                    [Đổi KB]   │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │                                                              │ │
│ │ Tên KB:       Quản chế Cơ bản (KB-2024-003, mono)          │ │
│ │ Trạng thái:   [Đang hoạt động] ← CMP-BADGE done            │ │
│ │ Ngày gán:     01/01/2024                                    │ │
│ │ Gán bởi:      Trần Thị B                                   │ │
│ │                                                              │ │
│ │ ┌────────────────────────────────────────────────────────┐  │ │
│ │ │ Quy tắc trình báo                                      │  │ │
│ │ │ Tần suất: 1 lần/ngày | Khung giờ: 06:00-22:00         │  │ │
│ │ │ Grace: 30 phút | Face threshold: 80%                   │  │ │
│ │ │ NFC bắt buộc: Có                                       │  │ │
│ │ └────────────────────────────────────────────────────────┘  │ │
│ │                                                              │ │
│ │ ┌────────────────────────────────────────────────────────┐  │ │
│ │ │ Quy tắc giám sát                                       │  │ │
│ │ │ Geofence: Phường Bến Nghé (polygon)                    │  │ │
│ │ │ Giờ giới nghiêm: 22:00-06:00                           │  │ │
│ │ └────────────────────────────────────────────────────────┘  │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ gap-4                                                            │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Compliance                                                    │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │                                                              │ │
│ │ Compliance rate (30 ngày):   87.5%                          │ │
│ │ text-[24px] font-semibold    ← xanh nếu ≥80%, đỏ nếu <80% │ │
│ │                                                              │ │
│ │ Trình báo đúng:   26/30                                     │ │
│ │ Trình báo muộn:    2                                        │ │
│ │ Bỏ lỡ:             2                                        │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Alert đang mở                                      (3)       │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ CMP-TABLE compact                                            │ │
│ │ ┌──────┬────────────────┬────────┬────────────┬───────────┐ │ │
│ │ │ MÃ   │ LOẠI           │ MỨC ĐỘ│ THỜI GIAN  │ ACTIONS   │ │ │
│ │ ├──────┼────────────────┼────────┼────────────┼───────────┤ │ │
│ │ │AL-078│ Quá hạn TB     │[CAO]   │14/03 15:30 │ [Xem]     │ │ │
│ │ │mono  │                │CMP-ALVL│  muted     │  ghost    │ │ │
│ │ ├──────┼────────────────┼────────┼────────────┼───────────┤ │ │
│ │ │AL-076│ Ngoài geofence │[TB]    │13/03 22:15 │ [Xem]     │ │ │
│ │ └──────┴────────────────┴────────┴────────────┴───────────┘ │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Empty state nếu chưa gán kịch bản:                              │
│   icon=Settings2, title="Chưa gán kịch bản"                    │
│   sub="Gán kịch bản để bắt đầu quản lý đối tượng"             │
│   CTA=[Gán kịch bản] (nếu có quyền)                            │
└──────────────────────────────────────────────────────────────────┘
```

### Compliance rate color rules
| Rate     | Color          | Tailwind                 |
|----------|----------------|--------------------------|
| ≥ 80%    | green-800      | text-green-800           |
| 60–79%   | amber-800      | text-amber-800           |
| < 60%    | red-700        | text-red-700             |

---

## Tab 3: Timeline

### Layout Tab Timeline
```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ FilterBar nhỏ (inline trong tab)                              │ │
│ │ [Loại ▼: Tất cả] [Từ — Đến]                       [Lọc]    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ CMP-TLINE                                                        │
│ │                                                                 │
│ ├── 15/03/2026 09:47                                             │
│ │   ● [Event] Trình báo thành công                               │
│ │     GPS: 10.762, 106.682 — Trong geofence                     │
│ │     Face match: 94.2%                                          │
│ │                                                                 │
│ ├── 14/03/2026 15:30                                             │
│ │   ▲ [Alert CAO] Quá hạn trình báo                             │
│ │     Rule: D1 — Không trình báo trong khung giờ                 │
│ │     [Xem Alert →]                                               │
│ │                                                                 │
│ ├── 14/03/2026 15:31                                             │
│ │   ■ [Case] Case #CS-2024-089 — Mở                             │
│ │     Auto-escalated từ Alert #AL-078                            │
│ │     [Xem Case →]                                                │
│ │                                                                 │
│ ├── 10/03/2026 08:00                                             │
│ │   ○ [Kịch bản] Gán "Quản chế Cơ bản"                         │
│ │     Bởi: Trần Thị C                                            │
│ │                                                                 │
│ │   ... (Xem thêm)                                               │
│ │                                                                 │
│                                                                   │
│ Pagination: CMP-PAGE nếu entries > 20                            │
│                                                                   │
│ Empty state:                                                     │
│   icon=Activity, title="Chưa có sự kiện nào"                    │
│   sub="Lịch sử hoạt động sẽ xuất hiện tại đây"                 │
└──────────────────────────────────────────────────────────────────┘
```

### Timeline filter config
```typescript
filters: [
  {
    key: 'type',
    label: 'Loại',
    type: 'multi-select',
    options: [
      { value: 'event', label: 'Sự kiện' },
      { value: 'alert', label: 'Cảnh báo' },
      { value: 'case', label: 'Vụ việc' },
      { value: 'scenario', label: 'Kịch bản' },
      { value: 'request', label: 'Yêu cầu' },
      { value: 'system', label: 'Hệ thống' },
    ],
    width: 'w-[180px]'
  },
  {
    key: 'date_range',
    label: 'Thời gian',
    type: 'date-range',
    width: 'w-[240px]'
  }
]
```

---

## Tab 4: Tài liệu

### Layout Tab Tài liệu
```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Tài liệu đính kèm                      [+ Upload tài liệu]  │ │
│ │                                          CMP-BTN outline sm   │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │                                                              │ │
│ │ CMP-TABLE                                                    │ │
│ │ ┌─────┬───────────────────┬───────┬───────────┬──────────┐  │ │
│ │ │ #   │ TÊN TÀI LIỆU     │ LOẠI  │ NGÀY TẢI  │ ACTIONS  │  │ │
│ │ ├─────┼───────────────────┼───────┼───────────┼──────────┤  │ │
│ │ │ 1   │ ban-an-2024.pdf   │ PDF   │15/01/2024 │ [👁][↓][✕]│ │ │
│ │ │     │                   │       │ muted     │ ghost    │  │ │
│ │ ├─────┼───────────────────┼───────┼───────────┼──────────┤  │ │
│ │ │ 2   │ quyet-dinh.docx   │ DOCX  │20/02/2024 │ [👁][↓][✕]│ │ │
│ │ └─────┴───────────────────┴───────┴───────────┴──────────┘  │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ CMP-FILE (hiện khi click "Upload tài liệu" → mở inline)         │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│ │ Kéo thả file vào đây hoặc nhấn để chọn                     │  │
│ │ PDF, DOCX, JPG, PNG — tối đa 10MB                          │  │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                                                   │
│ Empty state:                                                     │
│   icon=FileText, title="Chưa có tài liệu"                      │
│   sub="Upload bản án, quyết định hoặc tài liệu liên quan"      │
│   CTA=[Upload tài liệu] (nếu role ≠ VIEWER)                    │
└──────────────────────────────────────────────────────────────────┘
```

### Table columns — Tab Tài liệu

| Column        | Width   | Content            | Style                                           |
|---------------|---------|--------------------|--------------------------------------------------|
| #             | 40px    | STT                | text-[12px] text-zinc-500                        |
| Tên tài liệu | flex-1  | Filename           | text-[13px] text-zinc-900                        |
| Loại          | 80px    | Extension uppercase| text-[12px] text-zinc-500 uppercase              |
| Ngày tải      | 100px   | DD/MM/YYYY         | text-[12px] text-zinc-500 tabular-nums           |
| Actions       | 100px   | Icon buttons       | text-right, CMP-BTN ghost sm (eye, download, X)  |

### Actions theo role — Tab Tài liệu

| Action           | Icon     | Hiện khi               |
|------------------|----------|------------------------|
| Xem (preview)    | Eye      | Luôn hiện              |
| Tải xuống        | Download | Luôn hiện              |
| Xoá              | X        | Role ≠ VIEWER, status ≠ ENDED |

---

## Tab 5: Thiết bị

### Layout Tab Thiết bị
```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Thiết bị đang gắn                                            │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │                                                              │ │
│ │ Device ID:    abc123def456  ← font-mono                     │ │
│ │ Model:        Samsung Galaxy A54                             │ │
│ │ OS:           Android 14                                     │ │
│ │ Bind date:    01/01/2024                                     │ │
│ │ Trạng thái:   [Active] ← CMP-BADGE done                    │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ gap-4                                                            │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Lịch sử thiết bị                                             │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ CMP-TABLE                                                    │ │
│ │ ┌────────────────┬───────────┬───────────┬──────┬──────────┐│ │
│ │ │ DEVICE ID      │ MODEL     │ TỪ NGÀY   │ĐẾN   │ LÝ DO    ││ │
│ │ ├────────────────┼───────────┼───────────┼──────┼──────────┤│ │
│ │ │ abc123def456   │ Galaxy A54│01/01/2024 │ —    │Enrollment││ │
│ │ │ mono           │           │ muted     │      │          ││ │
│ │ ├────────────────┼───────────┼───────────┼──────┼──────────┤│ │
│ │ │ xyz789ghi012   │ Redmi 12  │15/06/2023 │31/12 │Đổi TB    ││ │
│ │ │ mono           │           │ muted     │/2023 │          ││ │
│ │ └────────────────┴───────────┴───────────┴──────┴──────────┘│ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Empty state (không có thiết bị):                                 │
│   icon=Smartphone, title="Chưa gắn thiết bị"                    │
│   sub="Thiết bị sẽ được gắn sau khi hoàn thành Enrollment"      │
└──────────────────────────────────────────────────────────────────┘
```

### Table columns — Lịch sử thiết bị

| Column    | Width   | Style                                                |
|-----------|---------|------------------------------------------------------|
| Device ID | 160px   | font-mono text-[12px] text-zinc-600 tracking-wide    |
| Model     | flex-1  | text-[13px] text-zinc-900                            |
| Từ ngày   | 100px   | text-[12px] text-zinc-500 tabular-nums               |
| Đến ngày  | 100px   | text-[12px] text-zinc-500 tabular-nums ("—" nếu hiện tại) |
| Lý do     | 120px   | text-[13px] text-zinc-900                            |

---

## Tab 6: Enrollment

### Layout Tab Enrollment
```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Thông tin Enrollment                                          │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │                                                              │ │
│ │ Trạng thái:       [Đã hoàn thành] ← CMP-BADGE done         │ │
│ │ Ngày enrollment:  15/06/2023                                 │ │
│ │ Cán bộ xác nhận:  Trần Thị B                                │ │
│ │ NFC chip:         [Đã verify] ← CMP-BADGE done              │ │
│ │ Face embedding:   [Đã lưu] ← CMP-BADGE done                 │ │
│ │ Thiết bị ban đầu: abc123def456 ← font-mono                  │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Khi chưa enrollment (status = INIT):                             │
│ Empty state:                                                     │
│   icon=UserCheck, title="Chưa enrollment"                        │
│   sub="Đối tượng cần hoàn thành enrollment với cán bộ"          │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Integration

### 1. Lấy chi tiết hồ sơ — GET `/api/v1/subjects/:id`

- **Trigger:** Khi mount trang (useEffect), hoặc khi :id thay đổi
- **Request:**
  ```
  GET /api/v1/subjects/:id
  Authorization: Bearer {token}
  ```
- **Response 200:**
  ```json
  {
    "id": "uuid",
    "code": "HS-2024-0047",
    "full_name": "Nguyễn Văn A",
    "cccd": "001099012345",
    "date_of_birth": "1990-03-15",
    "gender": "MALE",
    "phone": "0901234567",
    "address": "123 Nguyễn Trãi, P.Bến Nghé, Q.1",
    "photo_url": "/uploads/subjects/uuid/photo.jpg",
    "status": "ACTIVE",
    "subject_type": "QUAN_CHE",
    "area": { "id": "uuid", "name": "Phường Bến Nghé, Quận 1" },
    "officer": { "id": "uuid", "name": "Trần Thị B" },
    "scenario": {
      "id": "uuid",
      "code": "KB-2024-003",
      "name": "Quản chế Cơ bản",
      "status": "ACTIVE",
      "assigned_at": "2024-01-01T00:00:00Z",
      "assigned_by": "Trần Thị C",
      "rules": {
        "report_frequency": "1/day",
        "report_window": "06:00-22:00",
        "grace_period_minutes": 30,
        "face_threshold": 0.80,
        "nfc_required": true,
        "geofence_id": "uuid",
        "geofence_name": "Phường Bến Nghé",
        "curfew": "22:00-06:00"
      }
    },
    "family": {
      "father": { "name": "Nguyễn Văn C", "phone": "0901111222" },
      "mother": { "name": "Lê Thị D", "phone": "0901111333" },
      "spouse": { "name": "Phạm Thị E", "phone": "0901111444" },
      "note": "Gia đình ở cùng địa chỉ"
    },
    "legal": {
      "crime_description": "Mô tả tội danh",
      "law_article": "Điều 248, Bộ luật Hình sự",
      "sentence_number": "123/2023/HS",
      "sentence_date": "2023-06-15",
      "sentence_description": "3 năm quản chế",
      "mgmt_start_date": "2024-01-01",
      "mgmt_end_date": "2026-12-31",
      "note": null
    },
    "enrollment": {
      "status": "COMPLETED",
      "enrolled_at": "2023-06-15T10:00:00Z",
      "confirmed_by": "Trần Thị B",
      "nfc_verified": true,
      "face_stored": true,
      "initial_device_id": "abc123def456"
    },
    "compliance": {
      "rate_30d": 87.5,
      "on_time": 26,
      "late": 2,
      "missed": 2,
      "total_days": 30
    },
    "created_at": "2023-06-15T10:00:00Z",
    "updated_at": "2026-03-15T09:47:00Z"
  }
  ```
- **Response errors:**

  | Status | Message hiển thị (Toast variant=error)                 |
  |--------|--------------------------------------------------------|
  | 401    | "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." |
  | 403    | "Bạn không có quyền xem hồ sơ này."                   |
  | 404    | Redirect → `/404`                                      |
  | 500    | "Lỗi hệ thống. Vui lòng thử lại sau."                |

### 2. Lấy thiết bị hiện tại + lịch sử — GET `/api/v1/subjects/:id/devices`

- **Trigger:** Khi chuyển sang tab Thiết bị (lazy load)
- **Request:**
  ```
  GET /api/v1/subjects/:id/devices
  Authorization: Bearer {token}
  ```
- **Response 200:**
  ```json
  {
    "current": {
      "device_id": "abc123def456",
      "model": "Samsung Galaxy A54",
      "os": "Android 14",
      "bound_at": "2024-01-01T00:00:00Z",
      "status": "ACTIVE"
    },
    "history": [
      {
        "device_id": "abc123def456",
        "model": "Samsung Galaxy A54",
        "from_date": "2024-01-01",
        "to_date": null,
        "reason": "Enrollment"
      },
      {
        "device_id": "xyz789ghi012",
        "model": "Xiaomi Redmi 12",
        "from_date": "2023-06-15",
        "to_date": "2023-12-31",
        "reason": "Đổi thiết bị"
      }
    ]
  }
  ```

### 3. Lấy timeline — GET `/api/v1/subjects/:id/timeline`

- **Trigger:** Khi chuyển sang tab Timeline (lazy load)
- **Request:**
  ```
  GET /api/v1/subjects/:id/timeline?page=1&limit=20&type=event,alert,case&from=2024-01-01&to=2026-03-15
  Authorization: Bearer {token}
  ```
- **Response 200:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "timestamp": "2026-03-15T09:47:00Z",
        "type": "event",
        "title": "Trình báo thành công",
        "badge": "Event",
        "details": ["GPS: 10.762, 106.682 — Trong geofence", "Face match: 94.2%"],
        "link": null,
        "actor": null
      }
    ],
    "total": 156,
    "page": 1,
    "limit": 20
  }
  ```

### 4. Lấy tài liệu — GET `/api/v1/subjects/:id/documents`

- **Trigger:** Khi chuyển sang tab Tài liệu (lazy load)
- **Response 200:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "filename": "ban-an-2024.pdf",
        "file_type": "PDF",
        "file_size": 1258291,
        "uploaded_at": "2024-01-15T10:00:00Z",
        "uploaded_by": "Trần Thị B",
        "url": "/uploads/subjects/uuid/documents/ban-an-2024.pdf"
      }
    ],
    "total": 2
  }
  ```

### 5. Upload tài liệu — POST `/api/v1/subjects/:id/documents`

- **Trigger:** Khi user upload file qua CMP-FILE
- **Request:**
  ```
  POST /api/v1/subjects/:id/documents
  Authorization: Bearer {token}
  Content-Type: multipart/form-data
  Body: { file: File }
  ```
- **Response 201:** Document object (thêm vào list)
- **Response errors:**

  | Status | Message hiển thị (Toast)                                |
  |--------|---------------------------------------------------------|
  | 400    | "Định dạng file không được hỗ trợ."                    |
  | 400    | "File vượt quá kích thước cho phép (10MB)."            |
  | 413    | "File quá lớn. Tối đa 10MB."                           |
  | 500    | "Lỗi hệ thống. Vui lòng thử lại sau."                 |

### 6. Xoá tài liệu — DELETE `/api/v1/subjects/:id/documents/:docId`

- **Trigger:** Click nút xoá → CMP-CFIRM → confirm
- **Response 200:** Toast success "Đã xoá tài liệu."
- **Response errors:**

  | Status | Message hiển thị (Toast)                        |
  |--------|-------------------------------------------------|
  | 403    | "Bạn không có quyền xoá tài liệu này."         |
  | 404    | "Tài liệu không tồn tại."                       |
  | 500    | "Lỗi hệ thống. Vui lòng thử lại sau."          |

### 7. Lấy Alert đang mở — GET `/api/v1/subjects/:id/alerts?status=OPEN`

- **Trigger:** Khi chuyển sang tab Kịch bản (lazy load)
- **Response 200:** Paginated list of alerts

### 8. Gán kịch bản — POST `/api/v1/subjects/:id/scenario`

- **Trigger:** Click "Gán kịch bản" → navigate tới SCR-095 (trang gán kịch bản), hoặc Drawer chọn kịch bản
- **Request:**
  ```json
  {
    "scenario_id": "uuid"
  }
  ```
- **Response 200:** Subject object cập nhật → Toast success "Đã gán kịch bản thành công."
- **Cần CMP-CFIRM:** "Gán kịch bản [Tên KB] cho đối tượng [Tên]?"

---

## States màn hình

| State      | Mô tả                                                                    |
|------------|--------------------------------------------------------------------------|
| loading    | Lần đầu load: skeleton loader cho toàn content (CMP-LOAD skeleton)       |
| idle       | Dữ liệu đã load, hiện tab Thông tin mặc định                            |
| tab-loading| Chuyển tab → skeleton riêng cho nội dung tab (lazy load)                 |
| error      | API GET lỗi: Toast error, hiện nút "Thử lại"                            |
| not-found  | 404 → redirect `/404`                                                    |
| no-access  | 403 → redirect `/403`                                                    |
| ended      | status = ENDED → Ẩn nút "Chỉnh sửa", "Gán kịch bản". Badge "Kết thúc" |

### Skeleton loading layout (lần đầu)
```
PageHeader:   1 skeleton bar h-3 w-[200px] (breadcrumb)
              1 skeleton bar h-5 w-[160px] (title)
              1 skeleton bar h-3 w-[240px] (subtitle)
Tabs:         skeleton bar h-4 w-full
Tab content:  3 Card skeletons, mỗi card 3-4 skeleton rows
```

### Tab lazy loading
- Tab Thông tin: load cùng với data chính (không lazy)
- Tab Kịch bản: load cùng với data chính (scenario + compliance đã có trong response)
- Tab Timeline: lazy load khi active, fetch API riêng
- Tab Tài liệu: lazy load khi active, fetch API riêng
- Tab Thiết bị: lazy load khi active, fetch API riêng
- Tab Enrollment: load cùng data chính (đã có trong response)

---

## Navigation

| Trigger                        | Destination                  | Method          |
|--------------------------------|------------------------------|-----------------|
| Click breadcrumb "Dashboard"   | `/dashboard`                 | router.push     |
| Click breadcrumb "Hồ sơ..."   | `/ho-so`                     | router.push     |
| Click "Chỉnh sửa"             | `/ho-so/:id/chinh-sua`       | router.push     |
| Click "Gán kịch bản"          | `/kich-ban/:scenarioId/gan`  | router.push     |
| Click "Xem Alert" (table row) | `/alerts/:alertId`           | router.push     |
| Click "Xem Case →" (timeline) | `/cases/:caseId`             | router.push     |
| Click "Xem Event" (timeline)  | `/events/:eventId`           | router.push     |
| Click tên kịch bản            | `/kich-ban/quan-ly/:kbId`    | router.push     |
| Click preview tài liệu        | Mở tab mới (window.open)    | —               |
| Click download tài liệu       | Download file                | anchor download |
| Back button browser            | `/ho-so` (quay lại danh sách)| browser history |

---

## Responsive

| Breakpoint      | Thay đổi                                                                |
|-----------------|--------------------------------------------------------------------------|
| Desktop ≥1024px | Layout đầy đủ. Card fields 2 cột (label + value). Table hiện tất cả cột.|
| Tablet 640-1023 | Sidebar collapsed (48px). Card fields 1 cột. Table ẩn cột ít quan trọng.|
| Mobile <640px   | Sidebar ẩn → hamburger. PageHeader: actions xuống dòng. Tabs horizontal scroll. Card fields stack dọc. Table → horizontal scroll hoặc card list. Avatar xl → lg. Upload zone full-width. |

### Responsive chi tiết từng tab

**Tab Thông tin (mobile):**
- Avatar hiện phía trên card (center), không inline bên trái
- Field rows: label phía trên, value phía dưới (stack)
- Card padding giảm: px-3 py-2

**Tab Kịch bản (mobile):**
- Compliance rate + stats stack dọc
- Alert table → card list (mỗi alert = 1 mini card)

**Tab Timeline (mobile):**
- FilterBar: mỗi filter full-width, stack dọc
- Timeline entries giữ nguyên layout (đã compact sẵn)

**Tab Tài liệu (mobile):**
- Table → card list: mỗi tài liệu = 1 row card với filename + actions
- Upload zone full-width

**Tab Thiết bị (mobile):**
- Card thiết bị hiện tại: fields stack dọc
- Table lịch sử: horizontal scroll

---

## Edge Cases

| Tình huống                                      | Xử lý                                                                 |
|-------------------------------------------------|------------------------------------------------------------------------|
| Hồ sơ không tồn tại (404)                       | Redirect `/404`                                                        |
| Hồ sơ bị soft delete                            | API trả 404 → redirect `/404`                                         |
| Không có quyền xem (ngoài data_scope)           | API trả 403 → redirect `/403`                                         |
| Chưa gán kịch bản (scenario = null)             | Tab Kịch bản hiện CMP-EMPTY với CTA "Gán kịch bản"                    |
| Hồ sơ trạng thái INIT (chưa enrollment)         | Tab Enrollment hiện CMP-EMPTY. Compliance = N/A. Ẩn nút "Gán kịch bản"|
| Hồ sơ trạng thái ENDED                          | Ẩn nút "Chỉnh sửa" + "Gán kịch bản". Tất cả data read-only. Badge "Kết thúc" |
| Không có thiết bị (device_id = null)             | Tab Thiết bị: Card "Chưa gắn thiết bị" + empty table lịch sử          |
| Timeline rỗng                                    | CMP-EMPTY: "Chưa có sự kiện nào"                                      |
| Tài liệu rỗng                                    | CMP-EMPTY: "Chưa có tài liệu"                                        |
| Upload file quá 10MB                              | Client-side validation → error dưới CMP-FILE                          |
| Upload file sai định dạng                         | Client-side validation → error dưới CMP-FILE                          |
| Ảnh chân dung không có (photo_url = null)        | CMP-AVT hiện initials (2 ký tự đầu họ tên)                            |
| Compliance rate = null (chưa đủ data)            | Hiện "N/A" thay số, text-zinc-400                                      |
| Mất kết nối khi đang load tab                    | Toast "Không có kết nối mạng. Vui lòng thử lại." + nút "Thử lại"     |
| Nhiều Alert đang mở (>5)                         | Table có pagination hoặc "Xem tất cả Alert →" link tới `/alerts?subject=:id` |
| Role VIEWER                                       | Ẩn tất cả nút hành động (Chỉnh sửa, Gán KB, Upload, Xoá tài liệu)   |
| Session hết hạn giữa chừng                       | API 401 → redirect `/login?session=expired`                            |
| URL query param `?tab=timeline`                   | Hỗ trợ deep link vào tab cụ thể qua URL query param                   |

---

## Accessibility

- `<h1>` cho mã hồ sơ trong PageHeader
- `<nav aria-label="Breadcrumb">` cho breadcrumb
- Tab list: `role="tablist"`, mỗi tab `role="tab"`, tab content `role="tabpanel"`
- `aria-selected="true"` cho tab active
- `aria-controls` liên kết tab → tabpanel
- Keyboard: Arrow left/right chuyển tab, Enter/Space chọn tab
- Card title: `<h2>` hoặc `<h3>` semantic heading
- Link trong timeline: `aria-label` mô tả đích đến
- Table: `aria-label` cho mỗi table mô tả nội dung
- Focus management: khi chuyển tab → focus vào tabpanel
- Screen reader: Badge trạng thái có `aria-label` đầy đủ (VD: "Trạng thái: Đang quản lý")

---

## Ghi chú kỹ thuật

### State management
```typescript
// Local state
const [activeTab, setActiveTab] = useState('thong-tin');
const [subject, setSubject] = useState<Subject | null>(null);
const [loading, setLoading] = useState(true);
const [tabData, setTabData] = useState<Record<string, any>>({});

// URL sync cho tab
// ?tab=timeline → setActiveTab('timeline')
// Dùng useSearchParams hoặc shallow routing
```

### Tab keys
```typescript
const TABS = [
  { key: 'thong-tin', label: 'Thông tin' },
  { key: 'kich-ban', label: 'Kịch bản', count: openAlertCount },
  { key: 'timeline', label: 'Timeline' },
  { key: 'tai-lieu', label: 'Tài liệu', count: documentCount },
  { key: 'thiet-bi', label: 'Thiết bị' },
  { key: 'enrollment', label: 'Enrollment' },
];
```

### Monospace fields (bắt buộc font-mono)
- Mã hồ sơ: `HS-2024-0047`
- Số CCCD: `001099012345`
- Số điện thoại (trong data display): `0901234567`
- Mã kịch bản: `KB-2024-003`
- Mã Alert: `AL-078`
- Mã Case: `CS-2024-089`
- Device ID: `abc123def456`
- Timestamp trong timeline: `15/03/2026 09:47`

---

## Figma Reference
- Frame: `SCR/021-ChiTietHoSo/Desktop`
- Frame: `SCR/021-ChiTietHoSo/Mobile`
- Frame: `SCR/021-ChiTietHoSo/Tab-KichBan`
- Frame: `SCR/021-ChiTietHoSo/Tab-Timeline`
- Frame: `SCR/021-ChiTietHoSo/Tab-TaiLieu`
- Frame: `SCR/021-ChiTietHoSo/Tab-ThietBi`
- Frame: `SCR/021-ChiTietHoSo/Tab-Enrollment`
- Frame: `SCR/021-ChiTietHoSo/EmptyState-KichBan`
- Frame: `SCR/021-ChiTietHoSo/Loading-Skeleton`
