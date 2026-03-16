# ERD & DATA DICTIONARY — HỆ THỐNG SMTTS
## Subject Management, Tracking & Tracing System
### PostgreSQL (Main) + PostgreSQL (Biometric — tách biệt)
### Phiên bản: 1.0 | Ngày: 15/03/2026

---

## MỤC LỤC

1. [Tổng quan kiến trúc Database](#1-tổng-quan)
2. [ERD — Sơ đồ quan hệ thực thể](#2-erd)
3. [Data Dictionary — Main Database](#3-main-db)
4. [Data Dictionary — Biometric Database](#4-bio-db)
5. [Index Strategy](#5-index)
6. [SQL Migration Script (TypeORM)](#6-migration)

---

## 1. TỔNG QUAN KIẾN TRÚC DATABASE

### 1.1 Hai database tách biệt (SBR-18)

| Database            | Mục đích                                         | Encryption             |
|---------------------|--------------------------------------------------|------------------------|
| **smtts_main**      | Toàn bộ nghiệp vụ: users, subjects, events, alerts, cases, scenarios... | CCCD: AES-256 at-rest. Password: bcrypt/argon2 |
| **smtts_biometric** | Face embeddings + NFC records — cô lập hoàn toàn | AES-256 toàn bộ. TLS in-transit |

### 1.2 Quy ước chung

| Quy ước               | Giá trị                                                |
|------------------------|--------------------------------------------------------|
| Naming convention      | `snake_case` cho tất cả table + column                 |
| Primary key            | `id` — UUID v4 (`uuid_generate_v4()`)                  |
| Timestamps             | `created_at`, `updated_at` — `TIMESTAMPTZ` (UTC)       |
| Soft delete            | `deleted_at` — `TIMESTAMPTZ` nullable (SBR-16)         |
| Foreign key            | `<entity>_id` — UUID, ON DELETE RESTRICT               |
| Enum                   | PostgreSQL ENUM type hoặc VARCHAR + CHECK              |
| JSON fields            | `JSONB` — cho dynamic data (custom fields, config)     |
| Code generation        | `<PREFIX>-YYYYMMDD-NNNN` (auto-increment trong ngày)  |
| Timezone               | Lưu UTC. Application layer convert sang UTC+7          |

---

## 2. ERD — SƠ ĐỒ QUAN HỆ THỰC THỂ

### 2.1 ERD Tổng quan — Main Database

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SMTTS_MAIN DATABASE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐         ┌──────────────┐         ┌──────────┐               │
│  │  areas    │ 1───∞  │    users     │ 1───∞   │  audit   │               │
│  │ (Địa bàn)│         │  (Cán bộ +   │         │  _logs   │               │
│  │          │         │   Đối tượng) │         │          │               │
│  └────┬─────┘         └──────┬───────┘         └──────────┘               │
│       │ 1                    │ 1                                            │
│       │                      │                                              │
│       ∞                      ∞                                              │
│  ┌────┴─────────────────────┴──────────────┐                               │
│  │              subjects                    │                               │
│  │         (Hồ sơ đối tượng)               │                               │
│  └──┬──────────┬──────────┬────────┬───────┘                               │
│     │ 1        │ 1        │ 1      │ 1                                     │
│     │          │          │        │                                        │
│     ∞          ∞          ∞        ∞                                        │
│  ┌──┴────┐ ┌──┴─────┐ ┌─┴──────┐ ┌┴──────────────┐                       │
│  │subject│ │subject │ │ events │ │  scenario      │                       │
│  │_family│ │_legal  │ │        │ │  _assignments  │                       │
│  └───────┘ └────────┘ └──┬─────┘ └──┬────────────┘                       │
│                           │ 1        │ ∞                                   │
│                           │          │                                      │
│                           ∞          1                                      │
│                      ┌────┴───┐  ┌───┴──────────────────────────┐          │
│                      │ alerts │  │   management_scenarios       │          │
│                      └──┬─────┘  │   (Kịch bản Quản lý)        │          │
│                         │ 1      └───┬──────────────────────────┘          │
│                         │            │ 1                                    │
│                         ∞            │                                      │
│                    ┌────┴──────┐     ∞                                     │
│                    │alert      │  ┌──┴──────────┐                          │
│                    │_histories │  │ alert_rules  │                          │
│                    └───────────┘  │ (Default +   │                          │
│                                   │  Custom)     │                          │
│                         │         └──────────────┘                          │
│                         │ 1                                                 │
│                         │                                                   │
│                         ∞                                                   │
│                    ┌────┴───┐                                               │
│                    │ cases  │                                                │
│                    └──┬─────┘                                               │
│                       │ 1                                                   │
│                       │                                                     │
│                       ∞                                                     │
│                  ┌────┴──────┐                                              │
│                  │case_notes │                                               │
│                  └───────────┘                                              │
│                                                                             │
│  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐           │
│  │ requests   │  │geofences │  │  devices    │  │notifications │           │
│  │(Yêu cầu)  │  │          │  │(Thiết bị)   │  │              │           │
│  └────────────┘  └──────────┘  └─────────────┘  └──────────────┘           │
│                                                                             │
│  ┌─────────┐  ┌──────────────┐                                             │
│  │  files  │  │   configs    │                                              │
│  └─────────┘  └──────────────┘                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────┐
│      SMTTS_BIOMETRIC DATABASE       │
├─────────────────────────────────────┤
│                                     │
│  ┌────────────────┐                 │
│  │ face_templates  │ ← AES-256     │
│  │ (subject_id FK) │                │
│  └────────────────┘                 │
│                                     │
│  ┌────────────────┐                 │
│  │  nfc_records    │ ← AES-256     │
│  │ (subject_id FK) │                │
│  └────────────────┘                 │
│                                     │
│  ┌────────────────┐                 │
│  │ biometric_logs  │               │
│  │ (match logs)    │               │
│  └────────────────┘                 │
│                                     │
└─────────────────────────────────────┘
```

### 2.2 ERD Chi tiết — Quan hệ giữa các bảng

```
areas ──────────────────────────────────┐
  │ PK: id                              │
  │ FK: parent_id → areas.id            │ (tỉnh → quận → phường)
  │                                     │
  ├──< users.area_id                    │
  ├──< subjects.area_id                 │
  └──< geofences.area_id               │

users ──────────────────────────────────┐
  │ PK: id                              │
  │ FK: area_id → areas.id              │
  │                                     │
  ├──< subjects.created_by_id           │ (cán bộ tạo hồ sơ)
  ├──< events.created_by_id             │ (cán bộ ghi thực địa)
  ├──< alerts → alert_histories.user_id │
  ├──< cases.assignee_id               │
  ├──< cases.closed_by_id              │
  ├──< case_notes.author_id            │
  ├──< requests.reviewed_by_id         │
  ├──< management_scenarios.created_by_id │
  ├──< management_scenarios.approved_by_id│
  ├──< scenario_assignments.assigned_by_id│
  ├──< audit_logs.user_id              │
  └──< notifications.user_id           │

subjects ───────────────────────────────┐
  │ PK: id                              │
  │ FK: area_id → areas.id              │
  │ FK: created_by_id → users.id        │
  │ FK: user_account_id → users.id      │ (đối tượng cũng có tài khoản đăng nhập)
  │                                     │
  ├──1 subject_families                 │
  ├──1 subject_legals                   │
  ├──∞ events                           │
  ├──∞ alerts                           │
  ├──∞ cases                            │
  ├──∞ requests                         │
  ├──∞ scenario_assignments             │
  ├──∞ devices                          │
  ├──∞ files                            │
  └──∞ notifications                    │

events ─────────────────────────────────┐
  │ PK: id                              │
  │ FK: subject_id → subjects.id        │
  │ FK: scenario_id → management_scenarios.id │ (kịch bản lúc event xảy ra)
  │ FK: created_by_id → users.id        │ (null nếu system-generated)
  │                                     │
  └──∞ alerts.trigger_event_id          │

alerts ─────────────────────────────────┐
  │ PK: id                              │
  │ FK: subject_id → subjects.id        │
  │ FK: trigger_event_id → events.id    │
  │ FK: alert_rule_id → alert_rules.id  │
  │ FK: scenario_id → management_scenarios.id │
  │ FK: case_id → cases.id              │ (null cho đến khi escalate)
  │                                     │
  └──∞ alert_histories                  │

alert_histories ────────────────────────┐
  │ PK: id                              │
  │ FK: alert_id → alerts.id            │
  │ FK: user_id → users.id              │ (null nếu SYSTEM)
  └─────────────────────────────────────┘

cases ──────────────────────────────────┐
  │ PK: id                              │
  │ FK: subject_id → subjects.id        │
  │ FK: escalated_from_alert_id → alerts.id │ (null nếu tạo thủ công)
  │ FK: assignee_id → users.id          │
  │ FK: created_by_id → users.id        │ (null nếu SYSTEM auto)
  │ FK: closed_by_id → users.id         │ (null nếu chưa đóng)
  │ FK: related_case_id → cases.id      │ (liên kết Case cũ — EC-14)
  │                                     │
  └──∞ case_notes                       │

case_notes ─────────────────────────────┐
  │ PK: id                              │
  │ FK: case_id → cases.id              │
  │ FK: author_id → users.id            │
  └─────────────────────────────────────┘

management_scenarios ───────────────────┐
  │ PK: id                              │
  │ FK: created_by_id → users.id        │
  │ FK: approved_by_id → users.id       │
  │ FK: geofence_id → geofences.id      │
  │ FK: parent_version_id → management_scenarios.id │ (versioning)
  │                                     │
  ├──∞ alert_rules                      │
  ├──∞ scenario_assignments             │
  └──∞ events (via scenario_id)         │

alert_rules ────────────────────────────┐
  │ PK: id                              │
  │ FK: scenario_id → management_scenarios.id │
  └─────────────────────────────────────┘

scenario_assignments ───────────────────┐
  │ PK: id                              │
  │ FK: subject_id → subjects.id        │
  │ FK: scenario_id → management_scenarios.id │
  │ FK: assigned_by_id → users.id       │
  └─────────────────────────────────────┘

requests ───────────────────────────────┐
  │ PK: id                              │
  │ FK: subject_id → subjects.id        │
  │ FK: reviewed_by_id → users.id       │
  └─────────────────────────────────────┘

geofences ──────────────────────────────┐
  │ PK: id                              │
  │ FK: area_id → areas.id              │
  │ FK: created_by_id → users.id        │
  └─────────────────────────────────────┘

devices ────────────────────────────────┐
  │ PK: id                              │
  │ FK: subject_id → subjects.id        │
  └─────────────────────────────────────┘

files ──────────────────────────────────┐
  │ PK: id                              │
  │ FK: uploaded_by_id → users.id       │
  │ Polymorphic: entity_type + entity_id│
  └─────────────────────────────────────┘

notifications ──────────────────────────┐
  │ PK: id                              │
  │ FK: user_id → users.id              │
  │ Polymorphic: entity_type + entity_id│
  └─────────────────────────────────────┘

configs ────────────────────────────────┐
  │ PK: id                              │
  │ Key-value store                     │
  └─────────────────────────────────────┘

audit_logs ─────────────────────────────┐
  │ PK: id                              │
  │ FK: user_id → users.id              │
  │ Append-only (SBR-17)                │
  └─────────────────────────────────────┘
```

---

## 3. DATA DICTIONARY — MAIN DATABASE (smtts_main)

### 3.1 Table: `areas` — Đơn vị hành chính

> Cây 3 cấp: Tỉnh/TP → Quận/Huyện → Phường/Xã. Dùng cho data_scope.

| Column       | Type            | Nullable | Default              | Constraint               | Mô tả                           |
|--------------|-----------------|----------|----------------------|--------------------------|----------------------------------|
| `id`         | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       | ID đơn vị                        |
| `code`       | VARCHAR(20)     | NOT NULL |                      | UNIQUE                   | Mã hành chính (VD: `PROV_HCM`) |
| `name`       | VARCHAR(200)    | NOT NULL |                      |                          | Tên đầy đủ                       |
| `level`      | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('PROVINCE','DISTRICT','WARD')) | Cấp hành chính |
| `parent_id`  | UUID            | NULL     |                      | FK → areas.id            | Cấp cha (NULL = tỉnh/TP)        |
| `is_active`  | BOOLEAN         | NOT NULL | `true`               |                          | Đang hoạt động                   |
| `created_at` | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |
| `updated_at` | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |

---

### 3.2 Table: `users` — Tài khoản (cán bộ + đối tượng)

> Cả cán bộ và đối tượng đều có tài khoản. Phân biệt bằng `role`.
> CCCD mã hóa AES-256. Password hash bcrypt/argon2.

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `username`          | VARCHAR(100)    | NOT NULL |                      | UNIQUE                   | Tên đăng nhập (cán bộ) hoặc CCCD hash (đối tượng) |
| `password_hash`     | VARCHAR(255)    | NOT NULL |                      |                          | Bcrypt/Argon2 hash                          |
| `full_name`         | VARCHAR(200)    | NOT NULL |                      |                          | Họ và tên                                   |
| `email`             | VARCHAR(200)    | NULL     |                      |                          | Email (cán bộ)                              |
| `phone`             | VARCHAR(15)     | NULL     |                      |                          | Số điện thoại                               |
| `role`              | VARCHAR(30)     | NOT NULL |                      | CHECK(IN('IT_ADMIN','LANH_DAO','CAN_BO_QUAN_LY','CAN_BO_CO_SO','SUBJECT')) | Vai trò |
| `area_id`           | UUID            | NULL     |                      | FK → areas.id            | Địa bàn quản lý (NULL cho IT_ADMIN)        |
| `data_scope_level`  | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('WARD','DISTRICT','PROVINCE','SYSTEM')) | Phạm vi dữ liệu |
| `otp_secret`        | VARCHAR(255)    | NULL     |                      |                          | TOTP secret (encrypted at-rest)             |
| `otp_enabled`       | BOOLEAN         | NOT NULL | `false`              |                          | Đã bật OTP chưa                             |
| `backup_codes`      | JSONB           | NULL     |                      |                          | Mảng backup codes (encrypted)               |
| `status`            | VARCHAR(20)     | NOT NULL | `'ACTIVE'`           | CHECK(IN('ACTIVE','LOCKED','DEACTIVATED'))    | Trạng thái tài khoản |
| `last_login_at`     | TIMESTAMPTZ     | NULL     |                      |                          | Lần đăng nhập cuối                          |
| `failed_login_count`| SMALLINT        | NOT NULL | `0`                  |                          | Số lần đăng nhập sai (reset khi thành công) |
| `locked_until`      | TIMESTAMPTZ     | NULL     |                      |                          | Khoá đến thời điểm                          |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `deleted_at`        | TIMESTAMPTZ     | NULL     |                      |                          | Soft delete                                 |

---

### 3.3 Table: `subjects` — Hồ sơ đối tượng

> Thông tin nhân thân chính. CCCD mã hóa AES-256.

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `code`              | VARCHAR(30)     | NOT NULL |                      | UNIQUE                   | Mã hồ sơ: `HS-YYYY-NNNN`                  |
| `user_account_id`   | UUID            | NULL     |                      | FK → users.id, UNIQUE    | Tài khoản đăng nhập (tạo sau enrollment)   |
| `full_name`         | VARCHAR(200)    | NOT NULL |                      |                          | Họ và tên                                   |
| `cccd_encrypted`    | VARCHAR(500)    | NOT NULL |                      |                          | Số CCCD (AES-256 encrypted)                |
| `cccd_hash`         | VARCHAR(64)     | NOT NULL |                      | UNIQUE                   | SHA-256 hash CCCD (để tìm kiếm nhanh, unique check) |
| `date_of_birth`     | DATE            | NOT NULL |                      |                          | Ngày sinh                                   |
| `gender`            | VARCHAR(10)     | NOT NULL |                      | CHECK(IN('MALE','FEMALE'))| Giới tính                                  |
| `ethnicity`         | VARCHAR(50)     | NULL     |                      |                          | Dân tộc                                     |
| `address`           | TEXT            | NOT NULL |                      |                          | Địa chỉ hiện tại                            |
| `permanent_address` | TEXT            | NULL     |                      |                          | Địa chỉ thường trú                          |
| `phone`             | VARCHAR(15)     | NULL     |                      |                          | Số điện thoại                               |
| `photo_url`         | VARCHAR(500)    | NULL     |                      |                          | URL ảnh chân dung                           |
| `area_id`           | UUID            | NOT NULL |                      | FK → areas.id            | Nơi đăng ký quản lý                        |
| `status`            | VARCHAR(20)     | NOT NULL | `'ENROLLED'`         | CHECK(IN('ENROLLED','ACTIVE','SUSPENDED','REINTEGRATING','COMPLETED')) | Trạng thái |
| `lifecycle`         | VARCHAR(30)     | NOT NULL | `'KHOI_TAO'`        | CHECK(IN('KHOI_TAO','ENROLLMENT','DANG_QUAN_LY','TAI_HOA_NHAP','KET_THUC')) | Vòng đời |
| `compliance_rate`   | DECIMAL(5,2)    | NULL     |                      | CHECK(0 <= val <= 100)   | Tỷ lệ tuân thủ (%) — tính toán từ events  |
| `enrollment_date`   | TIMESTAMPTZ     | NULL     |                      |                          | Ngày enrollment thành công                  |
| `custom_fields`     | JSONB           | NULL     | `'{}'`               |                          | Trường dữ liệu bổ sung từ kịch bản        |
| `notes`             | TEXT            | NULL     |                      |                          | Ghi chú chung                               |
| `created_by_id`     | UUID            | NOT NULL |                      | FK → users.id            | Cán bộ tạo hồ sơ                           |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `deleted_at`        | TIMESTAMPTZ     | NULL     |                      |                          | Soft delete                                 |

---

### 3.4 Table: `subject_families` — Thông tin gia đình

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                           |
|---------------------|-----------------|----------|----------------------|--------------------------|----------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                  |
| `subject_id`        | UUID            | NOT NULL |                      | FK → subjects.id, UNIQUE | 1-1 với subject                  |
| `father_name`       | VARCHAR(200)    | NULL     |                      |                          | Họ tên cha                       |
| `mother_name`       | VARCHAR(200)    | NULL     |                      |                          | Họ tên mẹ                       |
| `spouse_name`       | VARCHAR(200)    | NULL     |                      |                          | Họ tên vợ/chồng                 |
| `dependents`        | SMALLINT        | NULL     | `0`                  |                          | Số người phụ thuộc              |
| `family_notes`      | TEXT            | NULL     |                      |                          | Ghi chú gia đình                 |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |

---

### 3.5 Table: `subject_legals` — Thông tin pháp lý

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                           |
|---------------------|-----------------|----------|----------------------|--------------------------|----------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                  |
| `subject_id`        | UUID            | NOT NULL |                      | FK → subjects.id, UNIQUE | 1-1 với subject                  |
| `decision_number`   | VARCHAR(100)    | NULL     |                      |                          | Số quyết định                    |
| `decision_date`     | DATE            | NULL     |                      |                          | Ngày quyết định                  |
| `management_type`   | VARCHAR(50)     | NOT NULL |                      |                          | Loại quản lý (VD: QUAN_CHE)    |
| `start_date`        | DATE            | NOT NULL |                      |                          | Ngày bắt đầu quản lý           |
| `end_date`          | DATE            | NULL     |                      |                          | Ngày kết thúc (dự kiến)        |
| `issuing_authority`  | VARCHAR(300)    | NULL     |                      |                          | Cơ quan ban hành                 |
| `legal_notes`       | TEXT            | NULL     |                      |                          | Ghi chú pháp lý                 |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |

---

### 3.6 Table: `devices` — Thiết bị đối tượng

> Mỗi đối tượng bind 1 thiết bị (SBR-03). Đổi thiết bị cần cán bộ duyệt.

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                           |
|---------------------|-----------------|----------|----------------------|--------------------------|----------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                  |
| `subject_id`        | UUID            | NOT NULL |                      | FK → subjects.id         |                                  |
| `device_id`         | VARCHAR(200)    | NOT NULL |                      |                          | Android device ID                |
| `device_model`      | VARCHAR(200)    | NULL     |                      |                          | Model thiết bị (VD: Samsung A54)|
| `os_version`        | VARCHAR(50)     | NULL     |                      |                          | Phiên bản OS                     |
| `status`            | VARCHAR(20)     | NOT NULL | `'ACTIVE'`           | CHECK(IN('ACTIVE','SUSPENDED','REPLACED')) | Trạng thái |
| `enrolled_at`       | TIMESTAMPTZ     | NOT NULL |                      |                          | Ngày bind                        |
| `replaced_at`       | TIMESTAMPTZ     | NULL     |                      |                          | Ngày bị thay thế                 |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |

---

### 3.7 Table: `geofences` — Vùng giám sát GPS

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                           |
|---------------------|-----------------|----------|----------------------|--------------------------|----------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                  |
| `code`              | VARCHAR(30)     | NOT NULL |                      | UNIQUE                   | Mã geofence                      |
| `name`              | VARCHAR(200)    | NOT NULL |                      |                          | Tên vùng                         |
| `type`              | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('CIRCLE','POLYGON')) | Loại vùng                  |
| `center_lat`        | DECIMAL(10,7)   | NULL     |                      |                          | Tâm — vĩ độ (CIRCLE)            |
| `center_lng`        | DECIMAL(10,7)   | NULL     |                      |                          | Tâm — kinh độ (CIRCLE)          |
| `radius`            | INTEGER         | NULL     |                      |                          | Bán kính (mét) — CIRCLE         |
| `coordinates`       | JSONB           | NULL     |                      |                          | Mảng tọa độ [{lat,lng}] — POLYGON |
| `area_id`           | UUID            | NOT NULL |                      | FK → areas.id            | Thuộc đơn vị hành chính          |
| `is_active`         | BOOLEAN         | NOT NULL | `true`               |                          |                                  |
| `created_by_id`     | UUID            | NOT NULL |                      | FK → users.id            |                                  |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |
| `deleted_at`        | TIMESTAMPTZ     | NULL     |                      |                          |                                  |

---

### 3.8 Table: `management_scenarios` — Kịch bản Quản lý

> Kịch bản xác định quy tắc chấp hành cho đối tượng.
> SBR-08: Tạo kịch bản → hệ thống tự gắn 4 Alert Rules mặc định.
> Versioning: sửa → tạo bản mới, liên kết parent_version_id.

| Column                    | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                      | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `code`                    | VARCHAR(30)     | NOT NULL |                      | UNIQUE                   | Mã kịch bản: `KB-QC-NNN`                  |
| `name`                    | VARCHAR(200)    | NOT NULL |                      |                          | Tên kịch bản                                |
| `description`             | TEXT            | NULL     |                      |                          | Mô tả                                      |
| `status`                  | VARCHAR(30)     | NOT NULL | `'DRAFT'`            | CHECK(IN('DRAFT','PENDING_APPROVAL','ACTIVE','SUSPENDED','EXPIRED')) | Trạng thái |
| `version`                 | INTEGER         | NOT NULL | `1`                  |                          | Số version                                  |
| `parent_version_id`       | UUID            | NULL     |                      | FK → management_scenarios.id | Version trước đó               |
| `scope`                   | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('WARD','DISTRICT','PROVINCE','SYSTEM')) | Phạm vi áp dụng |
| `checkin_frequency`       | VARCHAR(30)     | NOT NULL |                      |                          | `1_PER_WEEK`, `2_PER_MONTH`, `1_PER_MONTH` |
| `checkin_window_start`    | TIME            | NOT NULL |                      |                          | Giờ bắt đầu khung trình báo                |
| `checkin_window_end`      | TIME            | NOT NULL |                      |                          | Giờ kết thúc khung trình báo                |
| `grace_period_days`       | SMALLINT        | NOT NULL | `2`                  |                          | Số ngày grace period (±)                    |
| `face_threshold`          | SMALLINT        | NOT NULL | `85`                 | CHECK(0 <= val <= 100)   | Ngưỡng face match tối thiểu (%)            |
| `nfc_required`            | BOOLEAN         | NOT NULL | `true`               |                          | NFC bắt buộc hay không                      |
| `fallback_allowed`        | BOOLEAN         | NOT NULL | `true`               |                          | Cho phép fallback trực tiếp                 |
| `geofence_id`             | UUID            | NULL     |                      | FK → geofences.id        | Vùng geofence áp dụng                      |
| `curfew_start`            | TIME            | NULL     |                      |                          | Giờ giới nghiêm bắt đầu                    |
| `curfew_end`              | TIME            | NULL     |                      |                          | Giờ giới nghiêm kết thúc                    |
| `travel_approval_required`| BOOLEAN         | NOT NULL | `true`               |                          | Bắt buộc xin phép đi xa                    |
| `travel_threshold_days`   | SMALLINT        | NULL     | `3`                  |                          | Đi xa > N ngày phải xin phép               |
| `auto_transitions`        | JSONB           | NULL     | `'[]'`               |                          | Quy tắc chuyển trạng thái tự động          |
| `custom_field_definitions`| JSONB           | NULL     | `'[]'`               |                          | Định nghĩa trường bổ sung [{name,type,required}] |
| `notification_config`     | JSONB           | NOT NULL | `'{}'`               |                          | Cấu hình nhắc nhở                          |
| `auto_escalation_config`  | JSONB           | NOT NULL | `'{"KHAN_CAP":true,"CAO":false,"TRUNG_BINH":false,"THAP":false}'` | | Mức nào auto-escalate thành Case |
| `effective_from`          | DATE            | NULL     |                      |                          | Ngày hiệu lực                               |
| `effective_to`            | DATE            | NULL     |                      |                          | Ngày hết hiệu lực                           |
| `created_by_id`           | UUID            | NOT NULL |                      | FK → users.id            | Người tạo                                   |
| `approved_by_id`          | UUID            | NULL     |                      | FK → users.id            | Người phê duyệt                             |
| `approved_at`             | TIMESTAMPTZ     | NULL     |                      |                          | Thời gian phê duyệt                        |
| `created_at`              | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`              | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `deleted_at`              | TIMESTAMPTZ     | NULL     |                      |                          |                                             |

---

### 3.9 Table: `alert_rules` — Quy tắc Alert (mặc định + tùy chỉnh)

> SBR-08: Mặc định không xoá được, chỉ chỉnh tham số.
> `source = 'DEFAULT'` → 4 rules mặc định. `source = 'CUSTOM'` → cán bộ tự tạo.

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `scenario_id`       | UUID            | NOT NULL |                      | FK → management_scenarios.id | Thuộc kịch bản nào                    |
| `code`              | VARCHAR(50)     | NOT NULL |                      |                          | `DEFAULT_OVERDUE`, `DEFAULT_FACE_MISMATCH`, `DEFAULT_NFC_ANOMALY`, `DEFAULT_SEVERE_OVERDUE`, hoặc `CUSTOM_NNN` |
| `name`              | VARCHAR(200)    | NOT NULL |                      |                          | Tên quy tắc                                |
| `source`            | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('DEFAULT','CUSTOM')) | Mặc định hay tùy chỉnh               |
| `event_type`        | VARCHAR(50)     | NOT NULL |                      |                          | Loại Event trigger                          |
| `condition_operator`| VARCHAR(10)     | NOT NULL | `'>='`               |                          | `>=`, `=`, `>`, …                           |
| `condition_value`   | INTEGER         | NOT NULL |                      |                          | Ngưỡng (VD: 3 ngày, 3 lần)                |
| `condition_period`  | VARCHAR(20)     | NULL     |                      |                          | Khoảng thời gian (`30_DAYS`, `7_DAYS`...)  |
| `condition_extra`   | JSONB           | NULL     |                      |                          | Điều kiện bổ sung (AND/OR phức tạp)        |
| `alert_level`       | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('THAP','TRUNG_BINH','CAO','KHAN_CAP')) | Mức Alert sinh ra |
| `notification_channels` | JSONB       | NULL     | `'["PUSH"]'`         |                          | Kênh thông báo: `["PUSH","EMAIL","SMS"]`   |
| `is_editable`       | BOOLEAN         | NOT NULL | `true`               |                          | Có thể chỉnh tham số không                 |
| `is_deletable`      | BOOLEAN         | NOT NULL |                      |                          | `false` cho DEFAULT, `true` cho CUSTOM     |
| `is_active`         | BOOLEAN         | NOT NULL | `true`               |                          |                                             |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 3.10 Table: `scenario_assignments` — Gán kịch bản cho đối tượng

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `subject_id`        | UUID            | NOT NULL |                      | FK → subjects.id         |                                             |
| `scenario_id`       | UUID            | NOT NULL |                      | FK → management_scenarios.id |                                         |
| `alert_rule_overrides` | JSONB        | NULL     |                      |                          | Override tham số mặc định cho đối tượng cụ thể |
| `status`            | VARCHAR(20)     | NOT NULL | `'ACTIVE'`           | CHECK(IN('ACTIVE','INACTIVE','EXPIRED')) | Trạng thái gán |
| `assigned_by_id`    | UUID            | NOT NULL |                      | FK → users.id            | Cán bộ gán                                 |
| `assigned_at`       | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `unassigned_at`     | TIMESTAMPTZ     | NULL     |                      |                          | Ngày gỡ kịch bản                           |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

**Unique constraint:** `(subject_id, scenario_id, status)` WHERE `status = 'ACTIVE'` — mỗi đối tượng chỉ có 1 kịch bản ACTIVE cùng loại.

---

### 3.11 Table: `events` — Sự kiện

> Read-heavy table. Mọi sự kiện tự động ghi (SBR-07).
> Partition theo tháng nếu dữ liệu lớn.

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `code`              | VARCHAR(30)     | NOT NULL |                      | UNIQUE                   | `EVT-YYYYMMDD-NNNN`                        |
| `type`              | VARCHAR(50)     | NOT NULL |                      |                          | Loại event (xem Appendix B — API Doc)      |
| `subject_id`        | UUID            | NOT NULL |                      | FK → subjects.id         |                                             |
| `scenario_id`       | UUID            | NULL     |                      | FK → management_scenarios.id | Kịch bản đang áp dụng lúc event xảy ra |
| `result`            | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('SUCCESS','FAILED','WARNING')) | Kết quả      |
| `gps_lat`           | DECIMAL(10,7)   | NULL     |                      |                          | Vĩ độ                                      |
| `gps_lng`           | DECIMAL(10,7)   | NULL     |                      |                          | Kinh độ                                     |
| `gps_accuracy`      | DECIMAL(8,2)    | NULL     |                      |                          | Độ chính xác GPS (mét)                     |
| `in_geofence`       | BOOLEAN         | NULL     |                      |                          | Trong vùng geofence không                   |
| `geofence_distance` | INTEGER         | NULL     |                      |                          | Khoảng cách đến tâm geofence (mét)        |
| `face_match_score`  | DECIMAL(5,2)    | NULL     |                      |                          | Điểm so khớp face (0-100)                  |
| `nfc_verified`      | BOOLEAN         | NULL     |                      |                          | NFC xác minh thành công                     |
| `nfc_cccd_match`    | BOOLEAN         | NULL     |                      |                          | CCCD trên chip khớp                         |
| `liveness_score`    | DECIMAL(5,2)    | NULL     |                      |                          | Điểm liveness (0-100)                      |
| `face_image_url`    | VARCHAR(500)    | NULL     |                      |                          | URL ảnh face capture                        |
| `device_id`         | VARCHAR(200)    | NULL     |                      |                          | Device ID thực hiện                         |
| `device_info`       | JSONB           | NULL     |                      |                          | {model, osVersion}                          |
| `is_voluntary`      | BOOLEAN         | NOT NULL | `false`              |                          | Trình báo tự nguyện ngoài lịch             |
| `extra_data`        | JSONB           | NULL     |                      |                          | Dữ liệu bổ sung tùy loại event            |
| `client_timestamp`  | TIMESTAMPTZ     | NULL     |                      |                          | Timestamp từ client                         |
| `created_by_id`     | UUID            | NULL     |                      | FK → users.id            | NULL nếu system-generated                   |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          | Server timestamp = thời gian sự kiện       |

> **Note:** Events KHÔNG có `updated_at` hay `deleted_at` — immutable log (append-only).

---

### 3.12 Table: `alerts` — Cảnh báo

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `code`              | VARCHAR(30)     | NOT NULL |                      | UNIQUE                   | `ALT-YYYYMMDD-NNNN`                        |
| `type`              | VARCHAR(50)     | NOT NULL |                      |                          | Loại: `OVERDUE_CHECKIN`, `FACE_MISMATCH_CONSECUTIVE`, `NFC_CCCD_MISMATCH`, `SEVERE_OVERDUE`, `OUTSIDE_GEOFENCE_REPEAT`, ... |
| `level`             | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('THAP','TRUNG_BINH','CAO','KHAN_CAP')) | Mức độ |
| `status`            | VARCHAR(20)     | NOT NULL | `'OPEN'`             | CHECK(IN('OPEN','ACKNOWLEDGED','RESOLVED','ESCALATED')) | Trạng thái |
| `source`            | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('DEFAULT','CUSTOM')) | Nguồn: rule mặc định hay tùy chỉnh |
| `subject_id`        | UUID            | NOT NULL |                      | FK → subjects.id         |                                             |
| `trigger_event_id`  | UUID            | NOT NULL |                      | FK → events.id           | Event đã trigger Alert này                  |
| `alert_rule_id`     | UUID            | NOT NULL |                      | FK → alert_rules.id      | Quy tắc nào trigger                        |
| `scenario_id`       | UUID            | NOT NULL |                      | FK → management_scenarios.id | Kịch bản context                       |
| `case_id`           | UUID            | NULL     |                      | FK → cases.id            | Case nếu đã escalate (NULL nếu chưa)      |
| `resolved_at`       | TIMESTAMPTZ     | NULL     |                      |                          | Thời gian xử lý xong                       |
| `escalated_at`      | TIMESTAMPTZ     | NULL     |                      |                          | Thời gian escalate                          |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 3.13 Table: `alert_histories` — Lịch sử xử lý Alert

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `alert_id`          | UUID            | NOT NULL |                      | FK → alerts.id           |                                             |
| `action`            | VARCHAR(30)     | NOT NULL |                      | CHECK(IN('CREATED','ACKNOWLEDGED','RESOLVED','ESCALATED')) | Hành động |
| `user_id`           | UUID            | NULL     |                      | FK → users.id            | NULL nếu SYSTEM                             |
| `performed_by`      | VARCHAR(100)    | NOT NULL |                      |                          | `'SYSTEM'` hoặc tên cán bộ                 |
| `note`              | TEXT            | NULL     |                      |                          | Ghi chú khi xử lý                          |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 3.14 Table: `cases` — Vụ việc

| Column                   | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|--------------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                     | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `code`                   | VARCHAR(30)     | NOT NULL |                      | UNIQUE                   | `CASE-YYYYMMDD-NNNN`                       |
| `subject_id`             | UUID            | NOT NULL |                      | FK → subjects.id         |                                             |
| `status`                 | VARCHAR(20)     | NOT NULL | `'OPEN'`             | CHECK(IN('OPEN','CLOSED'))| Trạng thái                                 |
| `severity`               | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('THAP','TRUNG_BINH','CAO','KHAN_CAP')) | Mức độ nghiêm trọng |
| `source`                 | VARCHAR(30)     | NOT NULL |                      | CHECK(IN('AUTO','MANUAL_ESCALATE','MANUAL_NEW')) | Nguồn tạo |
| `description`            | TEXT            | NULL     |                      |                          | Mô tả vụ việc (manual create)              |
| `escalated_from_alert_id`| UUID            | NULL     |                      | FK → alerts.id           | Alert gốc (NULL nếu tạo thủ công)         |
| `escalation_type`        | VARCHAR(20)     | NULL     |                      | CHECK(IN('AUTO','MANUAL'))| Auto hay thủ công                          |
| `escalation_reason`      | TEXT            | NULL     |                      |                          | Lý do escalation / ghi chú tạo            |
| `escalation_rule_name`   | VARCHAR(200)    | NULL     |                      |                          | Tên rule đã trigger (auto)                 |
| `linked_event_ids`       | JSONB           | NULL     | `'[]'`               |                          | Mảng Event IDs liên quan                   |
| `assignee_id`            | UUID            | NULL     |                      | FK → users.id            | Cán bộ phụ trách                            |
| `created_by_id`          | UUID            | NULL     |                      | FK → users.id            | NULL nếu SYSTEM auto-create                |
| `created_by_name`        | VARCHAR(100)    | NOT NULL |                      |                          | `'SYSTEM'` hoặc tên cán bộ                 |
| `closing_note`           | TEXT            | NULL     |                      |                          | Ghi chú khi đóng (bắt buộc — SBR-12)      |
| `closed_by_id`           | UUID            | NULL     |                      | FK → users.id            | Cán bộ đóng                                 |
| `closed_at`              | TIMESTAMPTZ     | NULL     |                      |                          | Thời gian đóng                              |
| `related_case_id`        | UUID            | NULL     |                      | FK → cases.id            | Liên kết Case cũ (EC-14: mở lại)          |
| `created_at`             | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`             | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 3.15 Table: `case_notes` — Ghi chú vụ việc (thread)

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `case_id`           | UUID            | NOT NULL |                      | FK → cases.id            |                                             |
| `content`           | TEXT            | NOT NULL |                      |                          | Nội dung ghi chú                            |
| `author_id`         | UUID            | NOT NULL |                      | FK → users.id            | Cán bộ ghi chú                              |
| `photos`            | JSONB           | NULL     | `'[]'`               |                          | Mảng [{url, gps_lat, gps_lng, captured_at, captured_by}] |
| `is_closing_note`   | BOOLEAN         | NOT NULL | `false`              |                          | Ghi chú đóng Case                           |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

> **Note:** Case notes KHÔNG có `updated_at`, `deleted_at` — immutable thread.

---

### 3.16 Table: `requests` — Yêu cầu xin phép

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `code`              | VARCHAR(30)     | NOT NULL |                      | UNIQUE                   | `YC-YYYYMMDD-NNNN`                         |
| `subject_id`        | UUID            | NOT NULL |                      | FK → subjects.id         |                                             |
| `type`              | VARCHAR(30)     | NOT NULL |                      | CHECK(IN('TRAVEL','POSTPONE','CHANGE_DEVICE','CHANGE_ADDRESS')) | Loại yêu cầu |
| `status`            | VARCHAR(20)     | NOT NULL | `'PENDING'`          | CHECK(IN('PENDING','APPROVED','REJECTED')) | Trạng thái |
| `reason`            | TEXT            | NOT NULL |                      |                          | Lý do                                      |
| `details`           | JSONB           | NOT NULL |                      |                          | Chi tiết tùy loại: {destination, fromDate, toDate, newAddress, newDeviceId...} |
| `reviewed_by_id`    | UUID            | NULL     |                      | FK → users.id            | Cán bộ xét duyệt                           |
| `review_note`       | TEXT            | NULL     |                      |                          | Ghi chú của cán bộ khi duyệt/từ chối      |
| `reviewed_at`       | TIMESTAMPTZ     | NULL     |                      |                          | Thời gian xét duyệt                        |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 3.17 Table: `notifications` — Thông báo

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `user_id`           | UUID            | NOT NULL |                      | FK → users.id            | Người nhận                                  |
| `type`              | VARCHAR(50)     | NOT NULL |                      |                          | `NEW_ALERT`, `NEW_CASE`, `NEW_REQUEST`, `SCENARIO_APPROVAL`, `CHECKIN_REMINDER`, ... |
| `title`             | VARCHAR(300)    | NOT NULL |                      |                          | Tiêu đề                                    |
| `message`           | TEXT            | NOT NULL |                      |                          | Nội dung                                    |
| `entity_type`       | VARCHAR(30)     | NULL     |                      |                          | Polymorphic: `ALERT`, `CASE`, `REQUEST`, `SUBJECT`, `SCENARIO` |
| `entity_id`         | UUID            | NULL     |                      |                          | ID entity liên quan                         |
| `link`              | VARCHAR(500)    | NULL     |                      |                          | URL deep link (Web)                         |
| `channel`           | VARCHAR(20)     | NOT NULL | `'WEB'`              | CHECK(IN('WEB','PUSH','EMAIL','SMS')) | Kênh gửi  |
| `is_read`           | BOOLEAN         | NOT NULL | `false`              |                          | Đã đọc                                     |
| `read_at`           | TIMESTAMPTZ     | NULL     |                      |                          |                                             |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 3.18 Table: `files` — File upload

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `original_name`     | VARCHAR(500)    | NOT NULL |                      |                          | Tên file gốc                                |
| `stored_path`       | VARCHAR(500)    | NOT NULL |                      |                          | Đường dẫn lưu trữ                          |
| `mime_type`         | VARCHAR(100)    | NOT NULL |                      |                          | `application/pdf`, `image/jpeg`...          |
| `size`              | INTEGER         | NOT NULL |                      | CHECK(val <= 10485760)   | Kích thước (bytes) ≤ 10MB                  |
| `file_type`         | VARCHAR(30)     | NOT NULL |                      | CHECK(IN('DOCUMENT','PHOTO','FIELD_PHOTO')) | Phân loại |
| `entity_type`       | VARCHAR(30)     | NOT NULL |                      |                          | Polymorphic: `SUBJECT`, `CASE`, `EVENT`     |
| `entity_id`         | UUID            | NOT NULL |                      |                          | ID entity                                   |
| `gps_lat`           | DECIMAL(10,7)   | NULL     |                      |                          | GPS ảnh thực địa                            |
| `gps_lng`           | DECIMAL(10,7)   | NULL     |                      |                          |                                             |
| `captured_at`       | TIMESTAMPTZ     | NULL     |                      |                          | Thời gian chụp ảnh                          |
| `uploaded_by_id`    | UUID            | NOT NULL |                      | FK → users.id            |                                             |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `deleted_at`        | TIMESTAMPTZ     | NULL     |                      |                          |                                             |

---

### 3.19 Table: `audit_logs` — Nhật ký hệ thống

> SBR-17: Append-only. KHÔNG có update, KHÔNG có delete.

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `user_id`           | UUID            | NOT NULL |                      | FK → users.id            | Cán bộ thực hiện                            |
| `user_name`         | VARCHAR(200)    | NOT NULL |                      |                          | Tên cán bộ (snapshot tại thời điểm)        |
| `user_role`         | VARCHAR(30)     | NOT NULL |                      |                          | Role tại thời điểm                          |
| `action`            | VARCHAR(50)     | NOT NULL |                      |                          | `SUBJECT_CREATE`, `SUBJECT_UPDATE`, `ALERT_ACKNOWLEDGE`, `ALERT_ESCALATE`, `CASE_CREATE`, `CASE_CLOSE`, `SCENARIO_CREATE`, `SCENARIO_APPROVE`, `USER_CREATE`, `USER_LOCK`, `LOGIN`, `LOGOUT`, ... |
| `target_type`       | VARCHAR(30)     | NOT NULL |                      |                          | `SUBJECT`, `EVENT`, `ALERT`, `CASE`, `SCENARIO`, `USER`, `CONFIG` |
| `target_id`         | UUID            | NULL     |                      |                          | ID entity bị tác động                       |
| `target_name`       | VARCHAR(200)    | NULL     |                      |                          | Tên/mã entity (snapshot)                    |
| `details`           | JSONB           | NULL     |                      |                          | Chi tiết thay đổi: {before, after} hoặc mô tả |
| `ip_address`        | VARCHAR(45)     | NULL     |                      |                          | IPv4 hoặc IPv6                              |
| `user_agent`        | VARCHAR(500)    | NULL     |                      |                          | Browser/App user agent                      |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 3.20 Table: `configs` — Cấu hình hệ thống

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `key`               | VARCHAR(100)    | NOT NULL |                      | UNIQUE                   | Khoá cấu hình                               |
| `value`             | JSONB           | NOT NULL |                      |                          | Giá trị                                     |
| `category`          | VARCHAR(50)     | NOT NULL |                      |                          | `SYSTEM`, `BIOMETRIC`, `ESCALATION`, `NOTIFICATION`, `CATEGORY` |
| `description`       | TEXT            | NULL     |                      |                          | Mô tả                                      |
| `updated_by_id`     | UUID            | NULL     |                      | FK → users.id            |                                             |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

**Configs mặc định (seed):**

| Key                                | Category      | Value (JSONB)                                     |
|------------------------------------|---------------|---------------------------------------------------|
| `system.default_page_size`         | SYSTEM        | `20`                                              |
| `system.max_file_size_bytes`       | SYSTEM        | `10485760`                                        |
| `biometric.face_threshold`         | BIOMETRIC     | `85`                                              |
| `biometric.liveness_enabled`       | BIOMETRIC     | `true`                                            |
| `biometric.retention_months`       | BIOMETRIC     | `12`                                              |
| `escalation.auto_levels`           | ESCALATION    | `{"KHAN_CAP": true, "CAO": false}`                |
| `category.management_types`        | CATEGORY      | `["QUAN_CHE","GIAM_SAT","TAI_HOA_NHAP","KHAC"]`  |
| `category.subject_types`           | CATEGORY      | `["LOAI_1","LOAI_2","LOAI_3"]`                    |

---

### 3.21 Table: `refresh_tokens` — JWT Refresh Tokens

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                           |
|---------------------|-----------------|----------|----------------------|--------------------------|----------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                  |
| `user_id`           | UUID            | NOT NULL |                      | FK → users.id            |                                  |
| `token_hash`        | VARCHAR(255)    | NOT NULL |                      | UNIQUE                   | Hash của refresh token           |
| `expires_at`        | TIMESTAMPTZ     | NOT NULL |                      |                          | Thời gian hết hạn               |
| `revoked`           | BOOLEAN         | NOT NULL | `false`              |                          | Đã thu hồi                      |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                  |

---

## 4. DATA DICTIONARY — BIOMETRIC DATABASE (smtts_biometric)

> Database tách biệt hoàn toàn (SBR-18). Mã hóa AES-256 at-rest.
> Liên kết với main DB qua `subject_id` (không dùng FK ở mức DB, xử lý application-level).

### 4.1 Table: `face_templates` — Face Embedding

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `subject_id`        | UUID            | NOT NULL |                      | UNIQUE                   | ID đối tượng (ref main DB — không FK)      |
| `embedding`         | BYTEA           | NOT NULL |                      |                          | Face embedding vector (AES-256 encrypted)  |
| `embedding_version` | VARCHAR(20)     | NOT NULL |                      |                          | Phiên bản model (`v1`, `v2`...)            |
| `source_image_hash` | VARCHAR(64)     | NOT NULL |                      |                          | SHA-256 hash ảnh gốc enrollment             |
| `quality_score`     | DECIMAL(5,2)    | NULL     |                      |                          | Chất lượng ảnh enrollment                   |
| `enrolled_at`       | TIMESTAMPTZ     | NOT NULL |                      |                          | Ngày enrollment                             |
| `re_enrolled_at`    | TIMESTAMPTZ     | NULL     |                      |                          | Ngày re-enroll (nếu có)                    |
| `expires_at`        | TIMESTAMPTZ     | NULL     |                      |                          | Ngày hết hạn retention (12 tháng)          |
| `is_active`         | BOOLEAN         | NOT NULL | `true`               |                          |                                             |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 4.2 Table: `nfc_records` — NFC Hash

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `subject_id`        | UUID            | NOT NULL |                      | UNIQUE                   | ID đối tượng (ref main DB)                 |
| `cccd_chip_hash`    | VARCHAR(128)    | NOT NULL |                      |                          | Hash dữ liệu chip CCCD (AES-256 encrypted)|
| `chip_serial`       | VARCHAR(100)    | NULL     |                      |                          | Serial chip (encrypted)                     |
| `passive_auth_data` | BYTEA           | NULL     |                      |                          | Dữ liệu Passive Authentication (encrypted)|
| `enrolled_at`       | TIMESTAMPTZ     | NOT NULL |                      |                          |                                             |
| `is_active`         | BOOLEAN         | NOT NULL | `true`               |                          |                                             |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |
| `updated_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

### 4.3 Table: `biometric_logs` — Log match mỗi lần trình báo

| Column              | Type            | Nullable | Default              | Constraint               | Mô tả                                      |
|---------------------|-----------------|----------|----------------------|--------------------------|---------------------------------------------|
| `id`                | UUID            | NOT NULL | `uuid_generate_v4()` | PK                       |                                             |
| `subject_id`        | UUID            | NOT NULL |                      |                          |                                             |
| `event_id`          | UUID            | NOT NULL |                      |                          | ID Event tương ứng (ref main DB)           |
| `face_match_score`  | DECIMAL(5,2)    | NOT NULL |                      |                          | Điểm so khớp                                |
| `face_threshold`    | SMALLINT        | NOT NULL |                      |                          | Ngưỡng áp dụng lúc match                   |
| `face_result`       | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('MATCH','MISMATCH','ERROR')) |                              |
| `liveness_result`   | VARCHAR(20)     | NULL     |                      | CHECK(IN('PASS','FAIL','SKIPPED'))    |                              |
| `nfc_result`        | VARCHAR(20)     | NOT NULL |                      | CHECK(IN('VERIFIED','FAILED','MISMATCH')) |                          |
| `match_duration_ms` | INTEGER         | NULL     |                      |                          | Thời gian xử lý (ms)                       |
| `created_at`        | TIMESTAMPTZ     | NOT NULL | `NOW()`              |                          |                                             |

---

## 5. INDEX STRATEGY

### 5.1 Main Database — Critical Indexes

```sql
-- areas
CREATE INDEX idx_areas_parent ON areas(parent_id);
CREATE INDEX idx_areas_level ON areas(level);

-- users
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_area ON users(area_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- subjects
CREATE INDEX idx_subjects_area ON subjects(area_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_status ON subjects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_cccd_hash ON subjects(cccd_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_code ON subjects(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_full_name ON subjects USING GIN(to_tsvector('simple', full_name));
CREATE INDEX idx_subjects_created_by ON subjects(created_by_id);

-- events (read-heavy, partition candidate)
CREATE INDEX idx_events_subject ON events(subject_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_subject_created ON events(subject_id, created_at DESC);
CREATE INDEX idx_events_scenario ON events(scenario_id);
CREATE INDEX idx_events_result ON events(result);

-- alerts
CREATE INDEX idx_alerts_subject ON alerts(subject_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_level ON alerts(level);
CREATE INDEX idx_alerts_status_level ON alerts(status, level);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_scenario ON alerts(scenario_id);

-- cases
CREATE INDEX idx_cases_subject ON cases(subject_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_severity ON cases(severity);
CREATE INDEX idx_cases_assignee ON cases(assignee_id);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

-- case_notes
CREATE INDEX idx_case_notes_case ON case_notes(case_id, created_at ASC);

-- scenario_assignments
CREATE INDEX idx_sa_subject ON scenario_assignments(subject_id);
CREATE INDEX idx_sa_scenario ON scenario_assignments(scenario_id);
CREATE INDEX idx_sa_active ON scenario_assignments(subject_id, status) WHERE status = 'ACTIVE';

-- requests
CREATE INDEX idx_requests_subject ON requests(subject_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);

-- notifications
CREATE INDEX idx_notif_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(user_id) WHERE is_read = false;

-- audit_logs (append-only, query-heavy)
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- files
CREATE INDEX idx_files_entity ON files(entity_type, entity_id);

-- refresh_tokens
CREATE INDEX idx_rt_user ON refresh_tokens(user_id);
CREATE INDEX idx_rt_expires ON refresh_tokens(expires_at) WHERE revoked = false;
```

### 5.2 Biometric Database — Indexes

```sql
CREATE UNIQUE INDEX idx_face_subject ON face_templates(subject_id) WHERE is_active = true;
CREATE UNIQUE INDEX idx_nfc_subject ON nfc_records(subject_id) WHERE is_active = true;
CREATE INDEX idx_bio_logs_subject ON biometric_logs(subject_id, created_at DESC);
CREATE INDEX idx_bio_logs_event ON biometric_logs(event_id);
```

---

## 6. THỐNG KÊ TỔNG HỢP

### Main Database: 21 tables

| # | Table                    | Loại          | Ước tính row/năm | Ghi chú              |
|---|--------------------------|---------------|-------------------|----------------------|
| 1 | areas                    | Reference     | ~500              | Seed data            |
| 2 | users                    | Core          | ~200              | Cán bộ + đối tượng   |
| 3 | subjects                 | Core          | ~5,000            | Hồ sơ đối tượng      |
| 4 | subject_families         | Core (1-1)    | ~5,000            | 1-1 với subjects     |
| 5 | subject_legals           | Core (1-1)    | ~5,000            | 1-1 với subjects     |
| 6 | devices                  | Core          | ~6,000            | Bao gồm thay thế     |
| 7 | geofences                | Reference     | ~100              |                      |
| 8 | management_scenarios     | Core          | ~50               | Bao gồm versioning   |
| 9 | alert_rules              | Core          | ~200              | 4 default/scenario + custom |
| 10| scenario_assignments     | Core          | ~10,000           |                      |
| 11| events                   | Log (heavy)   | ~500,000          | Partition candidate  |
| 12| alerts                   | Core          | ~20,000           |                      |
| 13| alert_histories          | Log           | ~50,000           |                      |
| 14| cases                    | Core          | ~5,000            |                      |
| 15| case_notes               | Log           | ~15,000           |                      |
| 16| requests                 | Core          | ~10,000           |                      |
| 17| notifications            | Log           | ~200,000          | Có thể archive       |
| 18| files                    | Reference     | ~20,000           |                      |
| 19| audit_logs               | Log (heavy)   | ~500,000          | Partition candidate  |
| 20| configs                  | Reference     | ~30               | Key-value            |
| 21| refresh_tokens           | Session       | ~50,000           | Cleanup expired      |

### Biometric Database: 3 tables

| # | Table                    | Ước tính row  |
|---|--------------------------|---------------|
| 1 | face_templates           | ~5,000        |
| 2 | nfc_records              | ~5,000        |
| 3 | biometric_logs           | ~500,000/năm  |

---

> **Tài liệu ERD v1.0 hoàn tất.**
> Tổng: 24 tables (21 main + 3 biometric), mapping đầy đủ với 17 API modules và toàn bộ business rules (SBR-01 → SBR-20).
