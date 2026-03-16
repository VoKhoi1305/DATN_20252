# CẤU TRÚC THƯ MỤC DỰ ÁN SMTTS
## Subject Management, Tracking & Tracing System
### Phiên bản: 1.0 | Ngày: 15/03/2026

---

## MỤC LỤC

1. [Tổng quan kiến trúc Monorepo](#1-tổng-quan)
2. [Cấu trúc gốc (Root)](#2-root)
3. [Web Dashboard — React + Tailwind CSS](#3-web)
4. [Mobile App — Android / Kotlin](#4-mobile)
5. [Backend — NestJS](#5-backend)
6. [Tài liệu phụ trợ Claude AI](#6-claude)
7. [Docker & Deployment](#7-docker)
8. [Quy tắc đặt tên & Convention](#8-convention)

---

## 1. TỔNG QUAN KIẾN TRÚC

```
Monorepo (Một repo duy nhất, quản lý bằng folder)

  SMTTS/
  ├── web/            ← Web Dashboard (React + Tailwind CSS)
  ├── mobile/         ← Mobile App (Android/Kotlin)
  ├── backend/        ← API Server (NestJS + PostgreSQL)
  ├── docs/           ← Tài liệu dự án (SRS, SAD, Spec, Báo cáo...)
  ├── claude-context/ ← Tài liệu phụ trợ cho Claude AI sinh code
  ├── docker/         ← Docker Compose, Dockerfile
  ├── scripts/        ← Script tiện ích (seed data, migration...)
  └── shared/         ← Types, constants dùng chung (nếu cần)
```

**Tech Stack theo tài liệu dự án:**

| Platform       | Technology                    | Database                         |
|----------------|-------------------------------|----------------------------------|
| Web Dashboard  | React + Tailwind CSS          | —                                |
| Mobile App     | Android (Kotlin)              | —                                |
| Backend API    | Node.js (NestJS)              | PostgreSQL + PostgreSQL Biometric|
| Bản đồ         | Google Maps API / OSM fallback| —                                |

---

## 2. CẤU TRÚC GỐC (ROOT)

```
SMTTS/
│
├── .github/                        # GitHub Actions CI/CD
│   └── workflows/
│       ├── web-ci.yml
│       ├── backend-ci.yml
│       └── mobile-ci.yml
│
├── web/                            # [MỤC 3] Web Dashboard
├── mobile/                         # [MỤC 4] Mobile App Android
├── backend/                        # [MỤC 5] Backend NestJS
├── docs/                           # [MỤC 6] Tài liệu dự án
├── claude-context/                 # [MỤC 6] Context cho Claude AI
├── docker/                         # [MỤC 7] Docker config
├── scripts/                        # Script tiện ích
│   ├── seed-data.ts                # Sinh fake data cho dev/demo
│   ├── reset-db.sh                 # Reset database
│   └── generate-api-docs.sh        # Sinh API documentation
│
├── shared/                         # Types/constants dùng chung
│   ├── types/
│   │   ├── subject.ts              # Type Subject (đối tượng)
│   │   ├── event.ts                # Type Event
│   │   ├── alert.ts                # Type Alert
│   │   ├── case.ts                 # Type Case
│   │   ├── scenario.ts             # Type Kịch bản
│   │   ├── user.ts                 # Type User/Cán bộ
│   │   └── api-response.ts         # Type API response chuẩn
│   └── constants/
│       ├── roles.ts                # IT_ADMIN, LANH_DAO, CAN_BO_QUAN_LY...
│       ├── alert-levels.ts         # Thấp, Trung bình, Cao, Khẩn cấp
│       ├── status.ts               # Trạng thái hồ sơ, case, alert...
│       └── error-codes.ts          # Mã lỗi chuẩn
│
├── .gitignore
├── .editorconfig
├── README.md                       # Hướng dẫn setup + chạy dự án
├── LICENSE
└── docker-compose.yml              # Orchestrate toàn bộ services
```

---

## 3. WEB DASHBOARD — React + Tailwind CSS

> **Đây là platform chính cho cán bộ** — Desktop quản lý đầy đủ, Mobile browser cho thực địa.
> Design language: "Serious · Dense · Trustworthy" — Đỏ-đen, IBM Plex Sans, compact.

```
web/
│
├── public/
│   ├── favicon.ico
│   ├── logo-smtts.svg              # Logo hệ thống
│   └── manifest.json
│
├── src/
│   │
│   ├── app/                        # ★ Entry point & routing
│   │   ├── App.tsx                 # Root component
│   │   ├── routes.tsx              # React Router config
│   │   │                           #   /login, /login/otp, /setup-otp
│   │   │                           #   /dashboard, /dashboard/executive
│   │   │                           #   /ho-so, /ho-so/:id, /ho-so/them-moi...
│   │   │                           #   /events, /events/:id
│   │   │                           #   /alerts, /alerts/:id
│   │   │                           #   /cases, /cases/:id
│   │   │                           #   /xet-duyet, /xet-duyet/:id
│   │   │                           #   /truy-vet, /ban-do, /kich-ban...
│   │   │                           #   /admin/tai-khoan, /admin/cau-hinh, /admin/nhat-ky
│   │   │                           #   /403, /404
│   │   └── providers.tsx           # Context providers wrapper
│   │
│   ├── layouts/                    # ★ 3 Layout theo System Spec
│   │   ├── AppLayout.tsx           # Sidebar(148px) + Topbar(40px) + Accent bar(3px) + Content
│   │   ├── AuthLayout.tsx          # Panel trái tối + Panel phải form (login/OTP)
│   │   ├── FullscreenLayout.tsx    # Không sidebar/topbar — in ấn, export
│   │   ├── Topbar.tsx              # h-10 bg-zinc-950 border-b-2 border-red-700
│   │   ├── Sidebar.tsx             # w-[148px] bg-zinc-900, nav items, collapsed state
│   │   └── MobileNav.tsx           # Hamburger menu cho <640px
│   │
│   ├── components/                 # ★ Component Library (theo 02-component-library)
│   │   │
│   │   ├── ui/                     # Foundation components (CMP-*)
│   │   │   ├── Button.tsx          # CMP-BTN: primary|secondary|outline|ghost|danger-ghost
│   │   │   ├── Input.tsx           # CMP-INPUT: text|password|number|search + states
│   │   │   ├── Select.tsx          # CMP-SELECT: single select + placeholder
│   │   │   ├── Textarea.tsx        # CMP-TXTAREA: auto-resize
│   │   │   ├── Checkbox.tsx        # CMP-CHECK
│   │   │   ├── Radio.tsx           # CMP-RADIO
│   │   │   ├── Toggle.tsx          # CMP-TOGGLE
│   │   │   ├── DatePicker.tsx      # CMP-DATE: DD/MM/YYYY format
│   │   │   ├── DateRangePicker.tsx # CMP-DATERANGE
│   │   │   ├── FileUpload.tsx      # CMP-FUPLOAD: .pdf,.docx,.jpg,.png ≤10MB
│   │   │   ├── Badge.tsx           # CMP-BADGE: success|warning|error|info|neutral|outline
│   │   │   ├── Tag.tsx             # CMP-TAG: removable tag
│   │   │   ├── Avatar.tsx          # CMP-AVATAR: 28x28px initials/image
│   │   │   ├── Tooltip.tsx         # CMP-TIP
│   │   │   ├── Spinner.tsx         # CMP-SPIN: loading indicator
│   │   │   ├── Skeleton.tsx        # CMP-SKEL: skeleton loader
│   │   │   ├── Toast.tsx           # CMP-TOAST: top-right, max 3 stack
│   │   │   └── index.ts            # Barrel export
│   │   │
│   │   ├── data-display/           # Data display components
│   │   │   ├── Table.tsx           # CMP-TBL: sortable, row-height 36px
│   │   │   ├── Pagination.tsx      # CMP-PAGE: 20 items/page default
│   │   │   ├── StatCard.tsx        # CMP-CARD variant=stat: số liệu tổng quan
│   │   │   ├── DataCard.tsx        # CMP-CARD: border zinc-200, rounded, no shadow
│   │   │   ├── EmptyState.tsx      # CMP-EMPTY: icon + title + sub + CTA
│   │   │   ├── Timeline.tsx        # CMP-TLINE: Event/Alert/Case timeline
│   │   │   ├── AlertLevelBadge.tsx # CMP-ALVL: Khẩn cấp(đỏ)/Cao/TB/Thấp
│   │   │   └── index.ts
│   │   │
│   │   ├── feedback/               # Feedback components
│   │   │   ├── Modal.tsx           # CMP-MODAL: sm|md|lg, z-300
│   │   │   ├── ConfirmDialog.tsx   # CMP-CFIRM: xoá, escalate, đóng case...
│   │   │   ├── Drawer.tsx          # CMP-DRAWER: side panel
│   │   │   ├── AlertBanner.tsx     # CMP-ALERT: info|warning|error|success
│   │   │   └── index.ts
│   │   │
│   │   ├── navigation/             # Navigation components
│   │   │   ├── Breadcrumb.tsx      # CMP-BCRUMB: Dashboard > Module > Item
│   │   │   ├── Tabs.tsx            # CMP-TABS: underline style
│   │   │   ├── PageHeader.tsx      # CMP-PHDR: breadcrumb + title + actions
│   │   │   ├── FilterBar.tsx       # CMP-FILTER: search + selects + date range
│   │   │   └── index.ts
│   │   │
│   │   ├── form/                   # Form-specific components
│   │   │   ├── FormField.tsx       # Label + input + error message wrapper
│   │   │   ├── FormSection.tsx     # Section grouping trong form
│   │   │   ├── SearchSelect.tsx    # CMP-SRCHSEL: search + select combo
│   │   │   ├── QueryBuilder.tsx    # CMP-QBUILD: AND/OR query builder
│   │   │   └── index.ts
│   │   │
│   │   └── domain/                 # Domain-specific components (SMTTS)
│   │       ├── SubjectCard.tsx     # Card tóm tắt đối tượng
│   │       ├── EventCard.tsx       # Card sự kiện
│   │       ├── AlertCard.tsx       # Card cảnh báo + mức độ
│   │       ├── CaseCard.tsx        # Card vụ việc
│   │       ├── CaseNotes.tsx       # CMP-NOTES: thread ghi chú case
│   │       ├── EscalationInfo.tsx  # CMP-ESCINFO: nguồn escalation
│   │       ├── CameraCapture.tsx   # CMP-CAMERA: HTML5 Media Capture (mobile)
│   │       ├── MapView.tsx         # CMP-MAP: Google Maps wrapper
│   │       ├── GeofenceOverlay.tsx # Overlay geofence trên bản đồ
│   │       ├── ComplianceChart.tsx # Biểu đồ compliance rate
│   │       ├── ScenarioForm.tsx    # Form tạo/sửa kịch bản
│   │       └── index.ts
│   │
│   ├── pages/                      # ★ Screens (theo Screen Inventory SCR-*)
│   │   │
│   │   ├── auth/                   # Module: Xác thực
│   │   │   ├── LoginPage.tsx       # SCR-001: Đăng nhập
│   │   │   ├── OtpVerifyPage.tsx   # SCR-002: Xác thực OTP
│   │   │   └── SetupOtpPage.tsx    # SCR-003: Cài đặt OTP lần đầu
│   │   │
│   │   ├── dashboard/              # Module: Tổng quan
│   │   │   ├── DashboardPage.tsx   # SCR-010: Dashboard chính
│   │   │   └── ExecutivePage.tsx   # SCR-011: Dashboard điều hành
│   │   │
│   │   ├── subjects/               # Module: Hồ sơ đối tượng
│   │   │   ├── SubjectListPage.tsx     # SCR-020: Danh sách hồ sơ
│   │   │   ├── SubjectDetailPage.tsx   # SCR-021: Chi tiết hồ sơ (tabs)
│   │   │   ├── SubjectCreatePage.tsx   # SCR-022: Thêm hồ sơ mới
│   │   │   ├── SubjectEditPage.tsx     # SCR-023: Chỉnh sửa hồ sơ
│   │   │   └── EnrollmentPage.tsx      # SCR-024: Quản lý Enrollment
│   │   │
│   │   ├── events/                 # Module: Sự kiện
│   │   │   ├── EventListPage.tsx   # SCR-030: Danh sách Event
│   │   │   └── EventDetailPage.tsx # SCR-031: Chi tiết Event
│   │   │
│   │   ├── alerts/                 # Module: Cảnh báo
│   │   │   ├── AlertDashboardPage.tsx  # SCR-040: Dashboard Alert
│   │   │   └── AlertDetailPage.tsx     # SCR-041: Chi tiết Alert
│   │   │
│   │   ├── cases/                  # Module: Vụ việc
│   │   │   ├── CaseDashboardPage.tsx   # SCR-050: Dashboard Case
│   │   │   └── CaseDetailPage.tsx      # SCR-051: Chi tiết Case
│   │   │
│   │   ├── requests/               # Module: Xét duyệt
│   │   │   ├── RequestQueuePage.tsx    # SCR-060: Hàng đợi yêu cầu
│   │   │   └── RequestDetailPage.tsx   # SCR-061: Chi tiết yêu cầu
│   │   │
│   │   ├── tracking/               # Module: Truy vết
│   │   │   ├── TimelinePage.tsx    # SCR-070: Timeline View
│   │   │   └── MapPage.tsx         # SCR-080: Bản đồ tương tác
│   │   │
│   │   ├── scenarios/              # Module: Kịch bản
│   │   │   ├── ScenarioListPage.tsx        # SCR-090: DS kịch bản
│   │   │   ├── ScenarioCreatePage.tsx      # SCR-091: Tạo kịch bản QL
│   │   │   ├── ScenarioDetailPage.tsx      # SCR-092: Chi tiết kịch bản
│   │   │   ├── ScenarioEditPage.tsx        # SCR-093: Chỉnh sửa kịch bản
│   │   │   ├── AlertRuleListPage.tsx       # SCR-094: DS kịch bản Alert
│   │   │   ├── AlertRuleCreatePage.tsx     # SCR-095: Tạo kịch bản Alert
│   │   │   ├── ScenarioAssignPage.tsx      # SCR-096: Gán kịch bản
│   │   │   └── ScenarioSimulationPage.tsx  # SCR-097: Simulation
│   │   │
│   │   ├── reports/                # Module: Báo cáo
│   │   │   └── ReportPage.tsx      # SCR-100: Báo cáo
│   │   │
│   │   ├── admin/                  # Module: Quản trị (Admin/Lãnh đạo)
│   │   │   ├── AccountListPage.tsx     # SCR-110: Quản lý tài khoản
│   │   │   ├── AccountCreatePage.tsx   # SCR-111: Thêm tài khoản
│   │   │   ├── AccountEditPage.tsx     # SCR-112: Sửa tài khoản
│   │   │   ├── ConfigPage.tsx          # SCR-113: Cấu hình hệ thống
│   │   │   └── AuditLogPage.tsx        # SCR-115: Nhật ký hệ thống
│   │   │
│   │   ├── profile/                # Module: Cá nhân
│   │   │   └── ProfilePage.tsx     # SCR-120: Hồ sơ cá nhân
│   │   │
│   │   └── errors/                 # Trang lỗi
│   │       ├── NotFoundPage.tsx    # 404
│   │       └── ForbiddenPage.tsx   # 403 — SCR-121
│   │
│   ├── hooks/                      # ★ Custom React Hooks
│   │   ├── useAuth.ts              # Auth state, login, logout, token
│   │   ├── usePermission.ts        # Check role, data_scope
│   │   ├── useDataScope.ts         # Filter data theo địa bàn cán bộ
│   │   ├── useSubjects.ts          # CRUD subjects
│   │   ├── useEvents.ts            # Fetch events
│   │   ├── useAlerts.ts            # Fetch/process alerts
│   │   ├── useCases.ts             # Fetch/process cases
│   │   ├── useScenarios.ts         # CRUD scenarios
│   │   ├── useNotifications.ts     # Polling 30s / WebSocket
│   │   ├── useToast.ts             # Toast management
│   │   ├── usePagination.ts        # Pagination state
│   │   ├── useFilter.ts            # Filter bar state
│   │   ├── useDebounce.ts          # Debounce search input
│   │   ├── useMediaCapture.ts      # HTML5 camera (mobile browser)
│   │   └── useGeolocation.ts       # Browser geolocation API
│   │
│   ├── services/                   # ★ API Service Layer
│   │   ├── api.ts                  # Axios instance: baseURL=/api/v1, interceptors
│   │   ├── auth.service.ts         # POST /auth/login, /auth/verify-otp, /auth/logout
│   │   ├── subject.service.ts      # CRUD /subjects
│   │   ├── event.service.ts        # GET /events
│   │   ├── alert.service.ts        # GET/PUT /alerts, escalate
│   │   ├── case.service.ts         # CRUD /cases, notes, close
│   │   ├── request.service.ts      # GET/PUT /requests (xét duyệt)
│   │   ├── scenario.service.ts     # CRUD /scenarios, /alert-rules
│   │   ├── user.service.ts         # CRUD /users (admin)
│   │   ├── notification.service.ts # GET /notifications
│   │   ├── report.service.ts       # GET /reports
│   │   ├── audit.service.ts        # GET /audit-logs
│   │   ├── config.service.ts       # GET/PUT /config
│   │   ├── upload.service.ts       # POST /upload (file, ảnh thực địa)
│   │   └── map.service.ts          # Google Maps / OSM integration
│   │
│   ├── stores/                     # ★ Global State (Zustand hoặc Context)
│   │   ├── authStore.ts            # user, token, permissions, role, data_scope
│   │   ├── sidebarStore.ts         # collapsed, activeNavItem
│   │   └── notificationStore.ts    # unreadCount, notificationList
│   │
│   ├── guards/                     # Route guards
│   │   ├── AuthGuard.tsx           # Redirect /login nếu chưa đăng nhập
│   │   ├── OtpGuard.tsx            # Redirect /setup-otp nếu chưa setup
│   │   ├── RoleGuard.tsx           # Redirect /403 nếu không đủ quyền
│   │   └── DataScopeGuard.tsx      # Inject data_scope vào request
│   │
│   ├── utils/                      # Utility functions
│   │   ├── format-date.ts          # DD/MM/YYYY, HH:mm, relative time
│   │   ├── format-number.ts        # Locale VN
│   │   ├── validators.ts           # CCCD (12 số), SĐT (10 số, đầu 0)
│   │   ├── permission-check.ts     # hasPermission(), canAccess()
│   │   ├── data-scope-filter.ts    # Filter logic theo phường/quận/tỉnh
│   │   ├── query-builder.ts        # AND/OR/=, ~, !=, !~ query logic
│   │   ├── cn.ts                   # clsx + twMerge helper
│   │   └── constants.ts            # API URLs, pagination defaults
│   │
│   ├── styles/                     # ★ Design Tokens & Global Styles
│   │   ├── globals.css             # CSS variables (--color-primary: #b91c1c;...)
│   │   ├── tailwind.css            # @tailwind base/components/utilities
│   │   └── fonts.css               # IBM Plex Sans + IBM Plex Mono import
│   │
│   ├── types/                      # TypeScript types (FE-specific)
│   │   ├── api.types.ts            # API response/request types
│   │   ├── component.types.ts      # Component prop types
│   │   └── route.types.ts          # Route params types
│   │
│   ├── assets/                     # Static assets
│   │   ├── icons/                  # SVG icons (Lucide hoặc custom)
│   │   └── images/
│   │       └── logo-smtts.svg
│   │
│   └── index.tsx                   # Entry point
│
├── tailwind.config.ts              # ★ Tailwind config theo Design Tokens
│                                   #   fontFamily: IBM Plex Sans/Mono
│                                   #   colors: primary=#b91c1c, zinc scale
│                                   #   spacing: compact base=4px
│                                   #   borderRadius: max=4px
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts                  # Vite build config
├── package.json
├── .env.example                    # VITE_API_BASE_URL, VITE_GOOGLE_MAPS_KEY
└── .env.local
```

---

## 4. MOBILE APP — Android / Kotlin

> **Dành cho đối tượng bị quản lý** — Trình báo NFC + Face, xin phép, xem lịch.
> Chỉ Android (Kotlin). iOS phát triển sau nếu cần.

```
mobile/
│
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/smtts/app/
│   │   │   │   │
│   │   │   │   ├── SmttsApplication.kt         # Application class
│   │   │   │   │
│   │   │   │   ├── di/                          # Dependency Injection (Hilt)
│   │   │   │   │   ├── AppModule.kt
│   │   │   │   │   ├── NetworkModule.kt         # Retrofit + OkHttp
│   │   │   │   │   └── DatabaseModule.kt        # Room DB
│   │   │   │   │
│   │   │   │   ├── data/                        # Data Layer
│   │   │   │   │   ├── remote/                  # API
│   │   │   │   │   │   ├── ApiService.kt        # Retrofit interface
│   │   │   │   │   │   ├── AuthApi.kt           # Login CCCD + password
│   │   │   │   │   │   ├── CheckInApi.kt        # Trình báo (NFC + Face + GPS)
│   │   │   │   │   │   ├── RequestApi.kt        # Xin phép, yêu cầu
│   │   │   │   │   │   └── NotificationApi.kt   # Push notification
│   │   │   │   │   │
│   │   │   │   │   ├── local/                   # Local DB
│   │   │   │   │   │   ├── AppDatabase.kt       # Room database
│   │   │   │   │   │   ├── dao/
│   │   │   │   │   │   │   ├── CheckInDao.kt
│   │   │   │   │   │   │   └── CacheDao.kt
│   │   │   │   │   │   └── entity/
│   │   │   │   │   │       ├── CheckInEntity.kt
│   │   │   │   │   │       └── ScheduleEntity.kt
│   │   │   │   │   │
│   │   │   │   │   ├── model/                   # Data models
│   │   │   │   │   │   ├── Subject.kt           # Đối tượng
│   │   │   │   │   │   ├── CheckInResult.kt     # Kết quả trình báo
│   │   │   │   │   │   ├── Scenario.kt          # Kịch bản hiện tại
│   │   │   │   │   │   ├── Request.kt           # Yêu cầu xin phép
│   │   │   │   │   │   └── Notification.kt
│   │   │   │   │   │
│   │   │   │   │   └── repository/              # Repository pattern
│   │   │   │   │       ├── AuthRepository.kt
│   │   │   │   │       ├── CheckInRepository.kt
│   │   │   │   │       ├── RequestRepository.kt
│   │   │   │   │       └── ScheduleRepository.kt
│   │   │   │   │
│   │   │   │   ├── domain/                      # Domain / Use Cases
│   │   │   │   │   ├── usecase/
│   │   │   │   │   │   ├── LoginUseCase.kt          # SA-02: Đăng nhập CCCD + pass
│   │   │   │   │   │   ├── EnrollmentUseCase.kt     # SA-01: Enrollment lần đầu
│   │   │   │   │   │   ├── CheckInUseCase.kt        # SA-06: Quy trình trình báo
│   │   │   │   │   │   ├── VoluntaryCheckInUseCase.kt # SA-10: Trình báo tự nguyện
│   │   │   │   │   │   ├── SubmitRequestUseCase.kt  # SA-11~14: Xin phép
│   │   │   │   │   │   └── ChangePasswordUseCase.kt # SA-04: Đổi mật khẩu
│   │   │   │   │   └── model/
│   │   │   │   │       └── CheckInData.kt           # NFC + Face + GPS + Timestamp
│   │   │   │   │
│   │   │   │   ├── presentation/                # UI Layer (MVVM)
│   │   │   │   │   │
│   │   │   │   │   ├── auth/                    # Đăng nhập & Enrollment
│   │   │   │   │   │   ├── LoginActivity.kt
│   │   │   │   │   │   ├── LoginViewModel.kt
│   │   │   │   │   │   ├── EnrollmentActivity.kt    # SA-01
│   │   │   │   │   │   └── EnrollmentViewModel.kt
│   │   │   │   │   │
│   │   │   │   │   ├── home/                    # Màn hình chính
│   │   │   │   │   │   ├── HomeActivity.kt          # SA-05: countdown + nút TRÌNH BÁO
│   │   │   │   │   │   └── HomeViewModel.kt
│   │   │   │   │   │
│   │   │   │   │   ├── checkin/                 # Quy trình trình báo
│   │   │   │   │   │   ├── CheckInActivity.kt       # Orchestrate NFC → Face → Submit
│   │   │   │   │   │   ├── CheckInViewModel.kt
│   │   │   │   │   │   ├── NfcScanFragment.kt       # SA-08: NFC chip verify
│   │   │   │   │   │   ├── FaceCaptureFragment.kt   # SA-07: Face + liveness
│   │   │   │   │   │   └── CheckInResultFragment.kt # SA-09: Kết quả
│   │   │   │   │   │
│   │   │   │   │   ├── schedule/                # Lịch & lịch sử
│   │   │   │   │   │   ├── ScheduleFragment.kt      # SA-17: Calendar trình báo
│   │   │   │   │   │   ├── HistoryFragment.kt       # SA-18: Lịch sử trình báo
│   │   │   │   │   │   └── ScheduleViewModel.kt
│   │   │   │   │   │
│   │   │   │   │   ├── request/                 # Xin phép & yêu cầu
│   │   │   │   │   │   ├── RequestListFragment.kt   # SA-21: Trạng thái yêu cầu
│   │   │   │   │   │   ├── NewRequestFragment.kt    # SA-11~14: Tạo yêu cầu
│   │   │   │   │   │   └── RequestViewModel.kt
│   │   │   │   │   │
│   │   │   │   │   ├── scenario/                # Xem kịch bản
│   │   │   │   │   │   └── ScenarioFragment.kt      # SA-16: Xem kịch bản
│   │   │   │   │   │
│   │   │   │   │   ├── profile/                 # Hồ sơ & cài đặt
│   │   │   │   │   │   ├── ProfileFragment.kt       # SA-04: Đổi mật khẩu
│   │   │   │   │   │   └── ContactFragment.kt       # SA-20: Liên hệ cán bộ
│   │   │   │   │   │
│   │   │   │   │   └── help/                    # Hướng dẫn
│   │   │   │   │       └── HelpFragment.kt          # SA-22: FAQ, hotline
│   │   │   │   │
│   │   │   │   ├── biometric/                   # ★ NFC + Face modules
│   │   │   │   │   ├── nfc/
│   │   │   │   │   │   ├── NfcReader.kt             # Đọc chip NFC CCCD
│   │   │   │   │   │   ├── NfcChipVerifier.kt       # Xác minh chữ ký số
│   │   │   │   │   │   └── NfcMockAdapter.kt        # Mock cho dev/test
│   │   │   │   │   │
│   │   │   │   │   └── face/
│   │   │   │   │       ├── FaceCapture.kt           # Camera capture
│   │   │   │   │       ├── LivenessDetector.kt      # SA-07: quay đầu, nháy mắt
│   │   │   │   │       ├── FaceMatcher.kt           # So khớp face
│   │   │   │   │       └── FaceMockService.kt       # Mock cho dev/test
│   │   │   │   │
│   │   │   │   ├── notification/                # Push notification
│   │   │   │   │   ├── FcmService.kt               # Firebase Cloud Messaging
│   │   │   │   │   └── NotificationHelper.kt       # SA-19: nhắc deadline
│   │   │   │   │
│   │   │   │   └── util/                        # Utilities
│   │   │   │       ├── LocationHelper.kt            # GPS lấy lúc trình báo
│   │   │   │       ├── EncryptionHelper.kt          # Mã hóa CCCD
│   │   │   │       ├── DateTimeHelper.kt            # Format DD/MM/YYYY, UTC+7
│   │   │   │       ├── DeviceBindHelper.kt          # SA-03: Bind 1 thiết bị
│   │   │   │       └── NetworkHelper.kt             # Check connectivity
│   │   │   │
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── activity_login.xml
│   │   │   │   │   ├── activity_home.xml
│   │   │   │   │   ├── activity_checkin.xml
│   │   │   │   │   ├── fragment_nfc_scan.xml
│   │   │   │   │   ├── fragment_face_capture.xml
│   │   │   │   │   ├── fragment_schedule.xml
│   │   │   │   │   └── ...
│   │   │   │   ├── values/
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   ├── strings.xml               # Tiếng Việt
│   │   │   │   │   ├── themes.xml
│   │   │   │   │   └── dimens.xml
│   │   │   │   ├── drawable/
│   │   │   │   └── navigation/
│   │   │   │       └── nav_graph.xml              # Navigation component
│   │   │   │
│   │   │   └── AndroidManifest.xml
│   │   │       # Permissions: CAMERA, NFC, ACCESS_FINE_LOCATION, INTERNET
│   │   │
│   │   └── test/                                  # Unit tests
│   │       └── java/com/smtts/app/
│   │           ├── CheckInUseCaseTest.kt
│   │           └── NfcReaderTest.kt
│   │
│   ├── build.gradle.kts
│   └── proguard-rules.pro
│
├── build.gradle.kts                # Project-level gradle
├── settings.gradle.kts
├── gradle.properties
└── local.properties                # SDK path
```

---

## 5. BACKEND — NestJS + PostgreSQL

> **API server cho cả Web Dashboard và Mobile App.**
> PostgreSQL (chính) + PostgreSQL tách biệt (biometric).

```
backend/
│
├── src/
│   │
│   ├── main.ts                         # NestJS bootstrap
│   ├── app.module.ts                   # Root module
│   │
│   ├── config/                         # Configuration
│   │   ├── database.config.ts          # PostgreSQL main + biometric
│   │   ├── jwt.config.ts               # JWT secret, expiry
│   │   ├── google-maps.config.ts       # API key
│   │   ├── upload.config.ts            # File size, types
│   │   └── app.config.ts              # Port, CORS, rate limit
│   │
│   ├── common/                         # Shared utilities
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts      # @Roles(IT_ADMIN, LANH_DAO...)
│   │   │   ├── data-scope.decorator.ts # @DataScope()
│   │   │   └── current-user.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts       # Bearer token validation
│   │   │   ├── otp.guard.ts            # OTP verification check
│   │   │   ├── roles.guard.ts          # Role-based access
│   │   │   └── data-scope.guard.ts     # Data scope filter
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts  # Audit log interceptor
│   │   │   └── transform.interceptor.ts# Response format chuẩn
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts# { code, message, details }
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts      # DTO validation
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts       # page, limit, sort, order
│   │   │   └── filter.dto.ts           # Search q=, q=~, q=!
│   │   └── utils/
│   │       ├── date.util.ts            # UTC ↔ Asia/Ho_Chi_Minh
│   │       ├── encryption.util.ts      # AES-256, bcrypt/argon2
│   │       └── query-builder.util.ts   # AND/OR, =, ~, !=, !~ logic
│   │
│   ├── modules/                        # ★ Feature Modules
│   │   │
│   │   ├── auth/                       # B-02, B-03: Authentication
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts      # POST /auth/login, /verify-otp, /logout
│   │   │   ├── auth.service.ts
│   │   │   ├── otp.service.ts          # TOTP (Google Authenticator)
│   │   │   ├── jwt.strategy.ts         # Passport JWT strategy
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── verify-otp.dto.ts
│   │   │
│   │   ├── users/                      # W-48: Quản lý tài khoản cán bộ
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts     # CRUD /users
│   │   │   ├── users.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts      # id, username, role, data_scope, otp_enabled
│   │   │
│   │   ├── subjects/                   # W-05: Hồ sơ đối tượng
│   │   │   ├── subjects.module.ts
│   │   │   ├── subjects.controller.ts  # CRUD /subjects
│   │   │   ├── subjects.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-subject.dto.ts
│   │   │   │   └── update-subject.dto.ts
│   │   │   └── entities/
│   │   │       ├── subject.entity.ts           # Nhân thân, CCCD (encrypted)
│   │   │       ├── subject-family.entity.ts    # Gia đình
│   │   │       └── subject-legal.entity.ts     # Pháp lý
│   │   │
│   │   ├── events/                     # B-08: Event processing
│   │   │   ├── events.module.ts
│   │   │   ├── events.controller.ts    # GET /events
│   │   │   ├── events.service.ts
│   │   │   └── entities/
│   │   │       └── event.entity.ts     # type, subject, gps, timestamp, result
│   │   │
│   │   ├── alerts/                     # B-09: Alert management
│   │   │   ├── alerts.module.ts
│   │   │   ├── alerts.controller.ts    # GET/PUT /alerts, POST /alerts/:id/escalate
│   │   │   ├── alerts.service.ts
│   │   │   └── entities/
│   │   │       └── alert.entity.ts     # level, source(default/custom), event, status
│   │   │
│   │   ├── cases/                      # W-22~28: Case management
│   │   │   ├── cases.module.ts
│   │   │   ├── cases.controller.ts     # CRUD /cases, POST /cases/:id/notes, /close
│   │   │   ├── cases.service.ts
│   │   │   └── entities/
│   │   │       ├── case.entity.ts              # source(auto/manual), status, severity
│   │   │       └── case-note.entity.ts         # content, officer, timestamp, photos
│   │   │
│   │   ├── requests/                   # W-34: Xét duyệt yêu cầu
│   │   │   ├── requests.module.ts
│   │   │   ├── requests.controller.ts  # GET/PUT /requests
│   │   │   ├── requests.service.ts
│   │   │   └── entities/
│   │   │       └── request.entity.ts   # type(đi xa/hoãn/đổi thiết bị/đổi nơi ở)
│   │   │
│   │   ├── scenarios/                  # SE-01~07: Scenario Engine
│   │   │   ├── scenarios.module.ts
│   │   │   ├── scenarios.controller.ts     # CRUD /scenarios, /alert-rules
│   │   │   ├── scenarios.service.ts
│   │   │   ├── scenario-engine.service.ts  # ★ Core engine: evaluate rules
│   │   │   ├── alert-rule-engine.service.ts# Evaluate alert rules (default + custom)
│   │   │   ├── auto-escalation.service.ts  # Auto-escalate Alert → Case
│   │   │   └── entities/
│   │   │       ├── management-scenario.entity.ts   # Kịch bản quản lý
│   │   │       ├── alert-rule.entity.ts            # Alert rules (default + custom)
│   │   │       └── scenario-assignment.entity.ts   # Gán kịch bản cho đối tượng
│   │   │
│   │   ├── checkin/                    # B-06, B-07: Trình báo từ Mobile App
│   │   │   ├── checkin.module.ts
│   │   │   ├── checkin.controller.ts   # POST /checkin
│   │   │   ├── checkin.service.ts      # Process NFC + Face + GPS + Timestamp
│   │   │   └── dto/
│   │   │       └── checkin.dto.ts      # nfc_data, face_image, gps, timestamp
│   │   │
│   │   ├── biometric/                  # B-05: Biometric service (DB tách biệt)
│   │   │   ├── biometric.module.ts
│   │   │   ├── face.service.ts         # Face match, liveness verify
│   │   │   ├── nfc.service.ts          # NFC chip verification
│   │   │   └── entities/              # → PostgreSQL biometric DB
│   │   │       ├── face-template.entity.ts
│   │   │       └── nfc-record.entity.ts
│   │   │
│   │   ├── enrollment/                 # B-04: Device enrollment
│   │   │   ├── enrollment.module.ts
│   │   │   ├── enrollment.controller.ts
│   │   │   ├── enrollment.service.ts
│   │   │   └── entities/
│   │   │       └── device.entity.ts    # device_id, subject, status
│   │   │
│   │   ├── geofence/                   # W-42: Geofence management
│   │   │   ├── geofence.module.ts
│   │   │   ├── geofence.service.ts     # Point-in-polygon, distance calc
│   │   │   └── entities/
│   │   │       └── geofence.entity.ts  # polygon/circle coordinates
│   │   │
│   │   ├── notifications/              # B-10: Push + Web notifications
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts  # GET /notifications
│   │   │   ├── push.service.ts              # Firebase push (Mobile)
│   │   │   └── web-notification.service.ts  # Polling / WebSocket (Web)
│   │   │
│   │   ├── reports/                    # W-44~47: Báo cáo
│   │   │   ├── reports.module.ts
│   │   │   ├── reports.controller.ts
│   │   │   └── reports.service.ts
│   │   │
│   │   ├── audit/                      # W-54: Audit log (append-only)
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.controller.ts     # GET /audit-logs
│   │   │   ├── audit.service.ts
│   │   │   └── entities/
│   │   │       └── audit-log.entity.ts # officer, action, target, ip, timestamp
│   │   │
│   │   ├── upload/                     # File upload service
│   │   │   ├── upload.module.ts
│   │   │   ├── upload.controller.ts    # POST /upload
│   │   │   └── upload.service.ts       # .pdf,.docx,.jpg,.png ≤10MB
│   │   │
│   │   └── config-admin/              # W-51~53: Cấu hình hệ thống
│   │       ├── config-admin.module.ts
│   │       ├── config-admin.controller.ts
│   │       └── config-admin.service.ts
│   │
│   └── database/                       # Database setup
│       ├── migrations/                 # TypeORM migrations
│       │   ├── 001-create-users.ts
│       │   ├── 002-create-subjects.ts
│       │   ├── 003-create-events.ts
│       │   ├── 004-create-alerts.ts
│       │   ├── 005-create-cases.ts
│       │   ├── 006-create-scenarios.ts
│       │   ├── 007-create-requests.ts
│       │   ├── 008-create-geofences.ts
│       │   ├── 009-create-audit-logs.ts
│       │   └── 010-create-devices.ts
│       ├── seeds/                      # Data seeding cho dev/demo
│       │   ├── seed-users.ts           # 5 roles mẫu
│       │   ├── seed-subjects.ts        # Đối tượng fake
│       │   ├── seed-scenarios.ts       # 3-4 kịch bản mẫu mỗi loại
│       │   └── seed-events.ts          # Event/Alert/Case mẫu
│       └── ormconfig.ts                # TypeORM config (2 DB connections)
│
├── test/                               # E2E tests
│   ├── auth.e2e-spec.ts
│   ├── checkin.e2e-spec.ts
│   └── jest-e2e.json
│
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
├── .env.example
│   # DATABASE_URL=postgresql://...
│   # BIOMETRIC_DATABASE_URL=postgresql://...
│   # JWT_SECRET=...
│   # GOOGLE_MAPS_API_KEY=...
│   # FIREBASE_CONFIG=...
└── .env
```

---

## 6. TÀI LIỆU PHỤ TRỢ CLAUDE AI

> **Mục đích:** Cung cấp context đầy đủ nhất cho Claude để sinh code chính xác ngay lần đầu.
> Sắp xếp theo thứ tự ưu tiên khi paste vào prompt.

```
claude-context/
│
├── README.md                          # Hướng dẫn cách sử dụng context files
│
├── 00-quick-start/                    # ★ PASTE ĐẦU TIÊN — Context nền bắt buộc
│   │
│   ├── project-overview.md            # Tóm tắt 1 trang: tên, mục đích, tech stack,
│   │                                  # roles, platforms, giới hạn
│   └── tech-stack-summary.md          # React+TW (web), Kotlin (mobile), NestJS (BE),
│                                      # PostgreSQL, Google Maps, TOTP
│
├── 01-design-system/                  # ★ PASTE KHI VIẾT CODE UI — Design tokens
│   │
│   ├── design-tokens.md               # Toàn bộ color, typography, spacing, radius, shadow
│   │                                  # → Copy từ system-spec.md Section 2
│   ├── layout-spec.md                 # AppLayout, AuthLayout, FullscreenLayout
│   │                                  # Topbar, Sidebar, Content area
│   │                                  # → Copy từ system-spec.md Section 3
│   └── design-constraints.md          # Danh sách CẤM: không rounded-xl, không shadow-md...
│                                      # → Copy từ system-spec.md Section 2.9
│
├── 02-component-library/              # ★ PASTE KHI SINH COMPONENT — Spec từng component
│   │
│   ├── batch1-foundation.md           # Button, Input, Select, Textarea, Checkbox...
│   │                                  # → Copy từ 02-component-library-batch1.md
│   ├── batch2-data-display.md         # Table, Badge, StatCard, Timeline, Pagination...
│   │                                  # → Copy từ 02-component-library-batch2.md
│   ├── batch3-feedback.md             # Modal, Toast, ConfirmDialog, Drawer...
│   │                                  # → Copy từ 02-component-library-batch3.md
│   ├── batch4-navigation.md           # Breadcrumb, Tabs, PageHeader, FilterBar...
│   │                                  # → Copy từ 02-component-library-batch4.md
│   └── batch5-domain.md              # CaseNotes, AlertLevel, EscalationInfo,
│                                      # CameraCapture, MapView...
│                                      # → Copy từ 02-component-library-batch5.md
│
├── 03-screen-specs/                   # ★ PASTE KHI VIẾT TỪNG MÀN HÌNH
│   │                                  # Mỗi file = 1 screen spec đầy đủ
│   ├── SCR-001-login.md               # Spec chi tiết: layout, fields, states, API
│   ├── SCR-002-otp-verify.md
│   ├── SCR-003-setup-otp.md
│   ├── SCR-010-dashboard.md
│   ├── SCR-011-executive-dashboard.md
│   ├── SCR-020-subject-list.md
│   ├── SCR-021-subject-detail.md
│   ├── SCR-022-subject-create.md
│   ├── SCR-023-subject-edit.md
│   ├── SCR-024-enrollment.md
│   ├── SCR-030-event-list.md
│   ├── SCR-031-event-detail.md
│   ├── SCR-040-alert-dashboard.md
│   ├── SCR-041-alert-detail.md
│   ├── SCR-050-case-dashboard.md
│   ├── SCR-051-case-detail.md
│   ├── SCR-060-request-queue.md
│   ├── SCR-061-request-detail.md
│   ├── SCR-070-timeline.md
│   ├── SCR-080-map.md
│   ├── SCR-090-scenario-list.md
│   ├── SCR-091-scenario-create.md
│   ├── SCR-092-scenario-detail.md
│   ├── SCR-093-scenario-edit.md
│   ├── SCR-094-alert-rule-list.md
│   ├── SCR-095-alert-rule-create.md
│   ├── SCR-096-scenario-assign.md
│   ├── SCR-097-simulation.md
│   ├── SCR-100-reports.md
│   ├── SCR-110-account-list.md
│   ├── SCR-111-account-create.md
│   ├── SCR-112-account-edit.md
│   ├── SCR-113-config.md
│   ├── SCR-115-audit-log.md
│   ├── SCR-120-profile.md
│   ├── SCR-121-forbidden.md
│   └── SCR-404-not-found.md
│
├── 04-system-spec/                    # ★ PASTE KHI CẦN CONTEXT TOÀN HỆ THỐNG
│   │
│   ├── system-spec-full.md            # File system-spec.md đầy đủ
│   ├── ux-rules.md                    # Loading, Error, Empty, Confirm, Validation
│   │                                  # → Copy từ system-spec.md Section 7
│   ├── routing-navigation.md          # Auth guard, redirect, breadcrumb
│   │                                  # → Copy từ system-spec.md Section 6
│   ├── api-conventions.md             # /api/v1, pagination, search, error format
│   │                                  # → Copy từ system-spec.md Section 8
│   └── permissions-rbac.md            # 5 roles, data_scope logic
│                                      # → Copy từ system-spec.md Section 7.6
│
├── 05-business-logic/                 # ★ PASTE KHI CODE BACKEND / LOGIC PHỨC TẠP
│   │
│   ├── deep-dive-analysis.md          # Phân tích chuyên sâu toàn hệ thống
│   ├── scenario-engine.md             # Scenario Engine spec chi tiết
│   │                                  # → Trích từ deep-dive Section 3
│   ├── event-alert-case-flow.md       # Luồng Event → Alert → Case
│   │                                  # → Trích từ deep-dive Section 4
│   ├── checkin-flow.md                # Quy trình trình báo NFC + Face + GPS
│   │                                  # → Trích từ deep-dive Section 4
│   └── data-scope-logic.md            # Logic filter theo địa bàn
│
├── 06-api-specs/                      # ★ PASTE KHI VIẾT API ENDPOINT
│   │
│   ├── auth-api.md                    # POST /auth/login, /verify-otp...
│   ├── subjects-api.md                # CRUD /subjects
│   ├── events-api.md                  # GET /events
│   ├── alerts-api.md                  # GET/PUT /alerts, POST escalate
│   ├── cases-api.md                   # CRUD /cases, notes, close
│   ├── scenarios-api.md               # CRUD /scenarios, /alert-rules
│   ├── checkin-api.md                 # POST /checkin (mobile)
│   └── admin-api.md                   # /users, /config, /audit-logs
│
├── 07-database/                       # ★ PASTE KHI VIẾT MIGRATION / ENTITY
│   │
│   ├── erd.md                         # Entity Relationship Diagram (text)
│   ├── data-dictionary.md             # Bảng mô tả từng field
│   └── biometric-db-spec.md           # Schema cho DB biometric tách biệt
│
├── 08-mobile-specs/                   # ★ PASTE KHI CODE MOBILE APP
│   │
│   ├── mobile-features.md             # SA-01 → SA-22 chi tiết
│   │                                  # → Trích từ deep-dive Section 2.1
│   ├── nfc-integration.md             # NFC chip CCCD reading spec
│   ├── face-capture-spec.md           # Liveness detection + face matching
│   └── checkin-flow-mobile.md         # Luồng trình báo trên app
│
├── 09-srs-sad/                        # ★ TÀI LIỆU CHÍNH THỨC
│   │
│   ├── SRS_SMTTS_v1_0.md             # Software Requirements Specification
│   └── SAD_SMTTS_v1_0.md             # Software Architecture Document
│
└── 10-prompts/                        # ★ Prompt templates tái sử dụng
    │
    ├── prompt-component.md            # Template prompt để sinh 1 component
    │                                  # "Paste: design-tokens + component-spec + screen-spec"
    ├── prompt-screen.md               # Template prompt để sinh 1 màn hình
    │                                  # "Paste: system-spec + screen-spec + components used"
    ├── prompt-api-endpoint.md         # Template prompt để sinh 1 API endpoint
    │                                  # "Paste: api-conventions + api-spec + entity"
    ├── prompt-mobile-screen.md        # Template prompt để sinh 1 màn hình mobile
    │                                  # "Paste: mobile-features + flow"
    └── prompt-full-page.md            # Template prompt full: design + component + screen + API
```

### Cách sử dụng Claude Context — Workflow

```
BƯỚC 1: Luôn paste 00-quick-start/ làm context nền

BƯỚC 2: Tùy task, paste thêm file phù hợp:

  Sinh Component UI:
    → 00 + 01-design-system/ + 02-component-library/batch-N.md

  Sinh Màn hình Web:
    → 00 + 01 + 03-screen-specs/SCR-XXX.md + 04/ux-rules.md

  Sinh API Endpoint:
    → 00 + 04/api-conventions.md + 06-api-specs/module.md + 07/erd.md

  Sinh Mobile Screen:
    → 00 + 08-mobile-specs/ + 05/checkin-flow.md

  Code Backend Logic:
    → 00 + 05-business-logic/ + 06 + 07

BƯỚC 3: (Optional) Dùng prompt template từ 10-prompts/
```

---

## 7. DOCKER & DEPLOYMENT

```
docker/
│
├── web/
│   ├── Dockerfile                  # Multi-stage: build React → nginx serve
│   └── nginx.conf                  # SPA routing, proxy /api → backend
│
├── backend/
│   ├── Dockerfile                  # Node.js NestJS production
│   └── .dockerignore
│
├── db/
│   ├── init-main.sql               # PostgreSQL main schema init
│   └── init-biometric.sql          # PostgreSQL biometric schema init
│
└── docker-compose.yml              # Orchestrate tất cả services
    # Services:
    #   web:       React app (nginx, port 80)
    #   backend:   NestJS API (port 3000)
    #   db-main:   PostgreSQL main (port 5432)
    #   db-bio:    PostgreSQL biometric (port 5433)
    #   redis:     Cache/session (optional)

---

docs/                               # Tài liệu nộp báo cáo đồ án
│
├── SRS_SMTTS_v1_0.docx             # Software Requirements Specification
├── SAD_SMTTS_v1_0.docx             # Software Architecture Document
├── system-spec.md                  # System UI Specification
├── deep-dive-analysis.md           # Phân tích chuyên sâu
├── 02-component-library-*.md       # Component Library (5 batch)
├── test-plan.md                    # Test Plan
├── user-manual.md                  # Hướng dẫn sử dụng
├── api-documentation.md            # API Documentation
├── deployment-guide.md             # Hướng dẫn triển khai (Docker)
└── presentation/
    ├── slides.pptx                 # Slide thuyết trình
    └── demo-video/                 # Video demo backup
        └── demo-smtts.mp4
```

---

## 8. QUY TẮC ĐẶT TÊN & CONVENTION

### File naming

| Platform | Convention | Ví dụ |
|----------|-----------|-------|
| Web (React) | PascalCase.tsx (component), camelCase.ts (utility) | `SubjectListPage.tsx`, `useAuth.ts` |
| Mobile (Kotlin) | PascalCase.kt | `CheckInActivity.kt`, `NfcReader.kt` |
| Backend (NestJS) | kebab-case.ts | `subjects.controller.ts`, `jwt-auth.guard.ts` |
| Tài liệu | kebab-case.md hoặc UPPER_CASE nếu là tên riêng | `SCR-020-subject-list.md` |

### Folder naming

Tất cả folder sử dụng **kebab-case** (chữ thường, nối bằng dấu gạch ngang). Ngoại trừ folder Java/Kotlin theo convention của ngôn ngữ.

### Git branch

```
main                    ← Production
develop                 ← Integration
feature/web-SCR-020     ← Feature branch theo mã màn hình
feature/be-auth         ← Feature branch backend
feature/mobile-checkin  ← Feature branch mobile
fix/alert-escalation    ← Bug fix
docs/srs-update         ← Documentation
```

### Commit message

```
feat(web): implement SCR-020 SubjectListPage
feat(be): add POST /api/v1/checkin endpoint
feat(mobile): NFC chip reader integration
fix(web): fix Alert badge color mapping
docs: update SRS section 4.3
chore: update Docker config
```

---

> **Ghi chú cuối:** Cấu trúc này được thiết kế tối ưu cho workflow sử dụng Claude AI để sinh code. Mỗi khi cần sinh code cho một phần cụ thể, chỉ cần paste đúng các file context tương ứng từ thư mục `claude-context/` vào prompt, Claude sẽ có đủ thông tin để sinh code chính xác theo đúng design system và business logic của dự án SMTTS.
