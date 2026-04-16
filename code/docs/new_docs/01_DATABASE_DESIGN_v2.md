# 01 — THIẾT KẾ CƠ SỞ DỮ LIỆU (v2 — cập nhật theo mã nguồn)
**Hệ thống SMTTS** · PostgreSQL 15 · TypeORM · Phiên bản v2 · 15/04/2026

---

## Mục lục
1. [Tổng quan kiến trúc DB](#1)
2. [Sơ đồ ERD tổng quan](#2)
3. [Quy ước chung](#3)
4. [Database `smtts_main` — Từ điển dữ liệu](#4)
5. [Database `smtts_biometric` — Từ điển dữ liệu](#5)
6. [Index Strategy](#6)
7. [So sánh với thiết kế cũ — các thay đổi](#7)
8. [Migration script đã áp dụng](#8)

---

<a id="1"></a>
## 1. Tổng quan kiến trúc DB

Hệ thống dùng **2 PostgreSQL instance tách biệt** theo SBR-18 (cô lập biometric):

| Database | Vai trò | Số bảng | Bảo mật |
|----------|---------|---------|---------|
| `smtts_main` | Toàn bộ nghiệp vụ: hồ sơ, kịch bản, sự kiện, cảnh báo, vụ việc, yêu cầu, audit, file… | **22** | CCCD: AES-256 + SHA-256 hash. Mật khẩu: bcrypt (cost 10). |
| `smtts_biometric` | Dữ liệu sinh trắc: face embeddings, NFC chip hash, log đối sánh | **3** | AES-256 at-rest, TLS in-transit, quyền tách biệt application user |

Cache phụ trợ: **Redis** dùng cho session OTP tạm, scenario cache, dashboard counters.

<a id="2"></a>
## 2. Sơ đồ ERD tổng quan

```
                    ┌──────────┐    ┌─────────────────┐
                    │  areas   │ 1∞ │     users       │
                    │ (P,D)    │←───│  cán bộ +       │
                    └────┬─────┘    │  đối tượng (acc)│
                         │ ∞        └─┬───────────────┘
                         │            │ 1
                         ↓            ↓ ∞
                    ┌──────────────────────────┐
                    │        subjects          │
                    │ (CCCD AES + cccd_hash)   │
                    └──┬──────┬──────┬─────┬───┘
                       │1     │1     │∞    │∞
        ┌──────────────┘      │      │     │
        ↓                     ↓      ↓     ↓
 subject_families  subject_legals  events  scenario_assignments
                                    │ 1                │ ∞
                                    ↓ ∞                ↓ 1
                                 alerts ──── alert_rules ─┐
                                    │ 1     ┌─────────────┘
                                    ↓ ∞     │ scenario_id
                                 cases ──── management_scenarios
                                    │ 1            │ 1
                                    ↓ ∞            ↓ ∞
                                 case_notes    escalation_rules  (NEW)
                                                   │
                                  ┌────────────────┘
                                  ↓
                              geofences (FK từ scenario)

   ┌────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐
   │  devices   │  │  requests    │  │  files     │  │ refresh_     │
   │(1/subject)│  │ (mobile)     │  │(polymorph)│  │ tokens       │
   └────────────┘  └─────────────┘  └────────────┘  └──────────────┘
   ┌────────────┐  ┌─────────────┐  ┌────────────────┐
   │ notifs     │  │ audit_logs  │  │ configs (kv)   │
   └────────────┘  └─────────────┘  └────────────────┘

   ── BIOMETRIC DB ──────────────────────────────────
   face_templates ──┐
   nfc_records   ───┼── subject_id (logical FK)
   biometric_logs ──┘   event_id (logical FK)
```

<a id="3"></a>
## 3. Quy ước chung

| Quy ước | Giá trị |
|---------|---------|
| Naming | `snake_case` cho mọi table/column. Entity TypeORM dùng `camelCase` map qua `name`. |
| Primary key | `id UUID DEFAULT uuid_generate_v4()` |
| Timestamps | `created_at`, `updated_at` `TIMESTAMPTZ` (UTC). Frontend convert UTC+7. |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` (SBR-16). Append-only audit (SBR-17). |
| Foreign key | `<entity>_id UUID`, `ON DELETE RESTRICT` mặc định. |
| Enum | PostgreSQL ENUM type (xem mục 4). |
| JSON | `JSONB` cho cấu hình động, custom fields, metadata. |
| Mã code | `<PREFIX>-YYYYMMDD-NNNN` hoặc `<PREFIX>-<timestamp>`. |

---

<a id="4"></a>
## 4. Database `smtts_main` — Từ điển dữ liệu

### 4.1 ENUM types

| Enum | Giá trị |
|------|---------|
| `area_level` | `PROVINCE`, `DISTRICT`, `WARD` *(WARD bị deactivate sau migration 007)* |
| `user_role` | `IT_ADMIN`, `LANH_DAO`, `CAN_BO_QUAN_LY`, `CAN_BO_CO_SO`, `SUBJECT` |
| `user_status` | `ACTIVE`, `LOCKED`, `DEACTIVATED` |
| `data_scope_level` | `DISTRICT`, `PROVINCE`, `SYSTEM` *(WARD đã loại)* |
| `subject_status` | `ENROLLED`, `ACTIVE`, `SUSPENDED`, `REINTEGRATING`, `COMPLETED` |
| `subject_lifecycle` | `KHOI_TAO`, `ENROLLMENT`, `DANG_CHO_PHE_DUYET`, `DANG_QUAN_LY`, `TAI_HOA_NHAP`, `KET_THUC` |
| `gender_type` | `MALE`, `FEMALE` |
| `device_status` | `ACTIVE`, `SUSPENDED`, `REPLACED` |
| `geofence_type` | `CIRCLE`, `POLYGON` |
| `scenario_status` | `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `EXPIRED` |
| `alert_rule_source` | `DEFAULT`, `CUSTOM` |
| `alert_level` | `THAP`, `TRUNG_BINH`, `CAO`, `KHAN_CAP` |
| `event_result` | `SUCCESS`, `FAILED`, `WARNING` |
| `alert_status` | `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `ESCALATED` |
| `alert_history_action` | `CREATED`, `ACKNOWLEDGED`, `RESOLVED`, `ESCALATED`, `COMMENTED` |
| `case_status` | `OPEN`, `CLOSED` |
| `case_source` | `AUTO`, `MANUAL_ESCALATE`, `MANUAL_NEW` |
| `escalation_type` | `AUTO`, `MANUAL` |
| `request_type` | `DEVICE_CHANGE`, `ADDRESS_CHANGE`, `SCHEDULE_CHANGE`, `OTHER` |
| `request_status` | `PENDING`, `APPROVED`, `REJECTED` |
| `notification_channel` | `WEB`, `PUSH`, `EMAIL`, `SMS` |
| `file_type` | `DOCUMENT`, `PHOTO`, `FIELD_PHOTO`, `FACE_PHOTO` *(FACE_PHOTO mới — migration 011)* |
| `assignment_status` | `ACTIVE`, `INACTIVE`, `EXPIRED` |

### 4.2 Bảng `areas` — Đơn vị hành chính

Cây 2 cấp **(đã đơn giản hoá từ 3 cấp)**: Tỉnh/TP → Quận/Huyện. WARD level vẫn còn trong enum nhưng các row WARD bị set `is_active = false`.

| Cột | Kiểu | Null | Mặc định | Mô tả |
|-----|------|------|----------|-------|
| id | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| code | VARCHAR(20) | NOT NULL | | UNIQUE; ví dụ `PROV_HCM` |
| name | VARCHAR(200) | NOT NULL | | Tên đầy đủ |
| level | `area_level` | NOT NULL | | PROVINCE / DISTRICT |
| parent_id | UUID | NULL | | FK → areas.id |
| is_active | BOOLEAN | NOT NULL | `true` | |
| created_at, updated_at | TIMESTAMPTZ | NOT NULL | `NOW()` | |

### 4.3 Bảng `users`

Đại diện **cả cán bộ và đối tượng** (đối tượng có `role = SUBJECT`, liên kết qua `subjects.user_account_id`).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID | PK |
| username | VARCHAR(100) UNIQUE | Tên đăng nhập (đối tượng dùng số CCCD) |
| password_hash | VARCHAR(255) | bcrypt |
| full_name | VARCHAR(200) | |
| email | VARCHAR(200) NULL | |
| phone | VARCHAR(15) NULL | |
| role | `user_role` | |
| area_id | UUID NULL | FK → areas |
| data_scope_level | `data_scope_level` | DISTRICT/PROVINCE/SYSTEM |
| otp_secret | VARCHAR(255) NULL | TOTP secret (Google Authenticator) |
| otp_enabled | BOOLEAN DEFAULT false | **(MỚI)** Đánh dấu cán bộ đã setup OTP |
| backup_codes | JSONB NULL | **(MỚI)** Mã dự phòng hash sẵn |
| status | `user_status` | |
| last_login_at | TIMESTAMPTZ NULL | |
| failed_login_count | SMALLINT DEFAULT 0 | |
| locked_until | TIMESTAMPTZ NULL | Auto-unlock thời điểm |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | Soft delete |

### 4.4 Bảng `subjects` — Hồ sơ đối tượng

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| code | VARCHAR(30) UNIQUE | `SUB-YYYYMMDD-NNNN` |
| user_account_id | UUID UNIQUE NULL | FK → users.id (tài khoản mobile của đối tượng) |
| full_name | VARCHAR(200) | |
| cccd_encrypted | VARCHAR(500) | AES-256 (lưu key trong env) |
| cccd_hash | VARCHAR(64) | SHA-256 — **partial unique** (xem mục 6.1) |
| date_of_birth | DATE | |
| gender | `gender_type` | |
| ethnicity | VARCHAR(50) NULL | |
| address | TEXT | Địa chỉ tạm trú/cư trú |
| permanent_address | TEXT NULL | Địa chỉ thường trú |
| phone | VARCHAR(15) NULL | |
| photo_url | VARCHAR(500) NULL | Ảnh chân dung từ enrollment |
| area_id | UUID | FK → areas |
| status | `subject_status` | DEFAULT `ENROLLED` |
| lifecycle | `subject_lifecycle` | DEFAULT `KHOI_TAO` |
| compliance_rate | DECIMAL(5,2) NULL | 0–100 |
| enrollment_date | TIMESTAMPTZ NULL | |
| **submitted_at** | TIMESTAMPTZ NULL | **(MỚI v2)** Khi đối tượng nộp hồ sơ chờ duyệt |
| **approved_by_id** | UUID NULL | **(MỚI v2)** Cán bộ phê duyệt |
| **approved_at** | TIMESTAMPTZ NULL | **(MỚI v2)** |
| **approval_note** | TEXT NULL | **(MỚI v2)** |
| **rejection_note** | TEXT NULL | **(MỚI v2)** |
| custom_fields | JSONB DEFAULT `'{}'` | Theo `custom_field_definitions` của scenario |
| notes | TEXT NULL | |
| created_by_id | UUID | FK → users |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | Soft delete |

### 4.5 Bảng `subject_families` (1:1) và `subject_legals` (1:1)

`subject_families`: father_name, mother_name, spouse_name, dependents (SMALLINT), family_notes.

`subject_legals`: decision_number, decision_date, management_type, start_date, end_date, issuing_authority, legal_notes.

### 4.6 Bảng `devices` — Thiết bị mobile của đối tượng

Mỗi đối tượng có **tối đa 1 device ACTIVE**. Việc đổi thiết bị phải qua `requests.type = DEVICE_CHANGE` rồi cán bộ duyệt.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| subject_id | UUID | FK → subjects |
| device_id | VARCHAR(200) | Android ID (định danh phần cứng) |
| device_model | VARCHAR(200) NULL | |
| os_version | VARCHAR(50) NULL | |
| status | `device_status` | DEFAULT ACTIVE |
| enrolled_at | TIMESTAMPTZ | |
| replaced_at | TIMESTAMPTZ NULL | |

### 4.7 Bảng `geofences`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| code | VARCHAR(30) UNIQUE | |
| name | VARCHAR(200) | |
| type | `geofence_type` | CIRCLE / POLYGON |
| **address** | TEXT NULL | **(MỚI v2 — migration 006)** chuỗi địa chỉ người-đọc |
| center_lat / center_lng | DECIMAL(10,7) NULL | Cho CIRCLE |
| radius | INTEGER NULL | Mét, cho CIRCLE |
| coordinates | JSONB NULL | Mảng `{lat,lng}` cho POLYGON |
| **area_id** | UUID NULL | **(MỚI v2)** Đã đổi thành nullable — geofence là tài nguyên đứng riêng, gắn vào scenario qua `management_scenarios.geofence_id` |
| is_active | BOOLEAN DEFAULT true | |
| created_by_id | UUID | |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | |

### 4.8 Bảng `management_scenarios` — Kịch bản Quản lý

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| code | VARCHAR(30) UNIQUE | |
| name | VARCHAR(200) | |
| description | TEXT NULL | |
| status | `scenario_status` | DRAFT → PENDING_APPROVAL → ACTIVE → SUSPENDED/EXPIRED |
| version | INTEGER DEFAULT 1 | |
| parent_version_id | UUID NULL | Self-FK cho versioning |
| scope | `data_scope_level` | (WARD đã loại) |
| checkin_frequency | VARCHAR(30) | `DAILY`, `WEEKLY`, `MONTHLY`, … |
| checkin_window_start / _end | TIME | Khung giờ cho phép check-in |
| grace_period_days | SMALLINT DEFAULT 2 | Ân hạn |
| face_threshold | SMALLINT DEFAULT 85 | 0–100 |
| nfc_required | BOOLEAN DEFAULT true | |
| fallback_allowed | BOOLEAN DEFAULT true | Cho phép selfie fallback khi không có DG2 |
| geofence_id | UUID NULL | FK → geofences |
| curfew_start / _end | TIME NULL | Giờ giới nghiêm |
| travel_approval_required | BOOLEAN | |
| travel_threshold_days | SMALLINT NULL | |
| auto_transitions | JSONB | Chuỗi rule chuyển lifecycle tự động |
| custom_field_definitions | JSONB | Định nghĩa field bổ sung trên hồ sơ |
| notification_config | JSONB | Cấu hình kênh thông báo |
| auto_escalation_config | JSONB | `{ "KHAN_CAP": true, "CAO": false, ... }` (xem mục 7) |
| effective_from / _to | DATE NULL | |
| created_by_id, approved_by_id, approved_at | UUID/TIMESTAMPTZ | |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | |

### 4.9 Bảng `alert_rules` — Quy tắc sinh Alert từ Event

Mỗi scenario tự động có **4 rule mặc định** (overdue, face mismatch streak, NFC mismatch, severe overdue) với `is_deletable = false`.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| scenario_id | UUID | FK → management_scenarios |
| code | VARCHAR(50) | Mã rule trong scenario (vd `OVERDUE_3D`) |
| name | VARCHAR(200) | |
| source | `alert_rule_source` | DEFAULT / CUSTOM |
| event_type | VARCHAR(50) | Loại Event match (vd `CHECKIN_OVERDUE`) |
| condition_operator | VARCHAR(10) DEFAULT `>=` | `>=`, `>`, `=`, `<=`, `<` |
| condition_value | INTEGER DEFAULT 1 | |
| condition_window_days | INTEGER NULL | Cửa sổ thời gian |
| condition_extra | JSONB NULL | Tham số mở rộng |
| alert_level | `alert_level` | THAP/TRUNG_BINH/CAO/KHAN_CAP |
| notification_channels | JSONB DEFAULT `["PUSH"]` | |
| is_editable | BOOLEAN DEFAULT true | DEFAULT rule = true (cho chỉnh tham số) |
| is_deletable | BOOLEAN | DEFAULT rule = false |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.10 Bảng `escalation_rules` — **(MỚI v2)** Quy tắc tự động leo thang Alert → Case

> **Thay đổi quan trọng:** thiết kế cũ chỉ lưu cấu hình auto-escalate trong cột JSONB
> `management_scenarios.auto_escalation_config`. Hiện tại tách riêng thành **bảng độc lập** để hỗ trợ
> nhiều rule điều kiện phức tạp (vd: liên tiếp N alert level CAO trong M ngày → tạo Case KHAN_CAP).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| scenario_id | UUID | FK → management_scenarios |
| code | VARCHAR(50) | |
| name | VARCHAR(200) | |
| source | `alert_rule_source` | DEFAULT / CUSTOM |
| alert_type | VARCHAR(50) | Loại Alert match |
| alert_level_filter | `alert_level` NULL | Chỉ áp dụng nếu Alert ở mức này |
| condition_operator | VARCHAR(10) DEFAULT `>=` | |
| condition_value | INTEGER DEFAULT 1 | Số lần |
| condition_window_days | INTEGER NULL | Cửa sổ |
| condition_consecutive | BOOLEAN DEFAULT false | Liên tục hay không |
| condition_extra | JSONB NULL | |
| case_severity | `alert_level` | Mức độ Case sẽ tạo |
| case_description_tpl | TEXT NULL | Template mô tả |
| notification_channels | JSONB DEFAULT `["PUSH"]` | |
| auto_assign | BOOLEAN DEFAULT false | Tự gán cán bộ phụ trách |
| is_editable, is_deletable, is_active | BOOLEAN | |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.11 Bảng `scenario_assignments`

Gán scenario cho subject. Hỗ trợ override một số tham số rule riêng cho cá nhân (`alert_rule_overrides`).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| subject_id | UUID | FK |
| scenario_id | UUID | FK |
| alert_rule_overrides | JSONB NULL | `{ "<rule_id>": { "condition_value": 5 }, ... }` |
| status | `assignment_status` | ACTIVE/INACTIVE/EXPIRED |
| assigned_by_id | UUID | |
| assigned_at | TIMESTAMPTZ DEFAULT NOW | |
| unassigned_at | TIMESTAMPTZ NULL | |

### 4.12 Bảng `events` — Sổ nhật ký mọi sự kiện

> **Bổ sung nhiều cột so với thiết kế cũ** để phục vụ pipeline check-in 4-yếu-tố.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| code | VARCHAR(30) UNIQUE | `EVT-...` |
| type | VARCHAR(50) | `CHECKIN_SUCCESS`, `CHECKIN_FAILED`, `CHECKIN_OVERDUE`, `NFC_MISMATCH`, `OUT_OF_GEOFENCE`, … |
| subject_id | UUID | FK |
| scenario_id | UUID NULL | Scenario hiệu lực khi event xảy ra |
| result | `event_result` | SUCCESS/FAILED/WARNING |
| gps_lat, gps_lng | DECIMAL(10,7) NULL | |
| gps_accuracy | DECIMAL(8,2) NULL | mét |
| in_geofence | BOOLEAN NULL | |
| geofence_distance | INTEGER NULL | mét tới biên |
| face_match_score | DECIMAL(5,2) NULL | 0–100 |
| nfc_verified | BOOLEAN NULL | Passive Auth pass |
| nfc_cccd_match | BOOLEAN NULL | CCCD chip vs hồ sơ |
| **liveness_score** | DECIMAL(5,2) NULL | **(MỚI v2)** Anti-spoofing |
| **face_image_url** | VARCHAR(500) NULL | **(MỚI v2)** Ảnh selfie lúc check-in |
| **device_id** | VARCHAR(200) NULL | **(MỚI v2)** |
| **device_info** | JSONB NULL | **(MỚI v2)** `{ model, os }` |
| **is_voluntary** | BOOLEAN DEFAULT false | **(MỚI v2)** Check-in tự nguyện ngoài lịch |
| extra_data | JSONB NULL | Thông tin thêm |
| **client_timestamp** | TIMESTAMPTZ NULL | **(MỚI v2)** Thời gian thiết bị gửi (chống lệch giờ server) |
| created_by_id | UUID NULL | NULL nếu hệ thống tự sinh |
| created_at | TIMESTAMPTZ | |

### 4.13 Bảng `alerts`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| code | VARCHAR(30) UNIQUE | `ALR-...` |
| type | VARCHAR(50) | |
| level | `alert_level` | |
| status | `alert_status` | OPEN → ACKNOWLEDGED → RESOLVED hoặc → ESCALATED |
| source | `alert_rule_source` | |
| subject_id | UUID FK | |
| trigger_event_id | UUID FK | Event sinh ra Alert |
| alert_rule_id | UUID FK | Rule áp dụng |
| scenario_id | UUID FK | |
| case_id | UUID NULL | Set khi escalate |
| resolved_at, escalated_at | TIMESTAMPTZ NULL | |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.14 Bảng `alert_histories`

Append-only nhật ký mọi action lên Alert. Lưu user_id (NULL nếu SYSTEM), action enum, note, created_at.

### 4.15 Bảng `cases`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| code | VARCHAR(30) UNIQUE | `CAS-...` |
| subject_id | UUID FK | |
| status | `case_status` | OPEN/CLOSED |
| severity | `alert_level` | |
| source | `case_source` | AUTO / MANUAL_ESCALATE / **MANUAL_NEW** *(MỚI: tạo Case không từ Alert)* |
| description | TEXT NULL | |
| escalated_from_alert_id | UUID NULL | Alert nguồn |
| **escalation_type** | `escalation_type` NULL | **(MỚI v2)** AUTO / MANUAL |
| **escalation_reason** | TEXT NULL | **(MỚI v2)** |
| **escalation_rule_name** | VARCHAR(200) NULL | **(MỚI v2)** Rule trigger nếu AUTO |
| **linked_event_ids** | JSONB DEFAULT `[]` | **(MỚI v2)** Mảng UUID Event tham chiếu |
| assignee_id | UUID NULL | Cán bộ phụ trách |
| created_by_id | UUID NULL | NULL nếu SYSTEM auto |
| **created_by_name** | VARCHAR(100) | **(MỚI v2)** Snapshot tên (kể cả `SYSTEM`) |
| closing_note | TEXT NULL | |
| closed_by_id | UUID NULL | |
| closed_at | TIMESTAMPTZ NULL | |
| related_case_id | UUID NULL | Liên kết Case khi reopen (EC-14) |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.16 Bảng `case_notes`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| case_id | UUID FK | |
| content | TEXT | |
| author_id | UUID FK | |
| **photos** | JSONB DEFAULT `[]` | **(MỚI v2)** Mảng URL ảnh đính kèm |
| **is_closing_note** | BOOLEAN DEFAULT false | **(MỚI v2)** Đánh dấu note đóng case |
| created_at | TIMESTAMPTZ | |

### 4.17 Bảng `requests` — Yêu cầu từ đối tượng

> **Lưu ý:** Bảng đã được **tái cấu trúc** trong migration 011 (cột giản lược, không dùng entity TypeORM, truy cập trực tiếp qua raw SQL trong `RequestsService`).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| code | VARCHAR(30) UNIQUE | `REQ-<timestamp>` |
| subject_id | UUID FK | |
| type | VARCHAR(50) | `DEVICE_CHANGE`, `ADDRESS_CHANGE`, `SCHEDULE_CHANGE`, `OTHER` |
| reason | TEXT | |
| details | JSONB | |
| status | VARCHAR(20) DEFAULT `PENDING` | PENDING/APPROVED/REJECTED |
| reviewed_by_id | UUID NULL FK → users | |
| reviewed_at | TIMESTAMPTZ NULL | |
| review_note | TEXT NULL | |
| created_at, updated_at | TIMESTAMPTZ | |

### 4.18 Bảng `notifications`

Polymorphic: `entity_type` + `entity_id` để link tới Alert/Case/Request.

### 4.19 Bảng `files`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| original_name | VARCHAR(500) | |
| stored_path | VARCHAR(500) | Đường dẫn local trong container |
| mime_type | VARCHAR(100) | |
| size | INTEGER CHECK (≤ 10MB) | |
| file_type | `file_type` | DOCUMENT / PHOTO / FIELD_PHOTO / **FACE_PHOTO** *(MỚI)* |
| entity_type | VARCHAR(30) | `subject`, `case_note`, `event`, `enrollment` |
| entity_id | UUID | |
| gps_lat, gps_lng | DECIMAL(10,7) NULL | EXIF/field |
| captured_at | TIMESTAMPTZ NULL | |
| **is_public** | BOOLEAN DEFAULT false | **(MỚI v2)** false = chỉ cán bộ; true = đối tượng cũng xem được trong app |
| uploaded_by_id | UUID FK | |
| created_at, deleted_at | TIMESTAMPTZ | |

### 4.20 Bảng `audit_logs` (append-only)

`user_id`, `user_name`, `user_role` (snapshot), `action` (vd `SUBJECT_CREATE`), `target_type`, `target_id`, `target_name`, `details JSONB`, `ip_address`, `user_agent`, `created_at`. Không có `updated_at`/`deleted_at`.

### 4.21 Bảng `configs` (key-value)

`key` UNIQUE VARCHAR(100), `value` JSONB, `category` VARCHAR(50), `description`, `updated_by_id`, timestamps.

### 4.22 Bảng `refresh_tokens`

`user_id` FK CASCADE, `token_hash` UNIQUE VARCHAR(255), `expires_at`, `revoked` BOOLEAN, `created_at`.

---

<a id="5"></a>
## 5. Database `smtts_biometric` — Từ điển dữ liệu

### 5.1 `face_templates`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| subject_id | UUID | Logical FK sang main DB |
| embedding | BYTEA | 512-dim float (ArcFace R100) — encrypt at rest |
| embedding_version | VARCHAR(20) | Vd `arcface_r100_v1` |
| source_image_hash | VARCHAR(64) | SHA-256 ảnh nguồn |
| quality_score | DECIMAL(5,2) NULL | Đánh giá chất lượng nguồn |
| enrolled_at | TIMESTAMPTZ | |
| re_enrolled_at | TIMESTAMPTZ NULL | Khi đăng ký lại |
| expires_at | TIMESTAMPTZ NULL | Tuỳ scenario có yêu cầu refresh |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

### 5.2 `nfc_records`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| subject_id | UUID | Logical FK |
| cccd_chip_hash | VARCHAR(128) | SHA-512 nội dung DG1 chip CCCD |
| chip_serial | VARCHAR(100) NULL | UID NFC hex |
| passive_auth_data | BYTEA NULL | SOD object |
| enrolled_at | TIMESTAMPTZ | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

### 5.3 `biometric_logs`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID PK | |
| subject_id | UUID | |
| event_id | UUID | Logical FK sang `events.id` (main DB) |
| face_match_score | DECIMAL(5,2) | |
| face_threshold | SMALLINT | Ngưỡng tại thời điểm match |
| face_result | VARCHAR(20) | MATCH/MISMATCH/ERROR |
| liveness_result | VARCHAR(20) NULL | PASS/FAIL/SKIPPED |
| nfc_result | VARCHAR(20) | VERIFIED/FAILED/MISMATCH |
| match_duration_ms | INTEGER NULL | |
| created_at | TIMESTAMPTZ | |

---

<a id="6"></a>
## 6. Index Strategy

### 6.1 Partial unique cho CCCD trên `subjects` (migration 009)

Soft-delete + UNIQUE truyền thống xung đột. Dùng partial unique để giải:

```sql
DROP CONSTRAINT subjects_cccd_hash_key;
CREATE UNIQUE INDEX UQ_subjects_cccd_hash_active
  ON subjects (cccd_hash) WHERE deleted_at IS NULL;
```

Cho phép tạo lại hồ sơ với cùng CCCD sau khi xoá hồ sơ cũ.

### 6.2 Tóm tắt các index quan trọng

| Bảng | Index | Lý do |
|------|-------|-------|
| areas | `parent_id`, `level` | Build tree, filter scope |
| users | `role`, `area_id`, `status` (partial deleted_at IS NULL) | Lọc cán bộ theo địa bàn |
| subjects | `area_id`, `status`, `code`, GIN(`full_name`) | Filter + full-text search |
| subjects | `idx_subjects_pending_approval (area_id, submitted_at DESC) WHERE lifecycle = 'DANG_CHO_PHE_DUYET'` | **(MỚI)** Hàng đợi phê duyệt theo địa bàn |
| events | `(subject_id, created_at DESC)`, `type`, `scenario_id`, `result` | Timeline + dashboard |
| alerts | `(status, level)`, `created_at DESC`, `subject_id`, `scenario_id` | Bảng cảnh báo |
| cases | `subject_id`, `status`, `severity`, `assignee_id`, `created_at DESC` | |
| scenario_assignments | `(subject_id, status) WHERE status='ACTIVE'` | Lookup assignment hiệu lực |
| requests | `subject_id`, `status`, `created_at DESC` | |
| notifications | `(user_id, is_read, created_at DESC)` + partial `WHERE is_read = false` | Badge "chưa đọc" |
| audit_logs | `user_id`, `action`, `(target_type, target_id)` | Truy vết |

---

<a id="7"></a>
## 7. So sánh với thiết kế cũ — các thay đổi thực tế

### 7.1 Thêm bảng / thực thể

| Hạng mục | Lý do |
|----------|-------|
| **`escalation_rules`** (bảng mới) | Tách riêng khỏi `auto_escalation_config` JSONB để CRUD độc lập, hỗ trợ điều kiện phức tạp (consecutive, window) và quản lý theo từng scenario qua API riêng. |
| **`devices`** (đã có trong ERD nhưng giờ là module độc lập) | Pipeline check-in xác minh device → phải truy vấn nhanh, có endpoint riêng. |

### 7.2 Bỏ hoặc đơn giản hoá

| Hạng mục | Lý do |
|----------|-------|
| **WARD level** trong `area_level` / `data_scope_level` | Cải cách hành chính 2026 — bỏ Phường/Xã. Migration 007 chuyển dữ liệu lên DISTRICT, deactivate WARD. |
| **`geofences.area_id` NOT NULL → NULLABLE** | Geofence trở thành tài nguyên đứng riêng, gắn vào scenario chứ không gắn cứng vào địa bàn. |

### 7.3 Mở rộng cột

| Bảng | Cột mới | Lý do |
|------|---------|-------|
| `subjects` | `submitted_at`, `approved_by_id`, `approved_at`, `approval_note`, `rejection_note` + lifecycle `DANG_CHO_PHE_DUYET` | Triển khai luồng phê duyệt enrollment 2 bước (đối tượng nộp → cán bộ duyệt). Migration 012. |
| `users` | `otp_enabled`, `backup_codes` | Hỗ trợ luồng setup OTP lần đầu + mã dự phòng. |
| `events` | `liveness_score`, `face_image_url`, `device_id`, `device_info`, `is_voluntary`, `client_timestamp` | Pipeline check-in 4-yếu-tố, lưu đầy đủ chứng cứ. |
| `cases` | `escalation_type`, `escalation_reason`, `escalation_rule_name`, `linked_event_ids`, `created_by_name` | Truy vết auto-escalation rõ ràng (rule nào, từ event nào). |
| `case_notes` | `photos`, `is_closing_note` | Cán bộ field upload ảnh; phân biệt note đóng case. |
| `files` | `is_public`, type `FACE_PHOTO` | Phân quyền hiển thị tài liệu cho đối tượng trên mobile. |
| `geofences` | `address` | Hiển thị địa chỉ người-đọc lên UI. |
| `case_source` | thêm `MANUAL_NEW` | Cho phép tạo Case không từ Alert. |
| `subject_lifecycle` | thêm `DANG_CHO_PHE_DUYET` | |
| `file_type` | thêm `FACE_PHOTO` | |

### 7.4 Constraint thay đổi

- `subjects.cccd_hash` UNIQUE → **partial unique** `WHERE deleted_at IS NULL` (migration 009).

### 7.5 Bảng đã thiết kế nhưng chưa dùng đầy đủ

- `audit_logs`: bảng có sẵn, ghi log một số action quan trọng (login, escalation), nhưng **chưa phủ toàn bộ thao tác CRUD** — đề xuất bổ sung trong v3.
- `notifications`: bảng có sẵn, hiện chỉ insert thủ công ở luồng enrollment approval. **Đề xuất:** xây notification bus (Web push, Mobile FCM, Email).
- `configs`: bảng có sẵn, hiện chưa có endpoint quản lý. **Đề xuất:** bổ sung `/config/*` trong v3.

---

<a id="8"></a>
## 8. Các migration đã áp dụng

| # | Tên file | Phạm vi |
|---|----------|---------|
| 001 | `001_smtts_main_init.sql` | Khởi tạo DB main 21 bảng, enum, index |
| 002 | `002_smtts_biometric_init.sql` | Khởi tạo DB biometric 3 bảng |
| 003 | `003_seed_data.sql` | Seed area, user admin, scenario mẫu |
| 004 | `004_seed_dashboard_data.sql` | Seed event/alert mẫu cho dashboard |
| 005 | `005_seed_subjects_data.sql` | Seed hồ sơ đối tượng |
| 006 | `006_geofence_add_address.sql` | Thêm cột `geofences.address` |
| 007 | `007_simplify_areas_and_geofences.sql` | Bỏ WARD, `geofences.area_id` nullable |
| 008 | `008_seed_mobile_test_subjects.sql` | Seed đối tượng test cho mobile |
| 009 | `009_fix_cccd_hash_partial_unique.sql` | Partial unique CCCD hỗ trợ soft-delete |
| 010 | `010_seed_mobile_test_data.sql` | Seed thêm dữ liệu mobile |
| 011 | `011_files_add_visibility_and_face_photo.sql` | `files.is_public`, `FACE_PHOTO`, tái cấu trúc `requests` |
| 012 | `012_enrollment_approval.sql` | Lifecycle `DANG_CHO_PHE_DUYET`, các cột approval, index pending |

> Bảng `escalation_rules` được TypeORM auto-sync (chưa có migration script tách riêng — đề xuất chuẩn hoá thành migration 013 trong v3).
