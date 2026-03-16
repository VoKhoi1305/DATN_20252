# SCREEN: Thêm hồ sơ mới (SCR-022)

---

## 1. Metadata

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| Mã màn hình   | SCR-022                                                |
| Route         | `/ho-so/them-moi`                                      |
| Page title    | "Thêm hồ sơ mới — SMTTS"                              |
| Auth required | true (Bearer token + OTP verified)                     |
| Roles allowed | `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`, `IT_ADMIN`          |
| Layout        | AppLayout (accent bar + topbar + sidebar + main)       |
| Redirect      | Chưa login → `/login` · Không đủ quyền → `/403`       |
| Ưu tiên       | P0 — Bắt buộc demo                                    |
| SRS Ref       | FR-PROFILE-001 (CRUD Hồ sơ Đối tượng)                 |

---

## 2. Layout ASCII Art

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Accent bar: 3px bg-red-700
├──────────────────────────────────────────────────────────────────────┤
│ [Logo SMTTS]                            [Bell] [Tên CB] [Avatar]    │ ← Topbar: h-10 bg-zinc-950
│                                          border-b-2 border-red-700  │
├────────────┬─────────────────────────────────────────────────────────┤
│  SIDEBAR   │  MAIN CONTENT — bg-zinc-50, p-4, overflow-y-auto       │
│  w-[148px] │                                                         │
│  bg-zinc-  │  ┌─────────────────────────────────────────────────┐   │
│  900       │  │ PageHeader (LAY-HDR)                             │   │
│            │  │ Breadcrumb: Dashboard > Hồ sơ đối tượng >        │   │
│ ┌────────┐ │  │            Thêm hồ sơ mới                       │   │
│ │CHỨC    │ │  │ Title: "Thêm hồ sơ mới"         (không actions) │   │
│ │NĂNG    │ │  └─────────────────────────────────────────────────┘   │
│ │        │ │  mb-4                                                   │
│ │  Tổng  │ │                                                         │
│ │  quan  │ │  ┌─────────────────────────────────────────────────┐   │
│ │>Hồ sơ<│ │  │ CARD: Thông tin nhân thân (CMP-CARD)             │   │
│ │  Event │ │  │ title="Thông tin nhân thân"                      │   │
│ │  Alert │ │  │                                                   │   │
│ │  Case  │ │  │  ┌─ Row 1 ──────────────────────────────────┐   │   │
│ │  Yêu   │ │  │  │ [Họ và tên*]          [Số CCCD*]         │   │   │
│ │  cầu   │ │  │  │ (CMP-INPUT text)      (CMP-INPUT mono)   │   │   │
│ │  ...   │ │  │  │ w-1/2                 w-1/2               │   │   │
│ │        │ │  │  └───────────────────────────────────────────┘   │   │
│ │        │ │  │  ┌─ Row 2 ──────────────────────────────────┐   │   │
│ │        │ │  │  │ [Ngày sinh*]       [Giới tính*]           │   │   │
│ │        │ │  │  │ (CMP-DATE single)  (CMP-SEL)              │   │   │
│ │        │ │  │  │ w-1/2              w-1/2                   │   │   │
│ │        │ │  │  └───────────────────────────────────────────┘   │   │
│ │        │ │  │  ┌─ Row 3 ──────────────────────────────────┐   │   │
│ │        │ │  │  │ [Số điện thoại]    [Nơi ĐKQL*]            │   │   │
│ │        │ │  │  │ (CMP-INPUT tel)    (CMP-SEL searchable)   │   │   │
│ │        │ │  │  │ w-1/2              w-1/2                   │   │   │
│ │        │ │  │  └───────────────────────────────────────────┘   │   │
│ │        │ │  │  ┌─ Row 4 (full-width) ─────────────────────┐   │   │
│ │        │ │  │  │ [Địa chỉ cư trú*]                        │   │   │
│ │        │ │  │  │ (CMP-INPUT text, full-width)              │   │   │
│ │        │ │  │  └───────────────────────────────────────────┘   │   │
│ │        │ │  └─────────────────────────────────────────────────┘   │
│ │        │ │  mt-4                                                   │
│ │        │ │  ┌─────────────────────────────────────────────────┐   │
│ │        │ │  │ CARD: Thông tin gia đình (CMP-CARD)              │   │
│ │        │ │  │ title="Thông tin gia đình"                       │   │
│ │        │ │  │                                                   │   │
│ │        │ │  │  [Họ tên cha/mẹ]     [SĐT người thân]           │   │
│ │        │ │  │  [Địa chỉ gia đình]                              │   │
│ │        │ │  │  [Ghi chú gia đình] (CMP-TXT)                   │   │
│ │        │ │  └─────────────────────────────────────────────────┘   │
│ │        │ │  mt-4                                                   │
│ │        │ │  ┌─────────────────────────────────────────────────┐   │
│ │        │ │  │ CARD: Thông tin pháp lý (CMP-CARD)               │   │
│ │        │ │  │ title="Thông tin pháp lý"                        │   │
│ │        │ │  │                                                   │   │
│ │        │ │  │  [Số bản án/QĐ]      [Ngày ra QĐ]               │   │
│ │        │ │  │  [Cơ quan ra QĐ]     [Thời hạn quản lý]         │   │
│ │        │ │  │  [Tội danh / Lý do quản lý]                      │   │
│ │        │ │  └─────────────────────────────────────────────────┘   │
│ │        │ │  mt-4                                                   │
│ │        │ │  ┌─────────────────────────────────────────────────┐   │
│ │        │ │  │ CARD: Ghi chú (CMP-CARD)                         │   │
│ │        │ │  │ title="Ghi chú"                                  │   │
│ │        │ │  │                                                   │   │
│ │        │ │  │  [Ghi chú chung] (CMP-TXT rows=4)               │   │
│ │        │ │  └─────────────────────────────────────────────────┘   │
│ │        │ │  mt-6                                                   │
│ │        │ │  ┌─ Action Bar ────────────────────────────────────┐   │
│ │        │ │  │                   [Huỷ bỏ (ghost)]  [Lưu (primary)] │
│ │        │ │  │                    ← right-aligned, gap-2           │
│ │        │ │  └─────────────────────────────────────────────────┘   │
│ │        │ │                                                         │
│ └────────┘ │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

### Mobile (<640px)

```
┌──────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Accent bar 3px
├──────────────────────────────────┤
│ [☰] [SMTTS]     [Bell] [Avatar] │ ← Topbar h-10
├──────────────────────────────────┤
│ p-3 (12px) bg-zinc-50           │
│                                  │
│ Dashboard > Hồ sơ > Thêm mới   │ ← Breadcrumb truncate
│ Thêm hồ sơ mới                  │ ← Title h1
│ mb-4                             │
│                                  │
│ ┌──────────────────────────────┐│
│ │ Thông tin nhân thân          ││
│ │                              ││
│ │ [Họ và tên*]    (full-width) ││ ← Mỗi field 1 cột
│ │ [Số CCCD*]      (full-width) ││
│ │ [Ngày sinh*]    (full-width) ││
│ │ [Giới tính*]    (full-width) ││
│ │ [SĐT]           (full-width) ││
│ │ [Nơi ĐKQL*]    (full-width) ││
│ │ [Địa chỉ*]     (full-width) ││
│ └──────────────────────────────┘│
│ mt-4                             │
│ ┌──────────────────────────────┐│
│ │ Thông tin gia đình           ││
│ │ ...                          ││
│ └──────────────────────────────┘│
│ mt-4                             │
│ ┌──────────────────────────────┐│
│ │ Thông tin pháp lý            ││
│ │ ...                          ││
│ └──────────────────────────────┘│
│ mt-4                             │
│ ┌──────────────────────────────┐│
│ │ Ghi chú                      ││
│ │ ...                          ││
│ └──────────────────────────────┘│
│ mt-6                             │
│ [Huỷ bỏ (ghost)] [Lưu (primary)]│ ← w-full, flex gap-2
│                                  │
└──────────────────────────────────┘
```

### Content Layout CSS

```
Form grid (desktop):  grid grid-cols-2 gap-x-4 gap-y-3
Form grid (mobile):   grid grid-cols-1 gap-y-3
Full-width field:     col-span-2 (desktop) / col-span-1 (mobile)
Card gap:             mt-4 (16px) giữa các card sections
Action bar gap:       mt-6 (24px) trước action bar
Action bar align:     flex justify-end gap-2
```

---

## 3. Components sử dụng

| Component   | Mã         | Variant/Size         | Props đặc biệt                                           |
|-------------|------------|----------------------|-----------------------------------------------------------|
| AppLayout   | LAY-APP    | —                    | `activeNav="/ho-so"`                                     |
| Topbar      | LAY-TOP    | —                    | user info từ auth state                                  |
| Sidebar     | LAY-SIDE   | —                    | active item = "Hồ sơ"                                   |
| PageHeader  | LAY-HDR    | —                    | title="Thêm hồ sơ mới", không có actions slot           |
| Breadcrumb  | CMP-BRD    | —                    | 3 items (Dashboard → Hồ sơ đối tượng → Thêm hồ sơ mới) |
| Card        | CMP-CARD   | default              | 4 cards: Nhân thân, Gia đình, Pháp lý, Ghi chú         |
| Input       | CMP-INPUT  | text/tel             | Nhiều fields, một số có `monospace=true`                 |
| Select      | CMP-SEL    | default / searchable | Giới tính (default), Nơi ĐKQL (searchable)              |
| DatePicker  | CMP-DATE   | single               | Ngày sinh, Ngày ra QĐ                                   |
| Textarea    | CMP-TXT    | default              | Ghi chú gia đình, Ghi chú chung                         |
| Button      | CMP-BTN    | primary / ghost, md  | Lưu (primary) + Huỷ bỏ (ghost)                          |
| Toast       | CMP-TOAST  | success / error      | Sau khi submit thành công/thất bại                       |

---

## 4. Form Fields chi tiết

> **Quy ước:** `*` = required · `monospace` = IBM Plex Mono · Validation trigger = onBlur + onSubmit
> **Form lib:** React Hook Form + Zod schema

### 4.1 Section: Thông tin nhân thân

Card title: `"Thông tin nhân thân"` — CMP-CARD variant=default

#### Field: Họ và tên

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `full_name`                                            |
| type          | text                                                   |
| label         | "Họ và tên"                                            |
| placeholder   | "Nhập họ và tên đầy đủ"                                |
| required      | true                                                   |
| monospace     | false                                                  |
| Grid position | Row 1, col 1 (w-1/2 desktop, full mobile)             |
| Validation    |                                                        |
|               | - required → "Vui lòng nhập họ và tên"                |
|               | - minLength(2) → "Tối thiểu 2 ký tự"                  |
|               | - maxLength(200) → "Tối đa 200 ký tự"                 |
|               | - pattern: chỉ chữ cái Unicode + dấu cách → "Họ tên không hợp lệ" |

#### Field: Số CCCD

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `cccd`                                                 |
| type          | text                                                   |
| label         | "Số CCCD"                                              |
| placeholder   | "Nhập 12 chữ số"                                       |
| required      | true                                                   |
| monospace     | **true** — `font-mono text-[12px] tracking-wide text-zinc-600` |
| maxLength     | 12                                                     |
| Grid position | Row 1, col 2 (w-1/2 desktop, full mobile)             |
| Validation    |                                                        |
|               | - required → "Vui lòng nhập số CCCD"                  |
|               | - pattern: `/^\d{12}$/` → "CCCD phải gồm 12 chữ số"  |
|               | - async unique check (onBlur) → "Số CCCD đã tồn tại trong hệ thống" |
| helperText    | "12 ký tự số trên thẻ Căn cước công dân"              |

#### Field: Ngày sinh

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-DATE                                               |
| Field name    | `date_of_birth`                                        |
| variant       | single                                                 |
| label         | "Ngày sinh"                                            |
| placeholder   | "DD/MM/YYYY"                                           |
| required      | true                                                   |
| maxDate       | Hôm nay (không chọn tương lai)                         |
| minDate       | 01/01/1920                                             |
| Grid position | Row 2, col 1 (w-1/2 desktop, full mobile)             |
| Validation    |                                                        |
|               | - required → "Vui lòng chọn ngày sinh"                |
|               | - maxDate → "Ngày sinh không thể trong tương lai"      |
|               | - minAge(14) → "Đối tượng phải từ 14 tuổi trở lên"   |

#### Field: Giới tính

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-SEL                                                |
| Field name    | `gender`                                               |
| variant       | default (không searchable)                             |
| label         | "Giới tính"                                            |
| placeholder   | "Chọn giới tính"                                       |
| required      | true                                                   |
| options       | `[{value:'MALE', label:'Nam'}, {value:'FEMALE', label:'Nữ'}, {value:'OTHER', label:'Khác'}]` |
| Grid position | Row 2, col 2 (w-1/2 desktop, full mobile)             |
| Validation    |                                                        |
|               | - required → "Vui lòng chọn giới tính"                |

#### Field: Số điện thoại

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `phone`                                                |
| type          | tel                                                    |
| label         | "Số điện thoại"                                        |
| placeholder   | "0xxx xxx xxx"                                          |
| required      | false                                                  |
| monospace     | false (trong form nhập liệu; mono chỉ khi hiển thị trong table) |
| maxLength     | 10                                                     |
| Grid position | Row 3, col 1 (w-1/2 desktop, full mobile)             |
| Validation    |                                                        |
|               | - pattern: `/^0\d{9}$/` → "SĐT phải gồm 10 chữ số, bắt đầu bằng 0" |

#### Field: Nơi đăng ký quản lý

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-SEL                                                |
| Field name    | `area_id`                                              |
| variant       | default                                                |
| searchable    | **true** — vì danh sách đơn vị hành chính có thể dài  |
| label         | "Nơi đăng ký quản lý"                                  |
| placeholder   | "Tìm và chọn đơn vị..."                               |
| required      | true                                                   |
| options       | Load từ API `GET /api/v1/areas?scope={user_data_scope}` — trả về danh sách Area theo phạm vi dữ liệu của cán bộ |
| Grid position | Row 3, col 2 (w-1/2 desktop, full mobile)             |
| Validation    |                                                        |
|               | - required → "Vui lòng chọn nơi đăng ký quản lý"     |
| helperText    | "Chọn đơn vị phường/xã quản lý đối tượng"             |

#### Field: Địa chỉ cư trú

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `address`                                              |
| type          | text                                                   |
| label         | "Địa chỉ cư trú"                                      |
| placeholder   | "Nhập địa chỉ cư trú hiện tại"                        |
| required      | true                                                   |
| monospace     | false                                                  |
| Grid position | Row 4, **col-span-2** (full-width cả desktop và mobile)|
| Validation    |                                                        |
|               | - required → "Vui lòng nhập địa chỉ"                  |
|               | - maxLength(500) → "Tối đa 500 ký tự"                 |

---

### 4.2 Section: Thông tin gia đình

Card title: `"Thông tin gia đình"` — CMP-CARD variant=default

> Tất cả fields trong section này đều **không bắt buộc** (optional).

#### Field: Họ tên cha/mẹ hoặc người bảo hộ

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `family_contact_name`                                  |
| type          | text                                                   |
| label         | "Họ tên cha/mẹ hoặc người bảo hộ"                     |
| placeholder   | "Nhập họ tên"                                          |
| required      | false                                                  |
| Grid position | Row 1, col 1                                           |
| Validation    | maxLength(200)                                         |

#### Field: SĐT người thân

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `family_contact_phone`                                 |
| type          | tel                                                    |
| label         | "Số điện thoại người thân"                             |
| placeholder   | "0xxx xxx xxx"                                          |
| required      | false                                                  |
| Grid position | Row 1, col 2                                           |
| Validation    | pattern: `/^0\d{9}$/` (nếu có nhập) → "SĐT không hợp lệ" |

#### Field: Địa chỉ gia đình

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `family_address`                                       |
| type          | text                                                   |
| label         | "Địa chỉ gia đình"                                    |
| placeholder   | "Nhập địa chỉ gia đình (nếu khác địa chỉ cư trú)"   |
| required      | false                                                  |
| Grid position | Row 2, col-span-2 (full-width)                         |
| Validation    | maxLength(500)                                         |

#### Field: Ghi chú gia đình

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-TXT (Textarea)                                     |
| Field name    | `family_notes`                                         |
| label         | "Ghi chú về gia đình"                                 |
| placeholder   | "Thông tin bổ sung về hoàn cảnh gia đình..."          |
| required      | false                                                  |
| rows          | 3                                                      |
| maxLength     | 1000                                                   |
| resizable     | true                                                   |
| Grid position | Row 3, col-span-2 (full-width)                         |

---

### 4.3 Section: Thông tin pháp lý

Card title: `"Thông tin pháp lý"` — CMP-CARD variant=default

> Fields không bắt buộc lúc tạo mới. Có thể bổ sung sau khi chỉnh sửa hồ sơ.

#### Field: Số bản án / Quyết định

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `legal_document_number`                                |
| type          | text                                                   |
| label         | "Số bản án / Quyết định"                               |
| placeholder   | "VD: 45/2024/HS-ST"                                    |
| required      | false                                                  |
| monospace     | **true**                                               |
| Grid position | Row 1, col 1                                           |
| Validation    | maxLength(100)                                         |

#### Field: Ngày ra quyết định

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-DATE                                               |
| Field name    | `legal_document_date`                                  |
| variant       | single                                                 |
| label         | "Ngày ra quyết định"                                   |
| placeholder   | "DD/MM/YYYY"                                           |
| required      | false                                                  |
| maxDate       | Hôm nay                                                |
| Grid position | Row 1, col 2                                           |

#### Field: Cơ quan ra quyết định

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `legal_authority`                                      |
| type          | text                                                   |
| label         | "Cơ quan ra quyết định"                                |
| placeholder   | "VD: TAND Quận 1, TP.HCM"                             |
| required      | false                                                  |
| Grid position | Row 2, col 1                                           |
| Validation    | maxLength(300)                                         |

#### Field: Thời hạn quản lý

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-INPUT                                              |
| Field name    | `management_duration`                                  |
| type          | text                                                   |
| label         | "Thời hạn quản lý"                                     |
| placeholder   | "VD: 24 tháng"                                         |
| required      | false                                                  |
| Grid position | Row 2, col 2                                           |
| Validation    | maxLength(100)                                         |

#### Field: Tội danh / Lý do quản lý

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-TXT (Textarea)                                     |
| Field name    | `legal_reason`                                         |
| label         | "Tội danh / Lý do quản lý"                             |
| placeholder   | "Mô tả tội danh hoặc lý do đưa vào diện quản lý..."  |
| required      | false                                                  |
| rows          | 3                                                      |
| maxLength     | 2000                                                   |
| resizable     | true                                                   |
| Grid position | Row 3, col-span-2 (full-width)                         |

---

### 4.4 Section: Ghi chú

Card title: `"Ghi chú"` — CMP-CARD variant=default

#### Field: Ghi chú chung

| Thuộc tính    | Giá trị                                               |
|---------------|--------------------------------------------------------|
| Component     | CMP-TXT (Textarea)                                     |
| Field name    | `notes`                                                |
| label         | "Ghi chú"                                             |
| placeholder   | "Nhập ghi chú bổ sung về đối tượng..."                |
| required      | false                                                  |
| rows          | 4                                                      |
| maxLength     | 2000                                                   |
| resizable     | true                                                   |
| Grid position | Full-width                                             |

---

### 4.5 Action Bar

| Vị trí   | Align         | Spacing                                            |
|----------|---------------|----------------------------------------------------|
| Dưới cùng| `flex justify-end gap-2` | mt-6 cách card Ghi chú                  |

| Button    | Component | Variant      | Size | Label    | Type   | Behavior                |
|-----------|-----------|--------------|------|----------|--------|-------------------------|
| Huỷ bỏ   | CMP-BTN   | ghost        | md   | "Huỷ bỏ"| button | Navigate back → `/ho-so`|
| Lưu       | CMP-BTN   | **primary**  | md   | "Lưu hồ sơ" | submit | Submit form → POST API |

> **Quy tắc:** Chỉ 1 nút primary trên toàn màn hình. Nút "Lưu hồ sơ" là CTA duy nhất.

---

## 5. Zod Validation Schema

```typescript
import { z } from 'zod';

export const createSubjectSchema = z.object({
  // === Nhân thân (required) ===
  full_name: z
    .string()
    .min(2, 'Tối thiểu 2 ký tự')
    .max(200, 'Tối đa 200 ký tự')
    .regex(/^[\p{L}\s]+$/u, 'Họ tên không hợp lệ'),

  cccd: z
    .string()
    .regex(/^\d{12}$/, 'CCCD phải gồm 12 chữ số'),

  date_of_birth: z
    .string()
    .min(1, 'Vui lòng chọn ngày sinh'),
    // Custom validate: parse DD/MM/YYYY, check age ≥ 14, not future

  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER'], {
      errorMap: () => ({ message: 'Vui lòng chọn giới tính' }),
    }),

  address: z
    .string()
    .min(1, 'Vui lòng nhập địa chỉ')
    .max(500, 'Tối đa 500 ký tự'),

  phone: z
    .string()
    .regex(/^0\d{9}$/, 'SĐT phải gồm 10 chữ số, bắt đầu bằng 0')
    .optional()
    .or(z.literal('')),

  area_id: z
    .string()
    .uuid('Vui lòng chọn nơi đăng ký quản lý'),

  // === Gia đình (optional) ===
  family_contact_name: z.string().max(200).optional().or(z.literal('')),
  family_contact_phone: z
    .string()
    .regex(/^0\d{9}$/, 'SĐT không hợp lệ')
    .optional()
    .or(z.literal('')),
  family_address: z.string().max(500).optional().or(z.literal('')),
  family_notes: z.string().max(1000).optional().or(z.literal('')),

  // === Pháp lý (optional) ===
  legal_document_number: z.string().max(100).optional().or(z.literal('')),
  legal_document_date: z.string().optional().or(z.literal('')),
  legal_authority: z.string().max(300).optional().or(z.literal('')),
  management_duration: z.string().max(100).optional().or(z.literal('')),
  legal_reason: z.string().max(2000).optional().or(z.literal('')),

  // === Ghi chú (optional) ===
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
```

---

## 6. API Integration

### 6.1 Load danh sách Area — GET /api/v1/areas

- **Trigger:** Khi component mount (useEffect / react-query)
- **Endpoint:** `GET /api/v1/areas?scope={user_data_scope}`
- **Headers:** `Authorization: Bearer {token}`
- **Response 200:**
  ```json
  {
    "data": [
      { "id": "uuid-area-1", "name": "Phường Bến Nghé, Quận 1", "level": "ward" },
      { "id": "uuid-area-2", "name": "Phường Đa Kao, Quận 1", "level": "ward" }
    ]
  }
  ```
- **Mapping:** `options = data.map(a => ({ value: a.id, label: a.name }))`
- **Error:** Toast error "Không thể tải danh sách đơn vị. Vui lòng thử lại."

### 6.2 Check CCCD trùng — GET /api/v1/subjects/check-cccd

- **Trigger:** onBlur field CCCD (nếu đã đúng 12 số)
- **Endpoint:** `GET /api/v1/subjects/check-cccd?cccd={value}`
- **Headers:** `Authorization: Bearer {token}`
- **Response 200:**
  ```json
  { "exists": false }
  ```
- **Response 200 (trùng):**
  ```json
  { "exists": true, "subject_id": "uuid-...", "full_name": "Nguyễn Văn A" }
  ```
- **Nếu exists=true:** Set error trên field CCCD → "Số CCCD đã tồn tại trong hệ thống"
- **Debounce:** 500ms sau khi user ngừng gõ
- **Error network:** Không block submit, để server validate khi POST

### 6.3 Tạo hồ sơ — POST /api/v1/subjects

- **Trigger:** Click nút "Lưu hồ sơ" (sau khi form validation pass)
- **Endpoint:** `POST /api/v1/subjects`
- **Headers:**
  - `Authorization: Bearer {token}`
  - `Content-Type: application/json`
- **Request body:**
  ```json
  {
    "full_name": "Nguyễn Văn A",
    "cccd": "012345678901",
    "date_of_birth": "1990-05-15",
    "gender": "MALE",
    "address": "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
    "phone": "0901234567",
    "area_id": "uuid-area-1",
    "family": {
      "contact_name": "Nguyễn Thị B",
      "contact_phone": "0987654321",
      "address": "456 Lê Lợi, Quận 1",
      "notes": "Mẹ ruột, liên lạc được"
    },
    "legal": {
      "document_number": "45/2024/HS-ST",
      "document_date": "2024-01-15",
      "authority": "TAND Quận 1, TP.HCM",
      "management_duration": "24 tháng",
      "reason": "Tội trộm cắp tài sản"
    },
    "notes": "Đối tượng hợp tác tốt"
  }
  ```
  > **Lưu ý:** `date_of_birth` và `legal.document_date` gửi ISO format `YYYY-MM-DD`. Client convert từ DD/MM/YYYY trước khi gửi.
  > **Lưu ý:** Fields optional để trống → không gửi hoặc gửi `null`. Nested objects `family` và `legal` chỉ gửi nếu ít nhất 1 field có giá trị.

- **Response 201 Created:**
  ```json
  {
    "id": "uuid-subject-new",
    "code": "HS-2026-0048",
    "full_name": "Nguyễn Văn A",
    "status": "INIT",
    "created_at": "2026-03-16T09:30:00Z"
  }
  ```
  - **Action:** Toast success → `"Tạo hồ sơ thành công"` (variant=success, 3000ms)
  - **Navigate:** `router.replace('/ho-so/{id}')` — dùng `replace` để không quay lại form bằng nút Back

- **Response Errors:**

  | Status | Error code           | Message hiển thị (Toast variant=error)                        |
  |--------|----------------------|---------------------------------------------------------------|
  | 400    | VALIDATION_ERROR     | `"{message từ server}"` (VD: "Ngày sinh không hợp lệ")       |
  | 401    | UNAUTHORIZED         | "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." → redirect `/login?session=expired` |
  | 403    | FORBIDDEN            | "Bạn không có quyền thực hiện hành động này."                 |
  | 409    | DUPLICATE_CCCD       | "Số CCCD đã tồn tại trong hệ thống." + Set error trên field CCCD |
  | 429    | RATE_LIMIT           | "Quá nhiều yêu cầu. Vui lòng đợi ít phút."                  |
  | 500    | INTERNAL_ERROR       | "Lỗi hệ thống. Vui lòng thử lại sau."                        |

  > **Error handling chung:** Form giữ nguyên data (KHÔNG xoá input). Toast error hiện top-right, duration 5000ms. Nếu 409, scroll đến và focus field CCCD.

---

## 7. States màn hình

| State     | Mô tả                                                                           |
|-----------|----------------------------------------------------------------------------------|
| idle      | Form trống, nút "Lưu hồ sơ" enabled. Đang load danh sách Area cho dropdown.    |
| loading   | Nút "Lưu hồ sơ" chuyển loading state: spinner + text "Đang lưu...", disabled. Nút "Huỷ bỏ" cũng disabled. Tất cả input disabled trong khi submit. |
| success   | Toast success "Tạo hồ sơ thành công". Redirect `/ho-so/:id` bằng router.replace.|
| error     | Toast error hiện trên cùng (top-right). Form giữ nguyên data. Nếu error 409 CCCD trùng → field CCCD highlight error + scroll into view. |
| validating| CCCD field onBlur: hiện spinner nhỏ bên phải input trong khi check trùng.        |

### Loading states chi tiết

```
Gọi GET /api/v1/areas (mount):
  < 300ms → không hiện gì
  300ms–2s → Select "Nơi ĐKQL" hiện placeholder "Đang tải..."
  > 2s → Hiếm, vẫn hiện loading text

Gọi GET /api/v1/subjects/check-cccd (onBlur):
  Hiện spinner icon nhỏ (h-4 w-4) bên phải input CCCD thay rightIcon
  Kết quả → xoá spinner, set error nếu trùng

Gọi POST /api/v1/subjects (submit):
  300ms–2s → Nút "Lưu hồ sơ" loading (spinner thay text, disabled)
  Toàn bộ form inputs disabled
```

---

## 8. Navigation

| Trigger                   | Destination            | Method           |
|---------------------------|------------------------|------------------|
| Click breadcrumb "Dashboard" | `/dashboard`         | router.push      |
| Click breadcrumb "Hồ sơ đối tượng" | `/ho-so`      | router.push      |
| Click "Huỷ bỏ"           | `/ho-so`               | router.push      |
| Submit thành công (201)   | `/ho-so/:id` (id mới)  | router.replace   |
| Error 401                 | `/login?session=expired`| router.replace  |
| Sidebar item "Hồ sơ"     | `/ho-so`               | router.push      |

---

## 9. Responsive

| Breakpoint        | Thay đổi                                                              |
|-------------------|------------------------------------------------------------------------|
| Desktop ≥1024px   | AppLayout đầy đủ. Form 2 cột (`grid-cols-2 gap-x-4 gap-y-3`). Action bar `justify-end`. |
| Tablet 640–1023px | Sidebar collapsed (48px, icon only). Form vẫn 2 cột. Content padding p-4. |
| Mobile <640px     | Sidebar ẩn → hamburger. Form chuyển 1 cột (`grid-cols-1 gap-y-3`). Content padding p-3 (12px). Action bar: 2 nút `w-full` xếp dọc hoặc flex gap-2. Mỗi card section full-width. |

### Responsive details cho Action Bar (mobile)

```
Mobile:
  flex flex-col-reverse gap-2 sm:flex-row sm:justify-end
  → Mobile: "Lưu hồ sơ" trên, "Huỷ bỏ" dưới (reverse vì primary nên nổi bật)
  → Cả 2 nút: w-full trên mobile
  → Desktop: flex-row justify-end, nút kích thước tự nhiên
```

---

## 10. Edge Cases

| Trường hợp                          | Xử lý                                                                                                    |
|--------------------------------------|-----------------------------------------------------------------------------------------------------------|
| CCCD đã tồn tại (409)               | Toast error + set field error trên CCCD + scroll & focus field CCCD. User phải sửa trước khi submit lại. |
| CCCD check async thất bại (network) | Không block, cho submit bình thường. Server sẽ trả 409 nếu thật sự trùng.                                |
| Load Area list thất bại             | Toast error + Retry button nhỏ bên trong Select. Hoặc user refresh page.                                 |
| User navigate away khi form dirty   | Hiện browser confirm dialog: `"Bạn có dữ liệu chưa lưu. Bạn có chắc muốn rời trang?"` — dùng `beforeunload` event + Next.js route change guard. |
| Session hết hạn giữa lúc điền form  | Khi POST trả 401 → redirect `/login?session=expired`. Form data mất (chấp nhận). Có thể cải thiện bằng localStorage draft (P2). |
| Submit double-click                  | Nút "Lưu hồ sơ" disabled ngay khi click (loading state). Không gọi API lần 2.                           |
| Ngày sinh < 14 tuổi                 | Validation error: "Đối tượng phải từ 14 tuổi trở lên". Không cho submit.                                 |
| CCCD nhập chữ / ký tự đặc biệt     | Input chỉ cho phép nhập số (input filter hoặc regex). Validation error nếu vẫn lọt.                     |
| User role VIEWER truy cập route     | Redirect `/403`. Route guard kiểm tra role trước khi render.                                              |
| Area dropdown rỗng (cán bộ chưa gán data_scope) | Hiện helper text: "Không có đơn vị nào trong phạm vi quản lý. Liên hệ quản trị viên." |
| Paste dữ liệu có khoảng trắng thừa | Trim whitespace trước khi validate và submit (full_name, address, cccd).                                 |

---

## 11. Accessibility

| Yêu cầu                                | Chi tiết                                                   |
|-----------------------------------------|-------------------------------------------------------------|
| Label liên kết input                    | Mọi input có `<label htmlFor={id}>` → click label focus input |
| Required indicator                      | Dấu `*` đỏ (`text-red-700 ml-0.5`) bên cạnh label. Screen reader đọc qua `aria-required="true"` |
| Error announcement                      | `aria-invalid="true"` + `aria-describedby` trỏ tới error text. Error text có `role="alert"` |
| Form validation                         | `aria-live="polite"` cho vùng error summary                 |
| Tab order                               | Theo thứ tự visual: Nhân thân (trái→phải, trên→dưới) → Gia đình → Pháp lý → Ghi chú → Huỷ bỏ → Lưu |
| Keyboard submit                         | Enter trên field cuối → trigger submit (vì nút Lưu type=submit) |
| Loading state                           | `aria-busy="true"` trên nút Lưu khi loading                 |
| Focus management sau error              | Sau submit fail: focus vào field lỗi đầu tiên               |
| Card sections                           | Mỗi CMP-CARD có `role="group"` + `aria-labelledby={titleId}` |

---

## 12. Audit Trail

Theo FR-PROFILE-001, mọi hành động CRUD hồ sơ đều được ghi audit log:

```
Hành động:  CREATE_SUBJECT
Cán bộ:     {officer_id} — tên cán bộ đăng nhập
Đối tượng:  {subject_id} — hồ sơ vừa tạo
Thời gian:  ISO 8601 UTC
IP:         Client IP
Chi tiết:   JSON snapshot toàn bộ data đã tạo
```

> Audit trail do backend tự ghi khi xử lý POST /api/v1/subjects thành công. Frontend không cần gọi API riêng.

---

## 13. Figma Reference

- Frame: `SCR/022-ThemHoSo/Desktop`
- Frame: `SCR/022-ThemHoSo/Mobile`
- Components: Xem trong `CMP/Card`, `CMP/Input`, `CMP/Select`, `CMP/DatePicker`, `CMP/Textarea`, `CMP/Button`
