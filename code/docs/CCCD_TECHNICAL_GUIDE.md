# Hướng dẫn kỹ thuật: Quét MRZ & Đọc chip NFC CCCD Việt Nam
## Android Kotlin — ICAO 9303 / jMRTD

> Tài liệu này mô tả đầy đủ kỹ thuật để tích hợp tính năng quét MRZ bằng camera
> và đọc chip NFC từ Căn Cước Công Dân Việt Nam vào bất kỳ Android app nào.
> **Không bao gồm UI** — chỉ tập trung vào logic nghiệp vụ.

---

## 1. Dependencies (app/build.gradle.kts)

```kotlin
// Camera (MRZ scanning)
implementation("androidx.camera:camera-core:1.3.1")
implementation("androidx.camera:camera-camera2:1.3.1")
implementation("androidx.camera:camera-lifecycle:1.3.1")
implementation("androidx.camera:camera-view:1.3.1")

// ML Kit OCR (nhận dạng chữ trên ảnh camera)
implementation("com.google.mlkit:text-recognition:16.0.0")

// jMRTD stack — đọc chip NFC CCCD/hộ chiếu ICAO
implementation("org.jmrtd:jmrtd:0.7.40")
implementation("net.sf.scuba:scuba-sc-android:0.0.23")
implementation("org.ejbca.cvc:cert-cvc:1.4.6")
implementation("com.madgag.spongycastle:prov:1.58.0.0")

// Coroutines (đọc NFC trên background thread)
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
```

### Bắt buộc thêm vào khối `android {}`:

```kotlin
android {
    // ...
    packaging {
        resources {
            excludes += "META-INF/BCKEY.DSA"
            excludes += "META-INF/BCKEY.SF"
            excludes += "META-INF/LICENSE.md"
            excludes += "META-INF/LICENSE-notice.md"
        }
    }
}

// Ngoài khối android{}, ở cấp module:
// Loại bỏ BouncyCastle cũ (bcprov-jdk15on) kéo vào bởi cert-cvc.
// jmrtd đã có bcprov-jdk18on — giữ lại cái mới, xoá cái cũ.
configurations.all {
    exclude(group = "org.bouncycastle", module = "bcprov-jdk15on")
    exclude(group = "org.bouncycastle", module = "bcprov-jdk15to18")
}
```

> **Lý do:** `cert-cvc` kéo `bcprov-jdk15on`, trong khi `jmrtd` kéo `bcprov-jdk18on`.
> Hai JAR cùng package `org.bouncycastle` → trùng class → build fail nếu không exclude.

---

## 2. AndroidManifest.xml

### Permissions & features:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.NFC" />
<uses-permission android:name="android.permission.VIBRATE" />

<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

### Activity nhận NFC intent:

```xml
<activity
    android:name=".YourNfcActivity"
    android:launchMode="singleTop"
    android:exported="true">
    <intent-filter>
        <action android:name="android.nfc.action.TECH_DISCOVERED" />
    </intent-filter>
    <meta-data
        android:name="android.nfc.action.TECH_DISCOVERED"
        android:resource="@xml/nfc_tech_filter" />
</activity>
```

### File `res/xml/nfc_tech_filter.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <tech-list>
        <tech>android.nfc.tech.IsoDep</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NfcA</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NfcB</tech>
    </tech-list>
</resources>
```

> CCCD dùng ISO 14443-4 (IsoDep). NfcA/NfcB để bắt được cả hai loại tần số RF.

---

## 3. Data Models

### MrzData — kết quả parse MRZ

```kotlin
data class MrzData(
    val rawLine1: String = "",
    val rawLine2: String = "",
    val rawLine3: String = "",

    val documentType: String = "",       // "ID" cho CCCD VN
    val issuingCountry: String = "",     // "VNM"
    val documentNumber: String = "",     // 12 số CCCD (raw từ MRZ, padded với <)
    val documentNumberCheckDigit: Char = '0',

    val dateOfBirth: String = "",        // YYMMDD
    val dateOfBirthCheckDigit: Char = '0',
    val sex: String = "",                // M / F / <
    val expiryDate: String = "",         // YYMMDD
    val expiryDateCheckDigit: Char = '0',
    val nationality: String = "",        // VNM

    val surname: String = "",
    val givenNames: String = "",
    val optionalData1: String = "",
    val optionalData2: String = "",
    val compositeCheckDigit: Char = '0',

    val isValid: Boolean = false,
    val validationErrors: List<String> = emptyList()
)
```

### NfcChipData — kết quả đọc chip

```kotlin
data class NfcChipData(
    val mrzInfo: MrzData? = null,
    val portrait: ByteArray? = null,              // DG2: JPEG hoặc JPEG2000 bytes
    val additionalInfo: Map<String, String> = emptyMap(), // DG13: dữ liệu VN đặc thù
    val isAuthenticated: Boolean = false,
    val chipReadError: String? = null
)
```

---

## 4. Chuẩn MRZ ICAO 9303 TD1 cho CCCD Việt Nam

CCCD Việt Nam dùng chuẩn **ICAO 9303 TD1** — 3 dòng × 30 ký tự, font OCR-B.

```
LINE 1 (30 chars):
[0-1]  Document type   (2)  → "ID"
[2-4]  Country         (3)  → "VNM"
[5-13] Document number (9)  → 9 chars đầu của số CCCD, padded '<'
[14]   Check digit     (1)  → mod-10 weighted của [5-13]
[15-29]Optional data 1 (15) → phần còn lại số CCCD + padding '<'

LINE 2 (30 chars):
[0-5]  Date of birth   (6)  → YYMMDD
[6]    Check digit DOB (1)
[7]    Sex             (1)  → M / F / <
[8-13] Expiry date     (6)  → YYMMDD
[14]   Check digit exp (1)
[15-17]Nationality     (3)  → "VNM"
[18-28]Optional data 2 (11)
[29]   Composite check (1)  → bao gồm nhiều trường (xem bên dưới)

LINE 3 (30 chars):
[0-29] Name (30) → HỌ<<TÊN<ĐỆM (dấu << phân cách họ và tên)
```

### Thuật toán check digit (ICAO mod-10):

```kotlin
val WEIGHTS = intArrayOf(7, 3, 1)  // lặp lại

fun calculateCheckDigit(input: String): Char {
    var sum = 0
    input.forEachIndexed { i, c ->
        val v = when {
            c == '<' -> 0
            c.isDigit() -> c - '0'
            c.isLetter() -> c.uppercaseChar() - 'A' + 10
            else -> 0
        }
        sum += v * WEIGHTS[i % 3]
    }
    return ('0' + (sum % 10))
}
```

### Composite check digit (LINE 2, vị trí [29]):

Tính trên chuỗi ghép:
```
L1[5..29] + L2[0..6] + L2[8..14] + L2[18..28]
= docNum(9) + docCheck(1) + optData1(15)
+ dob(6) + dobCheck(1)
+ expiry(6) + expiryCheck(1)
+ optData2(11)
```

---

## 5. Module MRZ: Quét Camera

### 5.1 Setup CameraX (trong Activity/Fragment)

```kotlin
val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
cameraProviderFuture.addListener({
    val cameraProvider = cameraProviderFuture.get()

    val preview = Preview.Builder().build().also {
        it.setSurfaceProvider(previewView.surfaceProvider)
    }

    val imageAnalysis = ImageAnalysis.Builder()
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
        .also {
            it.setAnalyzer(
                ContextCompat.getMainExecutor(this),
                MrzCameraAnalyzer(
                    onMrzDetected = { mrzData -> /* navigate to NFC screen */ },
                    onNoMrz = { /* update UI */ }
                )
            )
        }

    cameraProvider.bindToLifecycle(
        this,
        CameraSelector.DEFAULT_BACK_CAMERA,
        preview,
        imageAnalysis
    )
}, ContextCompat.getMainExecutor(this))
```

### 5.2 MrzCameraAnalyzer — ImageAnalysis.Analyzer

```kotlin
class MrzCameraAnalyzer(
    private val onMrzDetected: (MrzData) -> Unit,
    private val onNoMrz: () -> Unit = {}
) : ImageAnalysis.Analyzer {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val isProcessing = AtomicBoolean(false)
    private var lastDetectTime = 0L
    private val DETECT_COOLDOWN_MS = 500L

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val now = System.currentTimeMillis()
        if (isProcessing.get() || now - lastDetectTime < DETECT_COOLDOWN_MS) {
            imageProxy.close()
            return
        }
        isProcessing.set(true)
        lastDetectTime = now

        val mediaImage = imageProxy.image ?: run {
            isProcessing.set(false)
            imageProxy.close()
            return
        }

        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                // Thử parse toàn bộ text trước
                val mrzData = MrzParser.tryParseFromOcrText(visionText.text)
                if (mrzData != null && mrzData.isValid) {
                    onMrzDetected(mrzData)
                } else {
                    // Fallback: thử từng block
                    val found = visionText.textBlocks.any { block ->
                        val blockMrz = MrzParser.tryParseFromOcrText(block.text)
                        if (blockMrz != null) { onMrzDetected(blockMrz); true } else false
                    }
                    if (!found) onNoMrz()
                }
            }
            .addOnFailureListener { onNoMrz() }
            .addOnCompleteListener {
                isProcessing.set(false)
                imageProxy.close()
            }
    }
}
```

### 5.3 MrzParser — Parse 3 dòng OCR

```kotlin
object MrzParser {
    fun tryParseFromOcrText(ocrText: String): MrzData? {
        val lines = ocrText.lines()
            .map { it.trim() }
            .filter { it.length >= 20 }

        for (i in lines.indices) {
            val line = lines[i].uppercase()
            if ((line.startsWith("I") || line.startsWith("ID")) &&
                lines.size > i + 2 &&
                hasMrzCharacteristics(lines[i + 1]) &&
                hasMrzCharacteristics(lines[i + 2])
            ) {
                val result = parse(lines[i], lines[i + 1], lines[i + 2])
                if (result.documentNumber.isNotBlank() && result.dateOfBirth.isNotBlank())
                    return result
            }
        }
        return null
    }

    private fun hasMrzCharacteristics(line: String): Boolean {
        val upper = line.uppercase()
        val fillerCount = upper.count { it == '<' || it == ' ' }
        val validChars = upper.count { it.isLetterOrDigit() || it == '<' }
        return validChars >= 20 && (fillerCount >= 2 || upper.length >= 25)
    }

    fun parse(line1: String, line2: String, line3: String): MrzData {
        val l1 = normalizeLine(line1, 30)
        val l2 = normalizeLine(line2, 30)
        val l3 = normalizeLine(line3, 30)
        val errors = mutableListOf<String>()

        // --- Line 1 ---
        val documentType   = l1.take(2).trimFiller()
        val issuingCountry = l1.substring(2, 5).trimFiller()
        val documentNumber = l1.substring(5, 14).trimFiller()
        val docNumCheck    = l1[14]
        val optionalData1  = l1.substring(15, 30).trimFiller()

        // --- Line 2 ---
        val dateOfBirth    = l2.substring(0, 6)
        val dobCheck       = l2[6]
        val sex            = l2[7].toString()
        val expiryDate     = l2.substring(8, 14)
        val expiryCheck    = l2[14]
        val nationality    = l2.substring(15, 18).trimFiller()
        val optionalData2  = l2.substring(18, 29).trimFiller()
        val compositeCheck = l2[29]

        // --- Line 3 (Name) ---
        val nameParts  = l3.substring(0, 30).split("<<")
        val surname    = nameParts.getOrNull(0)?.replace('<', ' ')?.trim() ?: ""
        val givenNames = (1 until nameParts.size)
            .joinToString(" ") { nameParts[it].replace('<', ' ').trim() }
            .trim()

        // --- Validate check digits ---
        val docNumRaw = l1.substring(5, 14)
        if (calculateCheckDigit(docNumRaw) != docNumCheck)
            errors.add("Check digit số CCCD sai")
        if (calculateCheckDigit(dateOfBirth) != dobCheck)
            errors.add("Check digit ngày sinh sai")
        if (calculateCheckDigit(expiryDate) != expiryCheck)
            errors.add("Check digit ngày hết hạn sai")
        val compositeInput = l1.substring(5, 30) + l2.substring(0, 7) +
                             l2.substring(8, 15) + l2.substring(18, 29)
        if (calculateCheckDigit(compositeInput) != compositeCheck)
            errors.add("Composite check digit sai")

        return MrzData(
            rawLine1 = l1, rawLine2 = l2, rawLine3 = l3,
            documentType = documentType, issuingCountry = issuingCountry,
            documentNumber = documentNumber, documentNumberCheckDigit = docNumCheck,
            dateOfBirth = dateOfBirth, dateOfBirthCheckDigit = dobCheck,
            sex = sex,
            expiryDate = expiryDate, expiryDateCheckDigit = expiryCheck,
            nationality = nationality,
            surname = surname, givenNames = givenNames,
            optionalData1 = optionalData1, optionalData2 = optionalData2,
            compositeCheckDigit = compositeCheck,
            isValid = errors.isEmpty(), validationErrors = errors
        )
    }

    private fun normalizeLine(raw: String, targetLength: Int): String {
        val sb = StringBuilder()
        for (c in raw.uppercase()) {
            when {
                c.isLetter() -> sb.append(c)
                c.isDigit()  -> sb.append(c)
                c == '<' || c == ' ' -> sb.append('<')
                // bỏ qua ký tự lạ (noise OCR)
            }
        }
        while (sb.length < targetLength) sb.append('<')
        return sb.toString().take(targetLength)
    }

    private fun String.trimFiller() = trimEnd('<').replace('<', ' ').trim()
}
```

---

## 6. Module NFC: Đọc chip CCCD

### 6.1 Setup Foreground Dispatch (trong Activity nhận NFC)

```kotlin
class YourNfcActivity : AppCompatActivity() {

    private lateinit var nfcAdapter: NfcAdapter
    private lateinit var pendingIntent: PendingIntent
    private lateinit var intentFilters: Array<IntentFilter>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_MUTABLE
        )

        intentFilters = arrayOf(
            IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        )
    }

    override fun onResume() {
        super.onResume()
        // Kích hoạt foreground dispatch để nhận NFC khi app đang foreground
        nfcAdapter.enableForegroundDispatch(
            this, pendingIntent, intentFilters,
            arrayOf(arrayOf("android.nfc.tech.IsoDep"))
        )
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG) ?: return
            // Gọi readChip với tag và mrzData đã quét được
            lifecycleScope.launch {
                val result = nfcChipReader.readChip(tag, mrzData)
                // xử lý result
            }
        }
    }
}
```

### 6.2 NfcChipReader — Logic đọc chip (QUAN TRỌNG)

```kotlin
import android.nfc.Tag
import android.nfc.tech.IsoDep
import net.sf.scuba.smartcards.CardServiceException
import net.sf.scuba.smartcards.IsoDepCardService
import org.jmrtd.BACKey
import org.jmrtd.PassportService
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File

class NfcChipReader(
    private val onProgress: (Int, String) -> Unit = { _, _ -> }
) {
    suspend fun readChip(tag: Tag, mrzData: MrzData): NfcChipData = withContext(Dispatchers.IO) {
        var ps: PassportService? = null
        try {
            // BƯỚC 1: Tạo kết nối IsoDep
            val isoDep = IsoDep.get(tag) ?: return@withContext NfcChipData(
                chipReadError = "Thẻ không hỗ trợ IsoDep"
            )

            // BƯỚC 2: Wrap IsoDep vào IsoDepCardService
            // QUAN TRỌNG: Dùng IsoDepCardService(isoDep) trực tiếp,
            // KHÔNG dùng CardService.getInstance(tag) — sẽ throw exception trên Android.
            val cs = IsoDepCardService(isoDep)

            // BƯỚC 3: Tạo PassportService
            ps = PassportService(
                cs,
                PassportService.NORMAL_MAX_TRANCEIVE_LENGTH, // 256
                PassportService.DEFAULT_MAX_BLOCKSIZE,       // 224
                false,   // CCCD không có master file (MF)
                false    // shouldSendHeaders
            )
            ps.open()
            isoDep.setTimeout(10000) // 10s timeout sau khi đã connect

            // BƯỚC 4: SELECT MRTD Application (AID: A0 00 00 02 47 10 01)
            // QUAN TRỌNG: Bắt buộc phải gọi TRƯỚC doBAC.
            // Nếu bỏ qua → chip trả về SW=6D00 (INS not supported).
            ps.sendSelectApplet(false) // false = không có master file

            // BƯỚC 5: BAC Authentication
            // documentNumber phải là 9 ký tự (phần đầu của MRZ line 1, pos 5-13)
            val docNumber = mrzData.documentNumber
                .replace("<", "")
                .padEnd(9, '<')
                .take(9)
            val bacKey = BACKey(docNumber, mrzData.dateOfBirth, mrzData.expiryDate)

            try {
                ps.doBAC(bacKey)
                // jmrtd tự xử lý: GET CHALLENGE → EXTERNAL AUTHENTICATE → session keys
            } catch (bacEx: Exception) {
                val sw = if (bacEx is CardServiceException)
                    Integer.toHexString(bacEx.sw).uppercase() else "?"
                return@withContext NfcChipData(
                    chipReadError = "BAC thất bại (SW=$sw): kiểm tra số CCCD, ngày sinh, ngày hết hạn"
                )
            }

            // BƯỚC 6: Đọc DG1 (MRZ data từ chip)
            var chipMrzData: MrzData? = null
            try {
                val dg1File = DG1File(ps.getInputStream(PassportService.EF_DG1))
                val mrzStr = dg1File.mrzInfo.toString()
                    .replace("\n", "").replace("\r", "")
                if (mrzStr.length >= 90) {
                    chipMrzData = MrzParser.parse(
                        mrzStr.substring(0, 30),
                        mrzStr.substring(30, 60),
                        mrzStr.substring(60, 90)
                    )
                }
            } catch (e: Exception) { /* optional */ }

            // BƯỚC 7: Đọc DG2 (ảnh khuôn mặt — JPEG hoặc JPEG2000)
            var portrait: ByteArray? = null
            try {
                val dg2File = DG2File(ps.getInputStream(PassportService.EF_DG2))
                val imageInfo = dg2File.faceInfos
                    .firstOrNull()?.faceImageInfos?.firstOrNull()
                if (imageInfo != null) {
                    val baos = java.io.ByteArrayOutputStream()
                    val buf = ByteArray(4096)
                    val imgStream = imageInfo.imageInputStream
                    var len: Int
                    while (imgStream.read(buf).also { len = it } != -1) baos.write(buf, 0, len)
                    portrait = baos.toByteArray().takeIf { it.isNotEmpty() }
                }
            } catch (e: Exception) { /* optional */ }

            // BƯỚC 8: Đọc DG13 (thông tin bổ sung — đặc thù Việt Nam)
            val additionalInfo = mutableMapOf<String, String>()
            try {
                val dg13Bytes = ps.getInputStream(PassportService.EF_DG13).readBytes()
                additionalInfo.putAll(parseDG13(dg13Bytes))
            } catch (e: Exception) { /* DG13 optional */ }

            NfcChipData(
                mrzInfo = chipMrzData ?: mrzData,
                portrait = portrait,
                additionalInfo = additionalInfo,
                isAuthenticated = true
            )

        } catch (e: Exception) {
            NfcChipData(chipReadError = "Lỗi: ${e.message}")
        } finally {
            try { ps?.close() } catch (_: Exception) {}
        }
    }

    // DG13: TLV structure đặc thù Việt Nam (spec không public hoàn toàn)
    private fun parseDG13(data: ByteArray): Map<String, String> {
        val result = mutableMapOf<String, String>()
        var i = 0
        try {
            while (i < data.size - 2) {
                val tag = data[i].toInt() and 0xFF
                val len = data[i + 1].toInt() and 0xFF
                if (len == 0 || i + 2 + len > data.size) break
                val value = String(data.copyOfRange(i + 2, i + 2 + len), Charsets.UTF_8).trim()
                when (tag) {
                    0x02 -> result["Quê quán"] = value
                    0x03 -> result["Địa chỉ"] = value
                    0x04 -> result["Dân tộc"] = value
                    0x05 -> result["Tôn giáo"] = value
                    0x06 -> result["Đặc điểm nhận dạng"] = value
                    0x07 -> result["Ngày cấp"] = value
                    0x08 -> result["Nơi cấp"] = value
                    0x09 -> result["Số CMND cũ"] = value
                }
                i += 2 + len
            }
        } catch (_: Exception) {}
        return result
    }
}
```

---

## 7. Luồng dữ liệu đầy đủ

```
[Camera Preview]
      │
      ▼
MrzCameraAnalyzer (ML Kit OCR)
      │  frame ảnh mỗi 500ms
      │  → recognizer.process(image)
      │  → visionText.text (raw OCR output)
      ▼
MrzParser.tryParseFromOcrText()
      │  tìm 3 dòng bắt đầu bằng "I"/"ID"
      │  normalize + validate check digits
      ▼
MrzData (isValid = true)
      │
      │  Người dùng đặt thẻ vào NFC reader
      ▼
NfcAdapter → onNewIntent(TAG_DISCOVERED)
      │
      ▼
NfcChipReader.readChip(tag, mrzData)
      │
      ├── IsoDep.get(tag)
      ├── IsoDepCardService(isoDep)
      ├── PassportService.open()
      ├── sendSelectApplet(false)      ← SELECT AID A0000002471001
      ├── BACKey(docNum9, dob, expiry)
      ├── doBAC(bacKey)                ← 3DES auth, establish session
      ├── getInputStream(EF_DG1) → DG1File → MRZInfo (xác nhận MRZ)
      ├── getInputStream(EF_DG2) → DG2File → FaceImageInfo → JPEG bytes
      └── getInputStream(EF_DG13) → parseDG13() → Map<String, String>
      │
      ▼
NfcChipData(mrzInfo, portrait, additionalInfo, isAuthenticated=true)
```

---

## 8. Data Groups (DG) trên chip CCCD

| DG | File ID | Nội dung | jMRTD class |
|----|---------|-----------|-----------  |
| DG1 | `EF_DG1` (0x0101) | MRZ data (90 chars) | `DG1File` |
| DG2 | `EF_DG2` (0x0102) | Ảnh khuôn mặt (JPEG/JPEG2000) | `DG2File` |
| DG13 | `EF_DG13` (0x010D) | Thông tin bổ sung VN (TLV) | parse thủ công |
| EF.COM | `EF_COM` (0x011E) | Danh sách DG có trên chip | (jMRTD tự quản lý) |
| EF.SOD | `EF_SOD` (0x011D) | Chữ ký số (Document Security Object) | (optional) |

---

## 9. BACKey — Lưu ý định dạng input

BAC (Basic Access Control) dùng thông tin MRZ để tạo session key 3DES.

```kotlin
BACKey(documentNumber, dateOfBirth, dateOfExpiry)
```

| Trường | Định dạng | Ví dụ |
|--------|-----------|-------|
| `documentNumber` | **9 ký tự**, padded `<` nếu ngắn hơn | `"079090001"` hoặc `"07909<<<<"`|
| `dateOfBirth` | `YYMMDD` (6 ký tự) | `"900515"` |
| `dateOfExpiry` | `YYMMDD` (6 ký tự) | `"290101"` |

> Số CCCD Việt Nam có 12 chữ số. MRZ TD1 chỉ chứa 9 ký tự ở trường documentNumber
> (vị trí 5-13 của line 1). Phần còn lại nằm trong optionalData1.
> Để tạo BACKey, chỉ dùng 9 ký tự đầu (đã có trong `mrzData.documentNumber`
> sau khi parse — field này lấy từ `l1.substring(5, 14).trimFiller()`).

**Format docNumber cho BACKey:**
```kotlin
val docNumber = mrzData.documentNumber
    .replace("<", "")      // bỏ padding filler
    .padEnd(9, '<')        // pad lại đủ 9 ký tự
    .take(9)               // đảm bảo đúng 9 ký tự
```

---

## 10. Các lỗi thường gặp & cách xử lý

### SW=6D00 — INS not supported
**Nguyên nhân:** Chưa gọi `sendSelectApplet()` trước `doBAC()`.  
**Fix:** Thêm `ps.sendSelectApplet(false)` ngay sau `ps.open()`.

### SW=6300 hoặc SW=6988 — EXTERNAL AUTHENTICATE failed
**Nguyên nhân:** Sai thông tin MRZ (số CCCD, ngày sinh, ngày hết hạn).  
**Fix:** Kiểm tra lại parse MRZ, đặc biệt check digit và padding.

### "Could not find a CardService for android.nfc.Tag"
**Nguyên nhân:** Dùng `CardService.getInstance(tag)` — ServiceLoader không hoạt động trên Android.  
**Fix:** Dùng `IsoDepCardService(IsoDep.get(tag))` trực tiếp.

### Duplicate class `org.bouncycastle.*`
**Nguyên nhân:** `cert-cvc` kéo `bcprov-jdk15on`, `jmrtd` kéo `bcprov-jdk18on`.  
**Fix:**
```kotlin
configurations.all {
    exclude(group = "org.bouncycastle", module = "bcprov-jdk15on")
    exclude(group = "org.bouncycastle", module = "bcprov-jdk15to18")
}
```

### Ảnh DG2 là JPEG2000 — Android không hiển thị được
**Nguyên nhân:** Một số CCCD lưu ảnh JPEG2000 (magic bytes: `FF 4F`).  
**Nhận biết:**
```kotlin
val isJpeg     = bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()
val isJpeg2000 = bytes[0] == 0xFF.toByte() && bytes[1] == 0x4F.toByte()
```
**Fix:** Dùng thư viện decode JPEG2000 (ví dụ `com.github.axet:j2k:0.3.1`)
hoặc chỉ hiển thị nếu là JPEG thuần.

### Timeout khi đọc DG2 (ảnh lớn)
**Fix:** `isoDep.setTimeout(10000)` sau `ps.open()`.

---

## 11. Input thủ công (không dùng camera)

Nếu camera OCR sai, cho người dùng nhập tay:

```kotlin
// Từ 3 trường: số CCCD, ngày sinh, ngày hết hạn
fun buildManualMrzData(cccd: String, dob: String, expiry: String): MrzData {
    // cccd: 12 số, dob: YYMMDD, expiry: YYMMDD
    val docNum9 = cccd.take(9).padEnd(9, '<')
    val docCheck = MrzParser.calculateCheckDigit(docNum9)
    val dobCheck = MrzParser.calculateCheckDigit(dob)
    val expiryCheck = MrzParser.calculateCheckDigit(expiry)
    val opt1 = cccd.drop(9).padEnd(15, '<').take(15)  // 3 số cuối + padding

    val line1 = "ID" + "VNM" + docNum9 + docCheck + opt1
    val line2 = dob + dobCheck + "<" + expiry + expiryCheck + "VNM" + "<<<<<<<<<<<" + "?"
    val line3 = "<".repeat(30)  // tên để trống

    return MrzParser.parse(line1, line2, line3)
}
```

> **Lưu ý:** `isValid` sẽ `false` ở line 3 nếu tên để trống nhưng
> `documentNumber`, `dateOfBirth`, `expiryDate` vẫn dùng được cho BACKey.

---

## 12. Yêu cầu tối thiểu

| Thứ | Giá trị |
|-----|---------|
| minSdk | 24 (Android 7.0) |
| compileSdk | 33+ |
| Java target | 11 |
| NFC | Bắt buộc phần cứng |
| Camera | Bắt buộc phần cứng |
| Network | Không cần |

---

## 13. Checklist tích hợp vào app mới

- [ ] Thêm dependencies vào `build.gradle.kts`
- [ ] Thêm `configurations.all { exclude bcprov-jdk15on }`
- [ ] Thêm `packaging { resources { excludes += BCKEY.* } }`
- [ ] Thêm permissions (`CAMERA`, `NFC`) vào `AndroidManifest.xml`
- [ ] Tạo file `res/xml/nfc_tech_filter.xml`
- [ ] Khai báo NFC intent-filter trong activity
- [ ] Copy data classes: `MrzData`, `NfcChipData`
- [ ] Copy `MrzParser.kt` (object, không phụ thuộc Android)
- [ ] Copy `MrzCameraAnalyzer.kt` (phụ thuộc CameraX + ML Kit)
- [ ] Copy `NfcChipReader.kt` (phụ thuộc jMRTD + scuba)
- [ ] Gọi `nfcAdapter.enableForegroundDispatch()` trong `onResume()`
- [ ] Gọi `nfcAdapter.disableForegroundDispatch()` trong `onPause()`
- [ ] Xử lý `onNewIntent()` để nhận NFC tag
- [ ] Truyền `mrzData` từ bước quét camera sang bước đọc NFC
- [ ] Yêu cầu runtime permission `CAMERA` trước khi mở camera
