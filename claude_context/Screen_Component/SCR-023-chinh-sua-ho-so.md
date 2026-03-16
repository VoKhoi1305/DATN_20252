# SCREEN: Chỉnh sửa hồ sơ (SCR-023)

---

## Metadata

| Field         | Value                                              |
|---------------|----------------------------------------------------|
| Route         | `/ho-so/:id/chinh-sua`                             |
| Page title    | "Chỉnh sửa hồ sơ — SMTTS"                        |
| Auth required | true (JWT + OTP verified)                          |
| Roles allowed | CAN_BO_CO_SO, CAN_BO_QUAN_LY, IT_ADMIN            |
| Layout        | AppLayout                                          |
| Redirect      | Nếu chưa login → `/login`; Nếu không đủ quyền → `/403`; Nếu hồ sơ không tồn tại → `/404` |
| Data scope    | Cán bộ chỉ sửa được hồ sơ trong khu vực quản lý (data_scope). CAN_BO_QUAN_LY có thể sửa đối tượng trong quận/huyện. IT_ADMIN toàn hệ thống |
| SRS ref       | FR-PROFILE-001 (CRUD Hồ sơ), SBR-16, SBR-17      |
| Deep-dive ref | W-05 (Hồ sơ CRUD), W-06 (Version History)         |

---

## AppLayout structure (chuẩn, không thay đổi)

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
┌──────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← accent bar 3px
├──────────────────────────────────────────────────────────────────┤
│ [Logo] SMTTS                      [Bell] [Tên CB] [Avatar]      │ ← topbar h-10
├────────────┬─────────────────────────────────────────────────────┤
│  SIDEBAR   │  MAIN CONTENT (overflow-y: auto, p-4)              │
│  w-[148px] │                                                     │
│            │  ┌─────────────────────────────────────────────┐   │
│  • Tổng    │  │ LAY-HDR: PageHeader                          │   │
│    quan    │  │ Dashboard > Hồ sơ đối tượng > HS-20XX-XXXX  │   │
│  ●─Hồ sơ  │  │  > Chỉnh sửa                                │   │
│  • Event   │  │ "Chỉnh sửa hồ sơ"       [Huỷ bỏ] [Lưu]    │   │
│  • Alert   │  └─────────────────────────────────────────────┘   │
│  • Case    │  ↓ mb-4                                             │
│  • Yêu cầu│  ┌─────────────────────────────────────────────┐   │
│  • Truy vết│  │ CARD: Thông tin nhân thân                    │   │
│  • Bản đồ  │  │ ┌───────────────────┬───────────────────┐   │   │
│  • Kịch bản│  │ │ Họ tên *          │ Số CCCD *  (mono) │   │   │
│  • Báo cáo │  │ ├───────────────────┼───────────────────┤   │   │
│            │  │ │ Ngày sinh *       │ Giới tính *       │   │   │
│  ────────  │  │ ├───────────────────┴───────────────────┤   │   │
│  QUẢN TRỊ  │  │ │ Địa chỉ cư trú *                     │   │   │
│  • Tài     │  │ ├───────────────────┬───────────────────┤   │   │
│    khoản   │  │ │ Số điện thoại     │ Nơi đăng ký QL * │   │   │
│  • Cấu hình│  │ ├───────────────────┴───────────────────┤   │   │
│  • Nhật ký │  │ │ Ảnh chân dung    [Xem] [Thay đổi]    │   │   │
│            │  │ └───────────────────────────────────────┘   │   │
│  Đăng xuất │  └─────────────────────────────────────────────┘   │
│            │  ↓ mt-4                                             │
│            │  ┌─────────────────────────────────────────────┐   │
│            │  │ CARD: Thông tin gia đình                     │   │
│            │  │ ┌───────────────────┬───────────────────┐   │   │
│            │  │ │ Tên cha/mẹ/người  │ Số ĐT người thân  │   │   │
│            │  │ │ giám hộ           │                    │   │   │
│            │  │ ├───────────────────┴───────────────────┤   │   │
│            │  │ │ Địa chỉ người thân                    │   │   │
│            │  │ └───────────────────────────────────────┘   │   │
│            │  └─────────────────────────────────────────────┘   │
│            │  ↓ mt-4                                             │
│            │  ┌─────────────────────────────────────────────┐   │
│            │  │ CARD: Thông tin pháp lý                      │   │
│            │  │ ┌───────────────────┬───────────────────┐   │   │
│            │  │ │ Loại đối tượng *  │ Số bản án (mono)  │   │   │
│            │  │ ├───────────────────┼───────────────────┤   │   │
│            │  │ │ Ngày bắt đầu QL  │ Ngày KT dự kiến   │   │   │
│            │  │ ├───────────────────┴───────────────────┤   │   │
│            │  │ │ Ghi chú pháp lý (textarea)            │   │   │
│            │  │ └───────────────────────────────────────┘   │   │
│            │  └─────────────────────────────────────────────┘   │
│            │  ↓ mt-4                                             │
│            │  ┌─────────────────────────────────────────────┐   │
│            │  │ CARD: Ghi chú nội bộ                         │   │
│            │  │ ┌───────────────────────────────────────┐   │   │
│            │  │ │ Ghi chú (textarea)                     │   │   │
│            │  │ └───────────────────────────────────────┘   │   │
│            │  └─────────────────────────────────────────────┘   │
│            │  ↓ mt-6                                             │
│            │  ┌─────────────────────────────────────────────┐   │
│            │  │ FOOTER ACTIONS (sticky bottom on mobile)     │   │
│            │  │              [Huỷ bỏ (ghost)]  [Lưu (primary)] │ │
│            │  └─────────────────────────────────────────────┘   │
└────────────┴─────────────────────────────────────────────────────┘
```

**Ghi chú layout:**
- Form dạng 2 cột trên desktop (grid-cols-2, gap-4), 1 cột trên mobile
- Mỗi section là 1 CMP-CARD với title
- Các field `full_name`, `address`, ghi chú chiếm full-width (col-span-2)
- Footer actions lặp lại cả trong PageHeader (desktop) và cuối form
- Form sử dụng React Hook Form + Zod validation
- Dữ liệu populate từ API GET khi mount

---

## Components sử dụng

| Component      | ID         | Variant       | Props đặc biệt                                     |
|----------------|------------|---------------|-----------------------------------------------------|
| PageHeader     | LAY-HDR    | —             | breadcrumbs=[Dashboard, Hồ sơ, {mã HS}, Chỉnh sửa], title="Chỉnh sửa hồ sơ", actions=[Huỷ bỏ, Lưu] |
| Breadcrumb     | CMP-BRD    | —             | items 4 cấp, mã HS hiển thị mono                   |
| Card           | CMP-CARD   | default       | 4 cards: Nhân thân, Gia đình, Pháp lý, Ghi chú    |
| Input          | CMP-INPUT  | text/tel      | monospace=true cho CCCD, SĐT trong data fields      |
| Select         | CMP-SEL    | default       | Giới tính, Loại đối tượng, Nơi đăng ký QL          |
| DatePicker     | CMP-DATE   | default       | Ngày sinh, Ngày bắt đầu QL, Ngày KT dự kiến       |
| Textarea       | CMP-TXT    | default       | Ghi chú pháp lý, Ghi chú nội bộ                    |
| FileUpload     | CMP-FILE   | image         | Ảnh chân dung (chỉ jpg/png, max 5MB)               |
| Button         | CMP-BTN    | primary       | "Lưu" — size=md, type=submit                       |
| Button         | CMP-BTN    | ghost         | "Huỷ bỏ" — size=md, navigate back                  |
| Toast          | CMP-TOAST  | success/error | Sau save thành công / lỗi API                       |
| Loading        | CMP-LOAD   | skeleton      | Skeleton cho toàn form khi đang fetch dữ liệu      |

---

## Form Fields — Chi tiết

### Section 1: Thông tin nhân thân (Card title: "Thông tin nhân thân")

#### Họ tên
- Component: CMP-INPUT
- name: `full_name`
- type: text
- label: "Họ tên"
- placeholder: "Nhập họ và tên đầy đủ"
- monospace: false
- required: true
- layout: col-span-2 (full width)
- validation:
  - required → "Vui lòng nhập họ tên"
  - minLength(2) → "Tối thiểu 2 ký tự"
  - maxLength(200) → "Tối đa 200 ký tự"

#### Số CCCD
- Component: CMP-INPUT
- name: `cccd`
- type: text
- label: "Số CCCD"
- placeholder: "Nhập 12 chữ số"
- **monospace: true** ← bắt buộc font-mono
- required: true
- **disabled: true** ← CCCD không được sửa sau khi tạo (read-only field, bg-zinc-100, cursor-not-allowed)
- helperText: "CCCD không thể thay đổi sau khi tạo hồ sơ"
- layout: col-span-1
- validation: (không cần validate vì disabled)

#### Ngày sinh
- Component: CMP-DATE
- name: `date_of_birth`
- label: "Ngày sinh"
- placeholder: "DD/MM/YYYY"
- required: true
- layout: col-span-1
- maxDate: today (không được chọn ngày tương lai)
- format hiển thị: DD/MM/YYYY
- validation:
  - required → "Vui lòng chọn ngày sinh"
  - maxDate(today) → "Ngày sinh không hợp lệ"

#### Giới tính
- Component: CMP-SEL
- name: `gender`
- label: "Giới tính"
- placeholder: "Chọn giới tính"
- required: true
- layout: col-span-1
- options:
  - { value: "MALE", label: "Nam" }
  - { value: "FEMALE", label: "Nữ" }
  - { value: "OTHER", label: "Khác" }
- validation:
  - required → "Vui lòng chọn giới tính"

#### Địa chỉ cư trú
- Component: CMP-INPUT
- name: `address`
- type: text
- label: "Địa chỉ cư trú"
- placeholder: "Nhập địa chỉ cư trú hiện tại"
- monospace: false
- required: true
- layout: col-span-2 (full width)
- validation:
  - required → "Vui lòng nhập địa chỉ"
  - maxLength(500) → "Tối đa 500 ký tự"

#### Số điện thoại
- Component: CMP-INPUT
- name: `phone`
- type: tel
- label: "Số điện thoại"
- placeholder: "0xxxxxxxxx"
- **monospace: true** ← font-mono cho SĐT
- required: false
- layout: col-span-1
- validation:
  - pattern(/^0\d{9}$/) → "Số điện thoại phải có 10 chữ số, bắt đầu bằng 0"

#### Nơi đăng ký quản lý
- Component: CMP-SEL
- name: `area_id`
- label: "Nơi đăng ký quản lý"
- placeholder: "Chọn đơn vị hành chính"
- required: true
- searchable: true (search trong dropdown)
- layout: col-span-1
- options: fetch từ API GET /api/v1/areas (lọc theo data_scope cán bộ)
- validation:
  - required → "Vui lòng chọn nơi đăng ký quản lý"

#### Ảnh chân dung
- Component: CMP-FILE
- name: `photo`
- label: "Ảnh chân dung"
- accept: image/jpeg, image/png
- maxSize: 5MB
- required: false (đã có ảnh từ trước, chỉ thay đổi nếu cần)
- preview: true (hiện ảnh hiện tại, click để thay đổi)
- layout: col-span-2
- helperText: "Định dạng JPG, PNG. Tối đa 5MB"
- validation:
  - fileType → "Chỉ chấp nhận ảnh JPG hoặc PNG"
  - fileSize → "Kích thước ảnh tối đa 5MB"

---

### Section 2: Thông tin gia đình (Card title: "Thông tin gia đình")

#### Tên cha/mẹ/người giám hộ
- Component: CMP-INPUT
- name: `guardian_name`
- type: text
- label: "Cha/mẹ/Người giám hộ"
- placeholder: "Nhập họ tên"
- required: false
- layout: col-span-1
- validation:
  - maxLength(200) → "Tối đa 200 ký tự"

#### Số ĐT người thân
- Component: CMP-INPUT
- name: `guardian_phone`
- type: tel
- label: "SĐT người thân"
- placeholder: "0xxxxxxxxx"
- **monospace: true**
- required: false
- layout: col-span-1
- validation:
  - pattern(/^0\d{9}$/) → "Số điện thoại không hợp lệ"

#### Địa chỉ người thân
- Component: CMP-INPUT
- name: `guardian_address`
- type: text
- label: "Địa chỉ người thân"
- placeholder: "Nhập địa chỉ"
- required: false
- layout: col-span-2
- validation:
  - maxLength(500) → "Tối đa 500 ký tự"

---

### Section 3: Thông tin pháp lý (Card title: "Thông tin pháp lý")

#### Loại đối tượng
- Component: CMP-SEL
- name: `subject_type`
- label: "Loại đối tượng"
- placeholder: "Chọn loại đối tượng"
- required: true
- layout: col-span-1
- options: fetch từ API GET /api/v1/config/subject-types (danh mục cấu hình)
- validation:
  - required → "Vui lòng chọn loại đối tượng"

#### Số bản án / Quyết định
- Component: CMP-INPUT
- name: `legal_document_number`
- type: text
- label: "Số bản án / Quyết định"
- placeholder: "VD: BA-2024/HSST-123"
- **monospace: true** ← mã số pháp lý
- required: false
- layout: col-span-1
- validation:
  - maxLength(100) → "Tối đa 100 ký tự"

#### Ngày bắt đầu quản lý
- Component: CMP-DATE
- name: `management_start_date`
- label: "Ngày bắt đầu quản lý"
- placeholder: "DD/MM/YYYY"
- required: false
- layout: col-span-1
- validation:
  - (nếu có) phải ≤ ngày kết thúc dự kiến → "Ngày bắt đầu phải trước ngày kết thúc"

#### Ngày kết thúc dự kiến
- Component: CMP-DATE
- name: `management_end_date`
- label: "Ngày kết thúc dự kiến"
- placeholder: "DD/MM/YYYY"
- required: false
- layout: col-span-1
- validation:
  - (nếu có) phải ≥ ngày bắt đầu → "Ngày kết thúc phải sau ngày bắt đầu"

#### Ghi chú pháp lý
- Component: CMP-TXT (Textarea)
- name: `legal_notes`
- label: "Ghi chú pháp lý"
- placeholder: "Nhập thông tin pháp lý bổ sung..."
- required: false
- rows: 3
- layout: col-span-2
- validation:
  - maxLength(2000) → "Tối đa 2000 ký tự"

---

### Section 4: Ghi chú nội bộ (Card title: "Ghi chú nội bộ")

#### Ghi chú
- Component: CMP-TXT (Textarea)
- name: `internal_notes`
- label: "Ghi chú"
- placeholder: "Ghi chú nội bộ của cán bộ..."
- required: false
- rows: 4
- layout: col-span-2
- validation:
  - maxLength(5000) → "Tối đa 5000 ký tự"

---

## API Integration

### 1. Load dữ liệu hiện tại — GET `/api/v1/subjects/:id`
- Trigger: Khi component mount (useEffect)
- Headers: `Authorization: Bearer {token}`
- Response 200:
  ```json
  {
    "id": "uuid",
    "cccd_encrypted": "***masked***",
    "cccd_display": "001234567890",
    "full_name": "Nguyễn Văn A",
    "date_of_birth": "1990-05-15",
    "gender": "MALE",
    "address": "123 Đường ABC, Phường XYZ...",
    "phone": "0901234567",
    "photo_url": "/uploads/subjects/uuid/photo.jpg",
    "status": "ACTIVE",
    "area_id": "uuid",
    "area_name": "Phường Bến Nghé, Quận 1",
    "officer_id": "uuid",
    "scenario_id": "uuid",
    "guardian_name": "Nguyễn Văn B",
    "guardian_phone": "0912345678",
    "guardian_address": "456 Đường DEF...",
    "subject_type": "TYPE_A",
    "legal_document_number": "BA-2024/HSST-123",
    "management_start_date": "2024-01-15",
    "management_end_date": "2026-01-15",
    "legal_notes": "...",
    "internal_notes": "...",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-12-01T10:30:00Z"
  }
  ```
- Populate form: Map response → React Hook Form `reset(data)`
- Date fields: parse ISO → Date object cho DatePicker
- CCCD field: hiển thị `cccd_display` với monospace, set disabled
- Ảnh: hiển thị preview từ `photo_url`

- Response errors:
  | Status | Xử lý                                                        |
  |--------|--------------------------------------------------------------|
  | 401    | Redirect `/login?session=expired`                            |
  | 403    | Redirect `/403` — không có quyền xem/sửa hồ sơ này         |
  | 404    | Redirect `/404` — hồ sơ không tồn tại hoặc đã bị xoá       |
  | 500    | Toast error "Lỗi hệ thống. Vui lòng thử lại sau."          |

### 2. Load danh mục — GET `/api/v1/areas` + GET `/api/v1/config/subject-types`
- Trigger: Khi component mount (song song với load dữ liệu)
- Areas: lọc `?scope=officer` — chỉ trả về areas trong data_scope cán bộ
- Subject types: danh sách loại đối tượng từ cấu hình hệ thống
- Dùng cho: dropdown Select (Nơi đăng ký QL, Loại đối tượng)

### 3. Lưu chỉnh sửa — PATCH `/api/v1/subjects/:id`
- Trigger: Click nút "Lưu" (submit form)
- Validation: React Hook Form + Zod validate toàn bộ trước khi gọi API
- Headers: `Authorization: Bearer {token}`, `Content-Type: multipart/form-data` (nếu có ảnh mới) hoặc `application/json` (nếu không đổi ảnh)
- Request body (chỉ gửi fields đã thay đổi — dirty fields):
  ```json
  {
    "full_name": "Nguyễn Văn A",
    "date_of_birth": "1990-05-15",
    "gender": "MALE",
    "address": "123 Đường ABC, Phường XYZ...",
    "phone": "0901234567",
    "area_id": "uuid",
    "guardian_name": "Nguyễn Văn B",
    "guardian_phone": "0912345678",
    "guardian_address": "...",
    "subject_type": "TYPE_A",
    "legal_document_number": "BA-2024/HSST-123",
    "management_start_date": "2024-01-15",
    "management_end_date": "2026-01-15",
    "legal_notes": "...",
    "internal_notes": "..."
  }
  ```
  Nếu có ảnh mới: gửi FormData với field `photo` (file)
- **KHÔNG gửi:** `cccd_encrypted`, `status`, `scenario_id`, `officer_id` (các trường này sửa qua flow riêng)
- Response 200:
  ```json
  {
    "id": "uuid",
    "full_name": "Nguyễn Văn A",
    "updated_at": "2026-03-16T09:00:00Z"
  }
  ```
  - Action: Toast success "Lưu hồ sơ thành công" (variant=success, duration=3000ms)
  - Navigate: `/ho-so/:id` bằng `router.replace`
  - Backend ghi Version History (SBR-17): ai thay đổi gì, khi nào
  - Backend ghi Audit Log (SBR-17): hành vi cán bộ

- Response errors:
  | Status | Message hiển thị (Toast, variant=error)                       |
  |--------|--------------------------------------------------------------|
  | 400    | "[Message từ server]" — VD: "Số điện thoại không hợp lệ"    |
  | 401    | "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." → redirect `/login?session=expired` |
  | 403    | "Bạn không có quyền chỉnh sửa hồ sơ này."                  |
  | 404    | "Không tìm thấy hồ sơ yêu cầu."                            |
  | 409    | "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang." (optimistic locking conflict) |
  | 429    | "Quá nhiều yêu cầu. Vui lòng đợi ít phút."                 |
  | 500    | "Lỗi hệ thống. Vui lòng thử lại sau."                      |

---

## States màn hình

| State       | Mô tả                                                                 |
|-------------|-----------------------------------------------------------------------|
| loading     | Đang fetch dữ liệu (GET /subjects/:id): Skeleton loader cho toàn form. 4 skeleton cards với placeholder bars cho từng field. Buttons disabled |
| idle        | Dữ liệu đã load xong, form populated, sẵn sàng chỉnh sửa. Nút "Lưu" enabled khi có ít nhất 1 field dirty (đã thay đổi so với giá trị gốc) |
| submitting  | Đang gọi PATCH: nút "Lưu" loading (spinner + "Đang lưu..."), nút "Huỷ bỏ" disabled, tất cả input disabled tạm thời |
| success     | API trả 200: Toast success "Lưu hồ sơ thành công" → navigate `/ho-so/:id` |
| error       | API trả 4xx/5xx: Toast error hiện góc trên phải. Form giữ nguyên data, KHÔNG xoá input. Buttons re-enable để user có thể retry |
| fetch-error | Lỗi khi load dữ liệu ban đầu: Hiện error card full-width: icon + "Không thể tải dữ liệu hồ sơ" + nút "Thử lại" |
| no-changes  | User chưa thay đổi gì: nút "Lưu" ở trạng thái disabled (bg-zinc-100, text-zinc-400, cursor-not-allowed) |

---

## Navigation

| Trigger                        | Destination              | Method           |
|--------------------------------|--------------------------|------------------|
| Click breadcrumb "Dashboard"   | `/dashboard`             | router.push      |
| Click breadcrumb "Hồ sơ đối tượng" | `/ho-so`            | router.push      |
| Click breadcrumb mã HS (mono) | `/ho-so/:id`             | router.push      |
| Click "Huỷ bỏ"                | `/ho-so/:id`             | router.back() hoặc router.push |
| Lưu thành công                | `/ho-so/:id`             | router.replace   |
| API 401                       | `/login?session=expired` | router.replace   |
| API 403                       | `/403`                   | router.replace   |
| API 404                       | `/404`                   | router.replace   |

---

## Responsive

| Breakpoint     | Thay đổi                                                           |
|----------------|--------------------------------------------------------------------|
| Desktop ≥1024px| AppLayout đầy đủ. Form 2 cột (grid-cols-2 gap-4). Actions trong PageHeader bên phải title. Footer actions ẩn (chỉ dùng PageHeader actions) |
| Tablet 640–1023px | Sidebar thu nhỏ 48px (icon only). Form vẫn 2 cột. Actions trong PageHeader |
| Mobile <640px  | Sidebar ẩn → hamburger menu. Form 1 cột (grid-cols-1). PageHeader actions xuống dòng dưới title. Footer actions hiện (sticky bottom, bg-white, border-t zinc-200, py-3 px-4, z-200): [Huỷ bỏ (ghost, flex-1)] [Lưu (primary, flex-1)]. Content padding giảm 12px |

---

## Edge Cases

### 1. Unsaved changes — Rời trang khi có thay đổi chưa lưu
- Khi form có dirty fields và user click navigation (breadcrumb, sidebar, browser back):
  - Hiện `CMP-CFIRM` variant=default
  - Title: "Rời khỏi trang?"
  - Body: "Bạn có thay đổi chưa được lưu. Dữ liệu sẽ bị mất nếu rời trang."
  - Buttons: [Ở lại (ghost)] [Rời trang (primary)]
  - Kèm `beforeunload` event cho browser tab close / refresh

### 2. Concurrent edit — Cùng lúc 2 cán bộ sửa 1 hồ sơ
- Backend sử dụng `updated_at` làm optimistic lock:
  - Request PATCH gửi kèm `updated_at` gốc (lúc GET)
  - Nếu `updated_at` trên DB khác → trả 409 Conflict
  - Frontend hiện Toast error: "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang."
  - Hiện nút "Tải lại" trong toast hoặc modal

### 3. Hồ sơ bị xoá (soft delete) trong lúc đang sửa
- API PATCH trả 404
- Hiện Toast error + redirect `/ho-so` sau 3 giây

### 4. Hồ sơ có status = ENDED (đã kết thúc quản lý)
- API GET trả về status = "ENDED"
- Form hiển thị ở chế độ read-only toàn bộ (tất cả input disabled)
- Ẩn nút "Lưu", đổi PageHeader subtitle: "Hồ sơ đã kết thúc quản lý — chỉ xem"
- Hoặc redirect về chi tiết `/ho-so/:id` với Toast info "Hồ sơ đã kết thúc, không thể chỉnh sửa"

### 5. Upload ảnh thất bại
- Nếu ảnh mới quá 5MB → validation error ngay trên field, không gọi API
- Nếu ảnh sai format → validation error
- Nếu upload thành công nhưng PATCH fail → ảnh orphan, backend cần cleanup job

### 6. Mất kết nối mạng
- Toast "Không có kết nối mạng. Vui lòng thử lại."
- Form giữ nguyên data, buttons re-enable
- Không tự retry

### 7. Token hết hạn giữa chừng
- Nếu GET /subjects/:id trả 401 → redirect login
- Nếu PATCH trả 401 → redirect login (data bị mất, không lưu local)
- Hiện Toast "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."

### 8. CCCD field — luôn disabled
- CCCD là trường định danh, không cho phép sửa sau enrollment
- Hiển thị với `monospace: true`, `disabled: true`, bg-zinc-100
- HelperText: "CCCD không thể thay đổi sau khi tạo hồ sơ"
- Nếu cần đổi CCCD → phải tạo hồ sơ mới + liên kết hồ sơ cũ (flow riêng, ngoài scope SCR-023)

### 9. Area dropdown — chỉ hiện area trong scope
- CAN_BO_CO_SO: chỉ thấy phường/xã mình quản lý
- CAN_BO_QUAN_LY: thấy tất cả phường/xã trong quận/huyện
- IT_ADMIN: thấy toàn bộ
- Nếu hồ sơ thuộc area ngoài scope cán bộ hiện tại:
  - Hiện area hiện tại trong dropdown (disabled, chỉ đọc)
  - Hoặc redirect `/403` nếu hoàn toàn không có quyền

### 10. Form validation timing
- **onBlur**: validate field vừa rời focus (hiện lỗi ngay dưới field)
- **onSubmit**: validate toàn bộ form (scroll đến field lỗi đầu tiên, focus vào field đó)
- **onChange (realtime)**: chỉ áp dụng cho format check (SĐT, ngày tháng)
- Error hiển thị: text-xs text-red-700 mt-1 dưới mỗi field

---

## Figma Reference
- Frame: `SCR/023-ChinhSuaHoSo/Desktop`
- Frame: `SCR/023-ChinhSuaHoSo/Mobile`

---

## Zod Schema (tham khảo cho dev)

```typescript
import { z } from 'zod';

export const editSubjectSchema = z.object({
  full_name: z.string()
    .min(2, "Tối thiểu 2 ký tự")
    .max(200, "Tối đa 200 ký tự"),
  // cccd: không có trong schema vì disabled
  date_of_birth: z.date({ required_error: "Vui lòng chọn ngày sinh" })
    .max(new Date(), "Ngày sinh không hợp lệ"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    required_error: "Vui lòng chọn giới tính"
  }),
  address: z.string()
    .min(1, "Vui lòng nhập địa chỉ")
    .max(500, "Tối đa 500 ký tự"),
  phone: z.string()
    .regex(/^0\d{9}$/, "Số điện thoại phải có 10 chữ số, bắt đầu bằng 0")
    .optional()
    .or(z.literal("")),
  area_id: z.string().uuid("Vui lòng chọn nơi đăng ký quản lý"),
  guardian_name: z.string().max(200).optional().or(z.literal("")),
  guardian_phone: z.string()
    .regex(/^0\d{9}$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  guardian_address: z.string().max(500).optional().or(z.literal("")),
  subject_type: z.string().min(1, "Vui lòng chọn loại đối tượng"),
  legal_document_number: z.string().max(100).optional().or(z.literal("")),
  management_start_date: z.date().optional().nullable(),
  management_end_date: z.date().optional().nullable(),
  legal_notes: z.string().max(2000).optional().or(z.literal("")),
  internal_notes: z.string().max(5000).optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.management_start_date && data.management_end_date) {
      return data.management_start_date <= data.management_end_date;
    }
    return true;
  },
  {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["management_end_date"],
  }
);
```

---

## Ghi chú thiết kế bổ sung

### Dirty tracking
- Sử dụng React Hook Form `formState.isDirty` và `formState.dirtyFields`
- Nút "Lưu" chỉ enabled khi `isDirty === true`
- Khi submit, chỉ gửi `dirtyFields` trong PATCH request (giảm payload, tránh overwrite)

### Optimistic lock
- Lưu `updated_at` từ GET response vào hidden state
- Gửi kèm trong PATCH header: `If-Unmodified-Since: {updated_at}`
- Hoặc gửi trong body: `{ "_version": "2024-12-01T10:30:00Z", ...fields }`

### Version History (SBR-17)
- Backend tự ghi version history khi PATCH thành công
- Ghi: `{ officer_id, timestamp, changes: { field: { old, new } } }`
- Hiển thị version history ở SCR-021 (Chi tiết hồ sơ), tab Thông tin hoặc section riêng
- SCR-023 KHÔNG hiển thị version history — chỉ focus vào form edit

### Sidebar active state
- Nav item "Hồ sơ" active: `bg-zinc-800/50, border-left: 2px solid #b91c1c, text-zinc-50`
