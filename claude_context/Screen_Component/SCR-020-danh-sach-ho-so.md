# SCREEN: Danh sách hồ sơ (SCR-020)

---

## Metadata

| Field         | Value                                               |
|---------------|-----------------------------------------------------|
| Route         | `/ho-so`                                            |
| Page title    | `"Hồ sơ đối tượng — SMTTS"`                        |
| Auth required | true                                                |
| Min role      | VIEWER (xem), CAN_BO_CO_SO (tạo mới)               |
| Layout        | AppLayout                                           |
| Redirect      | Chưa login → `/login`; Không đủ quyền → `/403`     |
| Data scope    | Mặc định: theo `data_scope` của cán bộ đăng nhập    |
| Priority      | P0 — Bắt buộc demo                                  |

---

## AppLayout structure (đã định nghĩa — không lặp lại)

```tsx
// <div className="flex flex-col h-screen bg-zinc-50">
//   <div className="h-[3px] bg-red-700 flex-none" />          ← accent bar
//   <header className="h-10 bg-zinc-950 border-b-2
//                      border-red-700 flex-none" />            ← topbar
//   <div className="flex flex-1 overflow-hidden">
//     <aside className="w-[148px] bg-zinc-900 flex-none
//                       overflow-y-auto" />                     ← sidebar (active: "Hồ sơ đối tượng")
//     <main className="flex-1 overflow-y-auto p-4" />          ← content ← SCR-020 render tại đây
//   </div>
// </div>
```

---

## Layout của màn hình này

```
┌──────────────────────────────────────────────────────────────────────┐
│ MAIN CONTENT (flex-1, overflow-y-auto, p-4, bg-zinc-50)             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ BREADCRUMB                                                     │  │
│  │ Dashboard / Hồ sơ đối tượng                                   │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ PAGE HEADER                                                    │  │
│  │ [h1] Hồ sơ đối tượng          [+ Thêm hồ sơ] [↓ Xuất Excel]  │  │
│  │ [subtitle] 156 đối tượng đang quản lý                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  mb-4                                                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ FILTER BAR                                                     │  │
│  │ [🔍 Tìm tên, CCCD...] [Trạng thái ▼] [Kịch bản ▼]           │  │
│  │ [Từ ngày — Đến ngày]  [Lọc] [⚙ Tìm nâng cao]                │  │
│  │                                                                │  │
│  │ Active filters (nếu có):                                      │  │
│  │ [Trạng thái: Đang quản lý ✕] [Kịch bản: Tiêu chuẩn ✕]       │  │
│  │ Xoá tất cả bộ lọc                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  mb-3                                                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ QUERY BUILDER PANEL (ẩn mặc định, toggle bởi "Tìm nâng cao") │  │
│  │ [Điều kiện 1: field ▼] [operator ▼] [value ___] [✕]          │  │
│  │ [AND ▼]                                                        │  │
│  │ [Điều kiện 2: field ▼] [operator ▼] [value ___] [✕]          │  │
│  │ [+ Thêm điều kiện]                                             │  │
│  │ Preview: ho_ten ~ "Nguyễn" AND trang_thai = "dang_quan_ly"    │  │
│  │                            [Xoá tất cả] [Tìm kiếm]           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ DATA TABLE                                                     │  │
│  │ ┌──────────────────────────────────────────────────────────┐   │  │
│  │ │ ☐ │ MÃ HỒ SƠ  │ HỌ TÊN  │ CCCD      │ ĐỊA CHỈ │ KỊCH │  │  │
│  │ │   │            │         │           │         │ BẢN  │  │  │
│  │ │   │            │         │           │         │      │  │  │
│  │ │   │ TRẠNG THÁI │ NGÀY TẠO│ HÀNH ĐỘNG │         │      │  │  │
│  │ ├──────────────────────────────────────────────────────────┤   │  │
│  │ │ ☐ │ HS-2024-   │ Nguyễn  │ 001204    │ 12 Lý   │ Tiêu │  │  │
│  │ │   │ 0047       │ Văn A   │ 012345    │ Thường  │ chuẩn│  │  │
│  │ │   │ (mono)     │         │ (mono)    │ Kiệt    │      │  │  │
│  │ │   │            │         │           │         │      │  │  │
│  │ │   │ [Đang QL]  │ 15/03/  │ [Xem][Sửa]         │      │  │  │
│  │ │   │ (Badge)    │ 2026    │                     │      │  │  │
│  │ ├──────────────────────────────────────────────────────────┤   │  │
│  │ │ ...rows...                                               │   │  │
│  │ └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │ PAGINATION                                                     │  │
│  │ Hiển thị 1-20 trên 156 kết quả     [◀] [1] [2] ... [8] [▶]   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ── HOẶC nếu không có dữ liệu: ──                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ EMPTY STATE                                                    │  │
│  │                 [👥 Users icon, h-12 w-12 zinc-300]            │  │
│  │              Chưa có hồ sơ nào                                 │  │
│  │      Nhấn "Thêm hồ sơ" để bắt đầu quản lý                   │  │
│  │              [+ Thêm hồ sơ]                                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Components sử dụng

| Component   | ID         | Variant           | Props đặc biệt                                                       |
|-------------|------------|-------------------|-----------------------------------------------------------------------|
| PageHeader  | LAY-HDR    | —                 | breadcrumbs, title, subtitle (dynamic count), actions slot            |
| Breadcrumb  | CMP-BRD    | —                 | items: [{label:'Dashboard', href:'/dashboard'}, {label:'Hồ sơ đối tượng'}] |
| Button      | CMP-BTN    | primary           | leftIcon: Plus, "Thêm hồ sơ", size=md — chỉ hiện nếu role ≥ CAN_BO_CO_SO |
| Button      | CMP-BTN    | secondary         | leftIcon: Download, "Xuất Excel", size=sm                            |
| Button      | CMP-BTN    | ghost             | "Tìm nâng cao", leftIcon: SlidersHorizontal, size=sm — toggle QueryBuilder |
| FilterBar   | CMP-FILTER | —                 | searchPlaceholder="Tìm tên, CCCD...", 3 filters: trạng thái, kịch bản, date range |
| Data Table  | CMP-TABLE  | default           | sortable, selectable (checkbox), 9 columns                           |
| Badge       | CMP-BADGE  | theo trạng thái   | Mapping: xem bảng Status → Badge bên dưới                            |
| Pagination  | CMP-PAGE   | —                 | itemsPerPage=20, showInfo=true                                       |
| Empty State | CMP-EMPTY  | —                 | icon=Users, title="Chưa có hồ sơ nào", subtitle + CTA               |
| Loading     | CMP-LOAD   | skeleton          | 5 skeleton rows khi loading ban đầu                                  |
| QueryBuilder| CMP-QBUILD | —                 | fields: 8 SMTTS fields, open toggle                                  |
| Toast       | CMP-TOAST  | success / error   | Cho feedback xuất file, lỗi API                                      |
| Tag         | CMP-TAG    | removable         | Cho active filters                                                    |

---

## Chi tiết cột bảng (CMP-TABLE — ColumnDef)

| #  | Column key     | Header text    | Width      | Align | Font/Style                                      | Sortable | Mô tả                                |
|----|----------------|----------------|------------|-------|--------------------------------------------------|----------|---------------------------------------|
| 0  | _select        | ☐ (checkbox)   | 40px       | center| CMP-TABLE checkbox                               | ✗        | Chọn hàng (multi-select)              |
| 1  | ma_ho_so       | MÃ HỒ SƠ      | 130px      | left  | `font-mono text-[12px] text-zinc-600 tracking-wide` | ✓     | VD: `HS-2024-0047`. Click → navigate chi tiết |
| 2  | full_name      | HỌ TÊN        | flex (1fr) | left  | `text-[13px] text-zinc-900 font-medium`          | ✓        | Link: click → navigate `/ho-so/:id`  |
| 3  | cccd           | CCCD           | 130px      | left  | `font-mono text-[12px] text-zinc-600 tracking-wide` | ✗     | Số CCCD (masked: `001204****45` nếu role < CAN_BO_QUAN_LY) |
| 4  | address        | ĐỊA CHỈ       | 200px      | left  | `text-[13px] text-zinc-900` — truncate ellipsis  | ✗        | Địa chỉ cư trú, tooltip full text    |
| 5  | scenario_name  | KỊCH BẢN       | 130px      | left  | `text-[13px] text-zinc-900`                      | ✓        | Tên kịch bản đang áp dụng. "—" nếu chưa gán |
| 6  | status         | TRẠNG THÁI     | 120px      | left  | CMP-BADGE (xem mapping bên dưới)                 | ✓        | Badge theo lifecycle                  |
| 7  | created_at     | NGÀY TẠO       | 100px      | left  | `text-[12px] text-zinc-500 tabular-nums`         | ✓        | Format: DD/MM/YYYY                    |
| 8  | _actions       | —              | 100px      | right | CMP-BTN ghost size=sm                            | ✗        | [Xem] [Sửa] — xem luôn hiện, sửa cần quyền |

### Quy tắc cột đặc biệt

- **Cột 1 (ma_ho_so)**: Bắt buộc `font-mono`. Click vào mã → navigate `/ho-so/:id`. Style: `text-red-700 hover:text-red-800 hover:underline cursor-pointer`.
- **Cột 2 (full_name)**: Font-medium, click navigate như cột 1.
- **Cột 3 (cccd)**: Bắt buộc `font-mono`. Masking CCCD cho role VIEWER và CAN_BO_CO_SO (chỉ hiện 6 số đầu + 4 số cuối, giữa `****`). CAN_BO_QUAN_LY trở lên thấy đầy đủ.
- **Cột 4 (address)**: `max-w-[200px] truncate` + title tooltip hiện full address.
- **Cột 8 (_actions)**: Nút "Xem" → ghost, navigate `/ho-so/:id`. Nút "Sửa" → ghost, navigate `/ho-so/:id/chinh-sua`, chỉ hiện nếu role ≥ CAN_BO_CO_SO.

### Status → Badge mapping

| Subject status   | Ý nghĩa               | Badge variant  | Badge text        |
|------------------|------------------------|----------------|-------------------|
| INIT             | Khởi tạo hồ sơ        | pending        | Khởi tạo          |
| ENROLLED         | Đã enrollment xong     | info           | Đã đăng ký        |
| ACTIVE           | Đang quản lý           | processing     | Đang quản lý      |
| REINTEGRATE      | Tái hòa nhập           | warning        | Tái hòa nhập      |
| ENDED            | Kết thúc quản lý       | done           | Kết thúc          |

---

## Filter Bar — Chi tiết cấu hình

### Search input

- Component: CMP-INPUT variant=search
- Placeholder: `"Tìm tên, CCCD..."`
- Width: `w-[240px]` (desktop), `w-full` (mobile)
- Behavior: debounce 300ms → gọi API với param `?q=~{value}`
- Monospace: false (search chung, không phải field CCCD)

### Select filters

| # | Key         | Label          | Type        | Width     | Options                                                                                                     |
|---|-------------|----------------|-------------|-----------|-------------------------------------------------------------------------------------------------------------|
| 1 | status      | Trạng thái     | select      | w-[160px] | Tất cả (default), Khởi tạo, Đã đăng ký, Đang quản lý, Tái hòa nhập, Kết thúc                              |
| 2 | scenario_id | Kịch bản       | select      | w-[160px] | Tất cả (default), [dynamic — load từ API `/api/v1/scenarios?type=management&status=active`]                  |
| 3 | date_range  | Ngày tạo       | date-range  | w-[220px] | CMP-DATE variant=range, placeholder "Từ ngày — Đến ngày"                                                    |

### Nút "Tìm nâng cao" (toggle QueryBuilder)

- Component: CMP-BTN variant=ghost size=sm
- leftIcon: SlidersHorizontal (lucide)
- Text: "Tìm nâng cao"
- Behavior: click → toggle CMP-QBUILD `open` state
- Chỉ hiện cho role ≥ CAN_BO_QUAN_LY (xem FR-PROFILE-002 trong SRS: tìm toàn hệ thống nếu có quyền)

### QueryBuilder (CMP-QBUILD)

- Vị trí: ngay dưới FilterBar, trước Table
- Ẩn mặc định (`open=false`)
- Fields: 8 trường SMTTS đã định nghĩa trong CMP-QBUILD spec:
  - `ho_ten` (text), `cccd` (text, mono), `ma_ho_so` (text, mono), `trang_thai` (select), `kich_ban` (select), `dia_ban` (select), `ngay_tao` (date), `sdt` (text, mono)
- Khi "Tìm kiếm" trong QueryBuilder → build query string → gọi API với params tương ứng → FilterBar bị disable (vì đang dùng nâng cao)
- Khi "Xoá tất cả" → quay về FilterBar thường

---

## API Integration

### 1. Lấy danh sách hồ sơ — GET `/api/v1/subjects`

- **Trigger:** Khi mount trang, khi thay đổi filter/search/page/sort, khi QueryBuilder search
- **Request params (query string):**
  ```
  ?page=1
  &limit=20
  &sort=created_at
  &order=desc
  &q=~Nguyễn                          ← search text (optional)
  &status=ACTIVE                       ← filter trạng thái (optional)
  &scenario_id=uuid-xxx                ← filter kịch bản (optional)
  &from=2025-01-01&to=2025-12-31       ← filter ngày tạo (optional)
  &scope=local                         ← default: local (data_scope), advanced: "all"
  ```
- **Advanced search (QueryBuilder):** Gửi thêm param:
  ```
  &advanced=true
  &conditions=[{"field":"ho_ten","operator":"~","value":"Nguyễn","connector":"AND"},
               {"field":"trang_thai","operator":"=","value":"ACTIVE"}]
  ```
  (JSON encoded → URL encoded)
- **Request headers:**
  ```
  Authorization: Bearer {token}
  Content-Type: application/json
  ```
- **Response 200:**
  ```json
  {
    "data": [
      {
        "id": "uuid-xxx",
        "ma_ho_so": "HS-2024-0047",
        "full_name": "Nguyễn Văn A",
        "cccd": "001204012345",
        "date_of_birth": "1990-05-15",
        "address": "12 Lý Thường Kiệt, Phường Bến Nghé, Quận 1, TP.HCM",
        "phone": "0901234567",
        "status": "ACTIVE",
        "scenario_id": "uuid-yyy",
        "scenario_name": "Tiêu chuẩn",
        "area_name": "Phường Bến Nghé",
        "officer_name": "Trần Thị B",
        "created_at": "2024-03-15T09:30:00Z",
        "updated_at": "2024-06-20T14:15:00Z"
      }
    ],
    "total": 156,
    "page": 1,
    "limit": 20
  }
  ```
- **Response errors:**

  | Status | Message hiển thị (Toast, variant=error)                    |
  |--------|------------------------------------------------------------|
  | 400    | `"Tham số tìm kiếm không hợp lệ."`                        |
  | 401    | → redirect `/login?session=expired`                        |
  | 403    | `"Bạn không có quyền xem danh sách hồ sơ."`               |
  | 429    | `"Quá nhiều yêu cầu. Vui lòng đợi ít phút."`             |
  | 500    | `"Lỗi hệ thống. Vui lòng thử lại sau."`                   |

### 2. Xuất danh sách — GET `/api/v1/subjects/export`

- **Trigger:** Click nút "Xuất Excel"
- **Request params:** Gửi cùng filter params đang active (search, status, scenario_id, date range, conditions nếu advanced)
  ```
  ?format=xlsx
  &status=ACTIVE
  &q=~Nguyễn
  (... giống params GET /subjects)
  ```
- **Response 200:** Binary file (xlsx) → browser download
- **Response 202:** Nếu dataset lớn → `{ "job_id": "xxx", "message": "Đang xuất file, sẽ thông báo khi hoàn thành." }` → Toast variant=info
- **Response errors:**

  | Status | Message hiển thị (Toast, variant=error)          |
  |--------|--------------------------------------------------|
  | 400    | `"Không thể xuất file với bộ lọc hiện tại."`    |
  | 403    | `"Bạn không có quyền xuất dữ liệu."`            |
  | 500    | `"Lỗi hệ thống. Vui lòng thử lại sau."`         |

### 3. Lấy danh sách kịch bản cho filter — GET `/api/v1/scenarios`

- **Trigger:** Khi mount trang (load options cho Select filter kịch bản)
- **Request params:**
  ```
  ?type=management&status=active&limit=100
  ```
- **Response 200:**
  ```json
  {
    "data": [
      { "id": "uuid-yyy", "name": "Tiêu chuẩn" },
      { "id": "uuid-zzz", "name": "Tái hòa nhập" }
    ]
  }
  ```

---

## States màn hình

| State           | Mô tả                                                                                       |
|-----------------|----------------------------------------------------------------------------------------------|
| **idle**        | Dữ liệu đã load xong. Table hiện data, pagination active. FilterBar sẵn sàng.               |
| **loading**     | Gọi API lần đầu hoặc khi thay đổi filter/page. Table hiện CMP-LOAD skeleton (5 rows). FilterBar + PageHeader vẫn hiện. Pagination ẩn. |
| **refreshing**  | Thay đổi filter/page sau khi đã có data → giữ data cũ (opacity-50) + spinner nhỏ góc table. Không skeleton toàn bộ. |
| **empty**       | API trả `total: 0` và không có filter active → CMP-EMPTY "Chưa có hồ sơ nào" + CTA "Thêm hồ sơ" (nếu có quyền). |
| **no-results**  | API trả `total: 0` nhưng CÓ filter active → CMP-EMPTY icon=Search, "Không tìm thấy kết quả", sub="Thử thay đổi bộ lọc hoặc từ khoá", không CTA. |
| **error**       | API fail → Toast error. Nếu chưa có data trước đó → CMP-EMPTY "Lỗi tải dữ liệu" + nút "Thử lại". Nếu đã có data → giữ data cũ + Toast. |
| **exporting**   | Click "Xuất Excel" → nút "Xuất Excel" chuyển loading state (spinner + disabled). Toast success khi xong. |

---

## State Management (Local)

```typescript
interface SubjectListState {
  // Data
  subjects: Subject[];
  total: number;

  // Pagination
  currentPage: number;
  itemsPerPage: 20;

  // Sort
  sortField: 'ma_ho_so' | 'full_name' | 'scenario_name' | 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';

  // Filter
  searchQuery: string;
  filterStatus: string | null;
  filterScenarioId: string | null;
  filterDateFrom: string | null;
  filterDateTo: string | null;

  // Advanced search
  advancedOpen: boolean;
  advancedConditions: QueryCondition[];
  isAdvancedActive: boolean;  // true khi đang dùng QueryBuilder search

  // UI states
  loading: boolean;
  refreshing: boolean;
  exporting: boolean;
  error: string | null;

  // Selection
  selectedIds: Set<string>;
  selectAll: boolean;

  // Options (loaded once)
  scenarioOptions: Array<{ id: string; name: string }>;
}
```

---

## Navigation

| Trigger                              | Destination              | Method          |
|--------------------------------------|--------------------------|-----------------|
| Click mã hồ sơ (cột 1)             | `/ho-so/:id`             | router.push     |
| Click họ tên (cột 2)                | `/ho-so/:id`             | router.push     |
| Click nút "Xem" (actions)           | `/ho-so/:id`             | router.push     |
| Click nút "Sửa" (actions)           | `/ho-so/:id/chinh-sua`   | router.push     |
| Click nút "Thêm hồ sơ" (header)    | `/ho-so/them-moi`        | router.push     |
| Click breadcrumb "Dashboard"         | `/dashboard`             | router.push     |
| Thay đổi page (pagination)          | Giữ route, update `?page=N` | URL search params |
| Thay đổi sort                       | Giữ route, update `?sort=field&order=asc` | URL search params |
| Thay đổi filter                     | Giữ route, update query params tương ứng | URL search params |

### URL params sync

Tất cả filter, sort, page được sync vào URL query params để có thể:
- Bookmark / share link có filter
- Browser back/forward hoạt động đúng
- Deep-link từ Dashboard vào danh sách đã filter sẵn (VD: `/ho-so?status=ACTIVE`)

---

## Responsive

| Breakpoint      | Thay đổi                                                                          |
|-----------------|------------------------------------------------------------------------------------|
| Desktop ≥1024px | Layout đầy đủ: sidebar 148px, table hiện tất cả cột, FilterBar 1 dòng, stats subtitle hiện |
| Tablet 640-1023 | Sidebar collapsed (48px). Table ẩn cột: ĐỊA CHỈ, KỊCH BẢN. FilterBar wrap 2 dòng. Nút "Xuất Excel" ẩn text, chỉ hiện icon. |
| Mobile <640px   | Sidebar ẩn → hamburger. **Table → horizontal scroll** (min-width: 700px) hoặc chuyển card list. FilterBar: search full-width, selects wrap. PageHeader: actions xuống dòng dưới subtitle. Pagination: ẩn text info, chỉ hiện page buttons. Nút "Tìm nâng cao" ẩn (QueryBuilder không hỗ trợ mobile). |

### Mobile card list (alternative)

Nếu chọn card list thay vì horizontal scroll table:

```
┌────────────────────────────────────────┐
│ HS-2024-0047 (mono)    [Đang QL] badge │
│ Nguyễn Văn A                           │
│ CCCD: 001204****45 (mono)              │
│ Kịch bản: Tiêu chuẩn                  │
│ 15/03/2026                    [Xem >]  │
└────────────────────────────────────────┘
```

---

## Edge Cases

| # | Tình huống                                         | Xử lý                                                                                    |
|---|---------------------------------------------------|-------------------------------------------------------------------------------------------|
| 1 | Hồ sơ bị soft-delete                              | Không hiện trong danh sách (API đã filter `deleted_at IS NULL`)                            |
| 2 | Cán bộ cơ sở xem ngoài data_scope                 | API trả 403 nếu cố filter `scope=all`. Nút "Tìm nâng cao" ẩn.                            |
| 3 | CCCD trùng khi tạo hồ sơ                          | Xử lý ở SCR-022. Ở list, mỗi CCCD unique → không có duplicate                             |
| 4 | Filter trả 0 kết quả                              | State `no-results`: icon Search, "Không tìm thấy kết quả", gợi ý thay đổi bộ lọc         |
| 5 | Xuất Excel dataset lớn (>5000 hồ sơ)              | API trả 202 + job_id. Toast info "Đang xuất...". Notification khi xong.                   |
| 6 | User thay đổi filter rất nhanh (debounce)          | Search: debounce 300ms. Select filter: apply ngay. Cancel request cũ khi có request mới.   |
| 7 | Token hết hạn giữa chừng                          | API 401 → redirect `/login?session=expired`                                                |
| 8 | Không có kịch bản nào active (scenario_options=[]) | Select kịch bản hiện "Không có kịch bản" disabled option. Filter vẫn hoạt động.           |
| 9 | Role VIEWER                                        | Ẩn: nút "Thêm hồ sơ", nút "Sửa" trong actions, checkbox select, nút "Xuất Excel".       |
| 10| Sort + filter đồng thời                           | Sort áp dụng trên kết quả đã filter. Reset page về 1 khi thay đổi filter.                 |
| 11| Deep-link với filter từ Dashboard                  | VD: Dashboard click "156 đối tượng" → `/ho-so?status=ACTIVE` → parse URL params vào state |
| 12| Kịch bản chưa gán (scenario_id=null)              | Cột KỊCH BẢN hiện "—" (text-zinc-400). Badge trạng thái vẫn hiện theo lifecycle.          |

---

## Hành vi Checkbox (multi-select)

- **Header checkbox**: toggle chọn/bỏ chọn TẤT CẢ items trên trang hiện tại (không phải toàn bộ dataset)
- **Indeterminate**: khi chọn một số nhưng chưa hết → header checkbox hiện trạng thái indeterminate
- **Cross-page selection**: Khi chuyển trang, selectedIds giữ nguyên (persistent selection)
- **Bulk actions** (hiện khi selectedIds.size > 0): Thanh action bar phía trên table:
  ```
  ┌────────────────────────────────────────────────────────────────┐
  │ Đã chọn 3 hồ sơ    [Gán kịch bản (outline)] [Xuất (ghost)]  │
  └────────────────────────────────────────────────────────────────┘
  ```
  - "Gán kịch bản": navigate `/kich-ban/:id/gan?subjects=id1,id2,id3` (chỉ role ≥ CAN_BO_QUAN_LY)
  - "Xuất": xuất Excel cho selected items
- **Visibility**: Checkbox cột chỉ hiện cho role ≥ CAN_BO_CO_SO. VIEWER không thấy checkbox.

---

## Sort Behavior

- Default sort: `created_at DESC` (mới nhất trước)
- Click header → toggle: `asc → desc → no sort (reset về default)`
- Sort icon: mũi tên ▲/▼ cạnh header text. Inactive = zinc-400, Active = zinc-900
- Khi sort thay đổi → reset page về 1
- Sort được sync vào URL: `?sort=full_name&order=asc`

---

## Accessibility

| Yêu cầu                    | Implementation                                                              |
|-----------------------------|-----------------------------------------------------------------------------|
| Page title                  | `<title>Hồ sơ đối tượng — SMTTS</title>` (document.title)                 |
| Breadcrumb nav              | `<nav aria-label="Breadcrumb">` + `<ol>`                                   |
| Table                       | `role="table"` (native `<table>`), `<caption>` screen-reader only          |
| Sort buttons                | `aria-sort="ascending"` / `"descending"` / `"none"` trên `<th>`           |
| Checkbox                    | `aria-label="Chọn hồ sơ {ma_ho_so}"` cho từng row, `"Chọn tất cả"` cho header |
| Pagination                  | `<nav aria-label="Phân trang">`, `aria-current="page"` cho trang active   |
| Empty state                 | `role="status"` + `aria-live="polite"` khi data thay đổi                  |
| Loading                     | `aria-busy="true"` trên table container khi loading                        |
| Keyboard                    | Tab qua filter → table → pagination. Enter trên row → navigate detail     |
| Filter active               | `aria-live="polite"` cho khu vực "Hiển thị X-Y trên Z kết quả" khi filter thay đổi |

---

## Performance Notes

- **Pagination server-side**: API trả `limit` items, không load toàn bộ
- **Debounce search**: 300ms delay trước khi gọi API
- **Cancel previous request**: Dùng AbortController khi filter/page thay đổi liên tục
- **Cache scenario options**: Load 1 lần khi mount, không refetch mỗi lần thay đổi filter
- **Skeleton loading**: Hiện ngay (< 16ms), không delay loading indicator

---

## Figma Reference

- Frame: `SCR/020-DanhSachHoSo/Desktop`
- Frame: `SCR/020-DanhSachHoSo/Mobile`
- Frame: `SCR/020-DanhSachHoSo/Empty`
- Frame: `SCR/020-DanhSachHoSo/Loading`
