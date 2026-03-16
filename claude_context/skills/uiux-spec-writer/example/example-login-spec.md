# UI/UX SPEC — Ví dụ hoàn chỉnh: Màn hình Đăng nhập
# Dùng file này làm mẫu để viết spec cho các màn hình khác

---

# DESIGN TOKENS (rút gọn — xem file đầy đủ ở 01-design-tokens.md)

## Colors
| Token               | Hex       | Tailwind           |
|---------------------|-----------|--------------------|
| color-primary       | #2563EB   | blue-600           |
| color-primary-hover | #1D4ED8   | blue-700           |
| color-error         | #DC2626   | red-600            |
| color-error-bg      | #FEF2F2   | red-50             |
| color-text-primary  | #111827   | gray-900           |
| color-text-secondary| #6B7280   | gray-500           |
| color-border        | #E5E7EB   | gray-200           |
| color-bg-page       | #F9FAFB   | gray-50            |

## Typography
| Token        | Size  | Weight | Tailwind               |
|--------------|-------|--------|------------------------|
| text-h2      | 24px  | 600    | text-2xl font-semibold |
| text-body-sm | 14px  | 400    | text-sm                |
| text-label   | 14px  | 500    | text-sm font-medium    |

## Spacing
| Token   | Value | Tailwind |
|---------|-------|----------|
| space-4 | 16px  | p-4      |
| space-6 | 24px  | p-6      |
| space-8 | 32px  | p-8      |

---

# COMPONENT: Button (CMP-BTN) — chỉ liệt kê variant dùng trong màn hình này

## Variant: primary, size: lg, fullWidth: true

### States
| State    | Classes Tailwind                                                     |
|----------|----------------------------------------------------------------------|
| default  | `bg-blue-600 text-white h-12 px-6 text-base w-full rounded-lg font-medium` |
| hover    | `hover:bg-blue-700`                                                  |
| focus    | `focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2` |
| disabled | `disabled:opacity-50 disabled:cursor-not-allowed`                   |
| loading  | Spinner (animate-spin) + text "Đang xử lý...", button disabled      |

---

# COMPONENT: Input (CMP-INPUT) — variant dùng trong màn hình này

## Email Input
| State   | Border               | Background | Ghi chú                        |
|---------|----------------------|------------|--------------------------------|
| default | border-gray-200      | white      |                                |
| focus   | border-blue-600, ring| white      | ring-2 ring-blue-600/20        |
| error   | border-red-500       | red-50     | Hiện error message dưới        |

## Password Input
- Như Email Input, thêm: eye icon bên phải để toggle `type=password/text`

---

# SCREEN: Đăng nhập (SCR-001)

## Metadata
| Field         | Value                                      |
|---------------|--------------------------------------------|
| Route         | /login                                     |
| Page title    | "Đăng nhập — [Tên hệ thống]"               |
| Auth required | false                                      |
| Layout        | AuthLayout (centered, max-w-md, no navbar) |
| Redirect      | Nếu đã đăng nhập → /dashboard             |

## Layout Structure
```
┌─────────────────────────────────┐
│        [Logo 40px]              │  ← centered
│   "Đăng nhập vào hệ thống"     │  ← text-h2, mt-8
│   "Chưa có tài khoản? Đăng ký" │  ← text-body-sm, text-gray-500
├─────────────────────────────────┤
│  [Form: email + password]       │  ← mt-8, space-y-4
│  [Remember me checkbox]         │
│  [Button "Đăng nhập" fullWidth] │  ← mt-6
├─────────────────────────────────┤
│   ─────── hoặc ───────          │  ← divider (tùy chọn)
│  [Button Google OAuth]          │  ← nếu có OAuth
└─────────────────────────────────┘
         "Quên mật khẩu?"          ← link, text-center, mt-4
```

- Container: `max-w-md mx-auto px-6 py-12`
- Background page: `bg-gray-50 min-h-screen flex items-center justify-center`
- Form card: `bg-white rounded-2xl shadow-md p-8`

## Components sử dụng
| Component  | ID        | Variant  | Props đặc biệt                      |
|------------|-----------|----------|-------------------------------------|
| Logo       | —         | —        | h=40px, href="/"                    |
| Input      | CMP-INPUT | email    | label, placeholder, validation      |
| Input      | CMP-INPUT | password | label, eye-toggle, validation       |
| Checkbox   | CMP-CHK   | default  | label="Nhớ đăng nhập"               |
| Button     | CMP-BTN   | primary  | size=lg, fullWidth, loading state   |
| Link       | —         | —        | "Quên mật khẩu?" → /forgot-password|
| Link       | —         | —        | "Đăng ký" → /register               |

## Form Fields

### Email
- Component: CMP-INPUT, type=email
- Label: "Email"
- Placeholder: "you@example.com"
- Validation:
  - required → "Vui lòng nhập email"
  - pattern (RFC5322) → "Email không hợp lệ"
- autoFocus: true

### Password
- Component: CMP-INPUT, type=password
- Label: "Mật khẩu"
- Placeholder: "••••••••"
- rightIcon: EyeIcon (toggle hiện/ẩn)
- Validation:
  - required → "Vui lòng nhập mật khẩu"
  - minLength(8) → "Mật khẩu tối thiểu 8 ký tự"

### Remember me
- Component: CMP-CHK
- Label: "Nhớ đăng nhập"
- Default: unchecked
- Nếu checked: lưu token vào localStorage (30 ngày), ngược lại sessionStorage

## API Integration

### Đăng nhập — POST /api/auth/login
- Trigger: Submit form (click button hoặc Enter)
- Pre-condition: Form validation pass
- Request body:
  ```json
  {
    "email": "string",
    "password": "string",
    "rememberMe": "boolean"
  }
  ```
- Response success (200):
  - Store: `accessToken` vào memory (Zustand/Context)
  - Store: `refreshToken` vào httpOnly cookie hoặc localStorage (nếu rememberMe)
  - Navigate: `router.replace(returnUrl ?? '/dashboard')`

- Response errors:
  | Status | Code                  | Message hiển thị (Toast, variant=error)         |
  |--------|-----------------------|-------------------------------------------------|
  | 400    | VALIDATION_ERROR      | "Dữ liệu không hợp lệ"                          |
  | 401    | INVALID_CREDENTIALS   | "Email hoặc mật khẩu không đúng"                |
  | 403    | EMAIL_NOT_VERIFIED    | "Vui lòng xác nhận email trước khi đăng nhập"   |
  | 423    | ACCOUNT_LOCKED        | "Tài khoản bị khóa. Thử lại sau [X] phút"       |
  | 429    | RATE_LIMIT            | "Quá nhiều lần thử. Vui lòng đợi 15 phút"       |
  | 500    | SERVER_ERROR          | "Lỗi hệ thống. Vui lòng thử lại sau"            |

## States của màn hình

| State          | Mô tả                                                      |
|----------------|------------------------------------------------------------|
| idle           | Form trống, tất cả fields ở default state                  |
| validating     | User đang nhập, inline validation sau khi blur field       |
| submitting     | Đang gọi API: button loading=true, form disabled           |
| error-field    | Validation lỗi: field border đỏ, error message hiện dưới  |
| error-api      | API trả lỗi: Toast error hiện top-right, form vẫn giữ data|
| locked-account | Account bị lock: hiện countdown timer, form disabled       |
| success        | Chuyển hướng ngay (không cần hiện success state)           |

## Navigation
| Trigger                   | Destination         | Method          |
|---------------------------|---------------------|-----------------|
| Đăng nhập thành công      | /dashboard          | router.replace  |
| Click "Đăng ký"           | /register           | router.push     |
| Click "Quên mật khẩu?"    | /forgot-password    | router.push     |
| Click Logo                | /                   | router.push     |

## Responsive Behavior
| Breakpoint | Thay đổi                                                 |
|------------|----------------------------------------------------------|
| mobile     | Bỏ card shadow, padding giảm còn px-4, form card full-width |
| tablet+    | Card có shadow-md, max-w-md, centered                    |

## Edge Cases
- URL có `?returnUrl=/some/path`: sau login thành công → redirect về returnUrl (validate domain trước để tránh open redirect)
- Paste password: cho phép (không block onPaste)
- Autofill trình duyệt: không override, cho phép
- Token đã tồn tại khi vào /login: redirect ngay về /dashboard, không render form
- Network offline: hiện Toast "Không có kết nối mạng"
- Form submit bằng Enter: trigger submit nếu ở field password

## Figma Reference
- Frame: `SCR/001-Login`
- Screens cần có: Default, Error state (email), Error state (password), Loading state, Mobile

---

# USER FLOW: Đăng nhập (UF-001)

## Trigger
User chưa đăng nhập và truy cập route cần auth (hoặc vào /login trực tiếp)

## Happy Path
1. [SCR-001] User nhập email hợp lệ
2. [SCR-001] User nhập password (≥8 ký tự)
3. [SCR-001] Click "Đăng nhập"
4. Hệ thống gọi `POST /api/auth/login`
5. API trả 200 + tokens
6. Lưu token, navigate → [SCR-002 Dashboard]

## Alternative Flows
- Sai mật khẩu (401): Hiện Toast lỗi, form giữ nguyên → user nhập lại
- Sai 5 lần (423): Form bị lock 15 phút, hiện countdown
- Email chưa xác nhận (403): Hiện toast + link "Gửi lại email xác nhận"
- Quên mật khẩu: Click link → [SCR-010 Forgot Password]
- Chưa có tài khoản: Click "Đăng ký" → [SCR-003 Register]

## End State
User đã đăng nhập, có token hợp lệ, đang ở /dashboard
