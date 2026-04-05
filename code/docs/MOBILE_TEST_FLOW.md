# SMTTS Mobile App — Luồng Test

## 1. Chuẩn bị môi trường

### 1.1 Khởi động services

```bash
# 1. Docker containers (PostgreSQL + Redis)
docker start smtts-postgres-main smtts-postgres-biometric smtts-redis

# 2. Backend NestJS
cd code/backend
npm run start:dev
# Server chạy tại http://localhost:3001

# 3. Mobile app — chỉnh API_BASE_URL trong build.gradle.kts
# Nếu test trên emulator: http://10.0.2.2:3001/api/v1/
# Nếu test trên thiết bị thật (cùng WiFi): http://<IP_MÁY>:3001/api/v1/
```

### 1.2 Seed data đã nhập

File: `code/scripts/migrations/010_seed_mobile_test_data.sql`

| Dữ liệu | Số lượng | Chi tiết |
|----------|----------|---------|
| Subjects | 2 | HS-2026-0001 (tài khoản của bạn) + HS-2026-TEST |
| Kịch bản | 1 | KB-001 "Kịch bản Tiêu chuẩn" — check-in DAILY 06:00-22:00 |
| Geofence | 1 | GF-Q1-001 — Vùng tròn bán kính 2km tại Quận 1 |
| Gia đình | 2 | Mỗi đối tượng 1 bản ghi |
| Pháp lý | 2 | Mỗi đối tượng 1 bản ghi |
| Thiết bị | 3 | Test subject: 1 ACTIVE + 1 REPLACED; Bạn: 1 ACTIVE |
| Tài liệu | 6 | Test subject: 2 PDF + 2 ảnh; Bạn: 1 PDF + 1 ảnh |
| Events | 20 | Test subject: 15 events (đa dạng); Bạn: 5 check-in |
| Alerts | 2 | 1 OVERDUE + 1 FACE_MISMATCH (đã resolved) |

### 1.3 Tài khoản test

| Tài khoản | Username | Password | Mô tả |
|-----------|----------|----------|-------|
| Test subject | `079200099001` | `Test@123` | Đối tượng test có đầy đủ dữ liệu |
| Tài khoản bạn | `001204003816` | *(mật khẩu bạn đã đặt khi kích hoạt)* | Đối tượng thật HS-2026-0001 |

---

## 2. Luồng test theo chức năng

### SA-01: Đăng nhập

**Bước test:**
1. Mở app, nhập username `079200099001` và password `Test@123`
2. Nhấn "Đăng nhập"

**Kết quả mong đợi:**
- Đăng nhập thành công, chuyển đến màn hình Dashboard (MainActivity)
- Header hiển thị "Xin chào, Trần Minh Tuấn"

**Test case bổ sung:**
- Nhập sai mật khẩu → Hiển thị lỗi "Tên đăng nhập hoặc mật khẩu không đúng"
- Để trống username → Hiển thị lỗi validation

---

### SA-05: Hồ sơ cá nhân (ProfileActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Hồ sơ cá nhân"

**Kết quả mong đợi:**
- **Thông tin cơ bản:** Trần Minh Tuấn, 15/06/1995, Nam, Kinh
- **Địa chỉ:** 100 Nguyễn Trãi, Quận 1, TP.HCM
- **HKTT:** 25 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM
- **SĐT:** 0912345678
- **Khu vực quản lý:** Quận 1 (DISTRICT)
- **Trạng thái:** Đang quản lý (status = ACTIVE → lifecycle = DANG_QUAN_LY)
- **Kịch bản:** "Kịch bản Tiêu chuẩn" — Hàng ngày
- **Tỷ lệ chấp hành:** 85.50% — Tốt
- **Cán bộ phụ trách:** Trần Thị Quản Lý
- **Thông tin gia đình:**
  - Cha: Trần Văn Bình
  - Mẹ: Nguyễn Thị Lan
  - Vợ/chồng: Lê Thị Hương
  - Người phụ thuộc: 2
- **Thông tin pháp lý:**
  - Số QĐ: QĐ-2025/CA-Q1-0042
  - Loại: QUAN_CHE
  - Thời hạn: 01/01/2026 - 01/01/2027
  - Cơ quan: Công an Quận 1, TP.HCM

---

### SA-06: Lịch sử check-in (HistoryActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Lịch sử"

**Kết quả mong đợi:**
- Hiển thị danh sách 15 events, sắp xếp mới nhất trước
- Các loại event đa dạng:
  - 10x CHECKIN (SUCCESS) — icon xanh lá
  - 1x CHECKIN_OVERDUE (WARNING) — icon vàng
  - 1x FACE_MISMATCH (FAILED) — icon đỏ
  - 1x GEOFENCE_VIOLATION (WARNING) — icon vàng
  - 1x NFC_FAIL (FAILED) — icon đỏ
  - 1x CHECKIN (SUCCESS) — gần nhất 03/03/2026
- Mỗi item hiển thị: loại event, kết quả, thời gian, tọa độ GPS

---

### SA-07: Vùng giám sát / Geofence (GeofenceActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Vùng giám sát"

**Kết quả mong đợi:**
- Hiển thị thông tin geofence từ kịch bản được gán:
  - Tên: "Khu vực cư trú Quận 1"
  - Loại: Hình tròn (CIRCLE)
  - Bán kính: 2000m
  - Tâm: 10.7731, 106.6980
  - Địa chỉ: 100 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM
- Bản đồ hiển thị vùng tròn (nếu có Google Maps API key)
- Nút "Kiểm tra vị trí" → gọi POST check-point API

---

### SA-08: Thông báo (NotificationActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Thông báo"

**Kết quả mong đợi:**
- Hiển thị trạng thái "Không có thông báo" (empty state)
- Lý do: Backend chưa có module notifications riêng

---

### SA-09: Yêu cầu (RequestListActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Yêu cầu"

**Kết quả mong đợi:**
- Hiển thị trạng thái "Không có yêu cầu" (empty state)
- Lý do: Backend chưa có module requests riêng

---

### SA-10: Quản lý thiết bị (DeviceActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Thiết bị"

**Kết quả mong đợi:**
- **Thiết bị hiện tại:**
  - Model: Samsung Galaxy A54
  - OS: Android 14
  - Mã thiết bị: android-current-device-002
  - Trạng thái: ACTIVE
  - Ngày đăng ký: 20/02/2026
- **Lưu ý:** Hiển thị ghi chú "Mỗi đối tượng chỉ được sử dụng 1 thiết bị..."
- **Nút "Yêu cầu đổi thiết bị"**: có mặt (chuyển sang màn hình tạo yêu cầu)
- **Lịch sử thiết bị:** 1 bản ghi
  - Samsung Galaxy A34, Android 13, REPLACED, đã thay thế 20/02/2026

---

### SA-11: Tài liệu (DocumentActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Tài liệu"

**Kết quả mong đợi:**
- **Tài liệu pháp lý (2 files):**
  - QD-2025-CA-Q1-0042.pdf (512 KB)
  - Ban-cam-ket-chap-hanh.pdf (250 KB)
- **Hình ảnh (2 files):**
  - anh-chan-dung.jpg (180 KB)
  - anh-xac-minh-noi-cu-tru.jpg (240 KB)
- Nhấn vào file → mở bằng trình xem bên ngoài (lưu ý: file thực tế chưa có trên server, sẽ báo lỗi 404 khi mở — đây là seed data giả)

---

### SA-12: Liên hệ cán bộ (ContactActivity)

**Bước test:**
1. Từ Dashboard, nhấn card "Liên hệ"

**Kết quả mong đợi:**
- **Cán bộ phụ trách:** Trần Thị Quản Lý
- **Khu vực quản lý:** Quận 1
- **Đường dây nóng:** hiển thị số hotline (nếu có trong strings.xml)
- Nhấn nút gọi → mở ứng dụng gọi điện

---

### SA-14: Cài đặt & Bảo mật (SettingsActivity)

**Bước test:**

#### 14a. Đổi mật khẩu
1. Từ Dashboard, nhấn card "Cài đặt"
2. Nhấn "Đổi mật khẩu"
3. Nhập mật khẩu hiện tại: `Test@123`
4. Nhập mật khẩu mới: `NewPass@456`
5. Xác nhận mật khẩu mới: `NewPass@456`
6. Nhấn "Xác nhận"

**Kết quả mong đợi:**
- Hiển thị thông báo "Đổi mật khẩu thành công"
- Đăng nhập lại với mật khẩu mới `NewPass@456` phải thành công
- (Nhớ đổi lại `Test@123` sau khi test)

#### 14b. Phiên bản ứng dụng
- Hiển thị version: 1.0 (hoặc giá trị từ BuildConfig)

#### 14c. Đăng xuất
1. Nhấn "Đăng xuất"
2. Xác nhận đăng xuất

**Kết quả mong đợi:**
- Xóa token, chuyển về màn hình đăng nhập
- Không thể quay lại Dashboard bằng nút Back

---

## 3. Lưu ý khi test

### 3.1 API_BASE_URL
- **Emulator:** `http://10.0.2.2:3001/api/v1/` (10.0.2.2 = localhost của máy host)
- **Thiết bị thật:** `http://<IP_WIFI_MÁY_TÍNH>:3001/api/v1/`
- Cấu hình tại: `app/build.gradle.kts` → `buildConfigField("String", "API_BASE_URL", ...)`

### 3.2 Chức năng chưa test được (bỏ qua)
- **NFC & Khuôn mặt:** Yêu cầu thiết bị thật có NFC + camera, sẽ bổ sung sau
- **Thông báo push:** Backend chưa có module notifications
- **Yêu cầu (requests):** Backend chưa có module requests
- **Tải file thực:** Files trong seed là metadata giả, file thực chưa tồn tại trên disk

### 3.3 Luồng kiểm tra nhanh (Happy Path)

```
Đăng nhập (079200099001 / Test@123)
  → Dashboard hiển thị đầy đủ 9 cards
  → Hồ sơ: thông tin đầy đủ, gia đình, pháp lý, kịch bản
  → Lịch sử: 15 events đa dạng
  → Vùng giám sát: geofence hình tròn Q1
  → Thông báo: empty state (bình thường)
  → Yêu cầu: empty state (bình thường)
  → Thiết bị: 1 active + 1 history
  → Tài liệu: 2 PDF + 2 ảnh
  → Liên hệ: Trần Thị Quản Lý, Q1
  → Cài đặt: đổi mật khẩu, version, đăng xuất
```

---

## 4. Chạy lại seed (nếu cần)

```bash
# Xóa toàn bộ dữ liệu test và chạy lại
PGPASSWORD=smtts_secret_2026 psql -h localhost -p 5434 -U smtts_user -d smtts_main -c "
  DELETE FROM alerts;
  DELETE FROM events;
  DELETE FROM files WHERE entity_type = 'SUBJECT';
  DELETE FROM devices;
  DELETE FROM scenario_assignments;
  DELETE FROM subject_families;
  DELETE FROM subject_legals;
  DELETE FROM alert_rules;
  DELETE FROM management_scenarios;
  DELETE FROM geofences;
"

# Chạy seed lại
PGPASSWORD=smtts_secret_2026 psql -h localhost -p 5434 -U smtts_user -d smtts_main \
  -f code/scripts/migrations/010_seed_mobile_test_data.sql
```
