# Các luồng nghiệp vụ đã bỏ qua tạm thời

> **Ngày tạo**: 2026-03-31
> **Mục đích**: Ghi lại các luồng nghiệp vụ được bỏ qua trong quá trình phát triển SA-05 → SA-09, để sau này dễ dàng quay lại xử lý.

---

## 1. Luồng kích hoạt lần đầu (First-time Enrollment Check)

### Mô tả

Theo đúng luồng nghiệp vụ trong `MOBILE_APP_SPEC.md`, khi đối tượng đăng nhập lần đầu hoặc chưa hoàn thành đăng ký sinh trắc học (NFC + Khuôn mặt), hệ thống phải:

1. Kiểm tra `lifecycle` của đối tượng (từ API `GET /subjects/:id` hoặc `GET /enrollment/status`)
2. Nếu `lifecycle == ENROLLMENT` (chưa hoàn thành enrollment) → **bắt buộc chuyển** đến `EnrollmentActivity`
3. Nếu `enrollmentComplete == false` → **không cho phép** truy cập các chức năng SA-05 → SA-09
4. Chỉ khi `lifecycle == DANG_QUAN_LY` (đang được quản lý) thì mới cho phép sử dụng đầy đủ

### Hiện tại đã bỏ qua gì

- **MainActivity**: Không kiểm tra enrollment status trước khi hiển thị dashboard. Người dùng có thể truy cập tất cả chức năng ngay sau khi đăng nhập.
- **ProfileActivity**: Không kiểm tra `lifecycle` trước khi load profile. API có thể trả về dữ liệu không đầy đủ nếu enrollment chưa xong.
- **HistoryActivity**: Không kiểm tra — nếu chưa enrollment thì sẽ không có events, hiển thị tháng trống.
- **GeofenceActivity**: Không kiểm tra — nếu chưa có scenario thì hiển thị lỗi "Chưa có khu vực quản lý".
- **NotificationActivity**: Không kiểm tra — hoạt động bình thường vì notifications không phụ thuộc enrollment.
- **RequestListActivity / CreateRequestActivity**: Không kiểm tra — API backend nên validate ở server-side.

### Cách thêm lại luồng kiểm tra

#### Bước 1: Thêm hàm kiểm tra enrollment vào `TokenManager`

```kotlin
// Trong TokenManager.kt, thêm:
fun getSubjectLifecycle(): String? {
    // Lưu lifecycle khi login/refresh
    return prefs.getString("smtts_subject_lifecycle", null)
}

fun setSubjectLifecycle(lifecycle: String) {
    prefs.edit().putString("smtts_subject_lifecycle", lifecycle).apply()
}

fun isEnrollmentComplete(): Boolean {
    val lifecycle = getSubjectLifecycle()
    return lifecycle == "DANG_QUAN_LY" || lifecycle == "TAI_HOA_NHAP" || lifecycle == "KET_THUC"
}
```

#### Bước 2: Cập nhật `MainActivity.onCreate()` để kiểm tra

```kotlin
// Trong MainActivity.kt, sau dòng `if (!tokenManager.isAuthenticated())`:
override fun onCreate(savedInstanceState: Bundle?) {
    // ... existing code ...

    // Guard: if not authenticated
    if (!tokenManager.isAuthenticated()) {
        navigateToLogin()
        return
    }

    // TODO: Thêm kiểm tra enrollment
    // Gọi API GET /enrollment/status hoặc dùng cached lifecycle
    if (!tokenManager.isEnrollmentComplete()) {
        // Chuyển đến EnrollmentActivity bắt buộc
        val intent = Intent(this, EnrollmentActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
        return
    }

    setContentView(R.layout.activity_main)
    // ... rest of setup ...
}
```

#### Bước 3: Lưu lifecycle sau khi login thành công

```kotlin
// Trong LoginViewModel.handleLoginSuccess(), thêm:
// Sau khi lưu tokens và user info:
lifecycleScope.launch {
    try {
        val statusResponse = ApiClient.enrollmentApi.getEnrollmentStatus()
        if (statusResponse.isSuccessful) {
            val status = statusResponse.body()?.data
            status?.lifecycle?.let { tokenManager.setSubjectLifecycle(it) }
        }
    } catch (_: Exception) { }
}
```

#### Bước 4: (Tùy chọn) Thêm guard vào từng Activity

Nếu muốn bảo vệ từng screen riêng lẻ:

```kotlin
// Thêm vào đầu onCreate() của ProfileActivity, HistoryActivity, etc.
if (!tokenManager.isEnrollmentComplete()) {
    Toast.makeText(this, "Vui lòng hoàn thành đăng ký sinh trắc học trước", Toast.LENGTH_LONG).show()
    finish()
    return
}
```

---

## 2. Luồng quét NFC (NFC Chip Reading)

### Mô tả

Chức năng quét NFC chip trên CCCD (`CccdNfcReader.kt`) sử dụng thư viện JMRTD với giao thức PACE/BAC để đọc DG1 từ chip. Hiện tại code đã có sẵn nhưng **chưa tìm được tài liệu đầy đủ** để hoàn thiện.

### Hiện tại

- `BaseNfcActivity` đã implement NFC foreground dispatch
- `CccdNfcReader` đã có code đọc chip (PACE + BAC authentication, DG1 parsing)
- `NfcResultBottomSheet` hiển thị kết quả quét
- **Vấn đề**: Chưa test được với thẻ CCCD thật, có thể cần điều chỉnh PACE/BAC parameters

### Khi quay lại xử lý

1. Test với thẻ CCCD gắn chip thật
2. Kiểm tra PACE protocol có hoạt động đúng không (một số thẻ chỉ hỗ trợ BAC)
3. Verify SOD (Security Object of Document) cho Passive Authentication
4. Xử lý các edge cases: thẻ không có chip, chip hỏng, đọc timeout

---

## 3. Tích hợp Google Maps cho SA-06

### Mô tả

SA-06 (Khu vực quản lý) hiện tại hiển thị thông tin geofence dạng **text only** với placeholder cho bản đồ.

### Cần làm khi quay lại

1. Thêm dependency Google Maps SDK vào `build.gradle.kts`:
   ```kotlin
   implementation("com.google.android.gms:play-services-maps:18.2.0")
   ```
2. Đăng ký API key trên Google Cloud Console
3. Thêm API key vào `AndroidManifest.xml`:
   ```xml
   <meta-data
       android:name="com.google.android.geo.API_KEY"
       android:value="YOUR_API_KEY" />
   ```
4. Thay thế placeholder trong `activity_geofence.xml` bằng `MapView` hoặc `SupportMapFragment`
5. Vẽ geofence circle/polygon lên bản đồ
6. Hiển thị vị trí hiện tại của người dùng (cần thêm permission `ACCESS_FINE_LOCATION`)
7. Tính khoảng cách từ vị trí hiện tại đến trung tâm geofence (hàm `distanceBetween` đã có trong `GeofenceViewModel`)

---

## 4. Firebase Cloud Messaging (FCM) cho SA-08

### Mô tả

SA-08 (Thông báo) hiện tại chỉ load danh sách thông báo từ API. Chưa tích hợp push notification.

### Cần làm khi quay lại

1. Thêm Firebase SDK vào project
2. Tạo `SMTTSFirebaseService extends FirebaseMessagingService`
3. Đăng ký FCM token với backend: `POST /notifications/register-device`
4. Xử lý local notifications (nhắc điểm danh 30 phút trước cửa sổ)
5. Deep linking từ notification vào đúng screen

---

## Tổng kết các file đã tạo/sửa

### Files mới (SA-05 → SA-09):

| Feature | Files |
|---------|-------|
| **Data Models** | `SubjectModels.kt`, `EventModels.kt`, `GeofenceModels.kt`, `NotificationModels.kt`, `RequestModels.kt` |
| **API Interfaces** | `SubjectApi.kt`, `EventApi.kt`, `GeofenceApi.kt`, `NotificationApi.kt`, `RequestApi.kt` |
| **SA-05 Profile** | `ProfileActivity.kt`, `ProfileViewModel.kt`, `activity_profile.xml`, `item_family_member.xml`, `item_legal_doc.xml` |
| **SA-06 Geofence** | `GeofenceActivity.kt`, `GeofenceViewModel.kt`, `activity_geofence.xml` |
| **SA-07 History** | `HistoryActivity.kt`, `HistoryViewModel.kt`, `HistoryAdapter.kt`, `activity_history.xml`, `item_history.xml` |
| **SA-08 Notification** | `NotificationActivity.kt`, `NotificationViewModel.kt`, `NotificationAdapter.kt`, `activity_notification.xml`, `item_notification.xml` |
| **SA-09 Request** | `RequestListActivity.kt`, `RequestListViewModel.kt`, `RequestAdapter.kt`, `CreateRequestActivity.kt`, `CreateRequestViewModel.kt`, `activity_request_list.xml`, `activity_create_request.xml`, `item_request.xml` |
| **Drawables** | `ic_notification.xml`, `ic_request.xml`, `ic_location.xml`, `ic_arrow_back.xml`, `ic_calendar.xml`, `ic_add.xml`, `ic_chevron_left.xml`, `ic_chevron_right.xml`, `bg_icon_circle_teal.xml`, `bg_icon_circle_orange.xml`, `bg_rounded_card.xml` |

### Files đã sửa:

| File | Thay đổi |
|------|----------|
| `ApiClient.kt` | Thêm 5 API instances mới (subject, event, geofence, notification, request) |
| `AndroidManifest.xml` | Thêm 6 activities mới |
| `MainActivity.kt` | Wire navigation cho History, Profile, Notification, Request, Geofence |
| `activity_main.xml` | Thêm 3 quick action cards (Notification, Request, Geofence) |
| `strings.xml` | Thêm ~100 strings cho 5 màn hình mới |
| `colors.xml` | Thêm amber_600, blue_600 |
