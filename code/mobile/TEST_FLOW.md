# Luồng Test: Đăng ký kích hoạt & Đăng nhập cho Đối tượng (Mobile)

## Chuẩn bị môi trường

### 1. Khởi động Backend & Database
```bash
cd code/docker
docker compose up -d

cd code/backend
npm run start:dev
```

### 2. Seed dữ liệu test cho mobile
```bash
# Chạy migration seed đối tượng test
docker exec -i smtts-postgres-main psql -U smtts_user -d smtts_main < code/scripts/migrations/008_seed_mobile_test_subjects.sql
```

### 3. Dữ liệu test có sẵn

| Mã hồ sơ | CCCD | Tên | Trạng thái |
|-----------|------|-----|-----------|
| `HS-2026-0001` | `079200099001` | Trần Minh Tuấn | KHOI_TAO (sẵn sàng kích hoạt) |
| `HS-2026-0002` | `079200099002` | Nguyễn Thị Hạnh | KHOI_TAO (sẵn sàng kích hoạt) |
| `HS-2026-0003` | `079200099003` | Phạm Văn Long | KHOI_TAO (sẵn sàng kích hoạt) |
| `HS-2026-0004` | `079200099004` | Lê Thị Ngọc | KHOI_TAO (sẵn sàng kích hoạt) |
| `HS-2026-0005` | `079200099005` | Hoàng Đức Anh | KHOI_TAO (sẵn sàng kích hoạt) |

### 4. Cấu hình Mobile
- Chạy app trên Android Emulator (API base URL mặc định: `http://10.0.2.2:3001/api/v1/`)
- Nếu dùng thiết bị thật: sửa `API_BASE_URL` trong `app/build.gradle.kts` thành IP máy chủ backend

---

## LUỒNG 1: Kích hoạt tài khoản lần đầu

### Test Case 1.1: Kích hoạt thành công
**Mục tiêu**: Đối tượng kích hoạt tài khoản lần đầu thành công

**Bước thực hiện**:
1. Mở app → Màn hình Đăng nhập hiển thị
2. Nhấn link **"Kích hoạt tài khoản lần đầu"** ở dưới nút Đăng nhập
3. Màn hình Kích hoạt hiển thị với 4 trường:
   - Mã hồ sơ
   - Số CCCD
   - Mật khẩu mới
   - Xác nhận mật khẩu
4. Nhập thông tin:
   - Mã hồ sơ: `HS-2026-0001`
   - Số CCCD: `079200099001`
   - Mật khẩu: `Test@123`
   - Xác nhận: `Test@123`
5. Nhấn **"Kích hoạt"**

**Kết quả mong đợi**:
- Snackbar hiển thị: "Kích hoạt tài khoản thành công!"
- Chuyển sang màn hình chính (MainActivity)
- Hiển thị thông tin: "Xin chào, Trần Minh Tuấn"
- Trong database:
  - Bảng `users`: tạo mới user với username=`079200099001`, role=`SUBJECT`
  - Bảng `subjects`: `user_account_id` được gán, `lifecycle` = `ENROLLMENT`

---

### Test Case 1.2: Validation — Thiếu thông tin
**Bước thực hiện**:
1. Vào màn hình Kích hoạt
2. Nhấn **"Kích hoạt"** ngay (không nhập gì)

**Kết quả mong đợi**:
- Hiển thị lỗi dưới mỗi trường:
  - "Vui lòng nhập mã hồ sơ"
  - "Vui lòng nhập số CCCD"
  - "Vui lòng nhập mật khẩu"
  - "Vui lòng xác nhận mật khẩu"
- Không gọi API

---

### Test Case 1.3: Validation — CCCD sai định dạng
**Bước thực hiện**:
1. Nhập CCCD: `12345` (ít hơn 12 số)
2. Nhấn Kích hoạt

**Kết quả mong đợi**:
- Lỗi: "Số CCCD phải có đúng 12 chữ số"
- Không gọi API

---

### Test Case 1.4: Validation — Mật khẩu yếu
**Bước thực hiện**:
1. Nhập đầy đủ mã hồ sơ + CCCD
2. Mật khẩu: `123456` (không có chữ hoa, chữ thường)
3. Xác nhận: `123456`

**Kết quả mong đợi**:
- Lỗi: "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số"

---

### Test Case 1.5: Validation — Mật khẩu không khớp
**Bước thực hiện**:
1. Mật khẩu: `Test@123`
2. Xác nhận: `Test@456`

**Kết quả mong đợi**:
- Lỗi: "Mật khẩu xác nhận không khớp"

---

### Test Case 1.6: Lỗi API — Mã hồ sơ không tồn tại
**Bước thực hiện**:
1. Mã hồ sơ: `HS-9999-9999` (không có trong DB)
2. CCCD: `079200099001`
3. Mật khẩu / Xác nhận: `Test@123`
4. Nhấn Kích hoạt

**Kết quả mong đợi**:
- Snackbar: "Không tìm thấy hồ sơ với mã này"
- Form giữ nguyên dữ liệu

---

### Test Case 1.7: Lỗi API — CCCD không khớp với hồ sơ
**Bước thực hiện**:
1. Mã hồ sơ: `HS-2026-0002`
2. CCCD: `079200099001` (CCCD của subject 1, không phải subject 2)
3. Mật khẩu / Xác nhận: `Test@123`
4. Nhấn Kích hoạt

**Kết quả mong đợi**:
- Snackbar: "Số CCCD không khớp với hồ sơ"

---

### Test Case 1.8: Lỗi API — Tài khoản đã kích hoạt
**Điều kiện**: Đã chạy Test Case 1.1 thành công (HS-2026-0001 đã kích hoạt)

**Bước thực hiện**:
1. Clear app data hoặc đăng xuất
2. Vào màn hình Kích hoạt
3. Nhập lại: HS-2026-0001 / 079200099001 / Test@123 / Test@123
4. Nhấn Kích hoạt

**Kết quả mong đợi**:
- Snackbar: "Tài khoản đã được kích hoạt trước đó. Vui lòng đăng nhập."

---

### Test Case 1.9: Navigation — Quay lại Đăng nhập
**Bước thực hiện**:
1. Vào màn hình Kích hoạt
2. Nhấn link **"Đã có tài khoản? Đăng nhập"**

**Kết quả mong đợi**:
- Quay về màn hình Đăng nhập

---

## LUỒNG 2: Đăng nhập cho Đối tượng (sau khi đã kích hoạt)

**Điều kiện**: Đã kích hoạt thành công HS-2026-0001 ở Luồng 1

### Test Case 2.1: Đăng nhập thành công
**Bước thực hiện**:
1. Clear app data (hoặc đăng xuất)
2. Mở app → Màn hình Đăng nhập
3. Nhập:
   - Tên đăng nhập: `079200099001` (số CCCD là username)
   - Mật khẩu: `Test@123`
4. Nhấn **"Đăng nhập"**

**Kết quả mong đợi**:
- Chuyển sang màn hình chính (không cần OTP vì role=SUBJECT)
- Hiển thị: "Xin chào, Trần Minh Tuấn"
- Token được lưu trong SharedPreferences

---

### Test Case 2.2: Đăng nhập — Sai mật khẩu
**Bước thực hiện**:
1. Tên đăng nhập: `079200099001`
2. Mật khẩu: `WrongPass123`
3. Nhấn Đăng nhập

**Kết quả mong đợi**:
- Snackbar: "Tên đăng nhập hoặc mật khẩu không đúng"
- Trường mật khẩu bị xóa, focus về trường mật khẩu
- Trường username giữ nguyên

---

### Test Case 2.3: Đăng nhập — Validation thiếu thông tin
**Bước thực hiện**:
1. Để trống cả 2 trường
2. Nhấn Đăng nhập

**Kết quả mong đợi**:
- Lỗi: "Vui lòng nhập tên đăng nhập" và "Vui lòng nhập mật khẩu"

---

### Test Case 2.4: Đăng nhập — Username quá ngắn
**Bước thực hiện**:
1. Tên đăng nhập: `ab` (2 ký tự)
2. Mật khẩu: `Test@123`
3. Nhấn Đăng nhập

**Kết quả mong đợi**:
- Lỗi: "Tên đăng nhập tối thiểu 3 ký tự"

---

### Test Case 2.5: Đăng nhập — Khoá tài khoản (5 lần sai)
**Bước thực hiện**:
1. Đăng nhập 5 lần liên tiếp với mật khẩu sai
2. Lần thứ 5

**Kết quả mong đợi**:
- Snackbar: "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên."
- Tài khoản bị khoá 5 phút trong database (`locked_until` được set)

---

### Test Case 2.6: Đã đăng nhập — Auto redirect
**Điều kiện**: Đã đăng nhập thành công, token còn hạn

**Bước thực hiện**:
1. Tắt app
2. Mở lại app

**Kết quả mong đợi**:
- Skip màn hình Đăng nhập, chuyển thẳng sang màn hình chính
- Không flash màn hình đăng nhập

---

### Test Case 2.7: Token hết hạn
**Điều kiện**: Token access đã hết hạn (>15 phút)

**Bước thực hiện**:
1. Mở app

**Kết quả mong đợi**:
- Hiển thị màn hình Đăng nhập (token expired)
- Người dùng cần đăng nhập lại

---

### Test Case 2.8: Nhấn Enter để submit
**Bước thực hiện**:
1. Nhập username + password
2. Nhấn phím "Done" trên bàn phím ảo (tại trường password)

**Kết quả mong đợi**:
- Form được submit (tương đương nhấn nút Đăng nhập)

---

## LUỒNG 3: Đăng nhập cho Cán bộ (Tham khảo)

Cán bộ dùng Web Dashboard, nhưng nếu test trên mobile:

### Test Case 3.1: Đăng nhập cán bộ → Yêu cầu OTP
**Bước thực hiện**:
1. Tên đăng nhập: `canbo.coso.bn`
2. Mật khẩu: `Admin@123`
3. Nhấn Đăng nhập

**Kết quả mong đợi**:
- Snackbar: "Vui lòng xác thực OTP để tiếp tục" (OTP screen chưa triển khai)
- Giữ nguyên màn hình đăng nhập

---

## LUỒNG 4: Kiểm tra mạng & Edge cases

### Test Case 4.1: Mất mạng
**Bước thực hiện**:
1. Tắt WiFi / Mobile data
2. Thử đăng nhập hoặc kích hoạt

**Kết quả mong đợi**:
- Snackbar: "Không có kết nối mạng. Vui lòng thử lại."

---

### Test Case 4.2: Server không hoạt động
**Bước thực hiện**:
1. Dừng backend server
2. Thử đăng nhập

**Kết quả mong đợi**:
- Snackbar: "Không có kết nối mạng. Vui lòng thử lại." hoặc "Lỗi hệ thống. Vui lòng thử lại sau."

---

### Test Case 4.3: Loading state
**Bước thực hiện**:
1. Nhấn Đăng nhập / Kích hoạt

**Kết quả mong đợi**:
- Nút đổi text: "Đang đăng nhập..." / "Đang kích hoạt..."
- Tất cả trường input bị disabled
- Bàn phím tự đóng
- Nút bị disabled (không nhấn lại được)

---

## Kiểm tra trên Database (sau khi test)

```sql
-- Kiểm tra user account được tạo
SELECT id, username, full_name, role, status, last_login_at
FROM users WHERE role = 'SUBJECT';

-- Kiểm tra subject đã link user account
SELECT code, full_name, user_account_id, lifecycle, enrollment_date
FROM subjects WHERE code IN ('HS-2026-0001', 'HS-2026-0002');

-- Kiểm tra refresh token
SELECT user_id, revoked, expires_at FROM refresh_tokens
WHERE user_id IN (SELECT id FROM users WHERE role = 'SUBJECT');
```

---

## Tóm tắt ma trận test

| # | Test Case | Loại | Kết quả mong đợi |
|---|-----------|------|------------------|
| 1.1 | Kích hoạt thành công | Happy path | Tạo account → Login → Main |
| 1.2 | Thiếu thông tin | Validation | Lỗi dưới field |
| 1.3 | CCCD sai định dạng | Validation | Lỗi dưới field |
| 1.4 | Mật khẩu yếu | Validation | Lỗi dưới field |
| 1.5 | Mật khẩu không khớp | Validation | Lỗi dưới field |
| 1.6 | Mã hồ sơ không tồn tại | API 404 | Snackbar lỗi |
| 1.7 | CCCD không khớp | API 400 | Snackbar lỗi |
| 1.8 | Đã kích hoạt rồi | API 400 | Snackbar lỗi |
| 1.9 | Quay lại đăng nhập | Navigation | Về login |
| 2.1 | Đăng nhập thành công | Happy path | Vào main |
| 2.2 | Sai mật khẩu | API 401 | Snackbar + clear pw |
| 2.3 | Thiếu thông tin | Validation | Lỗi dưới field |
| 2.4 | Username quá ngắn | Validation | Lỗi dưới field |
| 2.5 | Khoá tài khoản | API 403 | Snackbar lỗi |
| 2.6 | Auto redirect | Session | Skip login |
| 2.7 | Token hết hạn | Session | Hiện login |
| 2.8 | Enter submit | UX | Submit form |
| 4.1 | Mất mạng | Network | Snackbar lỗi |
| 4.2 | Server down | Network | Snackbar lỗi |
| 4.3 | Loading state | UX | Button + input disabled |
