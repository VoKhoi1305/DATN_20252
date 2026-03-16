# API DOCUMENTATION — HỆ THỐNG SMTTS
## Subject Management, Tracking & Tracing System
### RESTful API v1 | NestJS + PostgreSQL
### Phiên bản: 1.0 | Ngày: 15/03/2026

---

## MỤC LỤC

1. [Tổng quan API](#1-tổng-quan-api)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Module: Authentication (AUTH)](#3-authentication)
4. [Module: Subjects (Hồ sơ đối tượng)](#4-subjects)
5. [Module: Events (Sự kiện)](#5-events)
6. [Module: Alerts (Cảnh báo)](#6-alerts)
7. [Module: Cases (Vụ việc)](#7-cases)
8. [Module: Check-in (Trình báo — Mobile)](#8-check-in)
9. [Module: Requests (Yêu cầu xin phép)](#9-requests)
10. [Module: Scenarios (Kịch bản)](#10-scenarios)
11. [Module: Enrollment (Thiết bị & Đăng ký)](#11-enrollment)
12. [Module: Geofence](#12-geofence)
13. [Module: Notifications (Thông báo)](#13-notifications)
14. [Module: Users (Tài khoản cán bộ)](#14-users)
15. [Module: Config (Cấu hình hệ thống)](#15-config)
16. [Module: Audit Log (Nhật ký)](#16-audit-log)
17. [Module: Reports (Báo cáo)](#17-reports)
18. [Module: Upload (File)](#18-upload)
19. [Module: Dashboard](#19-dashboard)
20. [Appendix: Error Codes](#appendix-a)
21. [Appendix: Enum Values](#appendix-b)
22. [Appendix: Database Entity Summary](#appendix-c)

---

## 1. TỔNG QUAN API

### 1.1 Thông tin cơ bản

| Mục              | Giá trị                                          |
|------------------|--------------------------------------------------|
| Base URL         | `/api/v1`                                        |
| Protocol         | HTTPS (TLS 1.2+)                                |
| Format           | JSON (`Content-Type: application/json`)          |
| Encoding         | UTF-8                                            |
| Timezone         | Lưu UTC. Hiển thị `Asia/Ho_Chi_Minh` (UTC+7)    |
| Date format (DB) | ISO 8601 (`2026-03-15T02:47:00.000Z`)            |
| Date format (UI) | `DD/MM/YYYY HH:mm`                              |
| Auth             | Bearer JWT + TOTP (OTP) cho cán bộ               |
| Versioning       | URL path (`/api/v1/...`)                         |

### 1.2 Hai nhóm consumer

| Consumer       | Platform      | Auth method                                | Endpoints sử dụng                     |
|----------------|---------------|-------------------------------------------|---------------------------------------|
| Web Dashboard  | React SPA     | Username + Password + OTP → JWT            | Tất cả `/api/v1/*` (trừ `/checkin`)  |
| Mobile App     | Android/Kotlin| CCCD (encrypted) + Password → JWT          | `/auth/mobile/*`, `/checkin`, `/requests`, `/notifications`, `/subjects/me` |

### 1.3 Kiến trúc tổng quát

```
┌─────────────────┐     ┌─────────────────┐
│  Web Dashboard  │     │   Mobile App    │
│  (React + TW)   │     │  (Android/KT)   │
└────────┬────────┘     └────────┬────────┘
         │   HTTPS               │   HTTPS
         ▼                       ▼
┌────────────────────────────────────────────┐
│            API GATEWAY (NestJS)             │
│  Rate Limiting · JWT Guard · OTP Guard     │
│  Role Guard · DataScope Guard · Audit Log  │
├────────────────────────────────────────────┤
│  /auth    /subjects  /events  /alerts      │
│  /cases   /checkin   /requests /scenarios  │
│  /enrollment /geofence /notifications      │
│  /users   /config    /audit   /reports     │
│  /upload  /dashboard                       │
├────────────────────────────────────────────┤
│     Scenario Engine · Alert Rule Engine    │
│     Escalation Manager · Scheduled Jobs    │
├──────────────────┬─────────────────────────┤
│  PostgreSQL Main │  PostgreSQL Biometric   │
│  (subjects, events, alerts, cases,         │
│   scenarios, users, audit, config...)      │
│                  │  (face_templates,        │
│                  │   nfc_records)           │
└──────────────────┴─────────────────────────┘
```

---

## 2. QUY ƯỚC CHUNG

### 2.1 Authentication Header

```
Authorization: Bearer <jwt_token>
```

JWT payload chứa: `userId`, `role`, `dataScope`, `otpVerified`, `iat`, `exp`.

### 2.2 Response Format — Thành công

```json
// Single object
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-03-15T02:47:00.000Z"
}

// Paginated list
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 245,
    "page": 1,
    "limit": 20,
    "totalPages": 13
  },
  "timestamp": "2026-03-15T02:47:00.000Z"
}
```

### 2.3 Response Format — Lỗi

```json
{
  "success": false,
  "error": {
    "code": "SUBJECT_NOT_FOUND",
    "message": "Không tìm thấy hồ sơ đối tượng.",
    "details": {
      "subjectId": "HS-2024-0047"
    }
  },
  "timestamp": "2026-03-15T02:47:00.000Z"
}
```

### 2.4 HTTP Status Codes

| Status | Ý nghĩa                     | Khi nào dùng                                 |
|--------|------------------------------|----------------------------------------------|
| 200    | OK                           | GET, PUT, PATCH thành công                   |
| 201    | Created                      | POST tạo mới thành công                      |
| 204    | No Content                   | DELETE thành công                            |
| 400    | Bad Request                  | Dữ liệu không hợp lệ, validation fail       |
| 401    | Unauthorized                 | Chưa đăng nhập, token hết hạn               |
| 403    | Forbidden                    | Không đủ quyền (role hoặc data_scope)        |
| 404    | Not Found                    | Resource không tồn tại                       |
| 409    | Conflict                     | Trùng lặp dữ liệu (CCCD, username...)       |
| 429    | Too Many Requests            | Rate limit exceeded                          |
| 500    | Internal Server Error        | Lỗi hệ thống                                |

### 2.5 Pagination

```
GET /api/v1/subjects?page=1&limit=20
```

| Param   | Type   | Default | Mô tả               |
|---------|--------|---------|----------------------|
| `page`  | number | 1       | Trang hiện tại       |
| `limit` | number | 20      | Số item mỗi trang    |

### 2.6 Sorting

```
GET /api/v1/subjects?sort=created_at&order=desc
```

| Param   | Type   | Default      | Mô tả                  |
|---------|--------|-------------|------------------------|
| `sort`  | string | `created_at` | Tên field để sort      |
| `order` | string | `desc`       | `asc` hoặc `desc`     |

### 2.7 Filtering

```
GET /api/v1/subjects?status=ACTIVE&scenario_id=KB-001&from=2026-01-01&to=2026-03-15
```

### 2.8 Search — Hệ thống Query đặc biệt

```
# Fulltext search (exact match dùng =)
GET /api/v1/subjects?q=Nguyễn Văn A

# Elastic search (fuzzy match dùng ~)
GET /api/v1/subjects?q=~Nguyen Van

# NOT (không chứa dùng !)
GET /api/v1/subjects?q=!Hà Nội

# Advanced query (AND/OR qua QueryBuilder)
GET /api/v1/subjects?filters=[{"field":"status","op":"=","value":"ACTIVE"},{"field":"name","op":"~","value":"Nguyễn"}]&logic=AND
```

### 2.9 Data Scope — Auto-filter theo địa bàn

Mọi endpoint danh sách tự động lọc theo `data_scope` của cán bộ đăng nhập:

| Role              | Data Scope mặc định              | Mở rộng       |
|-------------------|----------------------------------|----------------|
| `CAN_BO_CO_SO`    | Phường/xã được gán               | Không          |
| `CAN_BO_QUAN_LY`  | Quận/huyện (tổng hợp phường/xã) | Toàn hệ thống |
| `LANH_DAO`        | Tỉnh/TP (tổng hợp quận/huyện)   | Toàn hệ thống |
| `IT_ADMIN`        | Toàn hệ thống                    | —              |

Mở rộng: thêm `?scope=all` (chỉ role có quyền).

### 2.10 Rate Limiting

| Nhóm endpoint          | Limit                    |
|------------------------|--------------------------|
| `POST /auth/login`     | 5 requests / 15 phút / IP |
| `POST /auth/verify-otp`| 5 requests / 5 phút / user|
| `POST /checkin`        | 10 requests / giờ / user  |
| Các endpoint khác      | 100 requests / phút / user|

---

## 3. AUTHENTICATION (AUTH)

> Module xác thực cho cả Web Dashboard (cán bộ) và Mobile App (đối tượng).
> Cán bộ: username + password + TOTP.
> Đối tượng: CCCD (encrypted) + password.

### 3.1 POST `/auth/login` — Đăng nhập cán bộ (Web)

**Mô tả:** Cán bộ đăng nhập bằng username + password. Nếu OTP đã bật → trả `requireOtp: true`, client redirect sang xác thực OTP.

**Auth:** Public (không cần token)

**Request Body:**
```json
{
  "username": "canbo.nguyenvana",
  "password": "********"
}
```

**Response 200 — OTP chưa bật (ít xảy ra, chỉ lần đầu chưa setup):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "requireOtp": false,
    "requireOtpSetup": true,
    "user": {
      "id": "usr_001",
      "username": "canbo.nguyenvana",
      "fullName": "Nguyễn Văn A",
      "role": "CAN_BO_CO_SO",
      "dataScope": {
        "level": "WARD",
        "areaId": "ward_001",
        "areaName": "Phường Bến Nghé"
      },
      "otpEnabled": false
    }
  }
}
```

**Response 200 — OTP đã bật (flow thông thường):**
```json
{
  "success": true,
  "data": {
    "tempToken": "temp_eyJhbGci...",
    "requireOtp": true,
    "requireOtpSetup": false
  }
}
```

**Response 401:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Sai tên đăng nhập hoặc mật khẩu."
  }
}
```

**Response 423 (Locked):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Tài khoản đã bị khoá. Liên hệ quản trị viên."
  }
}
```

---

### 3.2 POST `/auth/verify-otp` — Xác thực OTP

**Mô tả:** Xác thực mã OTP từ Google Authenticator. Nhận `tempToken` từ bước login.

**Auth:** tempToken (header `Authorization: Bearer <tempToken>`)

**Request Body:**
```json
{
  "otpCode": "482937"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr_001",
      "username": "canbo.nguyenvana",
      "fullName": "Nguyễn Văn A",
      "role": "CAN_BO_CO_SO",
      "dataScope": {
        "level": "WARD",
        "areaId": "ward_001",
        "areaName": "Phường Bến Nghé"
      },
      "otpEnabled": true
    }
  }
}
```

**Response 401:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Mã OTP không hợp lệ hoặc đã hết hạn."
  }
}
```

---

### 3.3 POST `/auth/setup-otp` — Cài đặt OTP lần đầu

**Mô tả:** Sinh QR code + secret key để cán bộ link Google Authenticator. Trả về backup codes.

**Auth:** Bearer JWT (đã login nhưng chưa verify OTP lần đầu)

**Request Body:** Không cần

**Response 200:**
```json
{
  "success": true,
  "data": {
    "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgo...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": [
      "a1b2c3d4",
      "e5f6g7h8",
      "i9j0k1l2",
      "m3n4o5p6",
      "q7r8s9t0"
    ]
  }
}
```

---

### 3.4 POST `/auth/confirm-otp-setup` — Xác nhận setup OTP

**Mô tả:** Cán bộ nhập mã OTP từ app authenticator để xác nhận setup thành công.

**Auth:** Bearer JWT

**Request Body:**
```json
{
  "otpCode": "394821"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Cài đặt OTP thành công.",
    "otpEnabled": true
  }
}
```

---

### 3.5 POST `/auth/verify-backup-code` — Dùng backup code

**Mô tả:** Khi mất authenticator app, dùng backup code thay OTP.

**Auth:** tempToken

**Request Body:**
```json
{
  "backupCode": "a1b2c3d4"
}
```

**Response 200:** Giống response verify-otp (trả accessToken + refreshToken).

---

### 3.6 POST `/auth/refresh` — Làm mới token

**Auth:** Public (gửi refreshToken trong body)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...(new)",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...(new)"
  }
}
```

---

### 3.7 POST `/auth/logout` — Đăng xuất

**Auth:** Bearer JWT

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 204:** No Content

---

### 3.8 POST `/auth/change-password` — Đổi mật khẩu (cán bộ)

**Auth:** Bearer JWT

**Request Body:**
```json
{
  "currentPassword": "********",
  "newPassword": "**********",
  "confirmPassword": "**********"
}
```

**Validation:** Mật khẩu mới ≥ 8 ký tự, có chữ hoa + chữ thường + số.

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Đổi mật khẩu thành công." }
}
```

---

### 3.9 POST `/auth/mobile/login` — Đăng nhập đối tượng (Mobile App)

**Mô tả:** Đối tượng đăng nhập bằng số CCCD + mật khẩu. Kiểm tra device binding.

**Auth:** Public

**Request Body:**
```json
{
  "cccd": "001234567890",
  "password": "********",
  "deviceId": "android_abc123def456"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "subject": {
      "id": "sub_001",
      "fullName": "Trần Văn B",
      "currentScenario": {
        "id": "scn_001",
        "name": "Quản chế Cơ bản",
        "nextCheckIn": "2026-03-20T07:00:00.000Z"
      }
    }
  }
}
```

**Response 403 — Device mismatch:**
```json
{
  "success": false,
  "error": {
    "code": "DEVICE_NOT_BOUND",
    "message": "Thiết bị này chưa được đăng ký. Vui lòng liên hệ cán bộ."
  }
}
```

---

### 3.10 POST `/auth/mobile/change-password` — Đổi mật khẩu (đối tượng)

**Auth:** Bearer JWT (mobile)

**Request Body:**
```json
{
  "currentPassword": "********",
  "newPassword": "**********"
}
```

---

## 4. SUBJECTS (HỒ SƠ ĐỐI TƯỢNG)

> CRUD hồ sơ đối tượng thuộc diện quản lý.
> Auto-filter theo data_scope của cán bộ.
> CCCD được mã hóa khi lưu, giải mã khi hiển thị.

### 4.1 GET `/subjects` — Danh sách hồ sơ

**Auth:** Bearer JWT | **Roles:** Tất cả cán bộ | **Scope:** Auto-filter

**Query Params:**
| Param         | Type   | Mô tả                                      |
|---------------|--------|---------------------------------------------|
| `page`        | number | Trang (default: 1)                          |
| `limit`       | number | Số item (default: 20)                       |
| `sort`        | string | Field sort (default: `created_at`)           |
| `order`       | string | `asc` / `desc`                              |
| `q`           | string | Tìm kiếm (tên, CCCD): `q=Nguyễn`, `q=~Nguyen`, `q=!Hà Nội` |
| `status`      | string | `ENROLLED`, `ACTIVE`, `SUSPENDED`, `REINTEGRATING`, `COMPLETED` |
| `scenarioId`  | string | Lọc theo kịch bản đang áp dụng             |
| `areaId`      | string | Lọc theo đơn vị hành chính                  |
| `from`        | string | Ngày tạo từ (ISO 8601)                      |
| `to`          | string | Ngày tạo đến (ISO 8601)                     |
| `scope`       | string | `default` / `all` (mở rộng — cần quyền)    |
| `filters`     | JSON   | Advanced: `[{"field":"name","op":"~","value":"Nguyễn"}]` |
| `logic`       | string | `AND` / `OR` (cho advanced filters)         |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sub_001",
      "code": "HS-2024-0047",
      "fullName": "Trần Văn B",
      "cccdMasked": "001***7890",
      "dateOfBirth": "1985-06-15",
      "gender": "MALE",
      "address": "123 Đường Lý Thường Kiệt, Phường Bến Nghé, Quận 1, TP.HCM",
      "phone": "0901234567",
      "status": "ACTIVE",
      "currentScenario": {
        "id": "scn_001",
        "name": "Quản chế Cơ bản"
      },
      "complianceRate": 92.5,
      "enrollmentDate": "2024-03-15T00:00:00.000Z",
      "area": {
        "wardId": "ward_001",
        "wardName": "Phường Bến Nghé",
        "districtId": "dist_001",
        "districtName": "Quận 1",
        "provinceId": "prov_001",
        "provinceName": "TP. Hồ Chí Minh"
      },
      "openAlerts": 1,
      "openCases": 0,
      "createdAt": "2024-03-15T02:30:00.000Z",
      "updatedAt": "2026-03-10T08:15:00.000Z"
    }
  ],
  "meta": {
    "total": 245,
    "page": 1,
    "limit": 20,
    "totalPages": 13
  }
}
```

---

### 4.2 GET `/subjects/:id` — Chi tiết hồ sơ

**Auth:** Bearer JWT | **Roles:** Tất cả cán bộ (trong scope)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "sub_001",
    "code": "HS-2024-0047",
    "personal": {
      "fullName": "Trần Văn B",
      "cccd": "001234567890",
      "dateOfBirth": "1985-06-15",
      "gender": "MALE",
      "ethnicity": "Kinh",
      "address": "123 Đường Lý Thường Kiệt, Phường Bến Nghé, Quận 1, TP.HCM",
      "permanentAddress": "456 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
      "phone": "0901234567",
      "photo": "/uploads/subjects/sub_001/photo.jpg"
    },
    "family": {
      "fatherName": "Trần Văn C",
      "motherName": "Nguyễn Thị D",
      "spouseName": null,
      "dependents": 0
    },
    "legal": {
      "decisionNumber": "QĐ-2024-0123",
      "decisionDate": "2024-01-15",
      "managementType": "QUAN_CHE",
      "startDate": "2024-03-15",
      "endDate": "2026-03-15",
      "notes": "Quản chế 2 năm theo QĐ TAND Quận 1"
    },
    "status": "ACTIVE",
    "lifecycle": "DANG_QUAN_LY",
    "currentScenario": {
      "id": "scn_001",
      "name": "Quản chế Cơ bản",
      "assignedAt": "2024-03-15T00:00:00.000Z",
      "assignedBy": "Nguyễn Văn A"
    },
    "complianceRate": 92.5,
    "enrollment": {
      "enrolledAt": "2024-03-15T09:30:00.000Z",
      "enrolledBy": "Nguyễn Văn A",
      "deviceId": "android_abc123def456",
      "deviceModel": "Samsung Galaxy A54",
      "deviceStatus": "ACTIVE"
    },
    "area": {
      "wardId": "ward_001",
      "wardName": "Phường Bến Nghé",
      "districtId": "dist_001",
      "districtName": "Quận 1",
      "provinceId": "prov_001",
      "provinceName": "TP. Hồ Chí Minh"
    },
    "stats": {
      "totalCheckIns": 45,
      "missedCheckIns": 3,
      "openAlerts": 1,
      "closedAlerts": 5,
      "openCases": 0,
      "closedCases": 1
    },
    "customFields": [
      {
        "name": "Số quyết định quản chế",
        "value": "QĐ-2024-0123",
        "required": true
      }
    ],
    "documents": [
      {
        "id": "doc_001",
        "name": "Quyết định quản chế.pdf",
        "type": "application/pdf",
        "size": 245000,
        "uploadedAt": "2024-03-15T10:00:00.000Z",
        "uploadedBy": "Nguyễn Văn A"
      }
    ],
    "createdAt": "2024-03-15T02:30:00.000Z",
    "updatedAt": "2026-03-10T08:15:00.000Z",
    "createdBy": "Nguyễn Văn A"
  }
}
```

---

### 4.3 POST `/subjects` — Tạo hồ sơ mới

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`, `IT_ADMIN`

**Request Body:**
```json
{
  "fullName": "Trần Văn B",
  "cccd": "001234567890",
  "dateOfBirth": "1985-06-15",
  "gender": "MALE",
  "ethnicity": "Kinh",
  "address": "123 Đường Lý Thường Kiệt, Phường Bến Nghé, Quận 1, TP.HCM",
  "permanentAddress": "456 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
  "phone": "0901234567",
  "areaId": "ward_001",
  "family": {
    "fatherName": "Trần Văn C",
    "motherName": "Nguyễn Thị D"
  },
  "legal": {
    "decisionNumber": "QĐ-2024-0123",
    "decisionDate": "2024-01-15",
    "managementType": "QUAN_CHE",
    "startDate": "2024-03-15",
    "endDate": "2026-03-15",
    "notes": "Quản chế 2 năm theo QĐ TAND Quận 1"
  },
  "customFields": [
    { "name": "Số quyết định quản chế", "value": "QĐ-2024-0123" }
  ]
}
```

**Validation:**
- `fullName`: bắt buộc, 2-100 ký tự
- `cccd`: bắt buộc, 12 chữ số, unique
- `dateOfBirth`: bắt buộc, format `YYYY-MM-DD`
- `gender`: bắt buộc, enum `MALE` | `FEMALE`
- `address`: bắt buộc
- `areaId`: bắt buộc, phải thuộc data_scope của cán bộ

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "sub_002",
    "code": "HS-2024-0048",
    "status": "ENROLLED",
    "message": "Tạo hồ sơ thành công."
  }
}
```

**Response 409:**
```json
{
  "success": false,
  "error": {
    "code": "CCCD_EXISTS",
    "message": "Số CCCD đã tồn tại trong hệ thống."
  }
}
```

---

### 4.4 PUT `/subjects/:id` — Cập nhật hồ sơ

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`, `IT_ADMIN`

**Request Body:** Các field cần cập nhật (partial update).

**Response 200:** Trả về object đã cập nhật.

---

### 4.5 DELETE `/subjects/:id` — Xoá hồ sơ (soft delete)

**Auth:** Bearer JWT | **Roles:** `CAN_BO_QUAN_LY`, `IT_ADMIN`

**Response 204:** No Content

> **Business Rule SBR-16:** Soft delete only. Hồ sơ bị đánh dấu `deleted_at`, không hiển thị trên UI nhưng vẫn lưu trong DB.

---

### 4.6 GET `/subjects/:id/timeline` — Timeline đối tượng

**Mô tả:** Toàn bộ sự kiện của 1 đối tượng theo trục thời gian: Event, Alert, Case, thay đổi kịch bản, thay đổi trạng thái.

**Auth:** Bearer JWT | **Roles:** Tất cả cán bộ

**Query Params:** `from`, `to`, `types` (comma-separated: `event,alert,case,scenario,status`)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "type": "EVENT",
      "id": "evt_100",
      "timestamp": "2026-03-10T08:15:00.000Z",
      "title": "Trình báo thành công",
      "details": {
        "eventType": "CHECKIN_SUCCESS",
        "inGeofence": true,
        "faceMatchScore": 95.2
      }
    },
    {
      "type": "ALERT",
      "id": "alt_050",
      "timestamp": "2026-03-05T00:00:00.000Z",
      "title": "Quá hạn trình báo 3 ngày",
      "details": {
        "level": "THAP",
        "source": "DEFAULT",
        "ruleName": "Quá hạn trình báo",
        "status": "RESOLVED"
      }
    },
    {
      "type": "CASE",
      "id": "cas_010",
      "timestamp": "2026-02-20T14:30:00.000Z",
      "title": "Case — NFC CCCD mismatch",
      "details": {
        "source": "AUTO",
        "escalatedFrom": "alt_045",
        "status": "CLOSED"
      }
    },
    {
      "type": "SCENARIO_CHANGE",
      "id": "log_001",
      "timestamp": "2024-03-15T10:00:00.000Z",
      "title": "Gán kịch bản: Quản chế Cơ bản",
      "details": {
        "scenarioId": "scn_001",
        "assignedBy": "Nguyễn Văn A"
      }
    }
  ]
}
```

---

### 4.7 GET `/subjects/me` — Thông tin đối tượng (Mobile App)

**Mô tả:** Đối tượng xem thông tin của chính mình + kịch bản hiện tại.

**Auth:** Bearer JWT (mobile) | **Role:** `SUBJECT`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "sub_001",
    "fullName": "Trần Văn B",
    "scenario": {
      "name": "Quản chế Cơ bản",
      "description": "Trình báo 2 lần/tháng, 07:00-19:00",
      "nextCheckIn": "2026-03-20T07:00:00.000Z",
      "checkInWindow": { "start": "07:00", "end": "19:00" },
      "geofence": { "name": "Phường Bến Nghé", "radius": 5000 },
      "gracePeriodDays": 2
    },
    "officer": {
      "name": "Nguyễn Văn A",
      "phone": "0912345678"
    },
    "stats": {
      "complianceRate": 92.5,
      "totalCheckIns": 45,
      "missedCheckIns": 3
    }
  }
}
```

---

## 5. EVENTS (SỰ KIỆN)

> Event = mọi sự kiện tự động ghi nhận. Dữ liệu thô, read-only từ phía UI Web.
> Event được tạo bởi: Check-in, Scheduled Job, User Action, System.

### 5.1 GET `/events` — Danh sách Event

**Auth:** Bearer JWT | **Roles:** Tất cả cán bộ | **Scope:** Auto-filter

**Query Params:**
| Param        | Type   | Mô tả                                                 |
|--------------|--------|--------------------------------------------------------|
| `page/limit` | number | Phân trang                                             |
| `sort/order` | string | Sắp xếp                                               |
| `q`          | string | Tìm kiếm (tên đối tượng, mã event)                    |
| `type`       | string | Enum: xem [Appendix B](#appendix-b)                    |
| `subjectId`  | string | Lọc theo đối tượng                                    |
| `from`       | string | Thời gian từ                                           |
| `to`         | string | Thời gian đến                                          |
| `areaId`     | string | Lọc theo khu vực                                      |
| `result`     | string | `SUCCESS`, `FAILED`, `WARNING`                         |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt_100",
      "code": "EVT-20260310-0001",
      "type": "CHECKIN_SUCCESS",
      "timestamp": "2026-03-10T08:15:00.000Z",
      "subject": {
        "id": "sub_001",
        "code": "HS-2024-0047",
        "fullName": "Trần Văn B"
      },
      "result": "SUCCESS",
      "gps": {
        "lat": 10.7769,
        "lng": 106.7009,
        "accuracy": 15.2
      },
      "inGeofence": true,
      "details": {
        "faceMatchScore": 95.2,
        "nfcVerified": true
      },
      "createdAt": "2026-03-10T08:15:00.000Z"
    }
  ],
  "meta": { "total": 1520, "page": 1, "limit": 20, "totalPages": 76 }
}
```

---

### 5.2 GET `/events/:id` — Chi tiết Event

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "evt_100",
    "code": "EVT-20260310-0001",
    "type": "CHECKIN_SUCCESS",
    "timestamp": "2026-03-10T08:15:00.000Z",
    "subject": {
      "id": "sub_001",
      "code": "HS-2024-0047",
      "fullName": "Trần Văn B"
    },
    "result": "SUCCESS",
    "gps": {
      "lat": 10.7769,
      "lng": 106.7009,
      "accuracy": 15.2,
      "address": "123 Lý Thường Kiệt, P. Bến Nghé, Q.1, TP.HCM"
    },
    "inGeofence": true,
    "geofenceResult": {
      "geofenceId": "gf_001",
      "geofenceName": "Phường Bến Nghé 5km",
      "distanceFromCenter": 1200
    },
    "biometric": {
      "faceMatchScore": 95.2,
      "faceImageUrl": "/uploads/events/evt_100/face.jpg",
      "nfcVerified": true,
      "nfcChipValid": true,
      "nfcCccdMatch": true,
      "livenessScore": 98.1
    },
    "scenarioAtTime": {
      "id": "scn_001",
      "name": "Quản chế Cơ bản"
    },
    "linkedAlerts": ["alt_050"],
    "deviceInfo": {
      "deviceId": "android_abc123def456",
      "model": "Samsung Galaxy A54",
      "osVersion": "Android 14"
    },
    "createdAt": "2026-03-10T08:15:00.000Z"
  }
}
```

---

### 5.3 GET `/events/export` — Xuất Event

**Auth:** Bearer JWT | **Roles:** `CAN_BO_QUAN_LY`, `LANH_DAO`, `IT_ADMIN`

**Query Params:** Giống GET `/events` + `format=xlsx` hoặc `csv`

**Response 200:** File download (binary)

---

## 6. ALERTS (CẢNH BÁO)

> Alert sinh ra khi Event thỏa điều kiện trong Alert Rules (mặc định hoặc tùy chỉnh).
> 4 mức: THAP (Thấp), TRUNG_BINH (Trung bình), CAO (Cao), KHAN_CAP (Khẩn cấp).

### 6.1 GET `/alerts` — Danh sách Alert

**Auth:** Bearer JWT | **Roles:** Tất cả cán bộ | **Scope:** Auto-filter

**Query Params:**
| Param        | Type   | Mô tả                                        |
|--------------|--------|-----------------------------------------------|
| `page/limit` | number | Phân trang                                    |
| `q`          | string | Tìm kiếm                                     |
| `level`      | string | `THAP`, `TRUNG_BINH`, `CAO`, `KHAN_CAP`      |
| `status`     | string | `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `ESCALATED`|
| `source`     | string | `DEFAULT` (mặc định), `CUSTOM` (tùy chỉnh)   |
| `subjectId`  | string | Lọc theo đối tượng                            |
| `from`       | string | Thời gian từ                                  |
| `to`         | string | Thời gian đến                                 |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alt_050",
      "code": "ALT-20260305-0001",
      "type": "OVERDUE_CHECKIN",
      "level": "THAP",
      "status": "OPEN",
      "source": "DEFAULT",
      "ruleName": "Quá hạn trình báo",
      "subject": {
        "id": "sub_001",
        "code": "HS-2024-0047",
        "fullName": "Trần Văn B"
      },
      "triggerEvent": {
        "id": "evt_095",
        "type": "OVERDUE",
        "timestamp": "2026-03-05T00:00:00.000Z"
      },
      "scenario": {
        "id": "scn_001",
        "name": "Quản chế Cơ bản"
      },
      "escalation": null,
      "createdAt": "2026-03-05T00:00:00.000Z"
    }
  ],
  "meta": { "total": 35, "page": 1, "limit": 20, "totalPages": 2 }
}
```

---

### 6.2 GET `/alerts/:id` — Chi tiết Alert

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "alt_050",
    "code": "ALT-20260305-0001",
    "type": "OVERDUE_CHECKIN",
    "level": "THAP",
    "status": "RESOLVED",
    "source": "DEFAULT",
    "ruleName": "Quá hạn trình báo",
    "ruleConfig": {
      "condition": "overdue_days >= 3",
      "threshold": 3
    },
    "subject": { "id": "sub_001", "code": "HS-2024-0047", "fullName": "Trần Văn B" },
    "triggerEvent": { "id": "evt_095", "type": "OVERDUE", "timestamp": "2026-03-05T00:00:00.000Z" },
    "scenario": { "id": "scn_001", "name": "Quản chế Cơ bản" },
    "escalation": {
      "escalated": false,
      "caseId": null
    },
    "history": [
      {
        "action": "CREATED",
        "timestamp": "2026-03-05T00:00:00.000Z",
        "by": "SYSTEM",
        "note": null
      },
      {
        "action": "ACKNOWLEDGED",
        "timestamp": "2026-03-06T09:30:00.000Z",
        "by": "Nguyễn Văn A",
        "note": "Đã liên hệ đối tượng, hẹn trình báo ngày mai."
      },
      {
        "action": "RESOLVED",
        "timestamp": "2026-03-07T10:00:00.000Z",
        "by": "Nguyễn Văn A",
        "note": "Đối tượng đã trình báo bổ sung."
      }
    ],
    "createdAt": "2026-03-05T00:00:00.000Z",
    "resolvedAt": "2026-03-07T10:00:00.000Z"
  }
}
```

---

### 6.3 PUT `/alerts/:id/acknowledge` — Ghi nhận Alert

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Request Body:**
```json
{
  "note": "Đã liên hệ đối tượng qua điện thoại."
}
```

**Response 200:** Trả về alert đã cập nhật `status: "ACKNOWLEDGED"`.

---

### 6.4 PUT `/alerts/:id/resolve` — Đánh dấu đã xử lý

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Request Body:**
```json
{
  "note": "Đối tượng đã trình báo bổ sung. Hết vi phạm."
}
```

**Response 200:** Trả về alert đã cập nhật `status: "RESOLVED"`.

---

### 6.5 POST `/alerts/:id/escalate` — Escalate thành Case (thủ công)

**Mô tả:** Cán bộ quyết định escalate Alert thành Case mới. Ghi metadata escalation.

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Request Body:**
```json
{
  "note": "Đối tượng liên tục không hợp tác. Escalate thành vụ việc.",
  "caseSeverity": "CAO"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "alertId": "alt_050",
    "alertStatus": "ESCALATED",
    "case": {
      "id": "cas_011",
      "code": "CASE-20260315-0001",
      "source": "MANUAL",
      "escalatedBy": "Nguyễn Văn A",
      "escalatedFromAlert": "alt_050"
    },
    "message": "Đã tạo Vụ việc CASE-20260315-0001 từ Alert ALT-20260305-0001."
  }
}
```

**Response 409 — Alert đã escalate:**
```json
{
  "success": false,
  "error": {
    "code": "ALERT_ALREADY_ESCALATED",
    "message": "Alert này đã được escalate thành Case #CASE-20260310-0005."
  }
}
```

---

## 7. CASES (VỤ VIỆC)

> Case = vi phạm nghiêm trọng. Tạo bởi: auto-escalate từ Alert HOẶC cán bộ thủ công.
> Case Mở → ghi chú → Đóng (bắt buộc ghi chú). Case Đóng = chỉ xem.

### 7.1 GET `/cases` — Danh sách Case

**Auth:** Bearer JWT | **Roles:** Tất cả cán bộ | **Scope:** Auto-filter

**Query Params:**
| Param        | Type   | Mô tả                                  |
|--------------|--------|-----------------------------------------|
| `status`     | string | `OPEN`, `CLOSED`                        |
| `severity`   | string | `THAP`, `TRUNG_BINH`, `CAO`, `KHAN_CAP`|
| `source`     | string | `AUTO`, `MANUAL_ESCALATE`, `MANUAL_NEW` |
| `subjectId`  | string | Lọc theo đối tượng                     |
| `assigneeId` | string | Lọc theo cán bộ phụ trách              |
| `from`, `to` | string | Khoảng thời gian                       |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cas_010",
      "code": "CASE-20260220-0001",
      "status": "CLOSED",
      "severity": "KHAN_CAP",
      "source": "AUTO",
      "subject": { "id": "sub_001", "code": "HS-2024-0047", "fullName": "Trần Văn B" },
      "escalation": {
        "type": "AUTO",
        "escalatedBy": "SYSTEM",
        "fromAlert": "alt_045",
        "ruleName": "NFC CCCD mismatch",
        "reason": "Auto-escalate: Alert KHẨN CẤP đạt ngưỡng auto-escalation"
      },
      "assignee": { "id": "usr_001", "fullName": "Nguyễn Văn A" },
      "notesCount": 3,
      "createdAt": "2026-02-20T14:30:00.000Z",
      "closedAt": "2026-02-25T16:00:00.000Z",
      "closedBy": "Nguyễn Văn A"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 7.2 GET `/cases/:id` — Chi tiết Case

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "cas_010",
    "code": "CASE-20260220-0001",
    "status": "CLOSED",
    "severity": "KHAN_CAP",
    "source": "AUTO",
    "subject": {
      "id": "sub_001",
      "code": "HS-2024-0047",
      "fullName": "Trần Văn B"
    },
    "escalation": {
      "type": "AUTO",
      "escalatedBy": "SYSTEM",
      "fromAlert": {
        "id": "alt_045",
        "code": "ALT-20260220-0003",
        "type": "NFC_CCCD_MISMATCH",
        "level": "KHAN_CAP"
      },
      "ruleName": "NFC CCCD mismatch",
      "reason": "Auto-escalate: Alert KHẨN CẤP đạt ngưỡng auto-escalation trong kịch bản 'Quản chế Cơ bản'"
    },
    "linkedEvents": ["evt_088", "evt_089"],
    "assignee": { "id": "usr_001", "fullName": "Nguyễn Văn A" },
    "notes": [
      {
        "id": "note_001",
        "content": "Đối tượng sử dụng CCCD của người khác khi trình báo. Đã báo cáo cấp trên.",
        "author": { "id": "usr_001", "fullName": "Nguyễn Văn A" },
        "photos": [
          {
            "url": "/uploads/cases/cas_010/note_001/photo_001.jpg",
            "gps": { "lat": 10.7769, "lng": 106.7009 },
            "capturedAt": "2026-02-21T09:00:00.000Z"
          }
        ],
        "createdAt": "2026-02-21T09:15:00.000Z"
      },
      {
        "id": "note_002",
        "content": "Đã xác minh tại hiện trường. Đối tượng thừa nhận vi phạm.",
        "author": { "id": "usr_001", "fullName": "Nguyễn Văn A" },
        "photos": [],
        "createdAt": "2026-02-23T14:00:00.000Z"
      }
    ],
    "closingNote": {
      "content": "Đã lập biên bản vi phạm. Đề xuất chuyển kịch bản nghiêm ngặt hơn.",
      "closedBy": { "id": "usr_001", "fullName": "Nguyễn Văn A" },
      "closedAt": "2026-02-25T16:00:00.000Z"
    },
    "documents": [],
    "relatedCases": [],
    "createdAt": "2026-02-20T14:30:00.000Z"
  }
}
```

---

### 7.3 POST `/cases` — Tạo Case thủ công (không từ Alert)

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Request Body:**
```json
{
  "subjectId": "sub_001",
  "severity": "CAO",
  "description": "Phát hiện đối tượng tụ tập với nhóm có tiền án tại quán cafe.",
  "linkedEventIds": ["evt_100"],
  "note": "Phát hiện qua kiểm tra thực địa ngày 15/03."
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "cas_012",
    "code": "CASE-20260315-0002",
    "source": "MANUAL_NEW",
    "createdBy": "Nguyễn Văn A",
    "message": "Tạo vụ việc thành công."
  }
}
```

---

### 7.4 POST `/cases/:id/notes` — Thêm ghi chú Case

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Request Body:** `multipart/form-data`
| Field    | Type   | Mô tả                                |
|----------|--------|---------------------------------------|
| `content`| string | Nội dung ghi chú (bắt buộc)          |
| `photos` | File[] | Ảnh đính kèm (jpg/png, ≤10MB mỗi ảnh)|

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "note_003",
    "content": "Đã gặp đối tượng tại nhà. Đối tượng cam kết không tái phạm.",
    "photos": [
      {
        "url": "/uploads/cases/cas_012/note_003/photo_001.jpg",
        "gps": { "lat": 10.7769, "lng": 106.7009 },
        "capturedAt": "2026-03-15T10:30:00.000Z",
        "capturedBy": "Nguyễn Văn A"
      }
    ],
    "author": { "id": "usr_001", "fullName": "Nguyễn Văn A" },
    "createdAt": "2026-03-15T10:35:00.000Z"
  }
}
```

---

### 7.5 PUT `/cases/:id/close` — Đóng Case

**Mô tả:** Đóng Case. Bắt buộc ghi chú kết quả. Case Đóng chỉ xem, không sửa.

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Request Body:**
```json
{
  "closingNote": "Đã lập biên bản vi phạm. Đề xuất chuyển kịch bản nghiêm ngặt hơn."
}
```

**Validation:** `closingNote` bắt buộc, ≥ 10 ký tự.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "cas_012",
    "status": "CLOSED",
    "closedBy": "Nguyễn Văn A",
    "closedAt": "2026-03-15T16:00:00.000Z",
    "message": "Đóng vụ việc thành công."
  }
}
```

---

### 7.6 GET `/cases/:id/export` — Xuất Case PDF

**Mô tả:** Xuất toàn bộ Case: thông tin, diễn biến, ghi chú, kết quả, nguồn escalation.

**Auth:** Bearer JWT

**Response 200:** File PDF download.

---

## 8. CHECK-IN (TRÌNH BÁO — Mobile App)

> Endpoint chính cho quy trình trình báo từ Mobile App.
> Flow: GPS + NFC + Face → Backend xử lý → Event → Alert Rule Engine.

### 8.1 POST `/checkin` — Gửi trình báo

**Mô tả:** Đối tượng gửi dữ liệu trình báo: NFC data + face image + GPS + timestamp. Backend xử lý, tạo Event, chạy Alert Rule Engine.

**Auth:** Bearer JWT (mobile) | **Role:** `SUBJECT`

**Request Body:** `multipart/form-data`
| Field          | Type   | Bắt buộc | Mô tả                                 |
|----------------|--------|----------|----------------------------------------|
| `nfcData`      | string | ✅       | NFC chip data (Base64 encoded)         |
| `nfcSignature` | string | ✅       | NFC passive authentication signature   |
| `faceImage`    | File   | ✅       | Ảnh face capture (jpg, ≤5MB)           |
| `livenessData` | string | ❌       | Liveness detection result (JSON)       |
| `latitude`     | number | ✅       | GPS latitude                           |
| `longitude`    | number | ✅       | GPS longitude                          |
| `gpsAccuracy`  | number | ❌       | GPS accuracy (meters)                  |
| `timestamp`    | string | ✅       | Client timestamp (ISO 8601)            |
| `deviceId`     | string | ✅       | Android device ID                      |
| `isVoluntary`  | boolean| ❌       | Trình báo tự nguyện ngoài lịch (default: false) |

**Response 200 — Thành công + trong geofence:**
```json
{
  "success": true,
  "data": {
    "result": "SUCCESS",
    "eventId": "evt_101",
    "message": "Trình báo thành công.",
    "inGeofence": true,
    "faceMatchScore": 95.2,
    "nfcVerified": true,
    "nextCheckIn": "2026-04-01T07:00:00.000Z",
    "serverTimestamp": "2026-03-15T08:15:00.000Z"
  }
}
```

**Response 200 — Thành công + ngoài geofence:**
```json
{
  "success": true,
  "data": {
    "result": "SUCCESS_OUTSIDE_GEOFENCE",
    "eventId": "evt_101",
    "message": "Đã ghi nhận. Lưu ý: bạn đang ngoài khu vực quản lý.",
    "inGeofence": false,
    "geofenceDistance": 2500,
    "faceMatchScore": 93.1,
    "nfcVerified": true,
    "nextCheckIn": "2026-04-01T07:00:00.000Z"
  }
}
```

**Response 400 — NFC fail:**
```json
{
  "success": false,
  "error": {
    "code": "NFC_VERIFICATION_FAILED",
    "message": "Không thể xác minh chip NFC. Vui lòng thử lại.",
    "details": {
      "reason": "CHIP_SIGNATURE_INVALID",
      "retryCount": 1,
      "maxRetries": 3
    }
  }
}
```

**Response 400 — Face mismatch:**
```json
{
  "success": false,
  "error": {
    "code": "FACE_MISMATCH",
    "message": "Khuôn mặt không khớp. Vui lòng thử lại.",
    "details": {
      "matchScore": 45.3,
      "threshold": 85.0,
      "retryCount": 1,
      "maxRetries": 3
    }
  }
}
```

**Response 400 — CCCD mismatch (NFC đọc CCCD khác người đăng ký):**
```json
{
  "success": false,
  "error": {
    "code": "NFC_CCCD_MISMATCH",
    "message": "Số CCCD không khớp với tài khoản đăng ký.",
    "details": {
      "alert": "KHAN_CAP",
      "eventCreated": true
    }
  }
}
```

> **Business Rule SBR-06:** Ngoài geofence = lưu vết Event, KHÔNG block trình báo.
> **Business Rule SBR-07:** Mọi sự kiện (thành công/thất bại) đều tạo Event.

---

### 8.2 GET `/checkin/schedule` — Lịch trình báo (Mobile)

**Auth:** Bearer JWT (mobile)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "nextCheckIn": "2026-03-20T07:00:00.000Z",
    "deadline": "2026-03-22T19:00:00.000Z",
    "gracePeriodEnd": "2026-03-24T23:59:59.000Z",
    "checkInWindow": { "start": "07:00", "end": "19:00" },
    "isOverdue": false,
    "overdueDays": 0,
    "calendar": [
      { "date": "2026-03-01", "status": "COMPLETED", "eventId": "evt_090" },
      { "date": "2026-03-05", "status": "MISSED" },
      { "date": "2026-03-15", "status": "COMPLETED", "eventId": "evt_100" },
      { "date": "2026-03-20", "status": "UPCOMING" },
      { "date": "2026-04-01", "status": "UPCOMING" }
    ]
  }
}
```

---

### 8.3 GET `/checkin/history` — Lịch sử trình báo (Mobile)

**Auth:** Bearer JWT (mobile)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt_100",
      "date": "2026-03-15",
      "time": "08:15",
      "result": "SUCCESS",
      "inGeofence": true,
      "faceMatchScore": 95.2
    },
    {
      "id": "evt_090",
      "date": "2026-03-01",
      "time": "09:30",
      "result": "SUCCESS",
      "inGeofence": true,
      "faceMatchScore": 91.8
    }
  ]
}
```

---

## 9. REQUESTS (YÊU CẦU XIN PHÉP)

> Đối tượng gửi yêu cầu (đi xa, hoãn trình báo, đổi thiết bị, đổi nơi ở).
> Cán bộ xét duyệt trên Web.

### 9.1 POST `/requests` — Gửi yêu cầu (Mobile App)

**Auth:** Bearer JWT (mobile) | **Role:** `SUBJECT`

**Request Body:**
```json
{
  "type": "TRAVEL",
  "reason": "Về quê thăm cha mẹ ốm.",
  "details": {
    "destination": "Xã Tân Phú, Huyện Đức Hoà, Long An",
    "fromDate": "2026-03-20",
    "toDate": "2026-03-25"
  }
}
```

**Type enum:** `TRAVEL` (đi xa), `POSTPONE` (hoãn trình báo), `CHANGE_DEVICE` (đổi thiết bị), `CHANGE_ADDRESS` (đổi nơi ở)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "req_001",
    "code": "YC-20260315-0001",
    "type": "TRAVEL",
    "status": "PENDING",
    "message": "Yêu cầu đã được gửi. Vui lòng chờ cán bộ xét duyệt."
  }
}
```

---

### 9.2 GET `/requests` — Danh sách yêu cầu (Web — Cán bộ)

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Query Params:** `type`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `subjectId`, `from`, `to`

---

### 9.3 GET `/requests/:id` — Chi tiết yêu cầu

---

### 9.4 PUT `/requests/:id/approve` — Duyệt yêu cầu

**Auth:** Bearer JWT | **Roles:** `CAN_BO_CO_SO`, `CAN_BO_QUAN_LY`

**Request Body:**
```json
{
  "note": "Đồng ý cho đi xa. Lưu ý trình báo đúng hạn khi trở về."
}
```

**Response 200:** Status → `APPROVED`. Hệ thống tự điều chỉnh lịch/geofence/device. Push notification cho đối tượng.

---

### 9.5 PUT `/requests/:id/reject` — Từ chối yêu cầu

**Request Body:**
```json
{
  "note": "Không đủ điều kiện đi xa. Cần trình báo thêm 2 lần."
}
```

---

### 9.6 GET `/requests/me` — Yêu cầu của tôi (Mobile App)

**Auth:** Bearer JWT (mobile) | **Role:** `SUBJECT`

---

## 10. SCENARIOS (KỊCH BẢN)

> 2 loại: Kịch bản Quản lý + Kịch bản Alert.
> Kịch bản Quản lý luôn đi kèm Alert Rules mặc định (4 rules).

### 10.1 GET `/scenarios` — Danh sách kịch bản

**Auth:** Bearer JWT | **Roles:** `CAN_BO_QUAN_LY`, `LANH_DAO`, `IT_ADMIN`

**Query Params:** `type` (`MANAGEMENT`, `ALERT`), `status` (`DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `EXPIRED`), `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "scn_001",
      "code": "KB-QC-001",
      "name": "Quản chế Cơ bản",
      "type": "MANAGEMENT",
      "status": "ACTIVE",
      "version": 2,
      "subjectCount": 45,
      "complianceRate": 91.3,
      "createdBy": "Trần Thị C",
      "approvedBy": "Lê Văn D",
      "createdAt": "2024-01-10T00:00:00.000Z",
      "effectiveFrom": "2024-02-01T00:00:00.000Z"
    }
  ]
}
```

---

### 10.2 GET `/scenarios/:id` — Chi tiết kịch bản

**Response 200 (Kịch bản Quản lý):**
```json
{
  "success": true,
  "data": {
    "id": "scn_001",
    "code": "KB-QC-001",
    "name": "Quản chế Cơ bản",
    "type": "MANAGEMENT",
    "status": "ACTIVE",
    "version": 2,
    "general": {
      "description": "Kịch bản quản chế cơ bản cho đối tượng mức nhẹ.",
      "scope": "WARD",
      "effectiveFrom": "2024-02-01",
      "effectiveTo": null
    },
    "checkInRules": {
      "frequency": "2_PER_MONTH",
      "windowStart": "07:00",
      "windowEnd": "19:00",
      "gracePeriodDays": 2,
      "faceThreshold": 85,
      "nfcRequired": true,
      "fallbackAllowed": true
    },
    "monitoringRules": {
      "geofence": {
        "id": "gf_001",
        "name": "Phường Bến Nghé 5km",
        "type": "CIRCLE",
        "center": { "lat": 10.7769, "lng": 106.7009 },
        "radius": 5000
      },
      "curfew": null,
      "travelApprovalRequired": true,
      "travelThresholdDays": 3
    },
    "autoTransitions": [
      {
        "condition": "compliance_rate >= 95 AND duration_months >= 12",
        "action": "SUGGEST_DOWNGRADE",
        "targetStatus": "GIAM_MUC"
      }
    ],
    "customFields": [
      { "name": "Số quyết định quản chế", "type": "TEXT", "required": true }
    ],
    "notificationConfig": {
      "beforeDeadline": [3, 1],
      "beforeDeadlineHours": [3],
      "overdueReminder": "DAILY"
    },
    "linkedAlertScenario": {
      "id": "ascn_001",
      "name": "Alert — Quản chế Cơ bản"
    },
    "stats": {
      "subjectCount": 45,
      "complianceRate": 91.3,
      "activeAlerts": 3,
      "activeCases": 1
    },
    "createdBy": "Trần Thị C",
    "approvedBy": "Lê Văn D",
    "createdAt": "2024-01-10T00:00:00.000Z"
  }
}
```

---

### 10.3 POST `/scenarios` — Tạo kịch bản

**Auth:** Bearer JWT | **Roles:** `CAN_BO_QUAN_LY`, `IT_ADMIN`

**Request Body:**
```json
{
  "name": "Giám sát Biên giới",
  "type": "MANAGEMENT",
  "description": "Kịch bản giám sát nghiêm ngặt vùng biên giới.",
  "checkInRules": {
    "frequency": "1_PER_WEEK",
    "windowStart": "06:00",
    "windowEnd": "20:00",
    "gracePeriodDays": 0,
    "faceThreshold": 90,
    "nfcRequired": true,
    "fallbackAllowed": false
  },
  "monitoringRules": {
    "geofenceId": "gf_002",
    "curfewStart": "21:00",
    "curfewEnd": "05:00",
    "travelApprovalRequired": true
  },
  "customFields": [],
  "notificationConfig": {
    "beforeDeadline": [2],
    "beforeDeadlineHours": [12, 1],
    "overdueReminder": "EVERY_6_HOURS"
  }
}
```

> **Business Rule SBR-08:** Khi tạo kịch bản Quản lý, hệ thống tự gắn 4 Alert Rules mặc định.

**Response 201:** Trả về kịch bản đã tạo + linked Alert scenario (status: `DRAFT`).

---

### 10.4 PUT `/scenarios/:id` — Cập nhật kịch bản

> Tạo version mới. Kịch bản cũ giữ nguyên cho audit.

---

### 10.5 PUT `/scenarios/:id/submit` — Gửi phê duyệt

**Auth:** Bearer JWT | **Roles:** `CAN_BO_QUAN_LY`

Status: `DRAFT` → `PENDING_APPROVAL`

---

### 10.6 PUT `/scenarios/:id/approve` — Phê duyệt kịch bản

**Auth:** Bearer JWT | **Roles:** `LANH_DAO`, `IT_ADMIN`

Status: `PENDING_APPROVAL` → `ACTIVE`

---

### 10.7 PUT `/scenarios/:id/suspend` — Tạm dừng kịch bản

---

### 10.8 POST `/scenarios/:id/assign` — Gán kịch bản cho đối tượng

**Auth:** Bearer JWT | **Roles:** `CAN_BO_QUAN_LY`, `CAN_BO_CO_SO`

**Request Body:**
```json
{
  "subjectIds": ["sub_001", "sub_002", "sub_003"],
  "alertRuleOverrides": [
    {
      "ruleId": "DEFAULT_OVERDUE",
      "threshold": 5
    }
  ],
  "autoEscalationConfig": {
    "KHAN_CAP": true,
    "CAO": false
  }
}
```

---

### 10.9 POST `/scenarios/:id/simulate` — Simulation

**Mô tả:** "Nếu Event X xảy ra → Alert gì? Auto-escalate không?"

**Request Body:**
```json
{
  "eventType": "OVERDUE",
  "params": { "overdueDays": 5 }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "triggeredRules": [
      {
        "ruleName": "Quá hạn trình báo",
        "source": "DEFAULT",
        "alertLevel": "TRUNG_BINH",
        "autoEscalate": false
      }
    ],
    "wouldCreateAlert": true,
    "wouldCreateCase": false,
    "explanation": "Event 'quá hạn 5 ngày' trigger rule mặc định D1. Alert TRUNG BÌNH. Không auto-escalate (ngưỡng = KHẨN CẤP)."
  }
}
```

---

### 10.10 GET `/scenarios/:id/alert-rules` — Alert Rules của kịch bản

**Response 200:**
```json
{
  "success": true,
  "data": {
    "defaultRules": [
      {
        "id": "DEFAULT_OVERDUE",
        "name": "Quá hạn trình báo",
        "condition": "overdue_days >= 3",
        "alertLevel": "THAP",
        "editable": true,
        "deletable": false,
        "currentThreshold": 3
      },
      {
        "id": "DEFAULT_FACE_MISMATCH",
        "name": "Face mismatch liên tiếp",
        "condition": "consecutive_face_mismatch >= 3",
        "alertLevel": "CAO",
        "editable": true,
        "deletable": false,
        "currentThreshold": 3
      },
      {
        "id": "DEFAULT_NFC_ANOMALY",
        "name": "NFC CCCD mismatch",
        "condition": "nfc_cccd_mismatch",
        "alertLevel": "KHAN_CAP",
        "editable": false,
        "deletable": false
      },
      {
        "id": "DEFAULT_SEVERE_OVERDUE",
        "name": "Quá hạn nghiêm trọng",
        "condition": "overdue_days >= 30",
        "alertLevel": "KHAN_CAP",
        "editable": true,
        "deletable": false,
        "currentThreshold": 30
      }
    ],
    "customRules": [
      {
        "id": "CUSTOM_001",
        "name": "Ngoài geofence lặp lại",
        "condition": "outside_geofence_count >= 2 AND period = 30_DAYS",
        "alertLevel": "TRUNG_BINH",
        "editable": true,
        "deletable": true
      }
    ],
    "autoEscalationConfig": {
      "KHAN_CAP": true,
      "CAO": false,
      "TRUNG_BINH": false,
      "THAP": false
    }
  }
}
```

---

### 10.11 PUT `/scenarios/:id/alert-rules/:ruleId` — Chỉnh sửa Alert Rule

### 10.12 POST `/scenarios/:id/alert-rules` — Thêm Custom Alert Rule

### 10.13 DELETE `/scenarios/:id/alert-rules/:ruleId` — Xoá Custom Alert Rule

> **Chỉ xoá được Custom rules.** Default rules không xoá được.

---

## 11. ENROLLMENT (THIẾT BỊ & ĐĂNG KÝ)

### 11.1 POST `/enrollment` — Enrollment lần đầu (cán bộ xác nhận)

### 11.2 GET `/enrollment` — Danh sách enrollment

### 11.3 PUT `/enrollment/:id/confirm` — Cán bộ xác nhận enrollment

### 11.4 PUT `/enrollment/:id/change-device` — Duyệt đổi thiết bị

### 11.5 PUT `/enrollment/:id/reset` — Reset enrollment (re-enroll)

---

## 12. GEOFENCE

### 12.1 GET `/geofences` — Danh sách geofence

### 12.2 POST `/geofences` — Tạo geofence mới

**Request Body:**
```json
{
  "name": "Phường Bến Nghé 5km",
  "type": "CIRCLE",
  "center": { "lat": 10.7769, "lng": 106.7009 },
  "radius": 5000,
  "areaId": "ward_001"
}
```

Hoặc polygon:
```json
{
  "name": "Khu vực cấm cửa khẩu",
  "type": "POLYGON",
  "coordinates": [
    { "lat": 10.78, "lng": 106.70 },
    { "lat": 10.79, "lng": 106.71 },
    { "lat": 10.77, "lng": 106.72 },
    { "lat": 10.76, "lng": 106.70 }
  ],
  "areaId": "ward_002"
}
```

### 12.3 PUT `/geofences/:id` — Cập nhật geofence

### 12.4 DELETE `/geofences/:id` — Xoá geofence

---

## 13. NOTIFICATIONS (THÔNG BÁO)

### 13.1 GET `/notifications` — Danh sách thông báo (Web)

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5,
    "notifications": [
      {
        "id": "notif_001",
        "type": "NEW_ALERT",
        "title": "Alert mới: Quá hạn trình báo",
        "message": "Trần Văn B — quá hạn 3 ngày.",
        "read": false,
        "link": "/alerts/alt_050",
        "createdAt": "2026-03-05T00:00:00.000Z"
      }
    ]
  }
}
```

### 13.2 PUT `/notifications/:id/read` — Đánh dấu đã đọc

### 13.3 PUT `/notifications/read-all` — Đánh dấu tất cả đã đọc

### 13.4 GET `/notifications/mobile` — Thông báo cho Mobile App

---

## 14. USERS (TÀI KHOẢN CÁN BỘ)

### 14.1 GET `/users` — Danh sách tài khoản

**Auth:** Bearer JWT | **Roles:** `IT_ADMIN`, `LANH_DAO`

### 14.2 GET `/users/:id` — Chi tiết tài khoản

### 14.3 POST `/users` — Tạo tài khoản cán bộ

**Request Body:**
```json
{
  "username": "canbo.levane",
  "fullName": "Lê Văn E",
  "email": "levane@smtts.gov.vn",
  "phone": "0912345679",
  "role": "CAN_BO_CO_SO",
  "dataScope": {
    "level": "WARD",
    "areaId": "ward_002"
  },
  "password": "TempPass@123"
}
```

### 14.4 PUT `/users/:id` — Cập nhật tài khoản

### 14.5 PUT `/users/:id/lock` — Khoá tài khoản

### 14.6 PUT `/users/:id/unlock` — Mở khoá tài khoản

### 14.7 PUT `/users/:id/reset-otp` — Reset OTP (Admin)

### 14.8 GET `/users/me` — Thông tin cá nhân (cán bộ đang đăng nhập)

---

## 15. CONFIG (CẤU HÌNH HỆ THỐNG)

### 15.1 GET `/config/categories` — Danh mục hệ thống

Loại đối tượng, loại sự kiện, loại vi phạm, trạng thái, đơn vị hành chính.

### 15.2 PUT `/config/categories/:type` — Cập nhật danh mục

### 15.3 GET `/config/escalation` — Cấu hình auto-escalation system-wide

### 15.4 PUT `/config/escalation` — Cập nhật cấu hình auto-escalation

### 15.5 GET `/config/biometric` — Cấu hình biometric

### 15.6 PUT `/config/biometric` — Cập nhật cấu hình biometric

### 15.7 GET `/config/areas` — Danh sách đơn vị hành chính (tỉnh → quận → phường)

---

## 16. AUDIT LOG (NHẬT KÝ HỆ THỐNG)

### 16.1 GET `/audit-logs` — Danh sách nhật ký

**Auth:** Bearer JWT | **Roles:** `IT_ADMIN`, `LANH_DAO`

**Query Params:** `action`, `userId`, `from`, `to`, `targetType`, `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log_001",
      "timestamp": "2026-03-15T10:00:00.000Z",
      "user": { "id": "usr_001", "fullName": "Nguyễn Văn A", "role": "CAN_BO_CO_SO" },
      "action": "CASE_CLOSE",
      "targetType": "CASE",
      "targetId": "cas_010",
      "targetName": "CASE-20260220-0001",
      "details": {
        "closingNote": "Đã lập biên bản vi phạm."
      },
      "ip": "192.168.1.100"
    }
  ]
}
```

> **Business Rule SBR-17:** Append-only. Không sửa, không xoá.

---

## 17. REPORTS (BÁO CÁO)

### 17.1 GET `/reports` — Danh sách báo cáo

### 17.2 GET `/reports/compliance` — Báo cáo compliance

**Query Params:** `areaId`, `from`, `to`, `groupBy` (`ward`, `district`, `province`)

### 17.3 GET `/reports/alerts-summary` — Tổng hợp Alert

### 17.4 GET `/reports/cases-summary` — Tổng hợp Case

### 17.5 GET `/reports/export` — Xuất báo cáo PDF/Excel

---

## 18. UPLOAD (FILE)

### 18.1 POST `/upload` — Upload file

**Auth:** Bearer JWT

**Request:** `multipart/form-data`
| Field    | Type   | Mô tả                                    |
|----------|--------|-------------------------------------------|
| `file`   | File   | File upload (≤10MB)                       |
| `type`   | string | `DOCUMENT`, `PHOTO`, `FIELD_PHOTO`        |
| `entityType` | string | `SUBJECT`, `CASE`, `EVENT`            |
| `entityId`   | string | ID của entity liên quan               |

**Allowed formats:** `.pdf`, `.docx`, `.xlsx`, `.jpg`, `.png`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "file_001",
    "url": "/uploads/subjects/sub_001/document_001.pdf",
    "name": "Quyết định quản chế.pdf",
    "size": 245000,
    "mimeType": "application/pdf"
  }
}
```

---

## 19. DASHBOARD

### 19.1 GET `/dashboard` — Dashboard chính

**Auth:** Bearer JWT | **Scope:** Auto-filter

**Response 200:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalSubjects": 245,
      "activeSubjects": 230,
      "complianceRate": 91.3,
      "openAlerts": 12,
      "openCases": 3,
      "pendingRequests": 5,
      "todayEvents": 18
    },
    "recentEvents": [
      {
        "id": "evt_100",
        "type": "CHECKIN_SUCCESS",
        "subject": "Trần Văn B",
        "timestamp": "2026-03-15T08:15:00.000Z"
      }
    ],
    "urgentAlerts": [
      {
        "id": "alt_051",
        "level": "KHAN_CAP",
        "subject": "Lê Văn F",
        "type": "NFC_CCCD_MISMATCH",
        "createdAt": "2026-03-14T22:00:00.000Z"
      }
    ],
    "complianceTrend": [
      { "date": "2026-03-09", "rate": 90.1 },
      { "date": "2026-03-10", "rate": 90.5 },
      { "date": "2026-03-11", "rate": 91.0 },
      { "date": "2026-03-12", "rate": 90.8 },
      { "date": "2026-03-13", "rate": 91.2 },
      { "date": "2026-03-14", "rate": 91.1 },
      { "date": "2026-03-15", "rate": 91.3 }
    ]
  }
}
```

### 19.2 GET `/dashboard/executive` — Dashboard điều hành

**Auth:** Bearer JWT | **Roles:** `CAN_BO_QUAN_LY`, `LANH_DAO`, `IT_ADMIN`

---

## APPENDIX A — Error Codes {#appendix-a}

| Code                        | HTTP | Mô tả                                         |
|-----------------------------|------|------------------------------------------------|
| `INVALID_CREDENTIALS`       | 401  | Sai tên đăng nhập hoặc mật khẩu               |
| `INVALID_OTP`               | 401  | Mã OTP không hợp lệ hoặc đã hết hạn          |
| `TOKEN_EXPIRED`             | 401  | Token JWT đã hết hạn                           |
| `ACCOUNT_LOCKED`            | 423  | Tài khoản đã bị khoá                          |
| `FORBIDDEN`                 | 403  | Không đủ quyền thực hiện hành động             |
| `DATA_SCOPE_VIOLATION`      | 403  | Dữ liệu ngoài phạm vi quản lý                |
| `SUBJECT_NOT_FOUND`         | 404  | Không tìm thấy hồ sơ đối tượng               |
| `EVENT_NOT_FOUND`           | 404  | Không tìm thấy sự kiện                        |
| `ALERT_NOT_FOUND`           | 404  | Không tìm thấy cảnh báo                       |
| `CASE_NOT_FOUND`            | 404  | Không tìm thấy vụ việc                        |
| `SCENARIO_NOT_FOUND`        | 404  | Không tìm thấy kịch bản                       |
| `CCCD_EXISTS`               | 409  | Số CCCD đã tồn tại trong hệ thống            |
| `USERNAME_EXISTS`           | 409  | Tên đăng nhập đã tồn tại                      |
| `ALERT_ALREADY_ESCALATED`   | 409  | Alert đã được escalate thành Case              |
| `CASE_ALREADY_CLOSED`       | 409  | Case đã đóng, không thể thao tác              |
| `DEVICE_NOT_BOUND`          | 403  | Thiết bị chưa được đăng ký                    |
| `NFC_VERIFICATION_FAILED`   | 400  | Không thể xác minh chip NFC                   |
| `NFC_CCCD_MISMATCH`         | 400  | Số CCCD trên chip không khớp                  |
| `FACE_MISMATCH`             | 400  | Khuôn mặt không khớp                          |
| `LIVENESS_FAILED`           | 400  | Không vượt qua kiểm tra liveness              |
| `VALIDATION_ERROR`          | 400  | Dữ liệu đầu vào không hợp lệ                |
| `FILE_TOO_LARGE`            | 400  | File vượt quá kích thước cho phép (10MB)      |
| `UNSUPPORTED_FILE_TYPE`     | 400  | Định dạng file không được hỗ trợ              |
| `RATE_LIMIT_EXCEEDED`       | 429  | Quá nhiều yêu cầu                             |
| `SCENARIO_NOT_ACTIVE`       | 400  | Kịch bản chưa được phê duyệt hoặc đã tạm dừng|
| `DEFAULT_RULE_NOT_DELETABLE`| 400  | Không thể xoá Alert Rule mặc định             |
| `CLOSING_NOTE_REQUIRED`     | 400  | Ghi chú kết quả bắt buộc khi đóng Case       |
| `INTERNAL_ERROR`            | 500  | Lỗi hệ thống                                  |

---

## APPENDIX B — Enum Values {#appendix-b}

### Roles
```
IT_ADMIN, LANH_DAO, CAN_BO_QUAN_LY, CAN_BO_CO_SO, SUBJECT
```

### Subject Status
```
ENROLLED, ACTIVE, SUSPENDED, REINTEGRATING, COMPLETED
```

### Subject Lifecycle
```
KHOI_TAO, ENROLLMENT, DANG_QUAN_LY, TAI_HOA_NHAP, KET_THUC
```

### Event Types
```
CHECKIN_SUCCESS, CHECKIN_FAILED, CHECKIN_OUTSIDE_GEOFENCE,
CHECKIN_VOLUNTARY, OVERDUE, NFC_FAIL, FACE_MISMATCH,
NFC_CCCD_MISMATCH, LOGIN, LOGOUT, SCENARIO_CHANGE,
STATUS_CHANGE, REQUEST_SUBMITTED, FIELD_NOTE, GPS_LOW_ACCURACY,
CHECKIN_EARLY, CHECKIN_DUPLICATE, DEVICE_CHANGE
```

### Alert Levels
```
THAP, TRUNG_BINH, CAO, KHAN_CAP
```

### Alert Status
```
OPEN, ACKNOWLEDGED, RESOLVED, ESCALATED
```

### Alert Source
```
DEFAULT, CUSTOM
```

### Case Status
```
OPEN, CLOSED
```

### Case Source
```
AUTO, MANUAL_ESCALATE, MANUAL_NEW
```

### Request Types
```
TRAVEL, POSTPONE, CHANGE_DEVICE, CHANGE_ADDRESS
```

### Request Status
```
PENDING, APPROVED, REJECTED
```

### Scenario Types
```
MANAGEMENT, ALERT
```

### Scenario Status
```
DRAFT, PENDING_APPROVAL, ACTIVE, SUSPENDED, EXPIRED
```

### Check-in Frequency
```
1_PER_WEEK, 2_PER_MONTH, 1_PER_MONTH
```

### Geofence Types
```
CIRCLE, POLYGON
```

### Data Scope Levels
```
WARD, DISTRICT, PROVINCE, SYSTEM
```

---

## APPENDIX C — Database Entity Summary {#appendix-c}

### Main Database (PostgreSQL)

| Entity                 | Table                    | Mô tả                                    |
|------------------------|--------------------------|-------------------------------------------|
| User                   | `users`                  | Tài khoản cán bộ + đối tượng             |
| Subject                | `subjects`               | Hồ sơ đối tượng (nhân thân)              |
| SubjectFamily          | `subject_families`       | Thông tin gia đình                        |
| SubjectLegal           | `subject_legals`         | Thông tin pháp lý                         |
| Event                  | `events`                 | Sự kiện (read-heavy)                     |
| Alert                  | `alerts`                 | Cảnh báo                                  |
| AlertHistory           | `alert_histories`        | Lịch sử xử lý Alert                     |
| Case                   | `cases`                  | Vụ việc                                   |
| CaseNote               | `case_notes`             | Ghi chú Case (thread)                   |
| Request                | `requests`               | Yêu cầu xin phép                        |
| ManagementScenario     | `management_scenarios`   | Kịch bản quản lý                         |
| AlertRule              | `alert_rules`            | Alert rules (default + custom)           |
| ScenarioAssignment     | `scenario_assignments`   | Gán kịch bản cho đối tượng              |
| Geofence               | `geofences`              | Vùng giám sát GPS                        |
| Device                 | `devices`                | Thiết bị đối tượng                       |
| Notification           | `notifications`          | Thông báo                                |
| AuditLog               | `audit_logs`             | Nhật ký hệ thống (append-only)          |
| File                   | `files`                  | Metadata file upload                     |
| Area                   | `areas`                  | Đơn vị hành chính (tỉnh/quận/phường)    |
| Config                 | `configs`                | Cấu hình hệ thống (key-value)           |

### Biometric Database (PostgreSQL riêng — SBR-18)

| Entity                 | Table                    | Mô tả                                    |
|------------------------|--------------------------|-------------------------------------------|
| FaceTemplate           | `face_templates`         | Face embedding (encrypted, AES-256)      |
| NfcRecord              | `nfc_records`            | NFC hash + metadata                      |
| BiometricLog           | `biometric_logs`         | Log match mỗi lần trình báo             |

---

> **Kết thúc API Documentation v1.0**
> Tổng cộng: 17 module, ~80 endpoints, 35 error codes, 18 enum groups, 22 database entities.
