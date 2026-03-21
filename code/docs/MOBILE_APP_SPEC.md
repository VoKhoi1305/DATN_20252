# Tài liệu phát triển ứng dụng di động SMTTS

> **Hệ thống Quản lý, Theo dõi và Truy vết Đối tượng**
> Ứng dụng dành cho **đối tượng bị quản lý** — thực hiện điểm danh trực tuyến, quản lý thông tin cá nhân và gửi yêu cầu.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Công nghệ & Yêu cầu kỹ thuật](#2-công-nghệ--yêu-cầu-kỹ-thuật)
3. [Kiến trúc ứng dụng](#3-kiến-trúc-ứng-dụng)
4. [SA-01: Đăng nhập](#4-sa-01-đăng-nhập)
5. [SA-02: Đăng ký & Kích hoạt lần đầu](#5-sa-02-đăng-ký--kích-hoạt-lần-đầu)
6. [SA-03: Trang chủ](#6-sa-03-trang-chủ)
7. [SA-04: Điểm danh trực tuyến](#7-sa-04-điểm-danh-trực-tuyến)
8. [SA-05: Thông tin quản lý cá nhân](#8-sa-05-thông-tin-quản-lý-cá-nhân)
9. [SA-06: Khu vực quản lý](#9-sa-06-khu-vực-quản-lý)
10. [SA-07: Lịch sử điểm danh](#10-sa-07-lịch-sử-điểm-danh)
11. [SA-08: Thông báo](#11-sa-08-thông-báo)
12. [SA-09: Gửi yêu cầu & Phê duyệt](#12-sa-09-gửi-yêu-cầu--phê-duyệt)
13. [SA-10: Quản lý thiết bị](#13-sa-10-quản-lý-thiết-bị)
14. [SA-11: Tài liệu cá nhân](#14-sa-11-tài-liệu-cá-nhân)
15. [SA-12: Liên hệ cán bộ](#15-sa-12-liên-hệ-cán-bộ)
16. [SA-13: Hướng dẫn sử dụng](#16-sa-13-hướng-dẫn-sử-dụng)
17. [SA-14: Cài đặt & Bảo mật](#17-sa-14-cài-đặt--bảo-mật)
18. [Tích hợp API Backend](#18-tích-hợp-api-backend)
19. [Bảo mật & Quyền riêng tư](#19-bảo-mật--quyền-riêng-tư)
20. [Xử lý lỗi & Offline](#20-xử-lý-lỗi--offline)
21. [Phụ lục: Cấu trúc dữ liệu](#21-phụ-lục-cấu-trúc-dữ-liệu)

---

## 1. Tổng quan

### Mục đích

Ứng dụng di động SMTTS dành cho **đối tượng bị quản lý** (người phải thực hiện trình diện/điểm danh theo quy định). App cho phép đối tượng:

- Thực hiện điểm danh trực tuyến qua **4 yếu tố xác thực** (NFC + Khuôn mặt + GPS + Thời gian)
- Xem thông tin quản lý của mình bằng ngôn ngữ dễ hiểu
- Xem khu vực được phép sinh sống/di chuyển
- Gửi yêu cầu xin phép (đi xa, đổi thiết bị, thay đổi địa chỉ...)
- Nhận thông báo nhắc nhở từ hệ thống

### Đối tượng sử dụng

Người dùng app là **người bị quản lý** — có thể có trình độ học vấn hạn chế. Do đó giao diện cần:

- **Ngôn ngữ đơn giản, rõ ràng** — tránh thuật ngữ kỹ thuật/pháp lý phức tạp
- **Chữ to, nút bấm lớn** — dễ thao tác trên mọi thiết bị
- **Biểu tượng trực quan** kèm theo chữ — không chỉ dùng icon
- **Ít bước thao tác nhất có thể** cho mỗi chức năng
- **Màu sắc phân biệt rõ ràng** — xanh = tốt, đỏ = cần chú ý, vàng = cảnh báo

### Ngôn ngữ

- Giao diện: **Tiếng Việt** hoàn toàn
- Code & API: **Tiếng Anh**

---

## 2. Công nghệ & Yêu cầu kỹ thuật

### Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Nền tảng | Android native |
| Ngôn ngữ | Kotlin |
| Minimum SDK | Android 8.0 (API 26) |
| Target SDK | Android 14 (API 34) |
| Kiến trúc | MVVM + Clean Architecture |
| DI | Hilt (Dagger) |
| Network | Retrofit + OkHttp |
| Database local | Room |
| Camera | CameraX |
| NFC | Android NFC API |
| AI (on-device) | TensorFlow Lite (Face Detection + Liveness) |
| AI (server) | Face Recognition matching chạy trên server |
| GPS | Google Play Services Location |
| Push | Firebase Cloud Messaging (FCM) |
| Bảo mật | AndroidKeystore, EncryptedSharedPreferences |

### Quyền hệ thống cần thiết

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.NFC" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<uses-feature android:name="android.hardware.nfc" android:required="true" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
```

---

## 3. Kiến trúc ứng dụng

### Sơ đồ module

```
app/
├── data/
│   ├── api/              # Retrofit interfaces, interceptors
│   ├── local/            # Room database, DAO
│   ├── model/            # Data models (DTO, Entity)
│   └── repository/       # Repository implementations
├── domain/
│   ├── model/            # Domain models
│   ├── repository/       # Repository interfaces
│   └── usecase/          # Business logic use cases
├── presentation/
│   ├── auth/             # Đăng nhập, đăng ký
│   ├── home/             # Trang chủ
│   ├── checkin/          # Điểm danh (NFC + Face + GPS)
│   ├── profile/          # Thông tin cá nhân
│   ├── area/             # Khu vực quản lý
│   ├── history/          # Lịch sử điểm danh
│   ├── notification/     # Thông báo
│   ├── request/          # Gửi yêu cầu
│   ├── device/           # Quản lý thiết bị
│   ├── document/         # Tài liệu cá nhân
│   ├── contact/          # Liên hệ cán bộ
│   ├── guide/            # Hướng dẫn sử dụng
│   └── settings/         # Cài đặt
├── biometric/
│   ├── face/             # TFLite face detection + liveness
│   ├── nfc/              # NFC CCCD reading
│   └── manager/          # BiometricManager tổng hợp
├── location/
│   └── LocationProvider  # GPS tracking khi điểm danh
├── notification/
│   └── FCMService        # Firebase push notification
└── util/
    ├── security/         # Encryption, secure storage
    ├── network/          # Connectivity check
    └── extensions/       # Kotlin extensions
```

### Luồng dữ liệu

```
UI (Fragment/Compose) → ViewModel → UseCase → Repository → API (Retrofit)
                                                         → Local DB (Room)
```

### Kết nối Backend

- **Base URL:** `https://<server>/api/v1`
- **Auth:** JWT Bearer token + Refresh token rotation
- **Response format:** `{ success: boolean, data: <payload>, timestamp: string }`

---

## 4. SA-01: Đăng nhập

### Mô tả

Đối tượng đăng nhập vào app bằng tài khoản đã được cán bộ tạo sẵn trong hệ thống.

### Giao diện

```
┌──────────────────────────────┐
│                              │
│        [Logo SMTTS]          │
│                              │
│   Tên đăng nhập              │
│   ┌────────────────────────┐ │
│   │                        │ │
│   └────────────────────────┘ │
│                              │
│   Mật khẩu                   │
│   ┌────────────────────────┐ │
│   │                    [👁] │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │     ĐĂNG NHẬP          │ │
│   └────────────────────────┘ │
│                              │
│   Quên mật khẩu?            │
│   → Liên hệ cán bộ phụ trách│
│                              │
└──────────────────────────────┘
```

### Luồng xử lý

1. Người dùng nhập **tên đăng nhập** + **mật khẩu**
2. Gọi `POST /api/v1/auth/login` → nhận `access_token` + `refresh_token`
3. Lưu token vào **EncryptedSharedPreferences**
4. Kiểm tra `role === 'SUBJECT'` — nếu không, báo lỗi "Tài khoản không hợp lệ cho ứng dụng này"
5. Nếu đăng nhập lần đầu hoặc chưa đăng ký thiết bị → chuyển sang **SA-02** (kích hoạt)
6. Nếu đã kích hoạt → chuyển sang **Trang chủ**

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/login` | Đăng nhập, nhận JWT |
| POST | `/auth/refresh` | Làm mới access token |
| POST | `/auth/logout` | Đăng xuất, thu hồi token |

### Xử lý lỗi

| Lỗi | Hiển thị |
|------|----------|
| Sai mật khẩu | "Tên đăng nhập hoặc mật khẩu không đúng. Bạn còn X lần thử" |
| Tài khoản bị khóa | "Tài khoản đã bị khóa. Vui lòng liên hệ cán bộ phụ trách" |
| Không có mạng | "Không có kết nối mạng. Vui lòng kiểm tra WiFi hoặc dữ liệu di động" |
| Đăng nhập quá 5 lần sai | Khóa 15 phút, hiển thị đếm ngược |

### Quy tắc nghiệp vụ

- Đối tượng **không có OTP** (OTP chỉ dành cho cán bộ)
- Quên mật khẩu phải đến gặp cán bộ trực tiếp để reset (SBR: xác minh danh tính trực tiếp)
- Mỗi lần đăng nhập, ghi lại `device_id` + `device_info` để so sánh với thiết bị đã đăng ký

---

## 5. SA-02: Đăng ký & Kích hoạt lần đầu

### Mô tả

Khi đối tượng đăng nhập **lần đầu tiên**, cần thực hiện quy trình kích hoạt dưới sự giám sát của cán bộ. Quy trình này bao gồm đăng ký thiết bị, xác minh CCCD qua NFC, và đăng ký sinh trắc học (khuôn mặt).

### Điều kiện tiên quyết

- Cán bộ đã tạo hồ sơ đối tượng trên web (bao gồm số CCCD)
- Cán bộ đã tạo tài khoản `SUBJECT` liên kết với hồ sơ
- Đối tượng và cán bộ **cùng có mặt trực tiếp**

### Luồng kích hoạt (5 bước)

```
Bước 1: Đổi mật khẩu       ← Bắt buộc đổi mật khẩu mặc định
    ↓
Bước 2: Đăng ký thiết bị   ← Ghi nhận device_id, model, OS
    ↓
Bước 3: Xác minh CCCD (NFC) ← Đặt thẻ CCCD lên điện thoại
    ↓
Bước 4: Chụp khuôn mặt     ← 3 ảnh (thẳng, trái, phải) + liveness
    ↓
Bước 5: Xác nhận hoàn tất  ← Cán bộ xác nhận trên web
```

#### Bước 1: Đổi mật khẩu lần đầu

```
┌──────────────────────────────┐
│   BƯỚC 1/5 — ĐỔI MẬT KHẨU  │
│   ════════════════════════    │
│                              │
│   Mật khẩu hiện tại          │
│   ┌────────────────────────┐ │
│   │                        │ │
│   └────────────────────────┘ │
│                              │
│   Mật khẩu mới               │
│   ┌────────────────────────┐ │
│   │                        │ │
│   └────────────────────────┘ │
│   ⓘ Ít nhất 8 ký tự, có     │
│     chữ hoa, chữ thường     │
│     và số                    │
│                              │
│   Nhập lại mật khẩu mới     │
│   ┌────────────────────────┐ │
│   │                        │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │     TIẾP TỤC →         │ │
│   └────────────────────────┘ │
└──────────────────────────────┘
```

- Gọi `POST /auth/change-password`
- Validate: ≥ 8 ký tự, có chữ hoa + chữ thường + số

#### Bước 2: Đăng ký thiết bị

```
┌──────────────────────────────┐
│   BƯỚC 2/5 — THIẾT BỊ       │
│   ════════════════════════    │
│                              │
│   📱 Thông tin thiết bị       │
│                              │
│   Tên máy:  Samsung Galaxy.. │
│   Hệ điều hành: Android 14  │
│   Mã thiết bị: ******a1b2   │
│                              │
│   ⓘ Thiết bị này sẽ được    │
│     đăng ký làm máy điểm    │
│     danh của bạn. Nếu muốn  │
│     đổi máy sau, bạn cần    │
│     xin phép cán bộ.        │
│                              │
│   ┌────────────────────────┐ │
│   │  XÁC NHẬN THIẾT BỊ →   │ │
│   └────────────────────────┘ │
└──────────────────────────────┘
```

- Tự động thu thập: `device_id` (Android ID), `device_model`, `os_version`
- Gọi API đăng ký thiết bị → lưu vào bảng `devices` với `status = 'ACTIVE'`
- **Quy tắc:** Mỗi đối tượng chỉ được 1 thiết bị hoạt động. Đổi thiết bị cần phê duyệt

#### Bước 3: Xác minh CCCD qua NFC

```
┌──────────────────────────────┐
│   BƯỚC 3/5 — XÁC MINH CCCD  │
│   ════════════════════════    │
│                              │
│        ┌─────────────┐       │
│        │  [Hình minh │       │
│        │   họa đặt   │       │
│        │   thẻ CCCD  │       │
│        │   lên điện  │       │
│        │   thoại]    │       │
│        └─────────────┘       │
│                              │
│   Hãy đặt thẻ Căn cước      │
│   công dân lên mặt sau       │
│   điện thoại và giữ yên      │
│                              │
│   Trạng thái: Đang chờ...   │
│   ━━━━━━━░░░░░░░░░░░░ 30%   │
│                              │
│   Giữ thẻ yên, không nhấc   │
│   cho đến khi hoàn tất      │
│                              │
└──────────────────────────────┘
```

**Luồng NFC:**

1. Bật NFC reader, chờ phát hiện thẻ CCCD (ISO 14443)
2. Đọc chip NFC → lấy dữ liệu:
   - Số CCCD từ chip
   - Passive Authentication data (chữ ký số)
   - Chip serial number
3. So khớp số CCCD đọc từ chip với số CCCD đã lưu trên hệ thống (`cccd_hash`)
4. Gửi dữ liệu NFC lên server:
   ```json
   {
     "cccd_chip_hash": "sha256_hash_of_chip_data",
     "chip_serial": "ABC123...",
     "passive_auth_data": "base64_encoded..."
   }
   ```
5. Server lưu vào bảng `nfc_records` (biometric database)
6. Nếu khớp → ✅ "Xác minh CCCD thành công"
7. Nếu không khớp → ❌ "Số CCCD không khớp với hồ sơ. Vui lòng kiểm tra lại"

**Xử lý lỗi NFC:**

| Lỗi | Hiển thị |
|------|----------|
| Không tìm thấy chip | "Không đọc được thẻ. Hãy thử đặt lại, giữ chắc hơn" |
| Mất kết nối giữa chừng | "Bị gián đoạn. Đặt lại thẻ từ đầu" |
| CCCD không khớp | "Số CCCD trên thẻ không khớp hồ sơ. Hãy liên hệ cán bộ" |
| Thiết bị không hỗ trợ NFC | Không cho phép đăng ký — báo cán bộ cấp thiết bị khác |

#### Bước 4: Đăng ký khuôn mặt

```
┌──────────────────────────────┐
│   BƯỚC 4/5 — CHỤP KHUÔN MẶT │
│   ════════════════════════    │
│                              │
│   ┌────────────────────────┐ │
│   │                        │ │
│   │    [Camera preview     │ │
│   │     với khung oval     │ │
│   │     hướng dẫn đặt     │ │
│   │     khuôn mặt vào]    │ │
│   │                        │ │
│   └────────────────────────┘ │
│                              │
│   ✅ Ảnh thẳng mặt           │
│   ⬜ Nghiêng trái            │
│   ⬜ Nghiêng phải            │
│                              │
│   Hãy quay mặt sang TRÁI    │
│   một chút                   │
│                              │
└──────────────────────────────┘
```

**Luồng đăng ký khuôn mặt:**

1. Mở camera trước (CameraX) với khung oval hướng dẫn
2. Chụp **3 ảnh** ở 3 góc:
   - **Thẳng mặt** — nhìn thẳng vào camera
   - **Nghiêng trái** ~15° — quay nhẹ sang trái
   - **Nghiêng phải** ~15° — quay nhẹ sang phải
3. Mỗi ảnh chạy **on-device** (TFLite):
   - Face Detection → kiểm tra có đúng 1 khuôn mặt
   - Liveness Detection → chống giả mạo (ảnh in, video)
   - Kiểm tra chất lượng ảnh (độ sáng, độ nét, kích thước mặt)
4. Gửi 3 ảnh lên server:
   ```
   POST /api/v1/biometric/enroll-face
   Content-Type: multipart/form-data

   subject_id: uuid
   images[]: [front.jpg, left.jpg, right.jpg]
   liveness_scores[]: [0.97, 0.95, 0.96]
   quality_scores[]: [92, 88, 90]
   ```
5. **Server xử lý AI nhận diện:**
   - Trích xuất face embedding (vector 512 chiều) từ 3 ảnh
   - Tính embedding trung bình → lưu vào `face_templates` (biometric DB)
   - Trả về `quality_score` tổng hợp
6. Nếu quality ≥ ngưỡng → ✅ thành công
7. Nếu quality thấp → yêu cầu chụp lại

**Yêu cầu ảnh:**

| Tiêu chí | Giá trị |
|----------|---------|
| Kích thước mặt tối thiểu | 200×200 px |
| Liveness score | ≥ 0.85 |
| Độ sáng | Không quá tối/sáng |
| Đeo kính đen | Không cho phép |
| Đeo khẩu trang | Không cho phép |

#### Bước 5: Xác nhận hoàn tất

```
┌──────────────────────────────┐
│   BƯỚC 5/5 — HOÀN TẤT       │
│   ════════════════════════    │
│                              │
│          ✅                   │
│                              │
│   Đăng ký thành công!        │
│                              │
│   Thiết bị: Samsung Galaxy.. │
│   CCCD: *** *** **89         │
│   Khuôn mặt: Đã đăng ký     │
│                              │
│   Bạn có thể bắt đầu sử    │
│   dụng ứng dụng để điểm     │
│   danh hàng ngày.           │
│                              │
│   ┌────────────────────────┐ │
│   │   VÀO TRANG CHỦ →      │ │
│   └────────────────────────┘ │
└──────────────────────────────┘
```

- Cập nhật trạng thái hồ sơ: `lifecycle = 'ENROLLMENT'` → `'DANG_QUAN_LY'`
- Cán bộ xác nhận trên web dashboard (optional, tùy cấu hình kịch bản)

---

## 6. SA-03: Trang chủ

### Mô tả

Màn hình chính sau đăng nhập. Hiển thị thông tin tổng quan bằng ngôn ngữ đơn giản, rõ ràng.

### Giao diện

```
┌──────────────────────────────┐
│ Xin chào, Nguyễn Văn A      │
│ Mã hồ sơ: HS-2024-001       │
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐    │
│  │  📋 HÔM NAY          │    │
│  │                      │    │
│  │  Bạn cần điểm danh  │    │
│  │  từ 06:00 đến 09:00 │    │
│  │                      │    │
│  │  ⏰ Còn 2 giờ 15 phút│    │
│  │                      │    │
│  │  [  ĐIỂM DANH NGAY ▶]│   │
│  └──────────────────────┘    │
│                              │
│  ┌──────────┐ ┌──────────┐   │
│  │ 📊 Tháng │ │ 🔔 Thông │   │
│  │ này      │ │ báo      │   │
│  │          │ │          │   │
│  │ Đã điểm  │ │ 2 tin    │   │
│  │ danh:    │ │ chưa đọc │   │
│  │ 18/22    │ │          │   │
│  │ ngày     │ │          │   │
│  └──────────┘ └──────────┘   │
│                              │
│  ┌──────────┐ ┌──────────┐   │
│  │ 📍 Khu   │ │ 📝 Yêu   │   │
│  │ vực      │ │ cầu      │   │
│  │ của bạn  │ │ của bạn  │   │
│  └──────────┘ └──────────┘   │
│                              │
├──────────────────────────────┤
│ 🏠 Chủ  📋 Lịch  👤 Tôi  ⚙ │
└──────────────────────────────┘
```

### Thành phần

| Phần | Nội dung | Nguồn dữ liệu |
|------|----------|----------------|
| Lời chào | Tên đối tượng, mã hồ sơ | `subjects.full_name`, `subjects.code` |
| Khung điểm danh | Cửa sổ điểm danh hôm nay, đếm ngược, nút bấm | `scenario.checkin_window_start/end` |
| Thống kê tháng | Số ngày đã điểm danh / tổng ngày phải điểm danh | Đếm events type=CHECK_IN trong tháng |
| Thông báo | Số thông báo chưa đọc | `notifications` where `is_read = false` |
| Khu vực | Nút vào xem khu vực quản lý | Link tới SA-06 |
| Yêu cầu | Nút vào xem/gửi yêu cầu | Link tới SA-09 |

### Logic hiển thị trạng thái điểm danh

```
Nếu chưa đến giờ:
  → "Bạn cần điểm danh từ HH:MM đến HH:MM" + đếm ngược

Nếu đang trong cửa sổ và chưa điểm danh:
  → "Bạn cần điểm danh NGAY" + nút lớn màu xanh + đếm ngược còn lại

Nếu đã điểm danh hôm nay:
  → "✅ Đã điểm danh lúc HH:MM" + màu xanh lá

Nếu quá giờ và chưa điểm danh:
  → "⚠️ Bạn đã quá giờ điểm danh!" + nút "Điểm danh muộn" + màu đỏ

Nếu hôm nay là ngày nghỉ / không cần điểm danh:
  → "📅 Hôm nay bạn không cần điểm danh"
```

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/subjects/:id` | Thông tin hồ sơ |
| GET | `/subjects/:id/scenario` | Kịch bản đang áp dụng (lấy checkin window) |
| GET | `/events?subject_id=:id&type=CHECK_IN&from=today` | Kiểm tra đã điểm danh chưa |
| GET | `/notifications?is_read=false&count=true` | Đếm thông báo chưa đọc |

---

## 7. SA-04: Điểm danh trực tuyến

### Mô tả

Chức năng cốt lõi của app. Đối tượng thực hiện điểm danh qua **4 yếu tố xác thực** đồng thời:

1. **NFC** (thẻ CCCD thật) — chứng minh có thẻ vật lý
2. **Khuôn mặt** — chứng minh đúng người
3. **GPS** — ghi nhận vị trí tại thời điểm điểm danh
4. **Timestamp** — ghi nhận thời gian

> **Quan trọng:** AI nhận diện khuôn mặt (face matching) chạy trên **server**, không phải trên thiết bị. Thiết bị chỉ chạy face detection + liveness detection.

### Luồng điểm danh chính

```
┌─────────────────┐
│  Bấm "Điểm danh"│
└────────┬────────┘
         ↓
┌─────────────────┐
│ Bước 1: Quét NFC│  ← Đặt thẻ CCCD lên điện thoại
│ (5-10 giây)     │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Bước 2: Chụp mặt│  ← Camera trước, liveness check on-device
│ (3-5 giây)      │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Bước 3: Lấy GPS │  ← Tự động, nền
└────────┬────────┘
         ↓
┌─────────────────┐
│ Gửi dữ liệu     │  ← Gom 4 yếu tố, gửi 1 request
│ lên server       │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Server xử lý:   │
│ - Face matching  │  ← SO SÁNH khuôn mặt với template đã đăng ký
│ - NFC verify     │  ← Kiểm tra hash NFC
│ - Geofence check │  ← GPS có trong vùng cho phép?
│ - Tạo Event      │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Kết quả:         │
│ ✅ Thành công    │
│ ⚠️ Cảnh báo     │
│ ❌ Thất bại      │
└─────────────────┘
```

### Bước 1: Quét NFC

```
┌──────────────────────────────┐
│   ĐIỂM DANH — Bước 1/3      │
│                              │
│        ┌─────────────┐       │
│        │  [Hình minh │       │
│        │   họa NFC]  │       │
│        └─────────────┘       │
│                              │
│   Đặt thẻ Căn cước lên      │
│   mặt sau điện thoại        │
│                              │
│   ━━━━━━━░░░░░░░░░░░ Đang   │
│                    chờ thẻ...│
│                              │
│   💡 Mẹo: Giữ thẻ sát mặt  │
│      sau điện thoại, không   │
│      lắc, chờ 3-5 giây      │
│                              │
└──────────────────────────────┘
```

- Đọc NFC chip → lấy `cccd_chip_hash` + `passive_auth_data`
- On-device: so sánh nhanh số CCCD đọc được vs số CCCD đã lưu local
- Nếu OK → tự động chuyển bước 2

### Bước 2: Chụp khuôn mặt

```
┌──────────────────────────────┐
│   ĐIỂM DANH — Bước 2/3      │
│                              │
│   ┌────────────────────────┐ │
│   │                        │ │
│   │    [Camera preview     │ │
│   │     với khung oval]    │ │
│   │                        │ │
│   │  Đưa mặt vào khung    │ │
│   │  tròn và giữ yên      │ │
│   │                        │ │
│   └────────────────────────┘ │
│                              │
│   ✅ Phát hiện khuôn mặt    │
│   ✅ Kiểm tra người thật    │
│   ⏳ Đang chụp...           │
│                              │
└──────────────────────────────┘
```

**On-device processing (TFLite):**

1. Face Detection → xác nhận có đúng 1 khuôn mặt trong khung
2. Liveness Detection → chống giả mạo:
   - Anti-spoofing: phát hiện ảnh in, màn hình, mặt nạ
   - Blink detection (optional): yêu cầu nháy mắt
3. Chụp ảnh chất lượng cao nhất
4. **KHÔNG matching trên device** — ảnh sẽ gửi lên server

**Server processing (AI Face Recognition):**

1. Nhận ảnh check-in → trích xuất face embedding
2. So sánh với `face_templates.embedding` đã đăng ký (cosine similarity)
3. Trả về `face_match_score` (0-100)
4. Nếu `score >= scenario.face_threshold` (mặc định 85) → MATCH
5. Nếu `score < threshold` → MISMATCH → vẫn ghi event nhưng result = FAILED

### Bước 3: Lấy GPS (tự động)

- Chạy song song với bước 1-2 (không cần bước riêng trên UI)
- Lấy `latitude`, `longitude`, `accuracy` từ FusedLocationProvider
- Nếu accuracy > 100m → cảnh báo "Vị trí không chính xác lắm, hãy ra ngoài trời"
- GPS **chỉ lấy tại thời điểm điểm danh**, KHÔNG theo dõi liên tục

### Gửi dữ liệu lên server

```json
POST /api/v1/events/checkin

{
  "subject_id": "uuid",
  "scenario_id": "uuid",
  "type": "CHECK_IN",
  "client_timestamp": "2025-03-22T07:30:00+07:00",

  "nfc_data": {
    "cccd_chip_hash": "sha256...",
    "chip_serial": "ABC123",
    "passive_auth_verified": true
  },

  "face_data": {
    "image": "base64_encoded_jpeg",
    "liveness_score": 0.97,
    "quality_score": 91,
    "device_face_detected": true
  },

  "gps_data": {
    "latitude": 21.0285,
    "longitude": 105.8542,
    "accuracy": 15.5
  },

  "device_info": {
    "device_id": "android_id_abc123",
    "device_model": "Samsung Galaxy A54",
    "os_version": "Android 14",
    "app_version": "1.0.0"
  }
}
```

### Kết quả điểm danh

**Server tạo Event và trả về kết quả:**

```
┌──────────────────────────────┐    ┌──────────────────────────────┐
│                              │    │                              │
│          ✅                   │    │          ⚠️                  │
│                              │    │                              │
│   ĐIỂM DANH THÀNH CÔNG      │    │   ĐIỂM DANH CÓ VẤN ĐỀ      │
│                              │    │                              │
│   Thời gian: 07:30           │    │   Thời gian: 07:30           │
│   Vị trí: Trong khu vực ✅   │    │   Vị trí: Ngoài khu vực ⚠️   │
│   Khuôn mặt: Khớp ✅        │    │   Khuôn mặt: Khớp ✅        │
│   Thẻ CCCD: Xác minh ✅     │    │   Thẻ CCCD: Xác minh ✅     │
│                              │    │                              │
│   ┌────────────────────────┐ │    │   Bạn đang ở ngoài khu vực  │
│   │      VỀ TRANG CHỦ      │ │    │   cho phép. Nếu bạn đang đi│
│   └────────────────────────┘ │    │   xa đã được phép, bạn      │
│                              │    │   không cần lo lắng.         │
└──────────────────────────────┘    │                              │
                                    │   ┌────────────────────────┐ │
                                    │   │      VỀ TRANG CHỦ      │ │
                                    │   └────────────────────────┘ │
                                    └──────────────────────────────┘
```

### Trường hợp Fallback (NFC lỗi)

Nếu kịch bản cấu hình `fallback_allowed = true` và NFC gặp lỗi:

```
┌──────────────────────────────┐
│                              │
│   ❌ Không đọc được thẻ     │
│                              │
│   Đã thử 3 lần nhưng       │
│   không đọc được thẻ CCCD.  │
│                              │
│   Bạn có thể điểm danh      │
│   không dùng thẻ, nhưng     │
│   lần điểm danh này sẽ      │
│   bị ghi chú là "NFC lỗi"  │
│                              │
│   ┌────────────────────────┐ │
│   │  ĐIỂM DANH KHÔNG NFC   │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │  THỬ LẠI NFC           │ │
│   └────────────────────────┘ │
└──────────────────────────────┘
```

- Event được tạo với `nfc_verified = false`, `result = WARNING`
- Hệ thống sẽ tạo Alert loại `NFC_FAIL` theo alert rules

### Bảng kết quả Event trên server

| Kết quả | Điều kiện | Event.result | Hậu quả |
|---------|-----------|-------------|---------|
| Thành công hoàn toàn | NFC ✅ + Face ✅ + Trong geofence | SUCCESS | Không |
| Ngoài khu vực | NFC ✅ + Face ✅ + Ngoài geofence | WARNING | Event `GEOFENCE_VIOLATION` (SBR-06: không chặn) |
| Khuôn mặt không khớp | NFC ✅ + Face ❌ | FAILED | Alert `FACE_MISMATCH` |
| NFC lỗi (fallback) | NFC ❌ + Face ✅ | WARNING | Alert `NFC_FAIL` |
| NFC CCCD không khớp | NFC đọc được nhưng sai số | FAILED | Alert `NFC_MISMATCH` |
| Điểm danh muộn | Ngoài cửa sổ thời gian | WARNING | Event `CHECKIN_OVERDUE` |

---

## 8. SA-05: Thông tin quản lý cá nhân

### Mô tả

Đối tượng xem thông tin quản lý của mình. Tất cả thông tin được trình bày bằng **ngôn ngữ đơn giản, dễ hiểu**.

### Giao diện

```
┌──────────────────────────────┐
│ ← THÔNG TIN CỦA TÔI        │
├──────────────────────────────┤
│                              │
│   [Ảnh đại diện]             │
│   Nguyễn Văn A               │
│   Mã hồ sơ: HS-2024-001     │
│                              │
├──────────────────────────────┤
│   📋 THÔNG TIN CÁ NHÂN      │
│                              │
│   Họ và tên:                 │
│   Nguyễn Văn A               │
│                              │
│   Số Căn cước:               │
│   012 345 ***89              │
│                              │
│   Ngày sinh:                 │
│   15/06/1990                 │
│                              │
│   Giới tính:                 │
│   Nam                        │
│                              │
│   Địa chỉ hiện tại:         │
│   123 Nguyễn Trãi, Phường   │
│   Thanh Xuân Trung, Quận    │
│   Thanh Xuân, Hà Nội        │
│                              │
│   Số điện thoại:             │
│   0912 345 678               │
│                              │
├──────────────────────────────┤
│   📌 TÌNH TRẠNG QUẢN LÝ     │
│                              │
│   Trạng thái hiện tại:      │
│   🟢 Đang được quản lý      │
│                              │
│   Ngày bắt đầu:             │
│   01/01/2025                 │
│                              │
│   Kịch bản áp dụng:         │
│   Quản lý thường xuyên      │
│   (Điểm danh mỗi ngày,     │
│    06:00 - 09:00)            │
│                              │
│   Tỷ lệ chấp hành:         │
│   ████████░░ 82%             │
│   (Tốt — tiếp tục giữ vững)│
│                              │
│   Khu vực quản lý:          │
│   Phường Thanh Xuân Trung   │
│   → Xem bản đồ              │
│                              │
├──────────────────────────────┤
│   👨‍👩‍👧 GIA ĐÌNH              │
│                              │
│   Người thân liên hệ:       │
│   Nguyễn Thị B (Vợ)        │
│   ĐT: 0987 654 321          │
│                              │
├──────────────────────────────┤
│   📄 GIẤY TỜ PHÁP LÝ       │
│                              │
│   Loại:                      │
│   Quyết định quản lý        │
│   Số: QĐ-123/2024           │
│   Ngày: 01/01/2025           │
│   Thời hạn: 12 tháng        │
│                              │
└──────────────────────────────┘
```

### Quy tắc hiển thị thân thiện

Chuyển đổi các giá trị hệ thống sang ngôn ngữ đơn giản:

| Giá trị hệ thống | Hiển thị cho đối tượng |
|-------------------|----------------------|
| `status = ACTIVE` | 🟢 "Đang được quản lý" |
| `status = ENROLLED` | 🔵 "Đang hoàn thiện hồ sơ" |
| `status = SUSPENDED` | 🟡 "Tạm dừng — liên hệ cán bộ" |
| `status = REINTEGRATING` | 🟠 "Đang tái hòa nhập" |
| `status = COMPLETED` | ✅ "Đã hoàn thành quản lý" |
| `compliance_rate >= 90` | "Rất tốt" |
| `compliance_rate >= 70` | "Tốt — tiếp tục giữ vững" |
| `compliance_rate >= 50` | "Cần cải thiện — cố gắng điểm danh đúng giờ" |
| `compliance_rate < 50` | "Chưa tốt — hãy liên hệ cán bộ để hỗ trợ" |
| `checkin_frequency = DAILY` | "Điểm danh mỗi ngày" |
| `checkin_frequency = WEEKLY` | "Điểm danh mỗi tuần" |
| `checkin_frequency = BIWEEKLY` | "Điểm danh 2 tuần một lần" |
| `checkin_frequency = MONTHLY` | "Điểm danh mỗi tháng" |

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/subjects/:id` | Thông tin hồ sơ đầy đủ |
| GET | `/subjects/:id/family` | Thông tin gia đình |
| GET | `/subjects/:id/legal` | Thông tin pháp lý |
| GET | `/subjects/:id/scenario` | Kịch bản đang áp dụng |

### Lưu ý

- CCCD hiển thị dạng ẩn: `012 345 ***89` (ẩn 3 số trước cuối)
- Đối tượng **chỉ được xem**, không được sửa thông tin (sửa phải qua cán bộ hoặc gửi yêu cầu)
- Số điện thoại hiển thị có khoảng trắng cho dễ đọc: `0912 345 678`

---

## 9. SA-06: Khu vực quản lý

### Mô tả

Hiển thị khu vực đối tượng được phép sinh sống. Thông tin được trình bày đơn giản, kèm bản đồ trực quan.

### Giao diện

```
┌──────────────────────────────┐
│ ← KHU VỰC CỦA BẠN          │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │    [Bản đồ Google      │  │
│  │     Maps hiển thị      │  │
│  │     vùng tròn/đa giác  │  │
│  │     geofence + vị trí  │  │
│  │     hiện tại]          │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  📍 Khu vực của bạn          │
│                              │
│  Bạn được phép ở trong       │
│  khu vực sau:                │
│                              │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │ 📌 Phường Thanh Xuân    │  │
│  │    Trung               │  │
│  │                        │  │
│  │ Khu vực hình tròn,     │  │
│  │ bán kính khoảng 2km    │  │
│  │ tính từ trung tâm      │  │
│  │ phường                 │  │
│  │                        │  │
│  │ Địa chỉ trung tâm:    │  │
│  │ UBND P. Thanh Xuân     │  │
│  │ Trung, Q. Thanh Xuân,  │  │
│  │ Hà Nội                 │  │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                              │
│  📏 Bạn đang cách trung     │
│  tâm khu vực: 850m          │
│  → 🟢 Bạn đang ở trong     │
│     khu vực cho phép        │
│                              │
│  ⓘ Khi bạn điểm danh,      │
│  hệ thống sẽ kiểm tra bạn  │
│  có đang ở trong khu vực    │
│  này không. Nếu bạn ở       │
│  ngoài khu vực mà chưa      │
│  được phép, cán bộ sẽ       │
│  nhận được thông báo.       │
│                              │
│  ⚠️ Giới nghiêm             │
│  Từ 22:00 đến 05:00, bạn   │
│  cần ở trong khu vực.       │
│                              │
└──────────────────────────────┘
```

### Chuyển đổi thông tin kỹ thuật → dễ hiểu

| Dữ liệu hệ thống | Hiển thị |
|--------------------|----------|
| `geofence.type = CIRCLE`, `radius = 2000` | "Khu vực hình tròn, bán kính khoảng 2km" |
| `geofence.type = POLYGON` | "Khu vực theo ranh giới phường/quận" (vẽ trên bản đồ) |
| `geofence.center_lat/lng` | Hiển thị địa chỉ dạng chữ (Reverse Geocoding) |
| `scenario.curfew_start = 22:00` | "Giới nghiêm: Từ 22:00 đến 05:00, bạn cần ở trong khu vực" |
| Khoảng cách hiện tại | "Bạn đang cách trung tâm: 850m" + 🟢/🟡/🔴 |

### Tính khoảng cách

```kotlin
// Haversine formula — tính khoảng cách GPS
fun distanceTo(centerLat: Double, centerLng: Double, myLat: Double, myLng: Double): Double {
    val R = 6371000.0 // Earth radius in meters
    val dLat = Math.toRadians(myLat - centerLat)
    val dLng = Math.toRadians(myLng - centerLng)
    val a = sin(dLat/2).pow(2) + cos(Math.toRadians(centerLat)) *
            cos(Math.toRadians(myLat)) * sin(dLng/2).pow(2)
    return R * 2 * atan2(sqrt(a), sqrt(1-a))
}
```

### Hiển thị trạng thái vị trí

| Khoảng cách | Hiển thị |
|-------------|----------|
| Trong geofence | 🟢 "Bạn đang ở trong khu vực cho phép" |
| Gần rìa (> 80% bán kính) | 🟡 "Bạn đang ở gần rìa khu vực" |
| Ngoài geofence | 🔴 "Bạn đang ở ngoài khu vực cho phép" |

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/geofences/:id` | Chi tiết geofence |
| GET | `/geofences/:id/point-check?lat=X&lng=Y` | Kiểm tra GPS trong/ngoài geofence |
| GET | `/subjects/:id/scenario` | Lấy geofence_id + curfew |

---

## 10. SA-07: Lịch sử điểm danh

### Mô tả

Đối tượng xem lại lịch sử điểm danh, biết những ngày nào đã/chưa điểm danh, kết quả từng lần.

### Giao diện

```
┌──────────────────────────────┐
│ ← LỊCH SỬ ĐIỂM DANH        │
├──────────────────────────────┤
│                              │
│  Tháng 3, 2025              │
│  ┌──┬──┬──┬──┬──┬──┬──┐     │
│  │T2│T3│T4│T5│T6│T7│CN│     │
│  ├──┼──┼──┼──┼──┼──┼──┤     │
│  │🟢│🟢│🟢│🟡│🟢│  │  │     │
│  │ 1│ 2│ 3│ 4│ 5│ 6│ 7│     │
│  ├──┼──┼──┼──┼──┼──┼──┤     │
│  │🟢│🟢│🔴│🟢│🟢│  │  │     │
│  │ 8│ 9│10│11│12│13│14│     │
│  ├──┼──┼──┼──┼──┼──┼──┤     │
│  │🟢│🟢│🟢│🟢│🟢│  │  │     │
│  │15│16│17│18│19│20│21│     │
│  ├──┼──┼──┼──┼──┼──┼──┤     │
│  │⬜│  │  │  │  │  │  │     │
│  │22│  │  │  │  │  │  │     │
│  └──┴──┴──┴──┴──┴──┴──┘     │
│                              │
│  🟢 Đã điểm danh (17 ngày)  │
│  🟡 Muộn (1 ngày)           │
│  🔴 Bỏ lỡ (1 ngày)         │
│  ⬜ Chưa đến                │
│                              │
├──────────────────────────────┤
│  CHI TIẾT GẦN ĐÂY           │
│                              │
│  22/03 ⬜ Chưa điểm danh    │
│         Cửa sổ: 06:00-09:00 │
│                              │
│  21/03 🟢 07:15              │
│         Trong khu vực ✅     │
│         Khuôn mặt khớp ✅   │
│                              │
│  20/03 🟢 08:42              │
│         Trong khu vực ✅     │
│         Khuôn mặt khớp ✅   │
│                              │
│  10/03 🔴 Không điểm danh   │
│         ⚠️ Hệ thống đã ghi  │
│         nhận ngày này        │
│                              │
│   4/03 🟡 09:25 (Muộn)      │
│         Ngoài cửa sổ 25 phút│
│         Khuôn mặt khớp ✅   │
│                              │
└──────────────────────────────┘
```

### Dữ liệu lịch

Từ danh sách events, xây dựng calendar view:

| Ngày | Events type CHECK_IN | Hiển thị |
|------|---------------------|----------|
| Có event SUCCESS | result = SUCCESS, trong cửa sổ | 🟢 |
| Có event WARNING | result = WARNING (muộn/ngoài geofence) | 🟡 |
| Không có event (ngày đã qua) | Không tìm thấy check-in | 🔴 |
| Ngày tương lai | Chưa đến | ⬜ |
| Ngày không phải điểm danh | Nghỉ / không thuộc lịch | — (trống) |

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/events?subject_id=:id&type=CHECK_IN&from=YYYY-MM-01&to=YYYY-MM-31` | Events trong tháng |
| GET | `/subjects/:id/timeline?page=1&limit=20` | Timeline tổng hợp |

---

## 11. SA-08: Thông báo

### Mô tả

Hiển thị các thông báo từ hệ thống: nhắc điểm danh, kết quả phê duyệt yêu cầu, cảnh báo, tin nhắn từ cán bộ.

### Giao diện

```
┌──────────────────────────────┐
│ ← THÔNG BÁO                 │
├──────────────────────────────┤
│                              │
│  Hôm nay                    │
│  ┌────────────────────────┐  │
│  │ 🔵 Nhắc điểm danh     │  │
│  │ Bạn cần điểm danh     │  │
│  │ trước 09:00 sáng nay  │  │
│  │              06:00     │  │
│  └────────────────────────┘  │
│                              │
│  Hôm qua                    │
│  ┌────────────────────────┐  │
│  │ ✅ Yêu cầu được duyệt │  │
│  │ Đơn xin đi Hải Phòng  │  │
│  │ từ 25/03 - 27/03 đã   │  │
│  │ được cán bộ phê duyệt │  │
│  │              14:30     │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ ⚠️ Cảnh báo            │  │
│  │ Lần điểm danh hôm qua │  │
│  │ ghi nhận bạn ở ngoài  │  │
│  │ khu vực. Nếu bạn đã   │  │
│  │ được phép, không cần   │  │
│  │ lo lắng.              │  │
│  │              08:15     │  │
│  └────────────────────────┘  │
│                              │
│  Tuần trước                  │
│  ┌────────────────────────┐  │
│  │ ❌ Yêu cầu bị từ chối │  │
│  │ Đơn xin đổi thiết bị  │  │
│  │ chưa được duyệt. Lý   │  │
│  │ do: Chưa đủ giấy tờ   │  │
│  │              10:45     │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Loại thông báo

| Loại | Icon | Mô tả |
|------|------|-------|
| `CHECKIN_REMINDER` | 🔵 | Nhắc điểm danh (trước cửa sổ 30 phút) |
| `CHECKIN_OVERDUE` | 🔴 | Cảnh báo quá giờ điểm danh |
| `REQUEST_APPROVED` | ✅ | Yêu cầu được phê duyệt |
| `REQUEST_REJECTED` | ❌ | Yêu cầu bị từ chối |
| `GEOFENCE_WARNING` | ⚠️ | Cảnh báo ngoài khu vực |
| `SYSTEM_MESSAGE` | 📢 | Thông báo hệ thống chung |
| `OFFICER_MESSAGE` | 💬 | Tin nhắn từ cán bộ phụ trách |

### Push Notification (FCM)

```kotlin
// Firebase Cloud Messaging service
class SMTTSFirebaseService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"]
        val title = message.data["title"]
        val body = message.data["message"]

        // Show local notification
        showNotification(type, title, body)

        // Nếu là nhắc điểm danh → set alarm
        if (type == "CHECKIN_REMINDER") {
            scheduleCheckinAlarm()
        }
    }
}
```

### Nhắc điểm danh tự động

Ngoài push notification từ server, app cũng tự tạo local notification:

| Thời điểm | Nội dung |
|-----------|----------|
| 30 phút trước cửa sổ | "Sắp đến giờ điểm danh (06:00 - 09:00)" |
| Đầu cửa sổ | "Đã đến giờ điểm danh! Hãy mở ứng dụng" |
| 30 phút trước hết cửa sổ | "Còn 30 phút để điểm danh!" |
| Sau khi hết cửa sổ (chưa điểm danh) | "Bạn đã quá giờ điểm danh hôm nay" |

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/notifications?page=1&limit=20` | Danh sách thông báo |
| PATCH | `/notifications/:id/read` | Đánh dấu đã đọc |
| PATCH | `/notifications/read-all` | Đánh dấu tất cả đã đọc |
| POST | `/notifications/register-device` | Đăng ký FCM token |

---

## 12. SA-09: Gửi yêu cầu & Phê duyệt

### Mô tả

Đối tượng có thể gửi yêu cầu xin phép cho cán bộ phụ trách. Có 4 loại yêu cầu:

### Các loại yêu cầu

| Loại | Mã hệ thống | Khi nào dùng |
|------|-------------|-------------|
| Xin đi xa | `TRAVEL` | Muốn rời khỏi khu vực quản lý |
| Xin hoãn điểm danh | `POSTPONE` | Không thể điểm danh vào ngày cụ thể |
| Xin đổi thiết bị | `CHANGE_DEVICE` | Điện thoại hỏng, mất, đổi máy mới |
| Xin thay đổi địa chỉ | `CHANGE_ADDRESS` | Chuyển chỗ ở |

### Giao diện — Danh sách yêu cầu

```
┌──────────────────────────────┐
│ ← YÊU CẦU CỦA TÔI          │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │  + GỬI YÊU CẦU MỚI    │  │
│  └────────────────────────┘  │
│                              │
│  ⏳ Đang chờ duyệt          │
│  ┌────────────────────────┐  │
│  │ 📋 Xin đổi thiết bị   │  │
│  │ Gửi ngày: 20/03/2025  │  │
│  │ Trạng thái: Đang chờ  │  │
│  └────────────────────────┘  │
│                              │
│  ✅ Đã xử lý                │
│  ┌────────────────────────┐  │
│  │ ✅ Xin đi Hải Phòng   │  │
│  │ 25/03 - 27/03/2025    │  │
│  │ Đã duyệt ✓            │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ ❌ Xin đi Đà Nẵng     │  │
│  │ 10/03 - 15/03/2025    │  │
│  │ Từ chối — Chưa đủ     │  │
│  │ thời gian quản lý     │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Giao diện — Tạo yêu cầu đi xa

```
┌──────────────────────────────┐
│ ← GỬI YÊU CẦU ĐI XA        │
├──────────────────────────────┤
│                              │
│  Bạn muốn đi đâu?           │
│  ┌────────────────────────┐  │
│  │ Hải Phòng              │  │
│  └────────────────────────┘  │
│                              │
│  Từ ngày:                    │
│  ┌────────────────────────┐  │
│  │ 25/03/2025         📅  │  │
│  └────────────────────────┘  │
│                              │
│  Đến ngày:                   │
│  ┌────────────────────────┐  │
│  │ 27/03/2025         📅  │  │
│  └────────────────────────┘  │
│                              │
│  Lý do:                      │
│  ┌────────────────────────┐  │
│  │ Về thăm gia đình       │  │
│  │                        │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ⓘ Yêu cầu đi xa cần gửi  │
│  trước ít nhất 3 ngày.      │
│  Cán bộ sẽ xem xét và      │
│  phản hồi trong vòng 24h.  │
│                              │
│  ┌────────────────────────┐  │
│  │      GỬI YÊU CẦU       │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Payload gửi yêu cầu

```json
POST /api/v1/requests

{
  "type": "TRAVEL",
  "reason": "Về thăm gia đình",
  "details": {
    "destination": "Hải Phòng",
    "date_from": "2025-03-25",
    "date_to": "2025-03-27",
    "contact_phone": "0912345678"
  }
}
```

### Validation theo loại

| Loại | Validation |
|------|-----------|
| TRAVEL | `destination`, `date_from`, `date_to` bắt buộc. Gửi trước `travel_threshold_days` ngày (cấu hình trong kịch bản, mặc định 3 ngày) |
| POSTPONE | `date`, `reason` bắt buộc. Không được postpone quá 3 ngày liên tiếp |
| CHANGE_DEVICE | `reason` bắt buộc. Mô tả lý do (hỏng/mất/đổi) |
| CHANGE_ADDRESS | `new_address`, `reason` bắt buộc |

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/requests?subject_id=:id&page=1&limit=20` | Danh sách yêu cầu |
| POST | `/requests` | Tạo yêu cầu mới |
| GET | `/requests/:id` | Chi tiết yêu cầu |

---

## 13. SA-10: Quản lý thiết bị

### Mô tả

Xem thông tin thiết bị đã đăng ký. Đối tượng chỉ được dùng 1 thiết bị tại một thời điểm.

### Giao diện

```
┌──────────────────────────────┐
│ ← THIẾT BỊ CỦA TÔI         │
├──────────────────────────────┤
│                              │
│  📱 Thiết bị đang dùng      │
│  ┌────────────────────────┐  │
│  │ 🟢 Đang hoạt động      │  │
│  │                        │  │
│  │ Samsung Galaxy A54     │  │
│  │ Android 14             │  │
│  │ Đăng ký: 01/01/2025   │  │
│  └────────────────────────┘  │
│                              │
│  ⓘ Bạn chỉ được dùng 1    │
│  thiết bị để điểm danh.    │
│  Nếu cần đổi máy, hãy      │
│  gửi yêu cầu bên dưới.    │
│                              │
│  ┌────────────────────────┐  │
│  │  📝 XIN ĐỔI THIẾT BỊ   │  │
│  └────────────────────────┘  │
│                              │
│  📋 Lịch sử thiết bị        │
│  ┌────────────────────────┐  │
│  │ Samsung Galaxy A54     │  │
│  │ 🟢 Đang dùng          │  │
│  │ Từ: 01/01/2025        │  │
│  ├────────────────────────┤  │
│  │ Samsung Galaxy A32     │  │
│  │ 🔴 Đã thay thế        │  │
│  │ 15/06/2024 - 31/12/24 │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/subjects/:id/devices` | Danh sách thiết bị |

---

## 14. SA-11: Tài liệu cá nhân

### Mô tả

Đối tượng xem các tài liệu liên quan đến hồ sơ của mình (quyết định quản lý, biên bản, giấy tờ đã nộp).

### Giao diện

```
┌──────────────────────────────┐
│ ← TÀI LIỆU                 │
├──────────────────────────────┤
│                              │
│  📄 Giấy tờ pháp lý         │
│  ┌────────────────────────┐  │
│  │ 📄 QĐ quản lý          │  │
│  │ QĐ-123/2024            │  │
│  │ Ngày: 01/01/2025       │  │
│  │                [Xem]   │  │
│  ├────────────────────────┤  │
│  │ 📄 Cam kết chấp hành   │  │
│  │ Ngày: 01/01/2025       │  │
│  │                [Xem]   │  │
│  └────────────────────────┘  │
│                              │
│  📸 Ảnh hồ sơ               │
│  ┌────────────────────────┐  │
│  │ 📸 Ảnh chân dung       │  │
│  │ Ngày: 01/01/2025       │  │
│  │                [Xem]   │  │
│  ├────────────────────────┤  │
│  │ 📸 Ảnh CCCD (mặt trước)│  │
│  │ Ngày: 01/01/2025       │  │
│  │                [Xem]   │  │
│  └────────────────────────┘  │
│                              │
│  ⓘ Nếu cần bổ sung giấy   │
│  tờ, hãy liên hệ cán bộ   │
│  phụ trách.                 │
│                              │
└──────────────────────────────┘
```

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/subjects/:id/documents` | Danh sách tài liệu |
| GET | `/files/:id/download` | Tải file (auth required) |

### Lưu ý

- Đối tượng **chỉ xem**, không tự upload tài liệu (upload do cán bộ thực hiện qua web)
- File PDF mở trong WebView hoặc PDF viewer
- Ảnh hiển thị inline

---

## 15. SA-12: Liên hệ cán bộ

### Mô tả

Hiển thị thông tin liên hệ của cán bộ phụ trách. Cho phép gọi điện trực tiếp.

### Giao diện

```
┌──────────────────────────────┐
│ ← LIÊN HỆ CÁN BỘ           │
├──────────────────────────────┤
│                              │
│  👤 Cán bộ phụ trách         │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │ Trần Văn B             │  │
│  │ Cán bộ cơ sở           │  │
│  │ P. Thanh Xuân Trung    │  │
│  │                        │  │
│  │ ┌──────┐  ┌──────────┐ │  │
│  │ │ 📞   │  │ 💬 Nhắn  │ │  │
│  │ │ Gọi  │  │ tin      │ │  │
│  │ └──────┘  └──────────┘ │  │
│  └────────────────────────┘  │
│                              │
│  🏢 Cơ quan quản lý         │
│  ┌────────────────────────┐  │
│  │ UBND P. Thanh Xuân     │  │
│  │ Trung                  │  │
│  │ 123 Nguyễn Trãi,      │  │
│  │ Thanh Xuân, Hà Nội    │  │
│  │                        │  │
│  │ ĐT: 024 3858 xxxx     │  │
│  │ Giờ làm việc:         │  │
│  │ T2-T6, 8:00 - 17:00   │  │
│  │                        │  │
│  │     [📍 Xem bản đồ]    │  │
│  └────────────────────────┘  │
│                              │
│  📞 Đường dây nóng          │
│  ┌────────────────────────┐  │
│  │ 1900 xxxx              │  │
│  │ (Miễn phí, 24/7)      │  │
│  │         [📞 Gọi ngay]  │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Nguồn dữ liệu

- Cán bộ phụ trách: `users` với `role = CAN_BO_CO_SO` và cùng `area_id` với đối tượng
- Cơ quan: `areas` thông tin phường/quận
- Đường dây nóng: cấu hình trong `configs`

### API liên quan

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/subjects/:id/officer` | Thông tin cán bộ phụ trách |
| GET | `/areas/:id` | Thông tin khu vực/cơ quan |

---

## 16. SA-13: Hướng dẫn sử dụng

### Mô tả

Hướng dẫn trong app dạng từng bước, có hình minh họa, dành cho người ít quen công nghệ.

### Nội dung

```
┌──────────────────────────────┐
│ ← HƯỚNG DẪN                 │
├──────────────────────────────┤
│                              │
│  📖 Cách điểm danh          │
│  Hướng dẫn từng bước cách   │
│  điểm danh hàng ngày    [→] │
│                              │
│  📖 Cách gửi yêu cầu       │
│  Hướng dẫn xin phép đi xa,  │
│  đổi máy, đổi địa chỉ  [→] │
│                              │
│  📖 Xem khu vực của bạn     │
│  Cách xem bản đồ khu vực    │
│  bạn được ở              [→] │
│                              │
│  📖 Câu hỏi thường gặp     │
│  Giải đáp các thắc mắc  [→] │
│                              │
│  📖 Lỗi thường gặp          │
│  Khắc phục sự cố NFC,       │
│  camera, GPS             [→] │
│                              │
└──────────────────────────────┘
```

### FAQ mẫu

| Câu hỏi | Trả lời |
|---------|---------|
| "Nếu tôi quên điểm danh thì sao?" | "Hệ thống sẽ ghi nhận bạn bỏ lỡ ngày đó. Hãy cố gắng điểm danh đúng giờ. Nếu có lý do chính đáng, hãy liên hệ cán bộ phụ trách." |
| "Tôi đi xa có cần điểm danh không?" | "Có. Bạn vẫn cần điểm danh dù ở đâu. Nhưng nhớ xin phép đi xa trước để không bị ghi nhận vi phạm." |
| "Điện thoại hỏng thì làm sao?" | "Hãy liên hệ cán bộ phụ trách ngay. Họ sẽ giúp bạn đăng ký thiết bị mới." |
| "NFC không đọc được thẻ" | "Thử: 1) Tháo ốp điện thoại, 2) Đặt thẻ sát mặt sau, giữ yên 5 giây, 3) Di chuyển thẻ chậm quanh khu vực camera sau. Nếu vẫn lỗi, dùng chế độ không NFC." |

---

## 17. SA-14: Cài đặt & Bảo mật

### Mô tả

Các cài đặt cá nhân và bảo mật tài khoản.

### Giao diện

```
┌──────────────────────────────┐
│ ← CÀI ĐẶT                  │
├──────────────────────────────┤
│                              │
│  🔒 Bảo mật                 │
│  ┌────────────────────────┐  │
│  │ Đổi mật khẩu       [→]│  │
│  │ Đăng ký lại khuôn   [→]│  │
│  │ mặt (cần cán bộ)      │  │
│  └────────────────────────┘  │
│                              │
│  🔔 Thông báo               │
│  ┌────────────────────────┐  │
│  │ Nhắc điểm danh   [🔵] │  │
│  │ Nhắc trước:   30 phút │  │
│  │ Thông báo hệ thống[🔵]│  │
│  │ Âm thanh        [🔵]  │  │
│  │ Rung             [🔵] │  │
│  └────────────────────────┘  │
│                              │
│  📱 Ứng dụng                │
│  ┌────────────────────────┐  │
│  │ Cỡ chữ     [Nhỏ|VỪA|To]│ │
│  │ Phiên bản: 1.0.0      │  │
│  │ Kiểm tra cập nhật  [→]│  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  🔴 ĐĂNG XUẤT          │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Chức năng

| Mục | Mô tả |
|-----|-------|
| Đổi mật khẩu | Yêu cầu nhập mật khẩu cũ + mật khẩu mới. Gọi `POST /auth/change-password` |
| Đăng ký lại khuôn mặt | Chuyển sang flow giống Bước 4 kích hoạt. **Bắt buộc có cán bộ giám sát** |
| Cỡ chữ | 3 mức: Nhỏ (14sp), Vừa (16sp), To (20sp). Lưu local bằng SharedPreferences |
| Nhắc điểm danh | Bật/tắt local notification nhắc trước cửa sổ |
| Đăng xuất | Gọi `POST /auth/logout`, xóa token, quay về màn đăng nhập |

---

## 18. Tích hợp API Backend

### Base Configuration

```kotlin
// Retrofit configuration
object ApiConfig {
    const val BASE_URL = "https://<server>/api/v1/"
    const val CONNECT_TIMEOUT = 30L  // seconds
    const val READ_TIMEOUT = 30L
    const val WRITE_TIMEOUT = 60L    // longer for file upload
}
```

### Authentication Interceptor

```kotlin
class AuthInterceptor(
    private val tokenManager: TokenManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer ${tokenManager.accessToken}")
            .addHeader("X-Device-Id", DeviceUtils.getDeviceId())
            .build()

        val response = chain.proceed(request)

        // Nếu 401 → tự động refresh token
        if (response.code == 401) {
            val newToken = tokenManager.refreshToken()
            if (newToken != null) {
                val retryRequest = request.newBuilder()
                    .header("Authorization", "Bearer $newToken")
                    .build()
                return chain.proceed(retryRequest)
            } else {
                // Refresh cũng hết hạn → force logout
                tokenManager.forceLogout()
            }
        }

        return response
    }
}
```

### API Interface tổng hợp

```kotlin
interface SmttsApi {

    // --- Auth ---
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): ApiResponse<LoginResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: RefreshRequest): ApiResponse<TokenResponse>

    @POST("auth/logout")
    suspend fun logout()

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): ApiResponse<Unit>

    // --- Subject Profile ---
    @GET("subjects/{id}")
    suspend fun getSubjectDetail(@Path("id") id: String): ApiResponse<SubjectDetail>

    @GET("subjects/{id}/devices")
    suspend fun getDevices(@Path("id") id: String): ApiResponse<DeviceList>

    @GET("subjects/{id}/documents")
    suspend fun getDocuments(@Path("id") id: String): ApiResponse<DocumentList>

    @GET("subjects/{id}/timeline")
    suspend fun getTimeline(
        @Path("id") id: String,
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): ApiResponse<TimelineResponse>

    // --- Check-in ---
    @Multipart
    @POST("events/checkin")
    suspend fun checkin(
        @Part("data") data: RequestBody,
        @Part faceImage: MultipartBody.Part
    ): ApiResponse<CheckinResponse>

    // --- Events (History) ---
    @GET("events")
    suspend fun getEvents(
        @Query("subject_id") subjectId: String,
        @Query("type") type: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 31
    ): ApiResponse<EventListResponse>

    // --- Notifications ---
    @GET("notifications")
    suspend fun getNotifications(
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): ApiResponse<NotificationListResponse>

    @PATCH("notifications/{id}/read")
    suspend fun markRead(@Path("id") id: String): ApiResponse<Unit>

    @POST("notifications/register-device")
    suspend fun registerFcmToken(@Body body: FcmTokenRequest): ApiResponse<Unit>

    // --- Requests ---
    @GET("requests")
    suspend fun getRequests(
        @Query("subject_id") subjectId: String,
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): ApiResponse<RequestListResponse>

    @POST("requests")
    suspend fun createRequest(@Body body: CreateRequestPayload): ApiResponse<RequestDetail>

    // --- Geofence ---
    @GET("geofences/{id}")
    suspend fun getGeofence(@Path("id") id: String): ApiResponse<GeofenceDetail>

    @GET("geofences/{id}/point-check")
    suspend fun checkPointInGeofence(
        @Path("id") id: String,
        @Query("lat") lat: Double,
        @Query("lng") lng: Double
    ): ApiResponse<PointCheckResponse>

    // --- Biometric Enrollment ---
    @Multipart
    @POST("biometric/enroll-face")
    suspend fun enrollFace(
        @Part("subject_id") subjectId: RequestBody,
        @Part images: List<MultipartBody.Part>,
        @Part("liveness_scores") livenessScores: RequestBody,
        @Part("quality_scores") qualityScores: RequestBody
    ): ApiResponse<EnrollFaceResponse>

    // --- Device Registration ---
    @POST("devices/register")
    suspend fun registerDevice(@Body body: RegisterDeviceRequest): ApiResponse<DeviceDetail>
}
```

### Response wrapper

```kotlin
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val timestamp: String?,
    val message: String?
)
```

---

## 19. Bảo mật & Quyền riêng tư

### Lưu trữ an toàn trên thiết bị

| Dữ liệu | Cách lưu |
|----------|----------|
| JWT Access Token | EncryptedSharedPreferences (AndroidKeystore) |
| Refresh Token | EncryptedSharedPreferences |
| Subject ID | EncryptedSharedPreferences |
| CCCD hash (for local NFC verify) | EncryptedSharedPreferences |
| Face template | **KHÔNG lưu trên device** — chỉ lưu trên server |
| Ảnh check-in | Xóa ngay sau khi upload thành công |

### Quy tắc bảo mật

1. **Không lưu dữ liệu sinh trắc học trên thiết bị** — face embedding chỉ tồn tại trên server (biometric DB riêng)
2. **Ảnh khuôn mặt check-in** — gửi lên server xong xóa ngay khỏi bộ nhớ tạm
3. **Token hết hạn:** Access token 15 phút, Refresh token 7 ngày
4. **Device binding:** Nếu `device_id` hiện tại ≠ `device_id` đã đăng ký → chặn, yêu cầu xin đổi thiết bị
5. **Root/Jailbreak detection:** Cảnh báo nếu thiết bị đã root (không chặn hoàn toàn nhưng ghi nhận vào `extra_data`)
6. **SSL Pinning:** Pin certificate của server để chống MITM
7. **Screenshot prevention:** Tắt screenshot trên màn hình nhạy cảm (check-in, thông tin CCCD)
8. **Tự động đăng xuất:** Sau 30 phút không hoạt động

### Certificate Pinning

```kotlin
val certificatePinner = CertificatePinner.Builder()
    .add("smtts.example.com", "sha256/AAAAAAA...")
    .build()

val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build()
```

---

## 20. Xử lý lỗi & Offline

### Xử lý mất mạng

App cần hoạt động ổn định khi mạng kém hoặc mất:

| Chức năng | Online | Offline |
|-----------|--------|---------|
| Xem trang chủ | Realtime | Cache data gần nhất |
| Điểm danh | Upload ngay | Lưu local → gửi khi có mạng |
| Xem thông tin | Realtime | Cache |
| Gửi yêu cầu | Gửi ngay | Lưu draft → gửi khi có mạng |
| Thông báo | Push realtime | Sync khi có mạng |

### Queue điểm danh offline

```kotlin
@Entity(tableName = "pending_checkins")
data class PendingCheckin(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val subjectId: String,
    val nfcData: String,       // JSON serialized
    val faceImagePath: String, // Local file path
    val gpsLat: Double,
    val gpsLng: Double,
    val gpsAccuracy: Float,
    val clientTimestamp: Long,
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val status: String = "PENDING" // PENDING, UPLOADING, DONE, FAILED
)
```

- Lưu dữ liệu check-in vào Room DB khi offline
- WorkManager chạy nền → retry upload khi có mạng
- Hiển thị badge "1 điểm danh chờ gửi" trên trang chủ
- Giới hạn: Chỉ giữ check-in offline tối đa 24h — sau đó báo hết hạn

### Mã lỗi thường gặp

| HTTP Code | Xử lý |
|-----------|-------|
| 401 | Auto refresh token. Nếu refresh cũng fail → đăng xuất |
| 403 | "Bạn không có quyền thực hiện thao tác này" |
| 404 | "Không tìm thấy dữ liệu" |
| 422 | Hiển thị validation errors từ server |
| 429 | "Vui lòng thử lại sau ít phút" |
| 500 | "Hệ thống đang gặp sự cố. Vui lòng thử lại sau" |
| Timeout | "Kết nối quá chậm. Kiểm tra mạng và thử lại" |
| No network | "Không có mạng. Kiểm tra WiFi hoặc dữ liệu di động" |

---

## 21. Phụ lục: Cấu trúc dữ liệu

### Models chính trên app

```kotlin
// Subject profile
data class SubjectProfile(
    val id: String,
    val code: String,
    val fullName: String,
    val cccd: String,           // Masked: "012 345 ***89"
    val dateOfBirth: String,
    val gender: String,          // "MALE" | "FEMALE"
    val address: String,
    val permanentAddress: String?,
    val phone: String?,
    val photoUrl: String?,
    val status: SubjectStatus,
    val lifecycle: SubjectLifecycle,
    val complianceRate: Double?,
    val enrollmentDate: String?,
    val areaId: String
)

enum class SubjectStatus { ENROLLED, ACTIVE, SUSPENDED, REINTEGRATING, COMPLETED }
enum class SubjectLifecycle { KHOI_TAO, ENROLLMENT, DANG_QUAN_LY, TAI_HOA_NHAP, KET_THUC }

// Scenario (assigned to subject)
data class AssignedScenario(
    val id: String,
    val code: String,
    val name: String,
    val checkinFrequency: String,
    val checkinWindowStart: String, // "06:00"
    val checkinWindowEnd: String,   // "09:00"
    val gracePeriodDays: Int,
    val faceThreshold: Int,
    val nfcRequired: Boolean,
    val fallbackAllowed: Boolean,
    val geofenceId: String?,
    val curfewStart: String?,       // "22:00"
    val curfewEnd: String?,         // "05:00"
    val travelApprovalRequired: Boolean,
    val travelThresholdDays: Int?
)

// Check-in event
data class CheckinEvent(
    val id: String,
    val code: String,
    val type: String,
    val result: EventResult,
    val createdAt: String,
    val clientTimestamp: String?,
    val gpsLat: Double?,
    val gpsLng: Double?,
    val inGeofence: Boolean?,
    val faceMatchScore: Double?,
    val nfcVerified: Boolean?
)

enum class EventResult { SUCCESS, FAILED, WARNING }

// Geofence
data class GeofenceInfo(
    val id: String,
    val name: String,
    val type: GeofenceType,     // CIRCLE | POLYGON
    val address: String?,
    val centerLat: Double?,
    val centerLng: Double?,
    val radius: Int?,           // meters (for CIRCLE)
    val coordinates: List<LatLng>? // for POLYGON
)

// Request
data class SubjectRequest(
    val id: String,
    val code: String,
    val type: RequestType,       // TRAVEL, POSTPONE, CHANGE_DEVICE, CHANGE_ADDRESS
    val status: RequestStatus,   // PENDING, APPROVED, REJECTED
    val reason: String,
    val details: Map<String, Any>,
    val reviewNote: String?,
    val createdAt: String,
    val reviewedAt: String?
)

// Notification
data class AppNotification(
    val id: String,
    val type: String,
    val title: String,
    val message: String,
    val isRead: Boolean,
    val createdAt: String
)

// Device
data class DeviceInfo(
    val id: String,
    val deviceId: String,
    val deviceModel: String?,
    val osVersion: String?,
    val status: String,          // ACTIVE, SUSPENDED, REPLACED
    val enrolledAt: String,
    val replacedAt: String?
)
```

### Database schema cần thiết cho backend bổ sung

Một số API endpoint mới cần được bổ sung ở backend để phục vụ app:

| Endpoint | Mô tả | Trạng thái |
|----------|-------|------------|
| `POST /events/checkin` | Endpoint điểm danh tổng hợp (NFC + Face + GPS) | Cần tạo mới |
| `POST /biometric/enroll-face` | Đăng ký khuôn mặt (gửi ảnh → server trích xuất embedding) | Cần tạo mới |
| `POST /devices/register` | Đăng ký thiết bị lần đầu | Cần tạo mới |
| `GET /subjects/:id/officer` | Lấy thông tin cán bộ phụ trách | Cần tạo mới |
| `GET /subjects/:id/scenario` | Lấy kịch bản đang áp dụng cho đối tượng | Cần tạo mới |
| `POST /notifications/register-device` | Đăng ký FCM token cho push notification | Cần tạo mới |
| `PATCH /notifications/:id/read` | Đánh dấu thông báo đã đọc | Cần tạo mới |
| `PATCH /notifications/read-all` | Đánh dấu tất cả đã đọc | Cần tạo mới |
| `POST /requests` | Tạo yêu cầu mới (từ phía đối tượng) | Kiểm tra quyền SUBJECT |
| `GET /events` | Lọc events theo subject_id (đối tượng chỉ thấy của mình) | Thêm scope filter |

---

*Tài liệu này là hướng dẫn phát triển cho team mobile. Mọi API response đều tuân theo format chuẩn `{ success, data, timestamp }` của backend SMTTS.*
