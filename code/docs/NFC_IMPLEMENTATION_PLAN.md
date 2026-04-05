# Kế hoạch triển khai NFC CCCD cho SMTTS

## Tổng quan

Tài liệu này mô tả chi tiết cách triển khai chức năng quét NFC CCCD (Căn Cước Công Dân) Việt Nam
cho hệ thống SMTTS, bao gồm cả **đăng ký lần đầu (Enrollment)** và **điểm danh (Check-in)**.

Dựa trên:
- App test NFC thành công tại `E:\phu\testCCCDapp`
- Tài liệu kỹ thuật `CCCD_TECHNICAL_GUIDE.md`
- Kiến trúc backend hiện tại (NestJS + PostgreSQL + Biometric DB)

---

## 1. Phân tích lỗi hiện tại

### 1.1 Lỗi trong `CccdNfcReader.kt` (project chính)

| # | Dòng | Lỗi | Hậu quả | Fix |
|---|------|------|---------|-----|
| 1 | 202 | `CardService.getInstance(isoDep)` | ServiceLoader không hoạt động trên Android → crash "Could not find a CardService" | Đổi thành `IsoDepCardService(isoDep)` |
| 2 | — | Không gọi `sendSelectApplet(false)` trước `doBAC()` | Chip trả về SW=6D00 (INS not supported) | Thêm `ps.sendSelectApplet(false)` sau `ps.open()` |
| 3 | 239-276 | PACE attempt thất bại → corrupt NFC session → BAC fallback cũng dùng `CardService.getInstance()` | Cả PACE lẫn BAC đều fail | Sửa cả hai đường code |

### 1.2 So sánh Test App (hoạt động) vs Project chính (lỗi)

| Tiêu chí | Test App (OK) | Project chính (LỖI) |
|----------|---------------|---------------------|
| Card Service | `IsoDepCardService(isoDep)` | `CardService.getInstance(isoDep)` |
| Select Applet | `ps.sendSelectApplet(false)` trước BAC | Không gọi |
| Auth method | Chỉ BAC (đơn giản, ổn định) | PACE + BAC fallback (phức tạp, dễ lỗi) |
| DG đọc | DG1 + DG2 + DG13 | DG1 + SOD (không DG2, không DG13) |
| Passive Auth | Không có | Có (SOD hash verification) |
| Coroutine | `suspend fun` + `Dispatchers.IO` | Blocking call trên IO dispatcher |

---

## 2. Kiến trúc NFC cho SMTTS

### 2.1 Luồng tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                     ĐĂNG KÝ LẦN ĐẦU (Enrollment)              │
│                                                                 │
│  Bước 1: Nhập thông tin BAC                                    │
│  ┌───────────────────────────────┐                              │
│  │ Số CCCD (12 số)              │  Nhập thủ công               │
│  │ Ngày sinh (dd/mm/yyyy)       │  HOẶC quét MRZ camera        │
│  │ Ngày hết hạn (dd/mm/yyyy)    │                              │
│  └──────────────┬────────────────┘                              │
│                 ▼                                                │
│  Bước 2: Quét NFC chip CCCD                                    │
│  ┌───────────────────────────────┐                              │
│  │ IsoDep → IsoDepCardService   │                              │
│  │ → PassportService            │                              │
│  │ → sendSelectApplet(false)    │                              │
│  │ → doBAC(docNum9, dob, exp)   │                              │
│  │ → Read DG1 (MRZ info)       │                              │
│  │ → Read EF_SOD (chữ ký số)   │                              │
│  │ → Passive Authentication    │                              │
│  └──────────────┬────────────────┘                              │
│                 ▼                                                │
│  Bước 3: Gửi lên server                                        │
│  ┌───────────────────────────────┐                              │
│  │ chipDataHash (SHA-256 DG1)   │  → Lưu vào biometric DB     │
│  │ chipSerial (chip UID hex)    │  → nfc_records table         │
│  │ passiveAuthData (Base64 SOD) │                              │
│  │ chipFullName                 │                              │
│  │ chipCccdNumber               │                              │
│  └───────────────────────────────┘                              │
│                                                                 │
│  Lưu local: CCCD, DOB, Expiry → TokenManager (SharedPrefs)    │
│  → Dùng cho các lần điểm danh sau                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ĐIỂM DANH (Check-in)                        │
│                                                                 │
│  Bước 1: Lấy BAC data từ local storage                         │
│  ┌───────────────────────────────┐                              │
│  │ TokenManager.getNfcCccd()    │  Đã lưu từ lần đăng ký      │
│  │ TokenManager.getNfcDob()     │                              │
│  │ TokenManager.getNfcExpiry()  │                              │
│  └──────────────┬────────────────┘                              │
│                 ▼                                                │
│  Bước 2: Quét NFC chip CCCD (quy trình giống enrollment)       │
│  ┌───────────────────────────────┐                              │
│  │ Đọc DG1 → tính chipDataHash │                              │
│  │ Đọc SOD → Passive Auth      │                              │
│  │ Lấy chipSerial              │                              │
│  └──────────────┬────────────────┘                              │
│                 ▼                                                │
│  Bước 3: Gửi lên server để xác minh                            │
│  ┌───────────────────────────────┐                              │
│  │ Server so sánh:              │                              │
│  │ ① chipDataHash mới == cũ?   │  → nfcVerified = true/false  │
│  │ ② chipSerial mới == cũ?     │  → cùng thẻ vật lý?         │
│  │ ③ passiveAuthVerified?       │  → thẻ thật?                │
│  └──────────────┬────────────────┘                              │
│                 ▼                                                │
│  Kết quả:                                                       │
│  ✅ Cả 3 khớp → ĐÚNG NGƯỜI, thẻ thật → NFC OK                │
│  ❌ Hash không khớp → SAI THẺ hoặc SAI NGƯỜI → NFC FAILED     │
│  ⚠️ PA thất bại → THẺ GIẢ/BỊ CLONE → CẢNH BÁO               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Xác minh danh tính qua NFC — Logic chi tiết

#### Dữ liệu cần thiết

**Lưu trữ từ lần enrollment (server-side, biometric DB):**

| Trường | Mô tả | Mục đích |
|--------|--------|----------|
| `cccdChipHash` | SHA-256 của raw DG1 bytes | **Fingerprint chính** — xác định danh tính thẻ |
| `chipSerial` | NFC chip UID (hex string) | Xác định thẻ vật lý (chip cụ thể) |
| `passiveAuthData` | Base64 của SOD (Document Security Object) | Xác minh tính toàn vẹn từ phía CSCA Việt Nam |

**Lưu trữ local (TokenManager/SharedPreferences):**

| Trường | Định dạng | Mục đích |
|--------|-----------|----------|
| `smtts_nfc_cccd` | 12 chữ số | Tạo BAC key (dùng 9 số đầu) |
| `smtts_nfc_dob` | YYMMDD | Tạo BAC key |
| `smtts_nfc_expiry` | YYMMDD | Tạo BAC key |

#### Tại sao phải lưu MRZ data?

BAC (Basic Access Control) là cơ chế bảo mật của chip CCCD theo chuẩn ICAO 9303.
Để đọc được bất kỳ dữ liệu nào từ chip, **phải xác thực BAC trước** bằng:
- Document number (9 ký tự đầu của số CCCD)
- Date of birth (YYMMDD)
- Date of expiry (YYMMDD)

→ 3 thông tin này tạo thành **chìa khóa 3DES** để thiết lập secure messaging với chip.
→ Không có → không đọc được chip → không điểm danh được.

#### Quy trình xác minh mỗi lần điểm danh

```
1. Mobile: Lấy BAC data từ local → Quét NFC → Đọc DG1 + SOD
2. Mobile: Tính SHA-256(DG1 raw bytes) = chipDataHash_new
3. Mobile: Verify DG1 hash vs SOD stored hash = passiveAuthVerified
4. Mobile → POST /checkin:
   {
     chipDataHash: "abc123...",      // Hash mới vừa tính
     chipSerial: "04:a3:b5:...",     // UID chip vừa đọc
     passiveAuthVerified: true,       // PA result
     passiveAuthData: "base64...",    // SOD (optional, cho server verify)
     clientTimestamp: "2026-04-05T08:30:00Z",
     gpsLat: 10.762622,
     gpsLng: 106.660172
   }
5. Server:
   a. Lấy NfcRecord active của subject → lấy cccdChipHash_stored
   b. So sánh: chipDataHash_new === cccdChipHash_stored
      → Match: nfcVerified = true
      → Mismatch: nfcCccdMatch = false → tạo Event FAILED
   c. So sánh: chipSerial_new === chipSerial_stored
      → Mismatch: có thể thẻ mới (cấp lại) → cảnh báo
   d. Kiểm tra passiveAuthVerified
      → false: thẻ có thể bị clone → cảnh báo nghiêm trọng
6. Server tạo Event:
   type: "CHECK_IN"
   result: "SUCCESS" | "FAILED" | "WARNING"
   nfcVerified: true/false
   nfcCccdMatch: true/false
```

---

## 3. Fix CccdNfcReader.kt — Thay đổi cần thiết

### 3.1 Sửa lỗi CardService (CRITICAL)

**File:** `code/mobile/app/src/main/java/com/example/smtts/nfc/CccdNfcReader.kt`

```kotlin
// ❌ TRƯỚC (LỖI):
private fun openPassportService(isoDep: IsoDep): PassportService {
    val cardService = CardService.getInstance(isoDep)  // ← ServiceLoader FAIL trên Android
    cardService.open()
    val ps = PassportService(cardService, ...)
    ps.open()
    return ps
}

// ✅ SAU (FIX):
private fun openPassportService(isoDep: IsoDep): PassportService {
    val cardService = IsoDepCardService(isoDep)  // ← Trực tiếp, không qua ServiceLoader
    val ps = PassportService(
        cardService,
        PassportService.NORMAL_MAX_TRANCEIVE_LENGTH,
        PassportService.DEFAULT_MAX_BLOCKSIZE,
        false,  // CCCD không có master file
        false
    )
    ps.open()
    return ps
}
```

**Import cần thay đổi:**
```kotlin
// ❌ Xóa:
import net.sf.scuba.smartcards.CardService

// ✅ Thêm:
import net.sf.scuba.smartcards.IsoDepCardService
```

### 3.2 Thêm sendSelectApplet (CRITICAL)

Trong method `authenticateChip()`, **trước khi gọi `doBAC()`**:

```kotlin
// ── Attempt 2: BAC with MRZ key ──
service = openPassportService(isoDep)

// ✅ THÊM DÒNG NÀY — bắt buộc trước doBAC:
service.sendSelectApplet(false)

service.doBAC(bacKey)
```

Và cũng thêm trước PACE attempt (nếu giữ PACE):
```kotlin
// ── Attempt 1: PACE ──
var service = openPassportService(isoDep)
service.sendSelectApplet(false)  // ✅ THÊM
try {
    val cardAccessStream = service.getInputStream(PassportService.EF_CARD_ACCESS)
    ...
}
```

### 3.3 Đơn giản hóa authentication (KHUYẾN NGHỊ)

PACE trên CCCD Việt Nam không ổn định. Test app chỉ dùng BAC và hoạt động tốt.
**Khuyến nghị:** Bỏ PACE, chỉ dùng BAC.

```kotlin
private fun authenticateChip(
    isoDep: IsoDep,
    cccdNumber: String,
    dateOfBirth: String,
    expiryDate: String
): PassportService {
    val docNumber = cccdNumber.substring(0, 9)
    val bacKey = BACKey(docNumber, dateOfBirth, expiryDate)

    val service = openPassportService(isoDep)
    service.sendSelectApplet(false)  // ← BẮT BUỘC
    service.doBAC(bacKey)
    return service
}
```

---

## 4. Luồng dữ liệu NFC — Chi tiết kỹ thuật

### 4.1 Từ chip NFC → Data model

```
NFC Tag detected (onNewIntent)
    │
    ▼
IsoDep.get(tag)
    │
    ├── tag.id → chipSerial (hex string, vd: "04a3b5c7d9e1f2")
    │
    ▼
IsoDepCardService(isoDep)
    │
    ▼
PassportService(cardService, 256, 224, false, false)
    │
    ├── ps.open()
    ├── ps.sendSelectApplet(false)  ← SELECT AID A0000002471001
    │
    ▼
BACKey(docNumber9, dateOfBirth, expiryDate)
    │
    ├── ps.doBAC(bacKey)  ← 3DES mutual auth, establish session keys
    │
    ▼
Read DG1: ps.getInputStream(PassportService.EF_DG1)
    │
    ├── dg1RawBytes = stream.readBytes()
    ├── dg1File = DG1File(ByteArrayInputStream(dg1RawBytes))
    ├── mrzInfo = dg1File.mrzInfo
    │   ├── documentNumber (9 chars, MRZ format)
    │   ├── primaryIdentifier (họ)
    │   ├── secondaryIdentifier (tên đệm + tên)
    │   ├── dateOfBirth (YYMMDD)
    │   ├── dateOfExpiry (YYMMDD)
    │   ├── gender (M/F)
    │   ├── nationality (VNM)
    │   └── issuingState (VNM)
    │
    ├── chipDataHash = SHA-256(dg1RawBytes) → hex string
    │
    ▼
Read EF_SOD: ps.getInputStream(PassportService.EF_SOD)
    │
    ├── sodFile = SODFile(stream)
    ├── storedHash = sodFile.dataGroupHashes[1]  ← DG1 hash sealed at issuance
    ├── computedHash = MessageDigest(sodFile.digestAlgorithm).digest(dg1RawBytes)
    ├── passiveAuthVerified = (computedHash == storedHash)
    │   ├── true → chip data chưa bị sửa đổi kể từ khi phát hành
    │   └── false → CẢNH BÁO: thẻ giả/clone/tampered
    │
    ├── passiveAuthData = Base64.encode(sodFile.encoded)
    │   → Gửi cho server để verify full chain (CSCA certificate)
    │
    ▼
CccdChipData(
    fullName, cccdNumber, dateOfBirth, gender,
    expiryDate, nationality,
    chipDataHash,        ← Fingerprint chính cho xác minh
    chipSerial,          ← UID thẻ vật lý
    passiveAuthData,     ← SOD cho server verify
    passiveAuthVerified  ← Client-side PA result
)
```

### 4.2 Data Groups trên chip CCCD

| DG | File ID | Nội dung | Đọc khi nào |
|----|---------|----------|-------------|
| DG1 | `EF_DG1` (0x0101) | MRZ data (90 chars) — tên, số CCCD, ngày sinh, hạn | **Luôn luôn** (enrollment + check-in) |
| DG2 | `EF_DG2` (0x0102) | Ảnh khuôn mặt (JPEG/JPEG2000, ~15-20KB) | **Không đọc** — face biometric dùng camera riêng |
| DG13 | `EF_DG13` (0x010D) | Thông tin VN: quê quán, địa chỉ, dân tộc, tôn giáo | **Không đọc** — không cần cho xác minh |
| EF.SOD | `EF_SOD` (0x011D) | Document Security Object (chữ ký số CSCA) | **Luôn luôn** (Passive Authentication) |

**Lý do KHÔNG đọc DG2:**
- Mất 3-5 giây thêm (ảnh lớn, truyền qua NFC chậm)
- Face recognition của SMTTS dùng camera riêng (InsightFace/ArcFace)
- Ảnh DG2 có thể là JPEG2000 (Android không hỗ trợ native)
- Tăng nguy cơ timeout/mất kết nối thẻ

**Lý do KHÔNG đọc DG13:**
- Thông tin bổ sung (địa chỉ, dân tộc...) không cần cho xác minh danh tính
- Subject profile đã có thông tin này từ hệ thống quản lý

---

## 5. Quy trình Enrollment (Đăng ký lần đầu) — Chi tiết

### 5.1 Step 1: Thu thập thông tin BAC

**Phương án 1: Nhập thủ công (hiện tại)**
```
User nhập → Số CCCD (12 số) + Ngày sinh (dd/mm/yyyy) + Ngày hết hạn (dd/mm/yyyy)
         → Convert dd/mm/yyyy → YYMMDD
         → Lưu TokenManager: smtts_nfc_cccd, smtts_nfc_dob, smtts_nfc_expiry
```

**Phương án 2: Quét MRZ bằng camera (nâng cấp tương lai)**
```
CameraX + ML Kit TextRecognition
    → MrzCameraAnalyzer phân tích frame mỗi 500ms
    → MrzParser.tryParseFromOcrText() tìm 3 dòng MRZ
    → Tự động trích xuất: documentNumber, dateOfBirth, expiryDate
    → Không cần nhập tay
```

> **Ghi chú:** Quét MRZ camera là tính năng nâng cấp, hiện tại dùng nhập tay vẫn ổn.
> Code MRZ scanner đã có sẵn trong test app có thể port sang khi cần.

### 5.2 Step 2: Quét NFC chip

```kotlin
// EnrollmentActivity.handleNfcTag()
val chipData = CccdNfcReader().readChip(
    tag = tag,
    cccdNumber = bacData.cccdNumber,      // 12 số
    dateOfBirth = bacData.dateOfBirth,      // YYMMDD
    expiryDate = bacData.expiryDate        // YYMMDD
)
// chipData chứa: fullName, cccdNumber, chipDataHash, chipSerial, passiveAuthData, passiveAuthVerified
```

### 5.3 Step 3: Gửi lên server

```kotlin
// POST /enrollment/nfc
EnrollNfcRequest(
    chipData = chipData.chipDataHash,           // SHA-256 hex string
    chipSerial = chipData.chipSerial,           // Chip UID hex
    passiveAuthData = chipData.passiveAuthData, // Base64 SOD
    chipFullName = chipData.fullName,           // Tên từ chip
    chipCccdNumber = chipData.cccdNumber        // 12 số CCCD
)
```

**Server xử lý:**
1. Cross-check `chipCccdNumber` với `Subject.cccdHash` (đã lưu khi tạo hồ sơ)
2. Cross-check `chipFullName` với `Subject.fullName`
3. Lưu `NfcRecord`:
   - `cccdChipHash = chipData` (SHA-256)
   - `chipSerial`
   - `passiveAuthData` (BYTEA)
   - `isActive = true`
4. Deactivate NfcRecord cũ nếu có (re-enrollment)

---

## 6. Quy trình Check-in (Điểm danh) — Chi tiết

### 6.1 Flow đầy đủ 4 yếu tố

```
Check-in = NFC + Face + GPS + Timestamp

Bước 1: NFC (xác minh thẻ)
    ├── Lấy BAC data từ TokenManager
    ├── Quét NFC → đọc DG1 + SOD
    ├── Tính chipDataHash
    └── Gửi chipDataHash + chipSerial + passiveAuthVerified

Bước 2: Face (xác minh người)
    ├── Chụp ảnh selfie (CameraX, front camera)
    ├── Gửi ảnh lên server
    ├── Server: InsightFace extract embedding
    ├── So sánh cosine similarity với face template đã enrollment
    └── faceMatchScore ≥ threshold → OK

Bước 3: GPS + Timestamp (xác minh vị trí & thời gian)
    ├── Lấy GPS tọa độ hiện tại
    ├── Lấy client timestamp
    └── Server check geofence + schedule

→ Tạo Event với type="CHECK_IN", result="SUCCESS"/"FAILED"/"WARNING"
```

### 6.2 API Check-in (đề xuất)

```
POST /checkin
Authorization: Bearer <jwt>
Content-Type: multipart/form-data

Fields:
  chipDataHash: string          // SHA-256 hex từ DG1 vừa đọc
  chipSerial: string            // Chip UID hex
  passiveAuthVerified: boolean  // Client-side PA result
  passiveAuthData?: string      // Base64 SOD (optional, cho server verify)
  faceImage: file               // JPEG face photo
  gpsLat: number                // Latitude
  gpsLng: number                // Longitude
  clientTimestamp: string        // ISO 8601

Response:
{
  success: boolean,
  event: {
    id: string,
    type: "CHECK_IN",
    result: "SUCCESS" | "FAILED" | "WARNING",
    nfcVerified: boolean,
    nfcCccdMatch: boolean,
    faceMatchScore: number,
    inGeofence: boolean,
    createdAt: string
  },
  message: string
}
```

### 6.3 Logic xác minh NFC trên server

```typescript
async verifyCheckinNfc(subjectId: string, dto: CheckinNfcDto): Promise<NfcVerifyResult> {
  // 1. Lấy NfcRecord active của subject
  const nfcRecord = await this.nfcRecordRepo.findOne({
    where: { subject: { id: subjectId }, isActive: true }
  });

  if (!nfcRecord) {
    return { nfcVerified: false, reason: 'NO_NFC_RECORD' };
  }

  // 2. So sánh chipDataHash
  const hashMatch = dto.chipDataHash === nfcRecord.cccdChipHash;

  // 3. So sánh chipSerial (optional — thẻ cấp lại có serial mới)
  const serialMatch = dto.chipSerial === nfcRecord.chipSerial;

  // 4. Kiểm tra Passive Authentication
  const paOk = dto.passiveAuthVerified === true;

  // 5. Quyết định kết quả
  if (hashMatch && paOk) {
    return { nfcVerified: true, nfcCccdMatch: true };
  }
  if (hashMatch && !paOk) {
    return { nfcVerified: true, nfcCccdMatch: true, warning: 'PA_FAILED' };
  }
  if (!hashMatch) {
    return { nfcVerified: false, nfcCccdMatch: false, reason: 'HASH_MISMATCH' };
  }
}
```

### 6.4 Ma trận kết quả NFC

| chipDataHash | chipSerial | PA | Kết quả | Event result | Hành động |
|:---:|:---:|:---:|---------|:---:|-----------|
| Match | Match | Pass | Đúng người, đúng thẻ, thẻ thật | SUCCESS | Cho phép điểm danh |
| Match | Match | Fail | Đúng thẻ nhưng có thể bị clone | WARNING | Cho phép + tạo Alert |
| Match | Match | Skip | Đúng thẻ, không verify được PA | SUCCESS | Cho phép (SOD unavailable) |
| Match | Mismatch | Pass | Có thể thẻ cấp lại (serial thay đổi) | WARNING | Cho phép + cảnh báo |
| Mismatch | — | — | SAI THẺ hoặc SAI NGƯỜI | FAILED | Từ chối + tạo Event NFC_MISMATCH |

---

## 7. Dependencies cần thiết

### 7.1 app/build.gradle.kts

```kotlin
dependencies {
    // ── NFC / JMRTD stack ──
    implementation("org.jmrtd:jmrtd:0.7.40")
    implementation("net.sf.scuba:scuba-sc-android:0.0.23")
    implementation("org.ejbca.cvc:cert-cvc:1.4.6")

    // ── Camera (cho face capture, và MRZ scanner nếu cần) ──
    implementation("androidx.camera:camera-core:1.3.1")
    implementation("androidx.camera:camera-camera2:1.3.1")
    implementation("androidx.camera:camera-lifecycle:1.3.1")
    implementation("androidx.camera:camera-view:1.3.1")

    // ── ML Kit (cho MRZ scanner — optional, chỉ cần nếu implement quét MRZ camera) ──
    // implementation("com.google.mlkit:text-recognition:16.0.0")

    // ── Coroutines ──
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
}
```

### 7.2 BouncyCastle conflict resolution

```kotlin
// Trong build.gradle.kts, NGOÀI khối android{}:
configurations.all {
    exclude(group = "org.bouncycastle", module = "bcprov-jdk15on")
    exclude(group = "org.bouncycastle", module = "bcprov-jdk15to18")
}

// Trong khối android{}:
android {
    packaging {
        resources {
            excludes += "META-INF/BCKEY.DSA"
            excludes += "META-INF/BCKEY.SF"
            excludes += "META-INF/LICENSE.md"
            excludes += "META-INF/LICENSE-notice.md"
        }
    }
}
```

### 7.3 BouncyCastle Provider Registration

**BẮT BUỘC** trong `onCreate()` của Activity sử dụng NFC, **TRƯỚC** `super.onCreate()`:

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    // Phải đăng ký TRƯỚC super.onCreate()
    Security.removeProvider(BouncyCastleProvider.PROVIDER_NAME)
    Security.insertProviderAt(BouncyCastleProvider(), 1)

    super.onCreate(savedInstanceState)
    // ...
}
```

> Android ships a stripped-down BouncyCastle that lacks DESede, ECDH, AES-CMAC.
> JMRTD cần full BouncyCastle cho BAC (3DES) và PACE (ECDH).

---

## 8. BACKey — Format và lưu ý quan trọng

### 8.1 Cấu trúc BACKey

```kotlin
BACKey(documentNumber: String, dateOfBirth: String, dateOfExpiry: String)
```

| Trường | Định dạng | Ví dụ | Nguồn |
|--------|-----------|-------|-------|
| documentNumber | 9 ký tự, padded `<` | `"079090001"` | Lấy 9 số đầu từ CCCD 12 số |
| dateOfBirth | YYMMDD (6 ký tự) | `"900515"` | Từ form nhập hoặc MRZ scan |
| dateOfExpiry | YYMMDD (6 ký tự) | `"350101"` | Từ form nhập hoặc MRZ scan |

### 8.2 Chuyển đổi format ngày

```kotlin
// dd/mm/yyyy → YYMMDD (cho BAC)
fun displayToYymmdd(display: String): String {
    val parts = display.split("/")
    val dd = parts[0]
    val mm = parts[1]
    val yyyy = parts[2]
    val yy = yyyy.substring(2)
    return "$yy$mm$dd"
}
// Ví dụ: "15/05/1990" → "900515"

// YYMMDD → dd/mm/yyyy (cho hiển thị)
fun formatYymmdd(yymmdd: String): String {
    val yy = yymmdd.substring(0, 2).toIntOrNull() ?: return yymmdd
    val mm = yymmdd.substring(2, 4)
    val dd = yymmdd.substring(4, 6)
    val yyyy = if (yy > 50) "19$yy" else "20$yy"
    return "$dd/$mm/$yyyy"
}
// Ví dụ: "900515" → "15/05/1990"
```

---

## 9. Xử lý lỗi NFC thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `Could not find a CardService` | Dùng `CardService.getInstance()` | Đổi thành `IsoDepCardService(isoDep)` |
| SW=6D00 (INS not supported) | Thiếu `sendSelectApplet(false)` | Thêm trước `doBAC()` |
| SW=6300/6988 (AUTH failed) | Sai BAC key (CCCD/DOB/Expiry) | Kiểm tra lại thông tin nhập |
| `Tag lost` / `TagLostException` | Người dùng di chuyển thẻ khi đọc | Hiển thị hướng dẫn giữ yên thẻ |
| `Tag is out of date` | NFC session hết hạn | Nhấc thẻ ra và đặt lại |
| Duplicate class BouncyCastle | Xung đột dependencies | Exclude `bcprov-jdk15on/jdk15to18` |
| Timeout đọc DG2 | Ảnh lớn truyền qua NFC | `isoDep.timeout = 12000` (hoặc bỏ đọc DG2) |
| PA failed (SecurityException) | Thẻ giả/clone/tampered | Cảnh báo nghiêm trọng, không cho phép |

---

## 10. Checklist triển khai

### 10.1 Fix NFC hiện tại (ưu tiên cao)

- [ ] Sửa `CardService.getInstance()` → `IsoDepCardService()` trong `CccdNfcReader.kt`
- [ ] Thêm `sendSelectApplet(false)` trước `doBAC()` trong `CccdNfcReader.kt`
- [ ] Đơn giản hóa authentication: bỏ PACE, chỉ dùng BAC
- [ ] Test enrollment NFC trên thiết bị thực

### 10.2 Implement Check-in flow (ưu tiên cao)

- [ ] Tạo `CheckinActivity` với luồng: NFC → Face → GPS → Submit
- [ ] Tạo `CheckinViewModel` quản lý state
- [ ] Tạo API endpoint `POST /checkin` trên backend
- [ ] Implement `verifyNfc()` trên backend (so sánh chipDataHash)
- [ ] Tạo UI layout cho check-in screen
- [ ] Tạo `BiometricLog` entry cho mỗi lần check-in
- [ ] Tạo `Event` entry với đầy đủ thông tin (nfcVerified, faceMatchScore, GPS...)

### 10.3 Nâng cấp (ưu tiên thấp)

- [ ] Thêm MRZ camera scanner (port từ test app)
- [ ] Thêm manual MRZ input dialog (fallback khi camera OCR sai)
- [ ] Server-side full PA verification (CSCA certificate chain)

---

## 11. Cấu trúc file đề xuất

```
code/mobile/app/src/main/java/com/example/smtts/
├── nfc/
│   ├── CccdNfcReader.kt          ← FIX: IsoDepCardService + sendSelectApplet
│   └── NfcResultBottomSheet.kt   (giữ nguyên)
├── mrz/                           ← MỚI (nếu implement MRZ scanner)
│   ├── MrzParser.kt              (port từ test app)
│   └── MrzCameraAnalyzer.kt      (port từ test app)
├── ui/
│   ├── enrollment/
│   │   ├── EnrollmentActivity.kt  (giữ nguyên, NFC đã được fix ở CccdNfcReader)
│   │   └── EnrollmentViewModel.kt
│   ├── checkin/                    ← MỚI
│   │   ├── CheckinActivity.kt    (4-factor check-in flow)
│   │   └── CheckinViewModel.kt
│   └── ...
├── data/
│   ├── api/
│   │   ├── CheckinApi.kt         ← MỚI (POST /checkin endpoint)
│   │   └── ...
│   └── model/
│       ├── CheckinModels.kt      ← MỚI (request/response DTOs)
│       └── ...
└── BaseNfcActivity.kt             (giữ nguyên)
```

---

## 12. Tóm tắt quyết định thiết kế

| Quyết định | Lý do |
|-----------|-------|
| Chỉ dùng BAC, bỏ PACE | PACE không ổn định trên CCCD VN, BAC đủ bảo mật |
| Chỉ đọc DG1 + SOD, bỏ DG2/DG13 | Giảm thời gian đọc, face dùng camera riêng |
| chipDataHash = SHA-256(DG1 raw bytes) | Fingerprint duy nhất cho thẻ, không thể giả mạo |
| Lưu BAC data local (TokenManager) | Cần cho mỗi lần check-in, không phải nhập lại |
| Passive Auth client-side + server-side | Client detect nhanh, server verify full chain |
| NFC check-in so sánh hash, không so sánh field | Hash an toàn hơn, detect mọi thay đổi |
| chipSerial là secondary check | Serial có thể thay đổi khi cấp thẻ mới |
