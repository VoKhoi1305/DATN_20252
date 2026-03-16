# SCREEN: Đăng nhập (SCR-001)

## Metadata

| Field         | Value                                        |
|---------------|----------------------------------------------|
| Route         | /login                                       |
| Page title    | "Đăng nhập — SMTTS"                          |
| Auth required | false                                        |
| Layout        | AuthLayout                                   |
| Redirect      | Nếu đã login (có token hợp lệ) → /dashboard |

---

## AuthLayout structure

```tsx
// <div className="flex flex-col min-h-screen">
//   <div className="h-[3px] bg-red-700 flex-none" />          ← accent bar
//   <div className="flex flex-1">
//     <div className="hidden lg:flex w-[45%] bg-zinc-950
//                     flex-col items-center justify-center" />  ← panel trái
//     <div className="flex-1 bg-white
//                     flex flex-col items-center justify-center
//                     px-6 py-8" />                             ← panel phải (form)
//   </div>
// </div>
```

---

## Layout của màn hình này

```
Desktop (≥1024px):
┌──────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ accent bar 3px
├────────────────────────────┬─────────────────────────────────────┤
│                            │                                     │
│   PANEL TRÁI               │   PANEL PHẢI                        │
│   bg-zinc-950              │   bg-white                          │
│   w-[45%]                  │   flex-1                            │
│                            │                                     │
│   ┌──────────────────┐    │   ┌───────────────────────────────┐ │
│   │                  │    │   │                               │ │
│   │  [Logo 48×48]    │    │   │  "Đăng nhập hệ thống"        │ │  ← title
│   │                  │    │   │  "Nhập tài khoản để tiếp tục" │ │  ← subtitle
│   │  SMTTS           │    │   │                               │ │
│   │  text-xl/600     │    │   │  ┌───────────────────────┐   │ │
│   │  text-zinc-50    │    │   │  │ Tên đăng nhập         │   │ │  ← CMP-INPUT
│   │                  │    │   │  │ [________________]     │   │ │
│   │  "Hệ thống Quản │    │   │  └───────────────────────┘   │ │
│   │   lý, Theo dõi  │    │   │                               │ │
│   │   và Truy vết    │    │   │  ┌───────────────────────┐   │ │
│   │   Đối tượng"     │    │   │  │ Mật khẩu         [👁] │   │ │  ← CMP-INPUT password
│   │  text-sm/400     │    │   │  │ [________________]     │   │ │
│   │  text-zinc-400   │    │   │  └───────────────────────┘   │ │
│   │                  │    │   │                               │ │
│   └──────────────────┘    │   │  [■■■■■ Đăng nhập ■■■■■]    │ │  ← CMP-BTN primary lg fullWidth
│                            │   │                               │ │
│                            │   │                               │ │
│                            │   │  max-w-[380px] w-full        │ │
│                            │   └───────────────────────────────┘ │
│                            │                                     │
├────────────────────────────┴─────────────────────────────────────┤
│                    © 2026 SMTTS                                  │  ← footer
└──────────────────────────────────────────────────────────────────┘

Mobile (<1024px):
┌──────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│                                                                  │
│   bg-white, full width                                          │
│   flex flex-col items-center justify-center                      │
│   px-6 py-8                                                      │
│                                                                  │
│   [Logo 36×36] SMTTS  ← inline, text-zinc-900, mb-8            │
│                                                                  │
│   "Đăng nhập hệ thống"                                          │
│   "Nhập tài khoản để tiếp tục"                                  │
│                                                                  │
│   [Tên đăng nhập]                                                │
│   [________________]                                             │
│                                                                  │
│   [Mật khẩu]                                                     │
│   [________________]                                             │
│                                                                  │
│   [■■■■■ Đăng nhập ■■■■■]                                      │
│                                                                  │
│   w-full max-w-[380px]                                           │
│                                                                  │
│                    © 2026 SMTTS                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Components sử dụng

| Component  | ID        | Variant   | Props đặc biệt                                       |
|------------|-----------|-----------|-------------------------------------------------------|
| AuthLayout | LAY-AUTH  | —         | title="Đăng nhập hệ thống", subtitle="Nhập tài khoản để tiếp tục" |
| Input      | CMP-INPUT | text      | label="Tên đăng nhập", required, placeholder="Nhập tên đăng nhập" |
| Input      | CMP-INPUT | password  | label="Mật khẩu", required, placeholder="Nhập mật khẩu", rightIcon=eye toggle |
| Button     | CMP-BTN   | primary   | size=lg, fullWidth=true, type=submit, loading khi gọi API |
| Toast      | CMP-TOAST | error     | Hiện khi API trả lỗi                                 |

---

## Form Fields

### Tên đăng nhập
- Component: CMP-INPUT
- type: text
- label: "Tên đăng nhập"
- placeholder: "Nhập tên đăng nhập"
- required: true
- monospace: false
- autoComplete: "username"
- autoFocus: true (focus khi load trang)
- validation:
  - required → "Vui lòng nhập tên đăng nhập"
  - minLength(3) → "Tên đăng nhập tối thiểu 3 ký tự"

### Mật khẩu
- Component: CMP-INPUT
- type: password
- label: "Mật khẩu"
- placeholder: "Nhập mật khẩu"
- required: true
- monospace: false
- autoComplete: "current-password"
- rightIcon: eye toggle (click → show/hide password)
- validation:
  - required → "Vui lòng nhập mật khẩu"
  - minLength(6) → "Mật khẩu tối thiểu 6 ký tự"

### Form layout & spacing
```
form: flex flex-col gap-4 (16px giữa các field)

[Input: Tên đăng nhập]     ← gap-4
[Input: Mật khẩu]          ← gap-4
                            ← gap-6 (24px trước nút submit)
[Button: Đăng nhập]
```

### Form validation
- Trigger: onBlur cho từng field + onSubmit cho toàn form
- Validate client-side trước, chỉ gọi API khi form hợp lệ
- Lỗi hiện dưới field tương ứng (text-xs text-red-700 mt-1)
- Khi submit lỗi API → giữ nguyên dữ liệu form, KHÔNG xoá

---

## API Integration

### Đăng nhập — POST /api/v1/auth/login

- Trigger: Click nút "Đăng nhập" hoặc Enter khi focus trong form
- Request headers:
  ```
  Content-Type: application/json
  ```
- Request body:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- Response 200:
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "user": {
      "id": "string",
      "name": "string",
      "role": "string",
      "dataScope": "string",
      "otpEnabled": true,
      "otpVerified": false
    },
    "requireOtp": true
  }
  ```
  - Nếu `requireOtp === true`:
    - Lưu accessToken tạm vào memory (chưa lưu persistent)
    - Navigate: /login/otp bằng router.push
  - Nếu `requireOtp === false` (edge case: OTP chưa bật — lần đầu):
    - Nếu `user.otpEnabled === false`:
      - Navigate: /setup-otp bằng router.replace
    - Nếu `user.otpEnabled === true` && `otpVerified === true`:
      - Lưu token persistent (localStorage/cookie)
      - Navigate: /dashboard bằng router.replace

- Response errors:

  | Status | Condition               | Hiển thị                                                        |
  |--------|-------------------------|-----------------------------------------------------------------|
  | 400    | Thiếu field             | Validation client-side đã chặn (không xảy ra)                  |
  | 401    | Sai username/password   | Toast error: "Tên đăng nhập hoặc mật khẩu không đúng"          |
  | 403    | Tài khoản bị khoá      | Toast error: "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên." |
  | 429    | Quá nhiều lần thử      | Toast error: "Quá nhiều lần thử. Vui lòng đợi 5 phút."        |
  | 500    | Lỗi server             | Toast error: "Lỗi hệ thống. Vui lòng thử lại sau."            |

  - Toast: variant=error, duration=5000ms, vị trí top-right
  - Form: giữ nguyên username, XOÁ password field (bảo mật)
  - Focus trả lại password field sau lỗi 401

---

## States màn hình

| State     | Mô tả                                                                        |
|-----------|-------------------------------------------------------------------------------|
| idle      | Form trống, nút "Đăng nhập" enabled, không có lỗi                            |
| filling   | User đang nhập, validation onBlur cho từng field                              |
| loading   | Sau submit: nút "Đăng nhập" loading (spinner + text, disabled), inputs disabled |
| error-field | Validation fail: error text đỏ dưới field tương ứng                        |
| error-api | API fail: Toast error hiện, form giữ username, xoá password, focus password  |
| redirect  | API success: chuyển trang (không hiện gì thêm, tránh flash)                  |

---

## Navigation

| Trigger                          | Destination    | Method          |
|----------------------------------|----------------|-----------------|
| Đăng nhập thành công + cần OTP  | /login/otp     | router.push     |
| Đăng nhập thành công + chưa setup OTP | /setup-otp | router.replace |
| Đăng nhập thành công + OTP đã verify  | /dashboard | router.replace |
| Đã có token hợp lệ (vào /login) | /dashboard     | router.replace  |

---

## Responsive

| Breakpoint      | Thay đổi                                                  |
|-----------------|------------------------------------------------------------|
| Desktop ≥1024px | 2 panel: trái (45%, zinc-950, branding) + phải (55%, white, form) |
| Mobile <1024px  | Panel trái ẩn. Logo nhỏ (36px) + tên inline phía trên form. Full width. px-6 py-8 |

---

## Edge Cases

| # | Trường hợp | Xử lý |
|---|-----------|--------|
| 1 | User đã đăng nhập (có token) vào /login | Kiểm tra token → hợp lệ → redirect /dashboard ngay. Token hết hạn → hiện form bình thường |
| 2 | URL có ?session=expired | Hiện Toast info: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." (duration 4000ms) khi load trang |
| 3 | URL có ?returnUrl=/ho-so/123 | Sau login thành công → redirect returnUrl thay vì /dashboard |
| 4 | User nhấn Enter trong input | Submit form (tương đương click nút Đăng nhập) |
| 5 | Paste username/password | Chấp nhận bình thường, trigger validation onBlur |
| 6 | Password manager autofill | autoComplete attributes đúng → browser autofill hoạt động |
| 7 | Tài khoản bị khoá | API 403 → Toast rõ ràng: "Tài khoản đã bị khoá..." → KHÔNG hiện thêm form gì |
| 8 | Mạng chậm (>2s) | Nút loading (spinner), inputs disabled, KHÔNG hiện skeleton |
| 9 | Mất mạng giữa chừng | Toast error: "Không có kết nối mạng. Vui lòng thử lại." |
| 10 | Brute force (429) | Toast: "Quá nhiều lần thử. Vui lòng đợi 5 phút." Nút Đăng nhập disabled 5 phút (countdown optional) |

---

## Ghi chú thiết kế bổ sung

### Panel trái — Branding content
```
Nội dung cố định (không thay đổi giữa SCR-001, SCR-002, SCR-003):

  [Logo SVG 48×48]                     ← logo hệ thống
  
  "SMTTS"                              ← text-xl font-semibold text-zinc-50, mt-4
  
  "Hệ thống Quản lý,                  ← text-sm text-zinc-400, mt-2
   Theo dõi và Truy vết               ← text-center, max-w-[280px]
   Đối tượng thuộc Diện Quản lý"      ← leading-relaxed
```

### Form container
```
max-w-[380px] w-full

Title:    "Đăng nhập hệ thống"        ← text-lg font-semibold text-zinc-900
Subtitle: "Nhập tài khoản để tiếp tục" ← text-[13px] text-zinc-500 mt-1 mb-6
```

### Nút Đăng nhập
```
CMP-BTN variant=primary size=lg fullWidth=true type=submit

Loading state:
  [spinner] Đang đăng nhập...          ← spinner thay leftIcon, text đổi
  disabled, cursor-not-allowed
```

### Footer
```
"© 2026 SMTTS"
text-[11px] text-zinc-500 text-center
py-4 (cố định dưới cùng)
```
