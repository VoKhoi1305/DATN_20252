# Công nghệ NFC đọc chip CCCD trong hệ thống SMTTS

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Tiêu chuẩn ICAO 9303](#2-tiêu-chuẩn-icao-9303)
3. [Cấu trúc dữ liệu trên chip CCCD](#3-cấu-trúc-dữ-liệu-trên-chip-cccd)
4. [Quy trình xác thực và đọc chip](#4-quy-trình-xác-thực-và-đọc-chip)
5. [Thư viện và công nghệ sử dụng](#5-thư-viện-và-công-nghệ-sử-dụng)
6. [Luồng xử lý trong SMTTS](#6-luồng-xử-lý-trong-smtts)
7. [Bảo mật](#7-bảo-mật)
8. [Xử lý lỗi](#8-xử-lý-lỗi)
9. [Sơ đồ kiến trúc](#9-sơ-đồ-kiến-trúc)

---

## 1. Tổng quan

### NFC là gì?

**NFC (Near Field Communication)** là công nghệ truyền thông không dây tầm ngắn (dưới 10cm), hoạt động ở tần số 13.56 MHz. NFC cho phép hai thiết bị trao đổi dữ liệu khi đặt gần nhau.

### CCCD gắn chip là gì?

**Căn cước công dân gắn chip (CCCD)** là thẻ căn cước do Bộ Công an Việt Nam cấp, tích hợp chip NFC theo tiêu chuẩn quốc tế ICAO 9303 (cùng tiêu chuẩn với hộ chiếu điện tử e-Passport). Chip lưu trữ thông tin cá nhân, ảnh khuôn mặt, và vân tay của chủ thẻ dưới dạng mã hóa, có chữ ký số để đảm bảo tính toàn vẹn.

### Tại sao SMTTS sử dụng NFC?

Trong hệ thống SMTTS, NFC đọc chip CCCD đóng vai trò là **yếu tố xác thực thứ nhất** trong quy trình xác thực 4 yếu tố (4-Factor Authentication):

| # | Yếu tố | Mục đích | Cách thức |
|---|--------|----------|-----------|
| 1 | **NFC chip (thẻ thật)** | Xác minh sở hữu thẻ vật lý | Đọc chip NFC trên CCCD |
| 2 | **Khuôn mặt (đúng người)** | Xác minh danh tính sinh trắc | So khớp khuôn mặt + kiểm tra sống |
| 3 | **GPS (vị trí)** | Ghi nhận vị trí trình báo | Chỉ thu thập tại thời điểm check-in |
| 4 | **Thời gian (thời điểm)** | Ghi nhận thời gian chính xác | Server timestamp |

NFC đảm bảo rằng người dùng **thực sự có thẻ CCCD gốc** (không phải bản sao hay thẻ giả), nhờ cơ chế xác thực thụ động (Passive Authentication) với chữ ký số quốc gia.

---

## 2. Tiêu chuẩn ICAO 9303

### Giới thiệu

**ICAO 9303** là tiêu chuẩn quốc tế do Tổ chức Hàng không Dân dụng Quốc tế (ICAO) ban hành, quy định cấu trúc của giấy tờ du lịch có thể đọc bằng máy (Machine Readable Travel Documents - MRTD).

CCCD Việt Nam tuân thủ tiêu chuẩn này, cụ thể:
- **Part 9**: Deploy of Biometric Identification (triển khai nhận dạng sinh trắc học)
- **Part 10**: Logical Data Structure (LDS) for Storage of Biometrics
- **Part 11**: Security Mechanisms for MRTDs (cơ chế bảo mật)

### Thành phần chính

```
┌─────────────────────────────────────────────────────┐
│                    CCCD gắn chip                     │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              MRZ (Mặt sau thẻ)                  │ │
│  │  P<VNMNGUYỄN VĂN<<AN<<<<<<<<<<<<<<<<<<<<<<<<   │ │
│  │  079012345<6VNM9001011M3012312<<<<<<<<<<<<<<<0  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────┐                                │
│  │   NFC Chip       │  Lưu trữ:                     │
│  │   (ICAO 9303)    │  - DG1: Dữ liệu MRZ          │
│  │                  │  - DG2: Ảnh khuôn mặt          │
│  │                  │  - DG3: Vân tay (hạn chế)      │
│  │                  │  - DG14: Khóa bảo mật          │
│  │                  │  - SOD: Chữ ký số              │
│  └──────────────────┘                                │
└─────────────────────────────────────────────────────┘
```

---

## 3. Cấu trúc dữ liệu trên chip CCCD

### Data Groups (DG)

| Data Group | Tên | Nội dung | Quyền truy cập |
|-----------|-----|----------|----------------|
| **DG1** | MRZ Data | Họ tên, số CCCD, ngày sinh, giới tính, ngày hết hạn, quốc tịch | Sau BAC |
| **DG2** | Face Photo | Ảnh khuôn mặt định dạng JPEG2000, chụp khi cấp thẻ | Sau BAC |
| **DG3** | Fingerprints | Mẫu vân tay (2 ngón) | Hạn chế (cần Extended Access Control) |
| **DG14** | Security Info | Thông tin cho Active Authentication | Sau BAC |
| **SOD** | Document Security Object | Chữ ký số + hash của tất cả DG | Sau BAC |

### SOD (Document Security Object)

SOD là thành phần bảo mật quan trọng nhất trên chip:

```
SOD Structure:
├── Digital Signature (ký bởi CSCA Việt Nam)
│   └── Thuật toán: RSA-SHA256 hoặc ECDSA
├── Hash Table
│   ├── Hash(DG1) → SHA-256 digest
│   ├── Hash(DG2) → SHA-256 digest
│   └── Hash(DG3) → SHA-256 digest
└── Document Signing Certificate
    └── Certificate chain → Vietnam CSCA Root
```

**Ý nghĩa**: Nếu chữ ký số trên SOD hợp lệ VÀ hash của DG1/DG2 khớp với hash trong SOD → dữ liệu trên chip là **chính hãng, không bị sửa đổi**.

---

## 4. Quy trình xác thực và đọc chip

### 4.1. BAC (Basic Access Control) — Xác thực cơ bản

BAC là cơ chế bảo vệ chống đọc trộm. Thiết bị phải chứng minh biết thông tin trên thẻ (từ MRZ) trước khi chip cho phép đọc dữ liệu.

```
Bước 1: Thu thập dữ liệu MRZ
─────────────────────────────
Người dùng nhập hoặc OCR đọc 3 thông tin:
  ┌─────────────────────────────────────┐
  │ Số CCCD (9 ký tự đầu): 079012345   │
  │ Ngày sinh (YYMMDD):    900101      │
  │ Ngày hết hạn (YYMMDD): 301231      │
  └─────────────────────────────────────┘

Bước 2: Tạo BAC Key (Session Key)
──────────────────────────────────
  BACKey = KDF(SHA-1(documentNumber + DOB + expiry))
  → Sinh ra 2 khóa phiên:
     K_enc (mã hóa AES/3DES)
     K_mac (kiểm tra toàn vẹn)

Bước 3: Mutual Authentication
─────────────────────────────
  Điện thoại ←→ Chip:
  1. Chip gửi challenge (nonce ngẫu nhiên)
  2. Điện thoại mã hóa response bằng K_enc
  3. Chip xác minh → nếu đúng → mở kênh Secure Messaging
  4. Mọi giao tiếp tiếp theo đều được mã hóa
```

**Code tương ứng** (`CccdNfcReader.kt`):
```kotlin
// Lấy 9 ký tự đầu của số CCCD làm document number
val docNumber = cccdNumber.take(9)
// Tạo BAC Key từ 3 thông tin MRZ
val bacKey: BACKeySpec = BACKey(docNumber, dateOfBirth, expiryDate)
// Thực hiện BAC authentication
passportService.doBAC(bacKey)
```

### 4.2. Đọc Data Groups

Sau khi BAC thành công, kênh giao tiếp được mã hóa (Secure Messaging). Ứng dụng đọc lần lượt:

```
┌──────────────────────────────────────────────────────┐
│ 1. ĐỌC DG1 — Dữ liệu cá nhân từ MRZ               │
│    ┌──────────────────────────────────────┐           │
│    │ val dg1 = DG1File(inputStream)       │           │
│    │ val mrz = dg1.mrzInfo                │           │
│    │ → fullName, documentNumber,          │           │
│    │   dateOfBirth, gender, nationality   │           │
│    └──────────────────────────────────────┘           │
│                                                       │
│ 2. ĐỌC DG2 — Ảnh khuôn mặt                          │
│    ┌──────────────────────────────────────┐           │
│    │ val dg2 = DG2File(inputStream)       │           │
│    │ val facePhoto = dg2.faceInfos[0]     │           │
│    │   .faceImageInfos[0]                 │           │
│    │   .imageInputStream.readBytes()      │           │
│    │ → JPEG2000 face image bytes          │           │
│    └──────────────────────────────────────┘           │
│                                                       │
│ 3. ĐỌC SOD — Chữ ký số                               │
│    ┌──────────────────────────────────────┐           │
│    │ val sod = SODFile(inputStream)       │           │
│    │ val sodBytes = sod.encoded           │           │
│    │ → Base64 encode để gửi lên server    │           │
│    └──────────────────────────────────────┘           │
└──────────────────────────────────────────────────────┘
```

### 4.3. Passive Authentication — Xác thực thụ động

Passive Authentication kiểm tra tính toàn vẹn của dữ liệu trên chip:

```
Quy trình Passive Authentication:
──────────────────────────────────

1. Đọc SOD từ chip
   │
2. Trích xuất chữ ký số từ SOD
   │
3. Xác minh chữ ký bằng CSCA Certificate (Vietnam Root CA)
   │  ✓ Chữ ký hợp lệ → SOD chưa bị sửa
   │  ✗ Chữ ký không hợp lệ → CẢNH BÁO: dữ liệu có thể giả
   │
4. Trích xuất bảng hash từ SOD
   │  Hash(DG1) = abc123...
   │  Hash(DG2) = def456...
   │
5. Tính hash của DG1, DG2 đã đọc ở bước trước
   │  SHA-256(DG1_bytes) = abc123... ?
   │  SHA-256(DG2_bytes) = def456... ?
   │
6. So sánh hash
   ✓ Khớp → Dữ liệu trên chip là CHÍNH HÃNG
   ✗ Không khớp → Dữ liệu đã bị CAN THIỆP
```

### 4.4. Active Authentication (tùy chọn)

Active Authentication chống sao chép chip:

```
Active Authentication (Challenge-Response):
───────────────────────────────────────────

Điện thoại                          Chip CCCD
    │                                   │
    │─── Gửi challenge (random) ────────▶│
    │                                   │
    │                          Ký challenge bằng
    │                          private key trên chip
    │                                   │
    │◀── Trả về signature ─────────────│
    │                                   │
Xác minh signature                      │
bằng public key (DG15)                  │
    │                                   │
    ✓ Hợp lệ → Chip là BẢN GỐC
    ✗ Không hợp lệ → Chip bị SAO CHÉP
```

> **Lưu ý**: SMTTS hiện sử dụng Passive Authentication (qua SOD). Active Authentication là nâng cấp trong tương lai.

---

## 5. Thư viện và công nghệ sử dụng

### JMRTD (Java Machine Readable Travel Documents)

| Thuộc tính | Giá trị |
|-----------|---------|
| Phiên bản | 0.7.42 |
| Nguồn mở | MIT License |
| Chức năng | Đọc chip MRTD (e-Passport, eID) theo ICAO 9303 |
| Hỗ trợ | BAC, PACE, Secure Messaging, tất cả Data Groups |
| Dependency | `org.jmrtd:jmrtd:0.7.42` |

### scuba-sc-android

| Thuộc tính | Giá trị |
|-----------|---------|
| Phiên bản | 0.0.26 |
| Chức năng | Smart Card communication layer cho Android NFC |
| Vai trò | Cầu nối giữa Android NFC API và JMRTD |
| Dependency | `net.sf.scuba:scuba-sc-android:0.0.26` |

### Kiến trúc thư viện

```
┌─────────────────────────────────────┐
│         Android NFC API             │  ← Android Framework
│         (IsoDep, Tag)               │
├─────────────────────────────────────┤
│       scuba-sc-android              │  ← Smart Card layer
│       (CardService)                 │
├─────────────────────────────────────┤
│           JMRTD                     │  ← ICAO 9303 protocol
│  (PassportService, BAC, DG Files)  │
├─────────────────────────────────────┤
│       CccdNfcReader.kt             │  ← SMTTS wrapper
│  (Đọc chip, parse data, hash)      │
└─────────────────────────────────────┘
```

---

## 6. Luồng xử lý trong SMTTS

### 6.1. Enrollment (Đăng ký ban đầu)

```
    MOBILE APP                          BACKEND (NestJS)              BIOMETRIC DB
        │                                     │                           │
   1. Người dùng nhập                         │                           │
      số CCCD + ngày sinh                     │                           │
      + ngày hết hạn                          │                           │
        │                                     │                           │
   2. Chạm CCCD vào                           │                           │
      điện thoại                              │                           │
        │                                     │                           │
   3. BAC Authentication                      │                           │
      (mở kênh mã hóa)                       │                           │
        │                                     │                           │
   4. Đọc DG1 + DG2 + SOD                    │                           │
        │                                     │                           │
   5. Tính chipDataHash =                     │                           │
      SHA-256(DG1 + DG2)                      │                           │
        │                                     │                           │
   6.───POST /enrollment/nfc──────────────▶   │                           │
      │ chipData: chipDataHash               │                           │
      │ chipSerial: NFC UID                  │                           │
      │ passiveAuthData: SOD (Base64)        │                           │
      │ chipFullName: tên từ DG1             │                           │
      │ chipCccdNumber: số CCCD từ DG1       │                           │
        │                                     │                           │
        │                              7. Đối chiếu CCCD:               │
        │                                 hash(chipCccdNumber)           │
        │                                 == subject.cccdHash?           │
        │                                     │                           │
        │                              8. Hash chipData:                 │
        │                                 SHA-256(chipData)              │
        │                                     │                           │
        │                              9.────INSERT nfc_records────────▶ │
        │                                │ subject_id                    │
        │                                │ cccd_chip_hash                │
        │                                │ chip_serial                   │
        │                                │ passive_auth_data (BYTEA)     │
        │                                     │                           │
   ◀──────── 201 Created ─────────────────────│                           │
```

### 6.2. Check-in (Trình báo)

```
    MOBILE APP                          BACKEND (NestJS)              BIOMETRIC DB
        │                                     │                           │
   1. Chạm CCCD vào                           │                           │
      điện thoại                              │                           │
        │                                     │                           │
   2. Đọc chip → tính                         │                           │
      chipDataHash                            │                           │
        │                                     │                           │
   3.───POST /checkin──────────────────▶      │                           │
      │ chipDataHash                          │                           │
      │ faceImage                             │                           │
      │ gpsLocation                           │                           │
        │                                     │                           │
        │                              4.────SELECT nfc_records──────▶   │
        │                                 WHERE subject_id = ?           │
        │                                 AND is_active = true           │
        │                                     │                           │
        │                              5. So sánh:                       │
        │                                 stored.cccd_chip_hash          │
        │                                 == hash(chipDataHash)?         │
        │                                     │                           │
        │                                 ✓ VERIFIED                     │
        │                                 ✗ MISMATCH / FAILED           │
        │                                     │                           │
        │                              6.────INSERT biometric_logs───▶  │
        │                                │ nfc_result: VERIFIED          │
        │                                │ face_result: MATCH            │
        │                                │ liveness_result: PASS         │
        │                                     │                           │
   ◀──────── Kết quả check-in ────────────────│                           │
```

---

## 7. Bảo mật

### Các lớp bảo mật

| Lớp | Cơ chế | Chống lại |
|-----|--------|-----------|
| **Vật lý** | NFC tầm ngắn (< 10cm) | Đọc từ xa |
| **Kênh truyền** | BAC → Secure Messaging (AES/3DES) | Nghe lén, man-in-the-middle |
| **Dữ liệu** | Passive Authentication (chữ ký số CSCA) | Giả mạo, sửa đổi dữ liệu |
| **Chip** | Active Authentication (tùy chọn) | Sao chép chip |
| **Lưu trữ** | Chỉ lưu hash (SHA-256), không lưu dữ liệu gốc | Rò rỉ thông tin cá nhân |
| **Database** | Tách biệt biometric DB (SBR-18) | Tấn công tập trung |

### Dữ liệu được lưu trữ trên server

SMTTS **KHÔNG** lưu trữ dữ liệu gốc từ chip. Chỉ lưu:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `cccd_chip_hash` | VARCHAR(128) | SHA-256 hash của dữ liệu chip |
| `chip_serial` | VARCHAR(100) | UID của chip NFC |
| `passive_auth_data` | BYTEA | SOD (Document Security Object) |

Không lưu: họ tên, số CCCD, ngày sinh, ảnh khuôn mặt từ chip.

---

## 8. Xử lý lỗi

### Các lỗi thường gặp

| Lỗi | Nguyên nhân | Xử lý |
|-----|-------------|-------|
| `NfcReadException: Thiết bị không hỗ trợ` | Thẻ không có chip NFC hoặc chip hỏng | Thông báo user thử lại với thẻ khác |
| BAC authentication failed | Sai số CCCD / ngày sinh / ngày hết hạn | Yêu cầu nhập lại thông tin MRZ |
| Timeout (10s) | Thẻ bị dịch chuyển khi đang đọc | Yêu cầu giữ thẻ ổn định |
| DG2 read failed | Chip không hỗ trợ hoặc DG2 bị khóa | Bỏ qua ảnh, tiếp tục enrollment |
| SOD read failed | Chip cũ không có SOD | Bỏ qua Passive Auth, ghi log cảnh báo |
| CCCD_MISMATCH | Số CCCD trên chip ≠ hồ sơ đã đăng ký | Từ chối enrollment |

### Code xử lý lỗi

```kotlin
// Timeout cho NFC communication
isoDep.timeout = 10000 // 10 giây

// DG2 và SOD là non-fatal — không có thì vẫn tiếp tục
try {
    val dg2 = DG2File(inputStream)
    // ... đọc ảnh
} catch (e: Exception) {
    Log.w(TAG, "Could not read DG2: ${e.message}")
    // Tiếp tục enrollment mà không có ảnh từ chip
}
```

---

## 9. Sơ đồ kiến trúc

### Tổng quan luồng NFC trong SMTTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP (Android)                          │
│                                                                             │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  NFC Intent   │───▶│  CccdNfcReader   │───▶│  EnrollmentViewModel    │   │
│  │  (Android OS) │    │  (JMRTD + scuba) │    │  (Gửi lên server)      │   │
│  └──────────────┘    └──────────────────┘    └───────────┬──────────────┘   │
│                                                           │                 │
│         1. Chạm thẻ        2. BAC → Đọc DG1,DG2,SOD     │ 3. POST /nfc    │
└──────────────────────────────────────────────────────────┼─────────────────┘
                                                            │
                                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (NestJS)                                   │
│                                                                             │
│  ┌──────────────────────┐    ┌──────────────────┐    ┌────────────────────┐ │
│  │ EnrollmentController │───▶│ EnrollmentService │───▶│  BiometricService  │ │
│  │  POST /enrollment/nfc│    │ Đối chiếu CCCD   │    │  Lưu hash vào DB  │ │
│  └──────────────────────┘    └──────────────────┘    └─────────┬──────────┘ │
│                                                                 │           │
└─────────────────────────────────────────────────────────────────┼───────────┘
                                                                  │
                                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BIOMETRIC DATABASE (PostgreSQL riêng biệt)               │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  nfc_records                                                         │   │
│  │  ├── id (UUID)                                                       │   │
│  │  ├── subject_id (UUID) ─── liên kết với main DB                      │   │
│  │  ├── cccd_chip_hash (SHA-256) ─── hash dữ liệu chip                 │   │
│  │  ├── chip_serial ─── UID chip NFC                                    │   │
│  │  ├── passive_auth_data (BYTEA) ─── SOD cho Passive Auth             │   │
│  │  ├── enrolled_at                                                     │   │
│  │  └── is_active (boolean)                                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File liên quan trong codebase

| File | Vai trò |
|------|---------|
| `mobile/.../nfc/CccdNfcReader.kt` | Đọc chip NFC bằng JMRTD |
| `mobile/.../ui/enrollment/EnrollmentActivity.kt` | UI màn hình enrollment, xử lý NFC intent |
| `mobile/.../ui/enrollment/EnrollmentViewModel.kt` | ViewModel điều phối enrollment flow |
| `mobile/.../data/api/EnrollmentApi.kt` | Retrofit API interface |
| `backend/.../enrollment/enrollment.controller.ts` | API endpoint `POST /enrollment/nfc` |
| `backend/.../enrollment/enrollment.service.ts` | Logic đối chiếu CCCD, gọi BiometricService |
| `backend/.../biometric/biometric.service.ts` | Lưu/truy vấn nfc_records |
| `backend/.../biometric/entities/nfc-record.entity.ts` | TypeORM entity cho bảng nfc_records |
| `scripts/migrations/002_smtts_biometric_init.sql` | SQL tạo bảng nfc_records |
