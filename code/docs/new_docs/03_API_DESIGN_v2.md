# 03 — THIẾT KẾ API (v2 — cập nhật theo mã nguồn)
**Hệ thống SMTTS** · RESTful API · NestJS · Phiên bản v2 · 15/04/2026

> Tài liệu liệt kê **toàn bộ endpoint thực tế** đang chạy trong source backend, đối chiếu mã trong
> `code/backend/src/modules/**/*.controller.ts`. Mọi endpoint đều prefix `/api/v1`.

---

## Mục lục

1. [Quy ước chung](#1)
2. [Auth](#2)
3. [Users](#3)
4. [Areas](#4)
5. [Subjects](#5)
6. [Devices](#6)
7. [Enrollment](#7)
8. [Check-in](#8)
9. [Scenarios · Alert Rules · Escalation Rules](#9)
10. [Geofences](#10)
11. [Events · Alerts · Cases](#11)
12. [Requests](#12)
13. [Dashboard](#13)
14. [Phụ lục — Mã lỗi & Enum](#14)

---

<a id="1"></a>
## 1. Quy ước chung

### 1.1 Base URL
```
http://<host>/api/v1
```

### 1.2 Authentication
- Header: `Authorization: Bearer <accessToken>`
- Token loại JWT (HS256). Access token TTL **15 phút**. Refresh token TTL **7 ngày**, lưu hash trong `refresh_tokens`.
- Endpoint `@Public()` không yêu cầu token: `/auth/login`, `/auth/activate`, `/auth/verify-otp`, `/auth/refresh`.

### 1.3 Response thành công

Backend trả raw object/array. Wrapper response **không** áp dụng đồng nhất (khác thiết kế gốc). Ví dụ:

```json
{ "id": "uuid", "code": "SUB-...", ... }
```

Các endpoint list trả:
```json
{ "items": [...], "total": 123, "page": 1, "limit": 20 }
```

### 1.4 Response lỗi

NestJS HttpException → JSON `{ "statusCode": 400, "message": "...", "code": "ERR_CODE" }`. Một số endpoint dùng `ErrorCodes` enum (xem `common/constants/error-codes.ts`).

### 1.5 Phân trang & sắp xếp

Query: `?page=1&limit=20&sort=created_at:desc`. Mặc định `page=1, limit=20`.

### 1.6 Filter & search

Tuỳ endpoint, ví dụ `?status=OPEN&level=CAO&from=2026-04-01&to=2026-04-30&search=Nguyễn`.

### 1.7 Data scope auto-filter

Mọi endpoint list trên `subjects`, `events`, `alerts`, `cases` đều tự lọc theo `data_scope_level` của cán bộ đang đăng nhập.

### 1.8 Rate limiting

`@nestjs/throttler` áp dụng cho `/auth/login`, `/auth/activate`. Cấu hình mặc định 10 req / phút / IP.

---

<a id="2"></a>
## 2. Auth — `/auth`

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/auth/login` | Public | Đăng nhập (cán bộ + đối tượng) |
| POST | `/auth/activate` | Public | Đối tượng kích hoạt tài khoản mobile |
| POST | `/auth/verify-otp` | TempToken | Xác thực TOTP 6-số |
| POST | `/auth/setup-otp` | Bearer | Khởi tạo OTP (trả QR) |
| POST | `/auth/confirm-otp-setup` | Bearer | Xác nhận OTP setup |
| POST | `/auth/refresh` | Public | Cấp lại token |
| POST | `/auth/logout` | Bearer | Revoke refresh token |
| POST | `/auth/change-password` | Bearer | Đổi mật khẩu |

### 2.1 `POST /auth/login`

**Request**
```json
{ "username": "admin", "password": "Pass123!" }
```

**Response (đã có OTP):**
```json
{ "requireOtp": true, "requireOtpSetup": false, "tempToken": "<jwt>" }
```

**Response (chưa setup OTP):**
```json
{
  "requireOtp": false,
  "requireOtpSetup": true,
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": { "id": "...", "username": "...", "fullName": "...", "role": "...", "areaId": "...", "dataScopeLevel": "..." }
}
```

**Response (đầy đủ):** không có `requireOtp/requireOtpSetup`, có `accessToken/refreshToken/user`.

### 2.2 `POST /auth/activate`

**Request**
```json
{
  "subjectCode": "SUB-20260101-0001",
  "cccd": "012345678901",
  "password": "Pass123!",
  "confirmPassword": "Pass123!"
}
```

**Response**
```json
{ "accessToken": "...", "refreshToken": "...", "user": { ... }, "requireEnrollment": true }
```

### 2.3 `POST /auth/verify-otp`

Header: `Authorization: Bearer <tempToken>` (lấy từ /login).

**Request**
```json
{ "otpCode": "123456" }
```

**Response**
```json
{ "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

### 2.4 `POST /auth/setup-otp` & `POST /auth/confirm-otp-setup`

- `setup-otp` trả `{ secret, otpauthUrl, qrDataUrl }`
- `confirm-otp-setup` body `{ otpCode }` → trả `{ otpEnabled: true, backupCodes: ["xxxx-xxxx", ...] }`

### 2.5 `POST /auth/refresh`

```json
// Request
{ "refreshToken": "..." }
// Response
{ "accessToken": "...", "refreshToken": "..." }
```

### 2.6 `POST /auth/logout`

```json
{ "refreshToken": "..." }   // → 204 No Content
```

### 2.7 `POST /auth/change-password`

```json
{ "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }
// → { "message": "Password changed successfully" }
```

---

<a id="3"></a>
## 3. Users — `/users`  *(IT_ADMIN, LANH_DAO)*

| Method | Path | Quyền | Mô tả |
|--------|------|-------|-------|
| GET | `/users` | IT_ADMIN, LANH_DAO | List có scope filter |
| GET | `/users/:id` | IT_ADMIN, LANH_DAO | Chi tiết |
| POST | `/users` | IT_ADMIN | Tạo cán bộ mới |
| PATCH | `/users/:id` | IT_ADMIN, LANH_DAO | Cập nhật |
| PATCH | `/users/:id/reset-password` | IT_ADMIN | Reset mật khẩu (truyền `new_password`) |
| PATCH | `/users/:id/toggle-status` | IT_ADMIN, LANH_DAO | Đổi giữa ACTIVE/DEACTIVATED |
| PATCH | `/users/:id/unlock` | IT_ADMIN, LANH_DAO | Mở khoá tài khoản bị lock |
| DELETE | `/users/:id` | IT_ADMIN | Soft delete |

### 3.1 Body `POST /users`

```json
{
  "username": "canbo01",
  "password": "InitialPass!",
  "fullName": "Nguyễn Văn A",
  "email": "a@example.com",
  "phone": "0901234567",
  "role": "CAN_BO_QUAN_LY",
  "areaId": "<uuid>",
  "dataScopeLevel": "DISTRICT"
}
```

### 3.2 Query `GET /users`

`?role=&status=&areaId=&search=&page=&limit=`

---

<a id="4"></a>
## 4. Areas — `/areas`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/areas` | Trả cây 2 cấp PROVINCE → DISTRICT (mặc định active) |

Response:
```json
[
  {
    "id": "uuid",
    "code": "PROV_HCM",
    "name": "TP. Hồ Chí Minh",
    "level": "PROVINCE",
    "children": [
      { "id": "...", "code": "DIST_Q1", "name": "Quận 1", "level": "DISTRICT" }
    ]
  }
]
```

---

<a id="5"></a>
## 5. Subjects — `/subjects`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/subjects` | List có scope + filter |
| GET | `/subjects/me` | **(Mobile)** Hồ sơ chính mình |
| GET | `/subjects/me/documents` | **(Mobile)** Tài liệu public + face photo |
| GET | `/subjects/scenarios` | List scenario ACTIVE (cho mobile xem quy định) |
| GET | `/subjects/check-cccd?cccd=` | Kiểm tra CCCD đã tồn tại |
| GET | `/subjects/export` | Xuất Excel |
| POST | `/subjects/:id/assign-scenario` | Body `{ scenario_id }` |
| POST | `/subjects/:id/unassign-scenario` | |
| GET | `/subjects/:id` | Chi tiết |
| POST | `/subjects` | Tạo |
| PATCH | `/subjects/:id` | Cập nhật |
| DELETE | `/subjects/:id` | Soft delete |
| GET | `/subjects/:id/timeline?type=&from=&to=` | Timeline gộp event/alert/case/request |
| GET | `/subjects/:id/devices` | Lịch sử thiết bị |
| GET | `/subjects/:id/documents` | Tài liệu (cán bộ thấy hết) |
| POST | `/subjects/:id/documents` | multipart `file`, `file_type`, `is_public` |
| DELETE | `/subjects/:id/documents/:docId` | Soft delete file |

### 5.1 Body `POST /subjects`

```json
{
  "fullName": "Trần Văn B",
  "cccd": "012345678901",
  "dateOfBirth": "1990-01-15",
  "gender": "MALE",
  "ethnicity": "Kinh",
  "address": "123 ABC, Q.1, TP.HCM",
  "permanentAddress": "...",
  "phone": "0912345678",
  "areaId": "<uuid>",
  "family": { "fatherName": "...", "motherName": "...", "spouseName": "...", "dependents": 2 },
  "legal": { "decisionNumber": "QD/2026/001", "decisionDate": "2026-01-01", "managementType": "QUAN_THUC", "startDate": "2026-01-01", "endDate": "2027-01-01", "issuingAuthority": "..." }
}
```

### 5.2 Query `GET /subjects`

`?status=&lifecycle=&areaId=&scenarioId=&search=&page=&limit=&sort=`

### 5.3 Response `GET /subjects/:id/timeline`

```json
{
  "items": [
    { "kind": "EVENT", "id": "...", "type": "CHECKIN_SUCCESS", "occurredAt": "...", "summary": "..." },
    { "kind": "ALERT", "id": "...", "level": "CAO", "occurredAt": "..." },
    { "kind": "CASE", "id": "...", "severity": "...", "occurredAt": "..." }
  ],
  "total": 56
}
```

---

<a id="6"></a>
## 6. Devices — `/devices`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/devices/current` | **(Mobile)** Thiết bị hiện hành + lịch sử của subject đang đăng nhập |

Response:
```json
{
  "current": { "id": "...", "device_id": "ANDROID_ID", "device_model": "Pixel 7", "os_version": "14", "status": "ACTIVE", "enrolled_at": "..." },
  "history": [ { "id": "...", "status": "REPLACED", "enrolled_at": "...", "replaced_at": "..." } ]
}
```

---

<a id="7"></a>
## 7. Enrollment — `/enrollment`

### 7.1 Mobile (subject)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/enrollment/status` | Trả `{ nfcDone, faceDone, deviceDone, lifecycle }` |
| POST | `/enrollment/nfc` | Body NFC chip data |
| POST | `/enrollment/face` | multipart `file` (JPEG/PNG ≤ 10MB) |
| POST | `/enrollment/device` | Body device info |
| POST | `/enrollment/complete` | Submit toàn bộ → DANG_CHO_PHE_DUYET |

#### `POST /enrollment/nfc`

```json
{
  "chipData": "<base64 raw DG1>",
  "chipSerial": "AB12CD34...",
  "passiveAuthData": "<base64 SOD>",
  "chipFullName": "TRAN VAN B",
  "chipCccdNumber": "012345678901",
  "dg2FaceImage": "<base64 jpeg>"
}
```

Server hash `chipData` (SHA-512), so với hồ sơ; lưu `nfc_records` + lưu DG2 face làm `FACE_PHOTO` trong `files` (`is_public=true`).

#### `POST /enrollment/face`

Multipart form-data:
- `file`: image/jpeg|png

Backend:
1. Forward file sang Face Service (FastAPI) `/v1/embeddings`
2. Nhận embedding 512-d float32
3. Lưu `face_templates` (encrypt), update `subjects.photo_url`

Response:
```json
{ "success": true, "qualityScore": 92, "embeddingVersion": "arcface_r100_v1" }
```

#### `POST /enrollment/device`

```json
{ "deviceId": "ANDROID_ID", "deviceModel": "Pixel 7", "osVersion": "14" }
```

#### `POST /enrollment/complete`

Không body. Yêu cầu cả 3 bước trên đã xong.
Response:
```json
{ "lifecycle": "DANG_CHO_PHE_DUYET", "submittedAt": "2026-04-15T10:00:00Z" }
```

### 7.2 Officer (Web)

Quyền: `IT_ADMIN`, `LANH_DAO`, `CAN_BO_QUAN_LY`.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/enrollment/pending` | Hồ sơ chờ duyệt thuộc địa bàn |
| POST | `/enrollment/:subjectId/approve` | Body `{ note? }` |
| POST | `/enrollment/:subjectId/reject` | Body `{ note }` (bắt buộc) |

---

<a id="8"></a>
## 8. Check-in — `/checkin`

### 8.1 `POST /checkin`

multipart/form-data:

| Field | Loại | Mô tả |
|-------|------|-------|
| chipDataHash | string | SHA-256 DG1 |
| chipSerial | string | UID hex |
| passiveAuthVerified | boolean | Client-side PA result |
| passiveAuthData | string? | Base64 SOD (server có thể re-verify) |
| gpsLat / gpsLng | number? | |
| clientTimestamp | string ISO 8601 | |
| deviceId / deviceModel / osVersion | string? | |
| faceImage | file | JPEG ≤ 10MB |

Pipeline backend (xem `checkin.service.ts`):
1. Resolve subject từ JWT
2. So `chipDataHash` với `nfc_records.cccd_chip_hash`
3. So `deviceId` với `devices` ACTIVE
4. Forward `faceImage` → Face Service → nhận `match_score` + `liveness_score`
5. Tạo `events` (type tổng hợp: `CHECKIN_SUCCESS` / `CHECKIN_FAILED` / `CHECKIN_WARNING`)
6. Tạo `biometric_logs`
7. Trigger Event Processor (rule engine)

Response:
```json
{
  "eventId": "uuid",
  "result": "SUCCESS",
  "faceMatchScore": 92.5,
  "livenessScore": 0.98,
  "nfcStatus": "VERIFIED",
  "deviceStatus": "MATCH",
  "inGeofence": true,
  "geofenceDistance": 0,
  "createdAt": "2026-04-15T08:00:01Z"
}
```

### 8.2 `POST /checkin/nfc-failure`

```json
{
  "reason": "PASSIVE_AUTH_FAILED" | "WRONG_CARD" | "READ_TIMEOUT" | "OTHER",
  "chipSerial": "...",
  "deviceId": "...",
  "gpsLat": 10.762,
  "gpsLng": 106.660,
  "clientTimestamp": "2026-04-15T08:00:00Z"
}
```

Tạo Event `NFC_MISMATCH` hoặc `NFC_FAILED` (tuỳ reason). Response `{ eventId, type, result }`.

---

<a id="9"></a>
## 9. Scenarios · Alert Rules · Escalation Rules

### 9.1 Scenarios — `/scenarios`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/scenarios?status=&search=&page=&limit=` | List |
| GET | `/scenarios/:id` | Chi tiết (kèm alert_rules, escalation_rules) |
| POST | `/scenarios` | Tạo (auto-sinh 4 default alert rules) |
| PATCH | `/scenarios/:id` | Cập nhật |
| PATCH | `/scenarios/:id/status` | Body `{ status: "PENDING_APPROVAL"|"ACTIVE"|"SUSPENDED" }` |
| DELETE | `/scenarios/:id` | Soft delete |

#### Body `POST /scenarios`

```json
{
  "name": "QT cấp xã 2026",
  "description": "...",
  "scope": "DISTRICT",
  "checkinFrequency": "DAILY",
  "checkinWindowStart": "06:00",
  "checkinWindowEnd": "22:00",
  "gracePeriodDays": 2,
  "faceThreshold": 85,
  "nfcRequired": true,
  "fallbackAllowed": true,
  "geofenceId": "<uuid>",
  "curfewStart": "22:00",
  "curfewEnd": "05:00",
  "travelApprovalRequired": true,
  "travelThresholdDays": 3,
  "customFieldDefinitions": [],
  "notificationConfig": { "channels": ["PUSH"] },
  "autoEscalationConfig": { "KHAN_CAP": true, "CAO": false }
}
```

### 9.2 Alert Rules — `/alert-rules`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/alert-rules?scenarioId=&isActive=` | List |
| GET | `/alert-rules/:id` | |
| POST | `/alert-rules` | Tạo CUSTOM (DEFAULT do hệ thống tạo) |
| PATCH | `/alert-rules/:id` | Chỉnh tham số (`condition_value`, …); DEFAULT chỉ chỉnh, không xoá |
| DELETE | `/alert-rules/:id` | Chỉ cho `is_deletable=true` |
| PATCH | `/alert-rules/:id/toggle` | Bật/tắt nhanh `is_active` |

Body `POST`:
```json
{
  "scenarioId": "<uuid>",
  "code": "OUT_OF_GEO_3X_7D",
  "name": "Ra ngoài geofence 3 lần / 7 ngày",
  "eventType": "OUT_OF_GEOFENCE",
  "conditionOperator": ">=",
  "conditionValue": 3,
  "conditionWindowDays": 7,
  "alertLevel": "TRUNG_BINH",
  "notificationChannels": ["PUSH", "WEB"]
}
```

### 9.3 Escalation Rules — `/escalation-rules` *(MỚI v2)*

Cùng cấu trúc /alert-rules nhưng cho Alert → Case.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/escalation-rules?scenarioId=` | |
| GET/POST/PATCH/DELETE | `/escalation-rules[/:id]` | CRUD |
| PATCH | `/escalation-rules/:id/toggle` | |

Body `POST`:
```json
{
  "scenarioId": "<uuid>",
  "code": "AUTO_CASE_KHAN_CAP",
  "name": "Tự tạo Case khi Alert KHAN_CAP",
  "alertType": "*",
  "alertLevelFilter": "KHAN_CAP",
  "conditionOperator": ">=",
  "conditionValue": 1,
  "conditionWindowDays": 1,
  "conditionConsecutive": false,
  "caseSeverity": "KHAN_CAP",
  "caseDescriptionTpl": "Auto case từ alert {{alertCode}}",
  "autoAssign": true
}
```

---

<a id="10"></a>
## 10. Geofences — `/geofences`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/geofences?search=&isActive=` | List |
| GET | `/geofences/geocode?address=` | Geocode chuỗi địa chỉ → `{lat,lng,formatted}` |
| GET | `/geofences/:id` | Chi tiết |
| POST | `/geofences` | Tạo |
| PATCH | `/geofences/:id` | Cập nhật |
| DELETE | `/geofences/:id` | Soft delete |
| POST | `/geofences/:id/check-point` | Body `{lat,lng}` → `{ inside: true, distance: 0 }` |

Body `POST`:
```json
{
  "name": "Phường 1, Quận 1",
  "type": "CIRCLE",
  "address": "...",
  "centerLat": 10.776,
  "centerLng": 106.700,
  "radius": 1500,
  "areaId": null
}
```

POLYGON:
```json
{
  "type": "POLYGON",
  "coordinates": [{ "lat": 10.77, "lng": 106.70 }, ...]
}
```

---

<a id="11"></a>
## 11. Events · Alerts · Cases

### 11.1 Events — `/events`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/events?subjectId=&type=&result=&from=&to=&page=&limit=` | List |
| GET | `/events/recent?limit=` | N event mới |
| GET | `/events/trace?cccd=` | Trace toàn bộ event của 1 CCCD |
| GET | `/events/export?...` | Excel |
| GET | `/events/:id` | Chi tiết (kèm `biometric_logs` nếu có) |

### 11.2 Alerts — `/alerts`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/alerts?status=&level=&from=&to=&page=&limit=` | List |
| GET | `/alerts/open?limit=` | Alert OPEN |
| GET | `/alerts/export` | Excel |
| GET | `/alerts/:id` | Chi tiết + `alert_histories` |
| PATCH | `/alerts/:id/acknowledge` | |
| PATCH | `/alerts/:id/resolve` | |
| POST | `/alerts/:id/escalate` | Body `{ severity?, description?, assigneeId? }` → tạo Case `MANUAL_ESCALATE` |

### 11.3 Cases — `/cases`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/cases?status=&severity=&assigneeId=&from=&to=&page=&limit=` | |
| GET | `/cases/export` | Excel |
| POST | `/cases` | Tạo `MANUAL_NEW` |
| PATCH | `/cases/:id/close` | Body `{ closingNote }` |
| POST | `/cases/:id/reopen` | Tạo Case mới link `related_case_id` |
| GET | `/cases/:id/notes` | List notes (timeline) |
| POST | `/cases/:id/notes` | Body `{ content, photos? }` |
| GET | `/cases/:id` | Chi tiết |

Body `POST /cases`:
```json
{
  "subjectId": "<uuid>",
  "severity": "CAO",
  "description": "...",
  "assigneeId": "<uuid>",
  "linkedEventIds": ["..."]
}
```

---

<a id="12"></a>
## 12. Requests — `/requests`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/requests/all?status=&search=&page=&limit=` | **Cán bộ** xem tất cả (auto-scope) |
| GET | `/requests?subject_id=&page=&limit=` | List của 1 subject (mobile self / cán bộ) |
| POST | `/requests` | **Mobile** tạo |
| POST | `/requests/:id/review` | **Cán bộ** approve/reject hợp nhất |
| GET | `/requests/:id` | Chi tiết |

Body `POST /requests`:
```json
{
  "type": "DEVICE_CHANGE",
  "reason": "Mất điện thoại cũ",
  "details": { "newDeviceModel": "Pixel 8" }
}
```

Body `POST /requests/:id/review`:
```json
{ "action": "APPROVED" | "REJECTED", "note": "..." }
```

---

<a id="13"></a>
## 13. Dashboard — `/dashboard`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/dashboard/summary` | Counters tổng |
| GET | `/dashboard/charts?days=7|30` | Time series |

Response `summary`:
```json
{
  "subjectsActive": 234,
  "alertsOpen": { "THAP": 5, "TRUNG_BINH": 12, "CAO": 3, "KHAN_CAP": 1 },
  "casesOpen": 7,
  "events24h": 1024,
  "complianceAvg": 92.4
}
```

Response `charts`:
```json
{
  "events": [{ "date": "2026-04-09", "count": 132 }, ...],
  "alerts": [{ "date": "...", "count": 8 }, ...],
  "cases":  [{ "date": "...", "count": 1 }, ...]
}
```

---

<a id="14"></a>
## 14. Phụ lục

### 14.1 Mã lỗi tiêu biểu

| Code | HTTP | Ý nghĩa |
|------|------|---------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Sai username/password |
| `AUTH_OTP_INVALID` | 401 | OTP sai |
| `AUTH_OTP_REQUIRED` | 401 | Chưa verify OTP |
| `AUTH_ACCOUNT_LOCKED` | 423 | Tài khoản bị khoá |
| `TOKEN_INVALID` / `TOKEN_EXPIRED` | 401 | Token sai/hết hạn |
| `SUBJECT_CCCD_DUPLICATED` | 409 | CCCD đã có hồ sơ ACTIVE |
| `ENROLLMENT_INCOMPLETE` | 400 | Thiếu bước (NFC/face/device) |
| `ENROLLMENT_FACE_LOW_QUALITY` | 422 | Ảnh face quá kém |
| `CHECKIN_NFC_MISMATCH` | 422 | NFC không khớp |
| `CHECKIN_FACE_MISMATCH` | 422 | Face không khớp |
| `CHECKIN_LIVENESS_FAILED` | 422 | Anti-spoofing fail |
| `CHECKIN_DEVICE_MISMATCH` | 422 | Device khác device đã enroll |
| `CASE_CLOSED_READONLY` | 409 | Case đã đóng |
| `RBAC_FORBIDDEN` | 403 | Không đủ quyền |
| `SCOPE_DENIED` | 403 | Ngoài phạm vi địa bàn |

### 14.2 Enum tổng hợp

Xem chi tiết §4.1 trong [01_DATABASE_DESIGN_v2.md](./01_DATABASE_DESIGN_v2.md).

### 14.3 Endpoint thiết kế gốc đã hợp nhất / loại bỏ

| Endpoint cũ | Trạng thái v2 |
|-------------|---------------|
| `POST /auth/mobile/login` | Hợp nhất → `POST /auth/login` |
| `POST /auth/mobile/change-password` | Hợp nhất → `POST /auth/change-password` |
| `POST /auth/verify-backup-code` | **Đã triển khai** (xem §2.x trong FUNCTIONAL_SPEC §12.6) |
| `PUT /scenarios/:id/submit \| approve \| suspend` | Hợp nhất → `PATCH /scenarios/:id/status` |
| `POST /scenarios/:id/simulate` | Chưa làm — đề xuất v3 |
| `/scenarios/:id/alert-rules*` (sub-resource) | Tách → `/alert-rules` top-level |
| `PUT /requests/:id/approve \| reject` | Hợp nhất → `POST /requests/:id/review { action }` |
| `PUT /enrollment/:id/change-device` | Thực hiện qua `requests.type=DEVICE_CHANGE` + `/requests/:id/review` |
| `PUT /enrollment/:id/reset` | **Đã triển khai** dưới dạng `POST /enrollment/:subjectId/reset` (xem FUNCTIONAL_SPEC §12.9) |
| `/notifications/*` | Chưa làm — đề xuất v3 |
| `/reports/*` | Chưa làm (đã có `/export` mỗi resource) |
| `/audit-logs` | Chưa có endpoint — đề xuất v3 |
| `/config/*` | Chưa làm — đề xuất v3 |
| `POST /upload` | Hợp nhất → typed endpoints (`/subjects/:id/documents`, `/enrollment/face`) |

### 14.4 Endpoint MỚI v2 (không có trong thiết kế gốc)

| Endpoint | Mục đích |
|----------|----------|
| `POST /auth/activate` | Đối tượng kích hoạt mobile |
| `GET /enrollment/status` | Tra tiến độ enrollment |
| `POST /enrollment/{nfc,face,device,complete}` | Pipeline 4 bước |
| `GET /enrollment/pending` | Hàng đợi phê duyệt |
| `POST /enrollment/:id/{approve,reject}` | Phê duyệt/từ chối |
| `POST /checkin` (mới hoá multipart) | Check-in 4 yếu tố |
| `POST /checkin/nfc-failure` | Log lỗi NFC |
| `/escalation-rules*` | CRUD escalation rules |
| `POST /alerts/:id/escalate` | Hợp nhất escalate manual |
| `POST /cases/:id/reopen` | Reopen tạo Case linked |
| `GET /cases/:id/notes` (riêng) | Timeline note |
| `GET /subjects/me`, `/me/documents`, `/scenarios`, `/check-cccd` | Self-service mobile |
| `POST /subjects/:id/{assign,unassign}-scenario` | Gán nhanh scenario |
| `GET /subjects/:id/{timeline,devices,documents}` | Sub-resources |
| `POST /subjects/:id/documents` + DELETE | Quản lý tài liệu typed |
| `GET /events/recent`, `/events/trace` | Dashboard widget + tra cứu nhanh |
| `GET /devices/current` | Mobile xem device hiện tại |
| `GET /geofences/geocode`, `POST /geofences/:id/check-point` | Hỗ trợ build geofence |
| `GET /requests/all`, `POST /requests/:id/review` | Cán bộ duyệt request |
| `GET /dashboard/summary`, `/dashboard/charts` | Widgets dashboard |
| `PATCH /users/:id/{toggle-status,unlock,reset-password}` | Quản trị tài khoản |
