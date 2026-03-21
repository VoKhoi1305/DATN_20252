# SMTTS API Test Plan - Postman

## Setup

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
Moi request (tru login/refresh) deu can header:
```
Authorization: Bearer {{accessToken}}
```

**Buoc 1 - Login:**
```
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123"
}
```
Response tra ve `tempToken`.

**Buoc 2 - Verify OTP:**
```
POST /auth/verify-otp
Authorization: Bearer {{tempToken}}
Content-Type: application/json

{
  "otpCode": "<6-digit-code>"
}
```
Dung Google Authenticator voi secret: `HUGVSXZEHUTGQ3YZ`
Response tra ve `accessToken` va `refreshToken`. Luu `accessToken` cho cac request sau.

### Test Users
| Username | Password | Role | OTP Secret |
|----------|----------|------|------------|
| admin | Admin@123 | IT_ADMIN | HUGVSXZEHUTGQ3YZ |
| lanhdao.hn | Admin@123 | LANH_DAO | (can setup) |
| canbo.quanly.hbt | Admin@123 | CAN_BO_QUAN_LY | (can setup) |
| canbo.coso.bk | Admin@123 | CAN_BO_CO_SO | (can setup) |

### Sample IDs
```
scenario_id:         b1000000-0000-0000-0000-000000000001
subject_ids:         d1000000-0000-0000-0000-000000000001, d1000000-0000-0000-0000-000000000002, d1000000-0000-0000-0000-000000000003
alert_rule_id:       c1000000-0000-0000-0000-000000000001 (default - Qua han check-in)
escalation_rule_id:  d1000000-0000-0000-0000-000000000001 (default - Canh bao lap lai)
event_id:            10000001-0001-0000-0000-000000000001
open_alert_id:       20000001-0000-0000-0000-000000000008
ack_alert_id:        20000001-0000-0000-0000-000000000004
open_case_id:        30000001-0000-0000-0000-000000000001
closed_case_id:      30000001-0000-0000-0000-000000000003
area_id:             a1000000-0000-0000-0000-000000000010 (Quan Hai Ba Trung)
geofence_id:         f1000000-0000-0000-0000-000000000001
```

---

## 1. AUTH (6 endpoints)

### 1.1 Login
```
POST /auth/login

{
  "username": "admin",
  "password": "Admin@123"
}
```
Expected: `200` - `{ requireOtp: true, tempToken: "..." }`

### 1.2 Verify OTP
```
POST /auth/verify-otp
Authorization: Bearer {{tempToken}}

{
  "otpCode": "123456"
}
```
Expected: `200` - `{ accessToken, refreshToken }`

### 1.3 Setup OTP (cho user chua setup)
```
POST /auth/setup-otp
Authorization: Bearer {{tempToken}}
```
Expected: `200` - `{ qrCodeUrl, secret }`

### 1.4 Confirm OTP Setup
```
POST /auth/confirm-otp-setup
Authorization: Bearer {{tempToken}}

{
  "otpCode": "123456"
}
```

### 1.5 Refresh Token
```
POST /auth/refresh

{
  "refreshToken": "{{refreshToken}}"
}
```
Expected: `200` - `{ accessToken, refreshToken }`

### 1.6 Logout
```
POST /auth/logout
Authorization: Bearer {{accessToken}}
```

### 1.7 Change Password
```
POST /auth/change-password
Authorization: Bearer {{accessToken}}

{
  "currentPassword": "Admin@123",
  "newPassword": "NewPass@456"
}
```

---

## 2. DASHBOARD (3 endpoints)

### 2.1 Summary
```
GET /dashboard/summary
```
Expected: Thong ke tong quan (subject count, event count, alert count, case count)

### 2.2 Open Alerts
```
GET /dashboard/alerts/open?limit=10
```

### 2.3 Recent Events
```
GET /dashboard/events/recent?limit=10
```

---

## 3. SUBJECTS (11 endpoints)

### 3.1 List Subjects
```
GET /subjects?page=1&limit=20
```

### 3.2 Get Subject Detail
```
GET /subjects/d1000000-0000-0000-0000-000000000001
```

### 3.3 Create Subject
```
POST /subjects

{
  "full_name": "Nguyen Test User",
  "cccd": "001234567890",
  "date_of_birth": "1990-01-15",
  "gender": "MALE",
  "address": "123 Phuong Bach Khoa, HBT, Ha Noi",
  "phone": "0901234567",
  "area_id": "a1000000-0000-0000-0000-000000000010",
  "ethnicity": "Kinh",
  "permanent_address": "123 Phuong Bach Khoa",
  "notes": "Test subject",
  "family": {
    "contact_name": "Nguyen Van A",
    "contact_phone": "0912345678",
    "address": "456 Bach Khoa",
    "notes": "Bo"
  },
  "legal": {
    "document_number": "QD-2026-001",
    "document_date": "2026-01-01",
    "authority": "Cong an Quan HBT",
    "management_duration": "12 thang",
    "start_date": "2026-01-01",
    "end_date": "2027-01-01",
    "reason": "Quan ly theo QD"
  }
}
```
Expected: `201`

### 3.4 Update Subject
```
PATCH /subjects/{{subject_id}}

{
  "phone": "0909876543",
  "notes": "Updated notes"
}
```

### 3.5 Subject Timeline
```
GET /subjects/d1000000-0000-0000-0000-000000000001/timeline
```

### 3.6 Subject Devices
```
GET /subjects/d1000000-0000-0000-0000-000000000001/devices
```

### 3.7 Subject Documents
```
GET /subjects/d1000000-0000-0000-0000-000000000001/documents
```

### 3.8 List Scenarios (for subject assignment)
```
GET /subjects/scenarios
```

### 3.9 Check CCCD
```
GET /subjects/check-cccd?cccd=001099012345
```

### 3.10 Assign Scenario
```
POST /subjects/d1000000-0000-0000-0000-000000000001/assign-scenario

{
  "scenario_id": "b1000000-0000-0000-0000-000000000001"
}
```

### 3.11 Unassign Scenario
```
POST /subjects/d1000000-0000-0000-0000-000000000001/unassign-scenario

{
  "scenario_id": "b1000000-0000-0000-0000-000000000001"
}
```

### 3.12 Export
```
GET /subjects/export
```

---

## 4. EVENTS (5 endpoints)

### 4.1 List Events
```
GET /events?page=1&limit=20
```
Filters (tat ca optional):
```
GET /events?subject_id=d1000000-0000-0000-0000-000000000001&type=CHECK_IN&result=SUCCESS&from=2026-02-20&to=2026-03-21&sort=created_at&order=desc
```

### 4.2 Event Detail
```
GET /events/10000001-0001-0000-0000-000000000001
```

### 4.3 Recent Events
```
GET /events/recent?limit=10
```

### 4.4 Trace (Tim kiem theo CCCD)
```
GET /events/trace?cccd=001204012345
```
Response tra ve thong tin doi tuong + tat ca event co GPS.
CCCD seed data: `001204012345`, `001304056789`, `001204098765`, `001304111222`, `001204333444`, `001304555666`

### 4.5 Export Excel
```
GET /events/export
```
Filters giong nhu list (type, result, from, to...). Response la file `.xlsx`.

---

## 5. ALERTS (7 endpoints)

### 5.1 List Alerts
```
GET /alerts?page=1&limit=20
```
Filters (tat ca optional):
```
GET /alerts?status=OPEN&level=CAO&source=DEFAULT&subject_id=d1000000-0000-0000-0000-000000000001&from=2026-03-01&to=2026-03-21&sort=created_at&order=desc
```
**Status values:** OPEN, ACKNOWLEDGED, RESOLVED, ESCALATED
**Level values:** THAP, TRUNG_BINH, CAO, KHAN_CAP
**Source values:** DEFAULT, CUSTOM

### 5.2 Open Alerts
```
GET /alerts/open?limit=10
```

### 5.3 Alert Detail
```
GET /alerts/20000001-0000-0000-0000-000000000008
```

### 5.4 Acknowledge Alert
```
PATCH /alerts/20000001-0000-0000-0000-000000000008/acknowledge
```
Expected: Chi acknowledge duoc alert co status = OPEN

### 5.5 Resolve Alert
```
PATCH /alerts/20000001-0000-0000-0000-000000000004/resolve
```
Expected: Resolve alert OPEN hoac ACKNOWLEDGED

### 5.6 Escalate Alert (tao Case tu Alert)
```
POST /alerts/20000001-0000-0000-0000-000000000016/escalate

{
  "reason": "Doi tuong co bieu hien bat thuong, can xu ly gap"
}
```
Expected: Tao case moi tu alert, alert status -> ESCALATED

### 5.7 Export Excel
```
GET /alerts/export
```
Filters giong nhu list (status, level, source, from, to...). Response la file `.xlsx`.

---

## 6. CASES (8 endpoints)

### 6.1 List Cases
```
GET /cases?page=1&limit=20
```
Filters (tat ca optional):
```
GET /cases?status=OPEN&severity=CAO&source=AUTO&subject_id=d1000000-0000-0000-0000-000000000001&from=2026-03-01&to=2026-03-21&sort=created_at&order=desc
```
**Status values:** OPEN, CLOSED
**Severity values:** THAP, TRUNG_BINH, CAO, KHAN_CAP
**Source values:** AUTO, MANUAL_ESCALATE, MANUAL_NEW

### 6.2 Case Detail
```
GET /cases/30000001-0000-0000-0000-000000000001
```

### 6.3 Create Case (Manual)
```
POST /cases

{
  "subject_id": "d1000000-0000-0000-0000-000000000002",
  "severity": "CAO",
  "description": "Doi tuong vi pham dieu kien quan ly"
}
```

### 6.4 Close Case
```
PATCH /cases/30000001-0000-0000-0000-000000000001/close

{
  "closing_note": "Da xu ly xong, doi tuong cam ket thuc hien dung quy dinh"
}
```
Expected: Chi dong duoc case OPEN

### 6.5 Reopen Case (tao case moi lien ket)
```
POST /cases/30000001-0000-0000-0000-000000000003/reopen
```
Expected: Chi reopen case CLOSED. Tao case moi voi related_case_id = case cu

### 6.6 Get Case Notes
```
GET /cases/30000001-0000-0000-0000-000000000001/notes
```

### 6.7 Add Case Note
```
POST /cases/30000001-0000-0000-0000-000000000001/notes

{
  "content": "Da lien he voi doi tuong qua dien thoai, hen gap truc tiep ngay mai"
}
```

### 6.8 Export Excel
```
GET /cases/export
```
Filters giong nhu list (status, severity, source, from, to...). Response la file `.xlsx`.

---

## 7. SCENARIOS (6 endpoints)

### 7.1 List Scenarios
```
GET /scenarios?page=1&limit=20
```

### 7.2 Scenario Detail
```
GET /scenarios/b1000000-0000-0000-0000-000000000001
```

### 7.3 Create Scenario
```
POST /scenarios

{
  "name": "Kich ban giam sat khu vuc moi",
  "description": "Ap dung cho doi tuong moi tiep nhan",
  "scope": "DISTRICT",
  "checkin_frequency": "DAILY",
  "checkin_window_start": "07:00",
  "checkin_window_end": "21:00",
  "grace_period_days": 3,
  "face_threshold": 85,
  "nfc_required": true,
  "fallback_allowed": false,
  "geofence_id": "f1000000-0000-0000-0000-000000000001",
  "curfew_start": "22:00",
  "curfew_end": "05:00",
  "travel_approval_required": true,
  "travel_threshold_days": 3,
  "effective_from": "2026-04-01",
  "effective_to": "2026-12-31"
}
```

### 7.4 Update Scenario
```
PATCH /scenarios/{{new_scenario_id}}

{
  "grace_period_days": 5,
  "face_threshold": 90
}
```

### 7.5 Update Scenario Status
```
PATCH /scenarios/{{new_scenario_id}}/status

{
  "status": "ACTIVE"
}
```

### 7.6 Delete Scenario
```
DELETE /scenarios/{{new_scenario_id}}
```

---

## 8. ALERT RULES - Event -> Alert (6 endpoints)

### 8.1 List Alert Rules (theo scenario)
```
GET /alert-rules?scenario_id=b1000000-0000-0000-0000-000000000001&limit=100
```
Filters optional:
```
GET /alert-rules?scenario_id=...&source=DEFAULT&is_active=true
```

### 8.2 Alert Rule Detail
```
GET /alert-rules/c1000000-0000-0000-0000-000000000001
```

### 8.3 Create Custom Alert Rule
```
POST /alert-rules

{
  "scenario_id": "b1000000-0000-0000-0000-000000000001",
  "name": "Canh bao vi pham khu vuc 2 lan",
  "event_type": "GEOFENCE_VIOLATION",
  "condition_operator": ">=",
  "condition_value": 2,
  "condition_window_days": 7,
  "alert_level": "CAO",
  "notification_channels": ["PUSH"],
  "is_active": true
}
```
**event_type values:** CHECK_IN, CHECKIN_OVERDUE, SEVERE_OVERDUE, FACE_MISMATCH, NFC_FAIL, NFC_MISMATCH, GEOFENCE_VIOLATION
**condition_operator values:** >=, <=, ==, >, <
**alert_level values:** THAP, TRUNG_BINH, CAO, KHAN_CAP

### 8.4 Update Alert Rule
```
PATCH /alert-rules/{{new_rule_id}}

{
  "name": "Cap nhat ten quy tac",
  "condition_value": 3,
  "alert_level": "KHAN_CAP"
}
```
Luu y: Quy tac DEFAULT chi cho sua: condition_value, condition_window_days, alert_level, is_active, notification_channels

### 8.5 Toggle Alert Rule
```
PATCH /alert-rules/c1000000-0000-0000-0000-000000000001/toggle
```
Expected: Bat/tat quy tac

### 8.6 Delete Alert Rule
```
DELETE /alert-rules/{{new_rule_id}}
```
Expected: Chi xoa duoc quy tac CUSTOM (is_deletable = true). DEFAULT rules khong xoa duoc.

---

## 9. ESCALATION RULES - Alert -> Case (6 endpoints)

### 9.1 List Escalation Rules (theo scenario)
```
GET /escalation-rules?scenario_id=b1000000-0000-0000-0000-000000000001&limit=100
```
Filters optional:
```
GET /escalation-rules?scenario_id=...&source=DEFAULT&is_active=true
```

### 9.2 Escalation Rule Detail
```
GET /escalation-rules/d1000000-0000-0000-0000-000000000001
```

### 9.3 Create Custom Escalation Rule
```
POST /escalation-rules

{
  "scenario_id": "b1000000-0000-0000-0000-000000000001",
  "name": "3 canh bao sai mat lien tiep tao vu viec",
  "alert_type": "FACE_MISMATCH_STREAK",
  "alert_level_filter": "TRUNG_BINH",
  "condition_operator": ">=",
  "condition_value": 3,
  "condition_window_days": 7,
  "condition_consecutive": true,
  "case_severity": "CAO",
  "case_description_tpl": "Tu dong tao vu viec: 3 canh bao sai khuon mat lien tiep",
  "notification_channels": ["PUSH"],
  "auto_assign": false,
  "is_active": true
}
```
**alert_type values:** * (tat ca), OVERDUE, FACE_MISMATCH_STREAK, SEVERE_OVERDUE, NFC_CCCD_MISMATCH, GEOFENCE_VIOLATION
**alert_level_filter values (optional):** THAP, TRUNG_BINH, CAO, KHAN_CAP (chi dem canh bao tu muc nay tro len)
**case_severity values:** THAP, TRUNG_BINH, CAO, KHAN_CAP
**condition_operator values:** >=, <=, ==, >, <

### 9.4 Update Escalation Rule
```
PATCH /escalation-rules/{{new_esc_rule_id}}

{
  "condition_value": 5,
  "case_severity": "KHAN_CAP"
}
```
Luu y: Quy tac DEFAULT chi cho sua: condition_value, condition_window_days, case_severity, is_active, alert_level_filter, notification_channels

### 9.5 Toggle Escalation Rule
```
PATCH /escalation-rules/d1000000-0000-0000-0000-000000000001/toggle
```

### 9.6 Delete Escalation Rule
```
DELETE /escalation-rules/{{new_esc_rule_id}}
```
Expected: Chi xoa duoc quy tac CUSTOM. DEFAULT rules khong xoa duoc.

---

## 10. GEOFENCES (7 endpoints)

### 10.1 List Geofences
```
GET /geofences?page=1&limit=20
```

### 10.2 Geofence Detail
```
GET /geofences/f1000000-0000-0000-0000-000000000001
```

### 10.3 Create Geofence
```
POST /geofences

{
  "name": "Khu vuc Bach Khoa moi",
  "address": "1 Dai Co Viet, Bach Khoa, HBT",
  "center_lat": 21.0048,
  "center_lng": 105.8473,
  "radius": 500,
  "area_id": "a1000000-0000-0000-0000-000000000010"
}
```

### 10.4 Update Geofence
```
PATCH /geofences/{{geofence_id}}

{
  "radius": 800,
  "is_active": true
}
```

### 10.5 Delete Geofence
```
DELETE /geofences/{{geofence_id}}
```

### 10.6 Geocode
```
GET /geofences/geocode?address=Bach%20Khoa%20Ha%20Noi
```

### 10.7 Check Point in Geofence
```
POST /geofences/f1000000-0000-0000-0000-000000000001/check-point

{
  "lat": 21.0048,
  "lng": 105.8473
}
```

---

## 11. AREAS (1 endpoint)

### 11.1 List Areas
```
GET /areas
```

---

## Kiem tra loi thuong gap

### UUID Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["scenario_id must be a UUID"]
  }
}
```
-> Kiem tra UUID co dung dinh dang hex: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Unauthorized
```json
{
  "success": false,
  "error": { "code": "INVALID_CREDENTIALS", "message": "Unauthorized" }
}
```
-> Token het han. Goi POST /auth/refresh de lay token moi.

### Forbidden - Business Rule
```json
{
  "success": false,
  "error": { "code": "BAD_REQUEST", "message": "Chi co the dong vu viec dang mo." }
}
```
-> Kiem tra trang thai hien tai truoc khi thao tac.

---

## Luong test toan bo (end-to-end)

### Luong 1: Event -> Alert Rule -> Alert -> Case
1. `GET /scenarios` -> lay scenario_id
2. `GET /alert-rules?scenario_id=...` -> xem 4 quy tac mac dinh
3. `POST /alert-rules` -> tao quy tac tuy chinh (VD: >= 2 GEOFENCE_VIOLATION trong 7 ngay -> CAO)
4. `GET /events?subject_id=...` -> xem su kien da co
5. `GET /alerts?subject_id=...` -> xem canh bao duoc tao tu quy tac

### Luong 2: Alert -> Escalation Rule -> Case
1. `GET /escalation-rules?scenario_id=...` -> xem 2 quy tac mac dinh
2. `POST /escalation-rules` -> tao quy tac tuy chinh (VD: >= 3 canh bao FACE_MISMATCH lien tiep -> tao Case CAO)
3. `GET /alerts` -> xem canh bao
4. `POST /alerts/:id/escalate` -> thu escalate thu cong 1 alert -> case duoc tao

### Luong 3: Xu ly Case
1. `GET /cases` -> danh sach vu viec
2. `GET /cases/:id` -> chi tiet (co notes)
3. `POST /cases/:id/notes` -> them ghi chu
4. `PATCH /cases/:id/close` -> dong vu viec
5. `POST /cases/:id/reopen` -> mo lai (tao case moi lien ket)

### Luong 4: Quan ly quy tac
1. `POST /alert-rules` -> tao moi
2. `PATCH /alert-rules/:id` -> sua
3. `PATCH /alert-rules/:id/toggle` -> bat/tat
4. `DELETE /alert-rules/:id` -> xoa (chi CUSTOM)
5. Tuong tu voi `/escalation-rules`

### Luong 5: Truy vet doi tuong
1. `GET /events/trace?cccd=001204012345` -> tra ve thong tin "Nguyen Van Hung" + 10 events voi GPS
2. `GET /events/trace?cccd=001304056789` -> "Tran Thi Mai" + events
3. `GET /events/trace?cccd=999999999999` -> 404 Not Found (khong co doi tuong)

### Luong 6: Export Excel
1. `GET /events/export` -> tai file su-kien-YYYY-MM-DD.xlsx
2. `GET /alerts/export` -> tai file canh-bao-YYYY-MM-DD.xlsx
3. `GET /cases/export` -> tai file vu-viec-YYYY-MM-DD.xlsx
4. `GET /subjects/export` -> tai file (da co tu truoc)
5. Tat ca deu ho tro filters giong list tuong ung
