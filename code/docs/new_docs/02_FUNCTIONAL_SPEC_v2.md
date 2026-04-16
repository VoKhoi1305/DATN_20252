# 02 — ĐẶC TẢ CHỨC NĂNG 
**Hệ thống SMTTS** · 

> Tài liệu liệt kê **toàn bộ chức năng đã triển khai** trong source hiện tại (backend NestJS,
> web React, mobile Android), kèm phần **đề xuất bổ sung** so với thiết kế gốc.

---

## Mục lục

1. [Vai trò & phân quyền](#1)
2. [Module 1 — Xác thực & tài khoản](#2)
3. [Module 2 — Quản lý hồ sơ đối tượng](#3)
4. [Module 3 — Kịch bản & quy tắc](#4)
5. [Module 4 — Geofence](#5)
6. [Module 5 — Enrollment & Phê duyệt](#6)
7. [Module 6 — Check-in (Mobile)](#7)
8. [Module 7 — Sự kiện · Cảnh báo · Vụ việc](#8)
9. [Module 8 — Yêu cầu (Requests)](#9)
10. [Module 9 — Dashboard · Map](#10)
11. [Module 10 — Quản lý cán bộ & Khu vực](#11)
12. [Hạng mục đề xuất bổ sung (v3)](#12)
13. [Hạng mục đã có trong thiết kế cũ nhưng tạm hoãn](#13)

---

<a id="1"></a>
## 1. Vai trò & phân quyền

| Role | Mô tả | Phạm vi dữ liệu mặc định |
|------|-------|---------------------------|
| `IT_ADMIN` | Quản trị hệ thống, tạo cán bộ, cấu hình | `SYSTEM` (toàn bộ) |
| `LANH_DAO` | Lãnh đạo cấp tỉnh/quận | `PROVINCE` hoặc `DISTRICT` |
| `CAN_BO_QUAN_LY` | Cán bộ quản lý nghiệp vụ | `DISTRICT` (mặc định) |
| `CAN_BO_CO_SO` | Cán bộ cơ sở (field) | `DISTRICT` |
| `SUBJECT` | Đối tượng quản lý (mobile) | Chỉ chính mình |

`data_scope_level` quyết định auto-filter dữ liệu trong dashboard và list endpoint.

---

<a id="2"></a>
## 2. Module Xác thực & tài khoản

### 2.1 Đăng nhập cán bộ (Web)

Luồng 2 bước với TOTP:
1. `POST /auth/login` (username + password) → trả `tempToken` nếu user đã có OTP, hoặc trả `accessToken` + `requireOtpSetup=true` nếu chưa setup.
2. `POST /auth/verify-otp` với `tempToken` + 6 số → trả `accessToken` (15 phút) + `refreshToken` (7 ngày).

Cơ chế khoá: 5 lần sai → `LOCKED` `locked_until = NOW() + 15 phút`. Cán bộ có quyền `unlock` thủ công.

### 2.2 Setup OTP lần đầu

`POST /auth/setup-otp` → trả `otpauth_url` (QR) + secret. `POST /auth/confirm-otp-setup` xác nhận bằng mã 6 số → set `otp_enabled = true` + sinh `backup_codes` (10 mã).

### 2.3 Kích hoạt tài khoản đối tượng (Mobile)

`POST /auth/activate` (subjectCode + cccd + password + confirmPassword) — đối tượng tự kích hoạt khi cán bộ đã tạo hồ sơ và phát mã. Sau kích hoạt: trả token + `requireEnrollment = true`.

### 2.4 Refresh / Logout / Đổi mật khẩu

- `POST /auth/refresh`: refresh token → cấp cặp token mới, revoke token cũ.
- `POST /auth/logout`: revoke refresh token.
- `POST /auth/change-password`: tự đổi mật khẩu (yêu cầu mật khẩu hiện tại).

### 2.5 Quản lý cán bộ (IT_ADMIN/LANH_DAO)

`/users`: list (có scope filter), create (chỉ IT_ADMIN), update, **toggle-status** (lock/deactivate/active), **unlock**, **reset-password** (chỉ IT_ADMIN), soft delete.

---

<a id="3"></a>
## 3. Module Quản lý hồ sơ đối tượng

### 3.1 Danh sách & tìm kiếm

`GET /subjects` — list phân trang, hỗ trợ filter (status, lifecycle, area_id, scenario_id), search theo tên/CCCD/mã, sort. Auto-scope theo cán bộ.

### 3.2 Tạo hồ sơ

`POST /subjects` — cán bộ nhập thông tin cơ bản + thông tin gia đình + pháp lý. Hệ thống:
- Generate `code` `SUB-YYYYMMDD-NNNN`
- Mã hoá CCCD (AES) + lưu hash (SHA-256)
- Tạo `users` row tương ứng (role=SUBJECT, username = số CCCD, password ngẫu nhiên + bắt đổi)
- Lifecycle = `KHOI_TAO`

### 3.3 Cập nhật / Xoá

`PATCH /subjects/:id`, `DELETE /subjects/:id` (soft delete + cascade soft delete `subject_families`/`legals`).

### 3.4 Chi tiết & timeline

- `GET /subjects/:id` — chi tiết đầy đủ
- `GET /subjects/:id/timeline` — gộp event/alert/case/request theo thời gian, filter theo loại
- `GET /subjects/:id/devices` — lịch sử thiết bị (current + history)
- `GET /subjects/:id/documents` — danh sách tài liệu (cán bộ thấy hết, có cờ `is_public`)

### 3.5 Tài liệu

- `POST /subjects/:id/documents` (multipart) — upload với `file_type` + `is_public` flag. Lưu vào `files`, link entity.
- `DELETE /subjects/:id/documents/:docId` — soft delete.

### 3.6 Self-access từ Mobile

- `GET /subjects/me` — đối tượng xem chính mình
- `GET /subjects/me/documents` — chỉ tài liệu `is_public = true` + ảnh chân dung
- `GET /subjects/scenarios` — danh sách scenario ACTIVE để biết quy định
- `GET /subjects/check-cccd?cccd=...` — kiểm tra CCCD đã có trong hệ thống

### 3.7 Gán kịch bản

- `POST /subjects/:id/assign-scenario` — gán/đổi scenario (đóng assignment cũ, tạo mới ACTIVE)
- `POST /subjects/:id/unassign-scenario` — đóng assignment hiện tại

### 3.8 Xuất Excel

`GET /subjects/export` — generate file `.xlsx` (ExcelJS) với cùng filter list.

---

<a id="4"></a>
## 4. Module Kịch bản & quy tắc

### 4.1 Quản lý Scenario

`/scenarios` CRUD. Vòng đời `DRAFT → PENDING_APPROVAL → ACTIVE → SUSPENDED/EXPIRED` điều khiển qua **`PATCH /scenarios/:id/status`** (consolidated từ nhiều endpoint cũ).

Khi tạo scenario → tự động sinh **4 alert rule mặc định** (DEFAULT) với `is_deletable=false`:
1. CCCD chip không khớp hồ sơ
2. Face mismatch streak (3 lần liên tiếp)
3. Overdue check-in
4. Severe overdue (>= grace_period × 2)

### 4.2 Alert Rules — module riêng

`/alert-rules` CRUD độc lập (lọc qua query `?scenario_id=`):
- `POST` thêm CUSTOM rule
- `PATCH` chỉnh tham số (DEFAULT chỉ chỉnh, không xoá)
- `DELETE` chỉ với `is_deletable = true`
- `PATCH /:id/toggle` bật/tắt nhanh

### 4.3 Escalation Rules — **(MỚI v2)** module riêng

`/escalation-rules` CRUD tương tự — quy tắc tự sinh Case từ Alert. Hỗ trợ điều kiện consecutive + window. Có cờ `auto_assign` để tự gán cán bộ.

### 4.4 Engine

`event-processor.service.ts` (background, in-process):
- Mọi Event → match `alert_rules` theo `event_type` + condition → tạo Alert (nếu chưa có Alert OPEN cùng loại trong cửa sổ)
- Alert mới → match `escalation_rules` → tạo Case nếu thoả; ghi `escalation_type=AUTO`, `escalation_rule_name`, `linked_event_ids`

`overdue-checkin.scheduler.ts` (cron mỗi giờ): quét subject `DANG_QUAN_LY` quá hạn check-in → tạo Event `CHECKIN_OVERDUE`.

---

<a id="5"></a>
## 5. Module Geofence

`/geofences` CRUD. Hỗ trợ CIRCLE (center + radius) và POLYGON (mảng coords). Bổ sung:
- `GET /geofences/geocode?address=` — geocode chuỗi địa chỉ (Google Maps API; fallback OSM)
- `POST /geofences/:id/check-point` — kiểm tra 1 điểm có trong vùng không (test khi build)

Geofence được scenario tham chiếu qua `geofence_id`. Check-in ngoài vùng vẫn được ghi nhận, nhưng tạo Event `OUT_OF_GEOFENCE` (SBR-06).

---

<a id="6"></a>
## 6. Module Enrollment & Phê duyệt — **(MỚI v2)**

> Pipeline 4 bước trên mobile, sau đó cán bộ phê duyệt.

### 6.1 Luồng đối tượng (Mobile)

| Bước | Endpoint | Mô tả |
|------|----------|-------|
| 1. Đọc NFC | `POST /enrollment/nfc` | App đọc CCCD qua JMRTD (BAC, DG1, DG2, SOD), upload chip data + serial + passive auth + ảnh DG2 |
| 2. Selfie face | `POST /enrollment/face` | multipart JPEG. Backend forward sang Face Service (InsightFace ArcFace R100) → nhận embedding 512-d → lưu `face_templates` |
| 3. Đăng ký device | `POST /enrollment/device` | Android ID + model + OS version → tạo row `devices` ACTIVE |
| 4. Hoàn tất | `POST /enrollment/complete` | Chuyển lifecycle `ENROLLMENT → DANG_CHO_PHE_DUYET`, set `submitted_at`, gửi notification cho cán bộ địa bàn |

`GET /enrollment/status` — kiểm tra hiện đang ở bước nào (NFC done? Face done? Device done?).

### 6.2 Luồng cán bộ (Web)

| Endpoint | Mô tả |
|----------|-------|
| `GET /enrollment/pending` | Danh sách đối tượng `DANG_CHO_PHE_DUYET` thuộc địa bàn (auto-scope DISTRICT/PROVINCE/SYSTEM) |
| `POST /enrollment/:subjectId/approve` | Body `{ note? }`. Lifecycle → `DANG_QUAN_LY`, set `approved_by_id`, `approved_at`, `approval_note`. Notify subject. |
| `POST /enrollment/:subjectId/reject` | Body `{ note }` (bắt buộc). Lifecycle → `ENROLLMENT`, set `rejection_note`. Subject phải sửa và submit lại. |

Quyền: `IT_ADMIN`, `LANH_DAO`, `CAN_BO_QUAN_LY`.

---

<a id="7"></a>
## 7. Module Check-in (Mobile) — **(MỚI v2)**

### 7.1 `POST /checkin` — Trình báo định kỳ

multipart/form-data:
- `chipDataHash` SHA-256 của DG1 đã đọc
- `chipSerial`, `passiveAuthVerified`, `passiveAuthData?`
- `gpsLat`, `gpsLng` (không bắt buộc nhưng khuyến khích)
- `clientTimestamp` ISO 8601
- `deviceId`, `deviceModel`, `osVersion`
- `faceImage` JPEG ≤ 10MB

**Pipeline (4 yếu tố):**
1. Verify NFC: `nfc_records.cccd_chip_hash == chipDataHash` ?
2. Verify Device: `devices` ACTIVE của subject `device_id == deviceId` ?
3. Verify Face: gọi Face Service → match score so với `face_templates.embedding`. Đồng thời chạy liveness detection.
4. Tạo `events` (kết quả tổng hợp) + `biometric_logs` (chi tiết).

Trả về: `face_match_score`, `liveness_score`, `nfc_status`, `device_status`, `event_id`, `result` SUCCESS/FAILED/WARNING.

### 7.2 `POST /checkin/nfc-failure` — Log lỗi NFC từ phía mobile

Khi mobile không đọc được chip (timeout, sai thẻ, passive auth fail) — gọi ngay endpoint này để tạo Event `NFC_MISMATCH`/`NFC_FAILED` mà không cần kèm ảnh face. Đảm bảo mọi lần thử đều có dấu vết.

### 7.3 (Đề xuất bổ sung)

- `GET /checkin/schedule` — trả khung giờ + tần suất từ scenario hiện tại của subject (hiện app suy ra qua `GET /subjects/me`)
- `GET /checkin/history` — lịch sử check-in của chính mình (hiện app dùng `GET /subjects/me` + `events?subject_id=me` thông qua filter)

---

<a id="8"></a>
## 8. Module Sự kiện · Cảnh báo · Vụ việc

### 8.1 Events

- `GET /events` — list, filter (`subject_id`, `type`, `result`, `from/to`), scope theo cán bộ
- `GET /events/recent?limit=` — N event mới (dashboard widget)
- `GET /events/trace?cccd=` — trace toàn bộ event của một CCCD (search nhanh)
- `GET /events/:id` — chi tiết
- `GET /events/export` — Excel

### 8.2 Alerts

- `GET /alerts`, `GET /alerts/open?limit=`, `GET /alerts/:id`
- `PATCH /alerts/:id/acknowledge` — ghi nhận
- `PATCH /alerts/:id/resolve` — xử lý xong
- `POST /alerts/:id/escalate` — escalate thủ công thành Case (note + assignee tuỳ chọn)
- `GET /alerts/export` — Excel

Mỗi action ghi vào `alert_histories`.

### 8.3 Cases

- `GET /cases`, `GET /cases/:id`, `GET /cases/export`
- `POST /cases` — tạo Case **MANUAL_NEW** (không từ Alert) hoặc MANUAL_ESCALATE từ alert. Bắt buộc `subject_id` + `severity` + `description`.
- `PATCH /cases/:id/close` — đóng (bắt buộc `closing_note`). Set `closed_by_id`, `closed_at`, `is_closing_note=true` cho note tương ứng. Case CLOSED là read-only.
- `POST /cases/:id/reopen` — mở lại — tạo **Case mới linked** qua `related_case_id` (EC-14).
- `GET /cases/:id/notes` + `POST /cases/:id/notes` — note kèm ảnh (mảng URL `photos`).

---

<a id="9"></a>
## 9. Module Yêu cầu (Requests) từ đối tượng

| Endpoint | Vai trò |
|----------|---------|
| `POST /requests` | Mobile (subject) gửi yêu cầu — `type`, `reason`, `details` |
| `GET /requests?subject_id=` | List của 1 subject (mobile self hoặc cán bộ tra cứu) |
| `GET /requests/all?status=&search=&page=&limit=` | **Cán bộ** xem toàn bộ (auto-scope) |
| `POST /requests/:id/review` | **Hợp nhất approve/reject** — body `{ action: APPROVED/REJECTED, note? }` |
| `GET /requests/:id` | Chi tiết |

Loại request: `DEVICE_CHANGE`, `ADDRESS_CHANGE`, `SCHEDULE_CHANGE`, `OTHER`.

---

<a id="10"></a>
## 10. Module Dashboard & Map

### 10.1 Dashboard widgets

- `GET /dashboard/summary` — tổng số subject ACTIVE, alert OPEN theo level, case OPEN, event 24h, compliance trung bình
- `GET /dashboard/charts` — chuỗi thời gian event/alert/case 7-30 ngày để vẽ biểu đồ
- `GET /events/recent`, `GET /alerts/open` — feed realtime cho dashboard

### 10.2 Map

Web page **Map** (`/map`) hiển thị:
- Geofence ACTIVE
- Vị trí check-in 24h (cluster)
- Subject ngoài geofence

Frontend dùng **Google Maps**. Endpoint dữ liệu chia sẻ cùng `/events` (filter có `gps_lat/lng`).

---

<a id="11"></a>
## 11. Module Quản lý cán bộ & Khu vực

### 11.1 Areas

`GET /areas` — trả cây 2 cấp (PROVINCE → DISTRICT). Dùng cho dropdown trong form, scope filter.

### 11.2 Users

(Đã mô tả ở §2.5).

---

<a id="12"></a>
## 12. Hạng mục đề xuất bổ sung

### 12.1 Notification System đầy đủ

- **Hiện trạng:** bảng `notifications` đã có, có row được insert ở luồng enrollment approval, nhưng:
  - Chưa có endpoint `/notifications` (list, mark-read, mark-all-read)
  - Chưa có Web Push / FCM cho mobile
  - Chưa có gửi email / SMS
- **Đề xuất:** xây Notification Bus (RabbitMQ hoặc Bull queue trên Redis) + worker gửi đa kênh (FCM, SMTP, SMS gateway).

### 12.2 Audit Log đầy đủ + UI tra cứu

- **Hiện trạng:** bảng `audit_logs` có sẵn, ghi log một số action quan trọng (login, escalate). **Chưa phủ toàn bộ CRUD.**
- **Đề xuất:**
  - Áp `AuditLogInterceptor` lên mọi mutating endpoint
  - Xây `GET /audit-logs` với filter (user, action, target, time range)
  - Trang Web tra cứu

### 12.3 Configs / Catalog

- **Hiện trạng:** bảng `configs` có sẵn, không có endpoint quản lý. Các tham số như `face_threshold` mặc định, danh sách enum tuỳ biến… đang hard-code trong code.
- **Đề xuất:** `/config/categories`, `/config/biometric`, `/config/escalation`, `/config/areas` như thiết kế gốc đã liệt kê.

### 12.4 Reports module

- **Hiện trạng:** mỗi resource đã có `/export` riêng (Excel). **Chưa có** report tổng hợp.
- **Đề xuất:** `/reports/compliance`, `/reports/alerts-summary`, `/reports/cases-summary`, `/reports/export` (PDF/Excel với template).

### 12.5 Scenario Simulation

- **Hiện trạng:** không có. Cán bộ phải đoán hiệu lực rule khi build scenario.
- **Đề xuất:** `POST /scenarios/:id/simulate` với input event giả lập → trả "rule nào sẽ trigger, alert sẽ tạo, có escalate Case không".

### 12.6 Backup codes verification flow

- **Hiện trạng:** `POST /auth/verify-backup-code` **đã triển khai**.
  - Header `Authorization: Bearer <tempToken>` (lấy từ `/auth/login`).
  - Body: `{ "backupCode": "XXXX-XXXX" }` (9 ký tự, hex + dấu gạch ngang).
  - Server hash SHA-256 → so khớp trong `users.backup_codes`, mỗi mã dùng 1 lần (xoá khỏi mảng sau khi verify thành công).
  - Response: `{ accessToken, refreshToken, user, remainingBackupCodes }` — `remainingBackupCodes` giúp UI cảnh báo khi còn ít mã.
  - Error codes: `INVALID_BACKUP_CODE`, `NO_BACKUP_CODES`, `OTP_NOT_SETUP`, `TOKEN_EXPIRED`, `TOKEN_INVALID`.

### 12.7 Mobile push notification (FCM)

- **Hiện trạng:** Mobile pull qua `GET /subjects/me`, không có push.
- **Đề xuất:** Đăng ký FCM token (`devices.fcm_token`), endpoint `/devices/register-fcm`.

### 12.8 Geofence Polygon UI

- **Hiện trạng:** schema hỗ trợ POLYGON nhưng UI chỉ vẽ CIRCLE.
- **Đề xuất:** Tích hợp Polygon drawing tool trên trang `/geofences`.

### 12.9 Re-enrollment

- **Hiện trạng:** `POST /enrollment/:subjectId/reset` **đã triển khai** (officer-only).
  - Quyền: `IT_ADMIN`, `LANH_DAO`, `CAN_BO_QUAN_LY` — cán bộ phải có data-scope phủ `subject.area_id`.
  - Body: `{ "reason": "...", "resetDevice": false }` — `reason` ≥ 5 ký tự, bắt buộc; `resetDevice` mặc định false.
  - Lifecycle được phép reset: `DANG_QUAN_LY`, `DANG_CHO_PHE_DUYET`, `TAI_HOA_NHAP` → sau khi reset lifecycle chuyển về `ENROLLMENT`.
  - Side effects: deactivate tất cả `face_templates` + `nfc_records` (`is_active = false`, giữ lịch sử); tuỳ chọn mark active device = `REPLACED`; xóa `approved_at/by`, lưu lý do vào `rejection_note`; gửi notification `ENROLLMENT_RESET` cho đối tượng.
  - Response: `{ lifecycle, resetAt, facesDeactivated, nfcDeactivated, deviceReset, message }`.

### 12.10 Migration script chính thức cho `escalation_rules`

- **Hiện trạng:** TypeORM auto-sync (rủi ro production).
- **Đề xuất:** viết `013_create_escalation_rules.sql` chuẩn, tách khỏi auto-sync.

### 12.11 Phân quyền chi tiết hơn (CASL)

- **Hiện trạng:** RolesGuard kiểm tra theo enum role + scope hard-code trong service.
- **Đề xuất:** Casl Ability để định nghĩa permission chi tiết (`Subject:edit:own-area`, …).

### 12.12 i18n trên Mobile (hiện chỉ tiếng Việt)

---

<a id="13"></a>
## 13. Hạng mục đã có trong thiết kế gốc nhưng tạm hoãn

| Mục | Lý do tạm hoãn |
|-----|----------------|
| `/auth/mobile/login` riêng | Hợp nhất với `/auth/login` (cùng JWT scheme, role phân biệt SUBJECT vs cán bộ) |
| `/auth/mobile/change-password` riêng | Hợp nhất với `/auth/change-password` |
| `/scenarios/:id/submit`, `/approve`, `/suspend` riêng | Consolidated thành `PATCH /scenarios/:id/status` |
| `/scenarios/:id/alert-rules` (sub-resource) | Tách thành `/alert-rules` top-level (RESTful hơn, dễ filter) |
| `/requests/:id/approve`, `/requests/:id/reject` riêng | Hợp nhất thành `POST /requests/:id/review { action }` |
| Notifications (Web + Mobile push) | Đề xuất v3 (xem §12.1) |
| Reports tổng hợp | Đề xuất v3 (xem §12.4) |
| Audit Log API + UI | Đề xuất v3 (xem §12.2) |
| Configs API | Đề xuất v3 (xem §12.3) |
| Upload generic `/upload` | Hợp nhất vào `/subjects/:id/documents` và `/enrollment/face` (typed) |
