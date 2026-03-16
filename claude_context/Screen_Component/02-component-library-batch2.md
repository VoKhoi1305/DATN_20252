# 02 — COMPONENT LIBRARY (ĐỢT 2: LAYOUT)
# Hệ thống SMTTS — Subject Management, Tracking & Tracing System
# Design language: Đỏ-Đen · Nghiêm túc · Gov-style · Compact
# Phiên bản: 1.0 | Ngày: 15/03/2026

---

> **File này chứa 6 Layout components.**
> Khi viết screen spec, chỉ cần paste component mà màn đó dùng — KHÔNG paste cả file.
> VD: Màn Login chỉ cần LAY-AUTH. Màn Dashboard cần LAY-APP + LAY-TOP + LAY-SIDE + LAY-HDR.

---

# COMPONENT: AppLayout (LAY-APP)

## Mô tả
Layout chính cho TẤT CẢ màn hình sau khi đăng nhập. Gồm 4 phần xếp theo thứ tự từ trên xuống: Accent bar (3px đỏ) → Topbar (đen) → Sidebar (trái, tối) + Main content (phải, sáng). Đây là khung xương của toàn bộ Web Dashboard.

## Cấu trúc bố cục

```
┌──────────────────────────────────────────────────────────┐
│ ACCENT BAR                h=3px  bg=#b91c1c  flex-none   │
├──────────────────────────────────────────────────────────┤
│ TOPBAR (LAY-TOP)          h=40px bg=#09090b  flex-none   │
│                           border-bottom: 2px #b91c1c     │
├──────────┬───────────────────────────────────────────────┤
│ SIDEBAR  │ MAIN CONTENT                                  │
│ (LAY-    │                                               │
│ SIDE)    │ padding: 16px                                 │
│          │ bg: #fafafa                                   │
│ w=148px  │ overflow-y: auto                              │
│ bg=      │                                               │
│ #18181b  │  ┌────────────────────────────────────────┐  │
│ flex-    │  │ {children}                              │  │
│ none     │  │ Nội dung từng màn hình                  │  │
│ overflow │  │ render tại đây                          │  │
│ -y:auto  │  └────────────────────────────────────────┘  │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

## Props
| Prop       | Type        | Default   | Mô tả                                    |
|------------|-------------|-----------|-------------------------------------------|
| children   | ReactNode   | —         | Nội dung main content (từng page)         |
| activeNav  | string      | —         | Route đang active (highlight sidebar nav) |
| user       | UserInfo    | —         | Thông tin user đăng nhập (topbar + sidebar) |
| collapsed  | boolean     | false     | Sidebar thu nhỏ (48px, chỉ icon)         |
| onToggle   | () => void  | undefined | Toggle sidebar collapse                   |

## UserInfo Interface
```typescript
interface UserInfo {
  name: string;           // Tên hiển thị
  role: string;           // VD: 'CAN_BO_CO_SO'
  avatar?: string;        // URL ảnh (nếu có)
  initials: string;       // VD: 'NV' (fallback khi không có ảnh)
  dataScope: string;      // VD: 'Phường Bến Nghé, Q.1'
  unreadCount: number;    // Số thông báo chưa đọc
}
```

## Behavior
- Accent bar luôn cố định trên cùng, KHÔNG scroll
- Topbar cố định, KHÔNG scroll
- Sidebar cố định bên trái, scroll riêng nếu nội dung dài (overflow-y-auto)
- Main content scroll riêng (overflow-y-auto)
- `collapsed=true` → sidebar chuyển sang 48px, chỉ hiện icon, tooltip hiện tên khi hover
- Route `/admin/*` → hiện section "QUẢN TRỊ" trong sidebar (nếu role cho phép)

## Responsive
| Breakpoint     | Thay đổi                                                    |
|----------------|-------------------------------------------------------------|
| Desktop ≥1024  | Layout đầy đủ: sidebar 148px cố định                        |
| Tablet 640-1023| Sidebar collapsed mặc định (48px, chỉ icon)                 |
| Mobile <640    | Sidebar ẩn hoàn toàn. Hamburger icon trong Topbar. Click → sidebar overlay (z-300, bg-zinc-900) trượt từ trái + backdrop đen 50% |

## Tailwind classes
```tsx
// ═══ ROOT CONTAINER ═══
const root = "flex flex-col h-screen bg-zinc-50";

// ═══ ACCENT BAR ═══
const accentBar = "h-[3px] bg-red-700 flex-none";

// ═══ TOPBAR SLOT ═══
// Render <Topbar /> tại đây — xem LAY-TOP

// ═══ BODY (sidebar + main) ═══
const body = "flex flex-1 overflow-hidden";

// ═══ SIDEBAR SLOT ═══
// Render <Sidebar /> tại đây — xem LAY-SIDE

// ═══ MAIN CONTENT ═══
const main = "flex-1 overflow-y-auto p-4 bg-zinc-50";

// ═══ MOBILE OVERLAY BACKDROP ═══
const backdrop = "fixed inset-0 z-[250] bg-black/50";  // click → đóng sidebar

// ═══ MOBILE SIDEBAR OVERLAY ═══
const sidebarOverlay = "fixed inset-y-0 left-0 z-[300] w-[220px] bg-zinc-900 shadow-lg";
```

## Cấu trúc JSX gợi ý
```tsx
<div className={root}>
  {/* Accent bar */}
  <div className={accentBar} />

  {/* Topbar */}
  <Topbar user={user} onToggleSidebar={onToggle} />

  {/* Body */}
  <div className={body}>
    {/* Sidebar — desktop/tablet */}
    <Sidebar
      activeNav={activeNav}
      collapsed={collapsed}
      userRole={user.role}
    />

    {/* Main content */}
    <main className={main}>
      {children}
    </main>
  </div>

  {/* Mobile sidebar overlay */}
  {mobileOpen && (
    <>
      <div className={backdrop} onClick={closeMobile} />
      <div className={sidebarOverlay}>
        <Sidebar activeNav={activeNav} userRole={user.role} />
      </div>
    </>
  )}
</div>
```

---

# COMPONENT: AuthLayout (LAY-AUTH)

## Mô tả
Layout cho các màn xác thực: Đăng nhập (SCR-001), Xác thực OTP (SCR-002), Cài đặt OTP (SCR-003). Chia 2 panel: trái (tối, branding) + phải (sáng, form). Mobile chỉ hiện panel phải + logo nhỏ phía trên.

## Cấu trúc bố cục

```
Desktop (≥1024px):
┌──────────────────────────────────────────────────────────┐
│ ACCENT BAR               h=3px  bg=#b91c1c               │
├──────────────────────────┬───────────────────────────────┤
│ PANEL TRÁI               │ PANEL PHẢI                    │
│ w=45%  bg=#09090b        │ w=55%  bg=#ffffff             │
│                          │                               │
│ flex items-center        │ flex items-center             │
│ justify-center           │ justify-center                │
│                          │                               │
│ ┌──────────────────┐    │ ┌───────────────────────────┐ │
│ │ Logo 48x48       │    │ │ {children}                │ │
│ │                  │    │ │                           │ │
│ │ "SMTTS"          │    │ │ Form đăng nhập /          │ │
│ │ text-xl/600      │    │ │ OTP / Setup OTP           │ │
│ │ text-zinc-50     │    │ │                           │ │
│ │                  │    │ │ max-w-[380px]             │ │
│ │ "Hệ thống Quản  │    │ │                           │ │
│ │  lý, Theo dõi   │    │ │                           │ │
│ │  và Truy vết"   │    │ │                           │ │
│ │ text-sm/400      │    │ │                           │ │
│ │ text-zinc-400    │    │ │                           │ │
│ └──────────────────┘    │ └───────────────────────────┘ │
│                          │                               │
├──────────────────────────┴───────────────────────────────┤
│ Footer: "© 2026 SMTTS"  text-[11px] text-zinc-500       │
└──────────────────────────────────────────────────────────┘

Mobile (<1024px):
┌──────────────────────────────────────────────────────────┐
│ ACCENT BAR               h=3px  bg=#b91c1c               │
├──────────────────────────────────────────────────────────┤
│ bg=#ffffff  full width                                   │
│ flex flex-col items-center justify-center                │
│ px-6 py-8                                                │
│                                                          │
│ ┌────────────────────────────────────┐                  │
│ │ Logo 36x36 + "SMTTS" inline       │                  │
│ │ text-zinc-900  mb-8               │                  │
│ └────────────────────────────────────┘                  │
│                                                          │
│ ┌────────────────────────────────────┐                  │
│ │ {children}                         │                  │
│ │ Form đăng nhập / OTP              │                  │
│ │ w-full max-w-[380px]              │                  │
│ └────────────────────────────────────┘                  │
│                                                          │
│ Footer: "© 2026 SMTTS"                                  │
└──────────────────────────────────────────────────────────┘
```

## Props
| Prop     | Type      | Default | Mô tả                                            |
|----------|-----------|---------|---------------------------------------------------|
| children | ReactNode | —       | Nội dung form (Login form, OTP form, Setup form)  |
| title    | string    | undefined | Tiêu đề phía trên form (VD: "Đăng nhập hệ thống") |
| subtitle | string    | undefined | Mô tả ngắn dưới tiêu đề                          |

## States
| State   | Mô tả                                              |
|---------|-----------------------------------------------------|
| default | 2 panel hiển thị bình thường                        |
| mobile  | Panel trái ẩn, chỉ hiện logo nhỏ + form full width |

## Behavior
- Panel trái là static branding — không thay đổi giữa các màn auth
- Panel phải nhận `children` — mỗi màn auth render form riêng vào đây
- Form container: `max-w-[380px] w-full` — center trong panel phải
- `title` và `subtitle` render phía trên children trong panel phải:
  - title: `text-lg font-semibold text-zinc-900`
  - subtitle: `text-[13px] text-zinc-500 mt-1`
- Footer cố định dưới cùng

## Tailwind classes
```tsx
// ═══ ROOT ═══
const root = "flex flex-col min-h-screen";

// ═══ ACCENT BAR ═══
const accentBar = "h-[3px] bg-red-700 flex-none";

// ═══ BODY ═══
const body = "flex flex-1";

// ═══ PANEL TRÁI (desktop only) ═══
const panelLeft = `
  hidden lg:flex
  w-[45%] bg-zinc-950
  flex-col items-center justify-center
  px-8
`;

const brandLogo = "h-12 w-12 mb-4";  // SVG logo 48x48
const brandTitle = "text-xl font-semibold text-zinc-50 mb-2";
const brandDesc = "text-sm text-zinc-400 text-center max-w-[280px] leading-relaxed";

// ═══ PANEL PHẢI ═══
const panelRight = `
  flex-1 bg-white
  flex flex-col items-center justify-center
  px-6 py-8
`;

// ═══ MOBILE LOGO (chỉ hiện < 1024px) ═══
const mobileLogo = "flex lg:hidden items-center gap-2 mb-8";
const mobileLogoIcon = "h-9 w-9";
const mobileLogoText = "text-lg font-semibold text-zinc-900";

// ═══ FORM CONTAINER ═══
const formContainer = "w-full max-w-[380px]";

// ═══ TITLE + SUBTITLE (trên form) ═══
const title = "text-lg font-semibold text-zinc-900";
const subtitle = "text-[13px] text-zinc-500 mt-1 mb-6";

// ═══ FOOTER ═══
const footer = "py-4 text-center text-[11px] text-zinc-500";
```

---

# COMPONENT: Topbar (LAY-TOP)

## Mô tả
Thanh trên cùng cố định, nền đen (#09090b), border dưới đỏ (2px #b91c1c). Bên trái: logo + tên hệ thống. Bên phải: nút thông báo + tên user + avatar. Trên mobile: thêm hamburger menu bên trái.

## Cấu trúc bố cục

```
┌──────────────────────────────────────────────────────────┐
│ [☰]? [Logo 24px] SMTTS          [🔔 badge?] [Tên] [AV]  │
│  ↑mobile only                                            │
│                                                          │
│ h=40px  bg=#09090b  border-bottom: 2px solid #b91c1c    │
│ px=16px  flex items-center justify-between               │
└──────────────────────────────────────────────────────────┘

Chi tiết bên trái:
  [Hamburger] — chỉ hiện < 640px, h-5 w-5, text-zinc-400, hover text-zinc-200
  [Logo]      — 24x24px, SVG
  [SMTTS]     — text-[20px] font-semibold text-zinc-50, ml-2

Chi tiết bên phải:
  [Bell icon]  — h-5 w-5, text-zinc-400, hover text-zinc-200, relative
  [Badge]      — absolute -top-1 -right-1, h-4 min-w-4 px-1,
                 bg-red-700 text-zinc-50 text-[9px] font-semibold rounded-full
                 Hiện khi unreadCount > 0
  [Divider]    — w-px h-5 bg-zinc-700, mx-3
  [Tên cán bộ] — text-[13px] text-zinc-300, mr-2, hidden sm:block
  [Avatar]     — h-7 w-7 rounded bg-zinc-800 text-zinc-50
                 text-[11px] font-semibold flex items-center justify-center
                 Hiện initials nếu không có ảnh
```

## Props
| Prop             | Type       | Default   | Mô tả                                  |
|------------------|------------|-----------|------------------------------------------|
| user             | UserInfo   | —         | Thông tin user (name, initials, avatar, unreadCount) |
| onToggleSidebar  | () => void | undefined | Toggle sidebar (mobile hamburger)       |
| onNotificationClick | () => void | undefined | Click bell → mở dropdown thông báo   |
| onAvatarClick    | () => void | undefined | Click avatar → mở dropdown user menu   |

## States
| Element          | State   | Visual                                       |
|------------------|---------|----------------------------------------------|
| Hamburger        | default | text-zinc-400                                |
| Hamburger        | hover   | text-zinc-200                                |
| Bell icon        | default | text-zinc-400                                |
| Bell icon        | hover   | text-zinc-200                                |
| Bell icon        | hasUnread | badge đỏ hiện số                          |
| Avatar           | default | bg-zinc-800 text-zinc-50                     |
| Avatar           | hover   | bg-zinc-700                                  |

## Behavior
- Hamburger chỉ hiện trên mobile (< 640px), click → mở sidebar overlay
- Bell icon: click → mở notification dropdown (position absolute, top-full right-0, z-100)
- Avatar: click → mở user dropdown (Hồ sơ cá nhân, Đăng xuất)
- Badge count: hiện số (tối đa "99+"), ẩn khi unreadCount === 0
- Tên cán bộ: ẩn trên mobile (hidden sm:block)

## Accessibility
- Hamburger: `aria-label="Mở menu"`, `aria-expanded` theo sidebar state
- Bell: `aria-label="Thông báo"`, `aria-haspopup="true"`
- Avatar: `aria-label="Menu tài khoản"`, `aria-haspopup="true"`

## Tailwind classes
```tsx
// ═══ TOPBAR CONTAINER ═══
const topbar = `
  h-10 bg-zinc-950 border-b-2 border-red-700
  flex items-center justify-between
  px-4 flex-none
`;

// ═══ LEFT SECTION ═══
const leftSection = "flex items-center gap-2";

// Hamburger (mobile only)
const hamburger = `
  lg:hidden h-5 w-5 text-zinc-400
  hover:text-zinc-200 cursor-pointer
  transition-colors duration-150
`;

// Logo
const logo = "h-6 w-6 flex-shrink-0";

// System name
const systemName = "text-xl font-semibold text-zinc-50 ml-2 hidden sm:block";
const systemNameMobile = "text-base font-semibold text-zinc-50 ml-1.5";

// ═══ RIGHT SECTION ═══
const rightSection = "flex items-center";

// Bell icon container
const bellContainer = "relative cursor-pointer p-1";
const bellIcon = "h-5 w-5 text-zinc-400 hover:text-zinc-200 transition-colors duration-150";

// Notification badge
const notifBadge = `
  absolute -top-0.5 -right-0.5
  h-4 min-w-[16px] px-1
  bg-red-700 text-zinc-50 text-[9px] font-semibold
  rounded-full flex items-center justify-center
`;

// Divider
const divider = "w-px h-5 bg-zinc-700 mx-3";

// User name
const userName = "text-[13px] text-zinc-300 mr-2 hidden sm:block";

// Avatar
const avatar = `
  h-7 w-7 rounded bg-zinc-800 text-zinc-50
  text-[11px] font-semibold
  flex items-center justify-center
  cursor-pointer hover:bg-zinc-700
  transition-colors duration-150
  flex-shrink-0
`;
const avatarImage = "h-7 w-7 rounded object-cover";
```

---

# COMPONENT: Sidebar (LAY-SIDE)

## Mô tả
Thanh điều hướng dọc bên trái, nền tối (#18181b). Chứa nav items theo nhóm (CHỨC NĂNG, QUẢN TRỊ), divider, và nút Đăng xuất. Active item có border-left đỏ. Hỗ trợ collapsed mode (chỉ icon, 48px).

## Cấu trúc bố cục

```
Expanded (148px):                    Collapsed (48px):
┌────────────────────┐               ┌──────────┐
│ CHỨC NĂNG          │  ← section    │          │
│ • Tổng quan        │  ← nav item   │ [icon]   │ ← tooltip "Tổng quan"
│ • Hồ sơ đối tượng  │               │ [icon]   │
│ ● Sự kiện          │  ← active     │ [icon●]  │
│ • Cảnh báo         │               │ [icon]   │
│ • Vụ việc          │               │ [icon]   │
│ • Xét duyệt       │               │ [icon]   │
│ • Truy vết         │               │ [icon]   │
│ • Bản đồ          │               │ [icon]   │
│ • Kịch bản        │               │ [icon]   │
│ • Báo cáo         │               │ [icon]   │
│ ────────────────── │  ← divider    │ ──────── │
│ QUẢN TRỊ           │  ← section    │          │
│ • Tài khoản        │               │ [icon]   │
│ • Cấu hình        │               │ [icon]   │
│ • Nhật ký         │               │ [icon]   │
│ ────────────────── │               │ ──────── │
│                    │               │          │
│ Đăng xuất          │  ← bottom     │ [icon]   │
└────────────────────┘               └──────────┘
```

## Nav Items Data
```typescript
interface NavItem {
  key: string;        // unique key
  label: string;      // Display text
  route: string;      // Route path
  icon: ReactNode;    // Lucide icon component
  section: 'main' | 'admin';
  adminOnly?: boolean; // true → chỉ hiện với Admin/Lãnh đạo
}

const navItems: NavItem[] = [
  // CHỨC NĂNG
  { key: 'dashboard',  label: 'Tổng quan',        route: '/dashboard',    icon: <LayoutDashboard />, section: 'main' },
  { key: 'ho-so',      label: 'Hồ sơ đối tượng',  route: '/ho-so',        icon: <Users />,           section: 'main' },
  { key: 'events',     label: 'Sự kiện',          route: '/events',       icon: <Activity />,        section: 'main' },
  { key: 'alerts',     label: 'Cảnh báo',         route: '/alerts',       icon: <AlertTriangle />,   section: 'main' },
  { key: 'cases',      label: 'Vụ việc',          route: '/cases',        icon: <Briefcase />,       section: 'main' },
  { key: 'xet-duyet',  label: 'Xét duyệt',        route: '/xet-duyet',    icon: <CheckSquare />,     section: 'main' },
  { key: 'truy-vet',   label: 'Truy vết',         route: '/truy-vet',     icon: <Search />,          section: 'main' },
  { key: 'ban-do',     label: 'Bản đồ',           route: '/ban-do',       icon: <Map />,             section: 'main' },
  { key: 'kich-ban',   label: 'Kịch bản',         route: '/kich-ban',     icon: <Settings2 />,       section: 'main' },
  { key: 'bao-cao',    label: 'Báo cáo',          route: '/bao-cao',      icon: <BarChart3 />,       section: 'main' },

  // QUẢN TRỊ
  { key: 'tai-khoan',  label: 'Tài khoản',        route: '/admin/tai-khoan', icon: <UserCog />,      section: 'admin', adminOnly: true },
  { key: 'cau-hinh',   label: 'Cấu hình',         route: '/admin/cau-hinh',  icon: <Sliders />,      section: 'admin', adminOnly: true },
  { key: 'nhat-ky',    label: 'Nhật ký',          route: '/admin/nhat-ky',   icon: <FileText />,     section: 'admin', adminOnly: true },
];
```

## Props
| Prop       | Type        | Default   | Mô tả                                    |
|------------|-------------|-----------|-------------------------------------------|
| activeNav  | string      | —         | Key của nav item đang active              |
| collapsed  | boolean     | false     | Sidebar thu nhỏ (48px chỉ icon)          |
| userRole   | string      | —         | Role user → hiện/ẩn section QUẢN TRỊ     |
| onNavigate | (route: string) => void | — | Handler khi click nav item          |
| onLogout   | () => void  | —         | Handler đăng xuất                         |

## States — Nav Item
| State   | Background        | Text       | Border-left        | Dot color  |
|---------|-------------------|------------|---------------------|------------|
| default | transparent       | #a1a1aa    | —                   | #52525b    |
| hover   | #27272a           | #e4e4e7    | —                   | #71717a    |
| active  | rgba(39,39,42,.5) | #fafafa    | 2px solid #b91c1c   | #b91c1c    |

## Behavior
- Section QUẢN TRỊ: chỉ hiện khi `userRole` là `IT_ADMIN` hoặc `LANH_DAO`
- `collapsed=true`:
  - Width chuyển 48px
  - Ẩn text label, chỉ hiện icon (center)
  - Ẩn section label
  - Hover icon → tooltip hiện tên (CMP-TIP, position right)
  - Dot indicator ẩn
- Active matching: so sánh `activeNav` với `navItem.key`, hoặc dùng `route.startsWith()` cho nested routes
- Đăng xuất: luôn ở đáy sidebar, cách divider
- Scroll: nếu nav items dài hơn viewport → overflow-y-auto (scrollbar thin, zinc-700)

## Accessibility
- `<nav aria-label="Menu chính">` wrapper
- Mỗi nav item: `<a>` hoặc `<button>` với `aria-current="page"` khi active
- Section label: `role="heading"` aria-level="2"
- Collapsed: `aria-label` trên icon buttons vẫn có text đầy đủ

## Tailwind classes
```tsx
// ═══ SIDEBAR CONTAINER ═══
const sidebar = `
  w-[148px] bg-zinc-900 flex-none
  flex flex-col
  overflow-y-auto
  scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent
`;
const sidebarCollapsed = "w-12";  // 48px

// ═══ SECTION LABEL ═══
const sectionLabel = `
  px-3 pt-4 pb-2
  text-[10px] font-semibold uppercase tracking-widest text-zinc-500
  select-none
`;

// ═══ NAV ITEM (expanded) ═══
const navItem = `
  h-[34px] mx-1 px-3
  flex items-center gap-2
  text-[13px] text-zinc-400
  rounded-[3px]
  cursor-pointer select-none
  transition-colors duration-150
`;
const navItemHover = "hover:bg-zinc-800 hover:text-zinc-200";
const navItemActive = `
  bg-zinc-800/50 text-zinc-50
  border-l-2 border-red-700
  pl-[10px]
`;
// pl-[10px] = px-3 (12px) - border-l-2 (2px) để giữ alignment

// ═══ NAV ITEM ICON ═══
const navIcon = "h-4 w-4 flex-shrink-0";

// ═══ NAV ITEM DOT (expanded only) ═══
const navDot = "h-1 w-1 rounded-full bg-zinc-600 flex-shrink-0";
const navDotActive = "bg-red-700";

// ═══ NAV ITEM (collapsed) ═══
const navItemCollapsed = `
  h-10 w-10 mx-auto my-0.5
  flex items-center justify-center
  text-zinc-400 rounded-[3px]
  cursor-pointer
  transition-colors duration-150
  hover:bg-zinc-800 hover:text-zinc-200
`;
const navItemCollapsedActive = "bg-zinc-800/50 text-zinc-50 border-l-2 border-red-700";

// ═══ DIVIDER ═══
const divider = "h-px bg-zinc-800 mx-3 my-2";

// ═══ LOGOUT (đáy sidebar) ═══
const logoutSection = "mt-auto";
const logoutItem = `
  h-[34px] mx-1 px-3
  flex items-center gap-2
  text-[13px] text-zinc-500
  rounded-[3px] cursor-pointer
  hover:text-zinc-300 hover:bg-zinc-800
  transition-colors duration-150
  mb-2
`;
const logoutIcon = "h-4 w-4";
```

---

# COMPONENT: PageHeader (LAY-HDR)

## Mô tả
Tiêu đề trang + breadcrumb + action buttons. Nằm trên cùng trong content area (bên trong main). Mọi màn hình AppLayout đều có PageHeader. Khoảng cách cố định dưới PageHeader trước khi đến nội dung chính.

## Cấu trúc bố cục

```
Desktop:
┌──────────────────────────────────────────────────────────┐
│ Dashboard > Hồ sơ đối tượng                              │  ← Breadcrumb
├──────────────────────────────────────────────────────────┤
│ Hồ sơ đối tượng               [+ Thêm hồ sơ] [↓ Xuất]  │  ← Title + Actions
│ 156 đối tượng đang quản lý                               │  ← Subtitle (optional)
└──────────────────────────────────────────────────────────┘
  mb-4 (16px) → tiếp content bên dưới

Mobile:
┌──────────────────────────────────────────────────────────┐
│ Dashboard > Hồ sơ                                        │  ← Breadcrumb (truncate)
├──────────────────────────────────────────────────────────┤
│ Hồ sơ đối tượng                                         │  ← Title
│ 156 đối tượng đang quản lý                               │  ← Subtitle
│ [+ Thêm hồ sơ] [↓ Xuất]                                │  ← Actions (xuống dòng)
└──────────────────────────────────────────────────────────┘
```

## Props
| Prop       | Type                 | Default   | Mô tả                                   |
|------------|----------------------|-----------|------------------------------------------|
| breadcrumbs| Array<{label, href?}>| —         | Danh sách breadcrumb items               |
| title      | string               | —         | Tiêu đề trang (h1)                      |
| subtitle   | string               | undefined | Mô tả phụ bên dưới title                |
| actions    | ReactNode            | undefined | Action buttons bên phải (slot)           |
| className  | string               | undefined | Custom classes                           |

## Breadcrumb Item
```typescript
interface BreadcrumbItem {
  label: string;       // Text hiển thị
  href?: string;       // Link (undefined = item cuối, không click)
}
// VD: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Hồ sơ đối tượng' }]
```

## Behavior
- Breadcrumb item cuối (không có href): text-zinc-900 font-medium, không click
- Breadcrumb items trước: text-zinc-500, hover underline, click navigate
- Separator: "/" text-zinc-300, mx-1.5
- Title: dùng `<h1>`, text-lg font-semibold text-zinc-900
- Subtitle: text-[13px] text-zinc-500, mt-0.5
- Actions: flex gap-2, items-center, bên phải title (desktop) hoặc xuống dòng (mobile)
- Spacing: mb-4 dưới PageHeader → content bên dưới

## Responsive
| Breakpoint | Thay đổi                                       |
|------------|------------------------------------------------|
| Desktop    | Title + Actions trên cùng dòng (justify-between) |
| Mobile     | Actions xuống dòng dưới subtitle, mt-2, w-full   |

## Accessibility
- `<nav aria-label="Breadcrumb">` cho breadcrumb
- `<ol>` cho danh sách breadcrumb items
- `aria-current="page"` cho item cuối
- `<h1>` cho title

## Tailwind classes
```tsx
// ═══ WRAPPER ═══
const wrapper = "mb-4";

// ═══ BREADCRUMB ═══
const breadcrumbNav = "mb-2";
const breadcrumbList = "flex items-center text-[12px]";
const breadcrumbItem = "text-zinc-500 hover:text-zinc-700 hover:underline cursor-pointer";
const breadcrumbCurrent = "text-zinc-900 font-medium cursor-default";
const breadcrumbSeparator = "text-zinc-300 mx-1.5 select-none";  // "/"

// ═══ TITLE ROW ═══
const titleRow = "flex items-start justify-between gap-4 flex-wrap";

// ═══ TITLE ═══
const titleGroup = "flex-1 min-w-0";
const title = "text-lg font-semibold text-zinc-900 truncate";
const subtitle = "text-[13px] text-zinc-500 mt-0.5";

// ═══ ACTIONS ═══
const actions = "flex items-center gap-2 flex-shrink-0";
const actionsMobile = "w-full mt-2";  // mobile: full width, dưới subtitle
```

---

# COMPONENT: Breadcrumb (CMP-BRD)

## Mô tả
Đường dẫn điều hướng hiện vị trí hiện tại trong cấu trúc hệ thống. Thường nằm trong LAY-HDR nhưng cũng có thể dùng độc lập. Items cách nhau bằng separator "/".

## Cấu trúc

```
[Dashboard] / [Hồ sơ đối tượng] / HS-2024-0047

Item clickable:    text-zinc-500 hover:text-zinc-700 hover:underline
Item current:      text-zinc-900 font-medium (không click)
Separator:         "/" text-zinc-300 mx-1.5
Mono item:         Nếu item cuối là mã số → font-mono text-[12px]
```

## Props
| Prop   | Type                          | Default | Mô tả                |
|--------|-------------------------------|---------|-----------------------|
| items  | Array<{label, href?, mono?}>  | —       | Danh sách items       |

## Behavior
- Item cuối: không có href, hiện như current page
- Item có `mono=true`: dùng font-mono (cho mã hồ sơ, mã case)
- Trên mobile: nếu quá dài → truncate items ở giữa, hiện "..." thay thế
  - VD: [Dashboard] / ... / [HS-2024-0047]
- Click item → navigate bằng router.push

## Accessibility
- `<nav aria-label="Breadcrumb">`
- `<ol>` semantic list
- `aria-current="page"` cho item cuối

## Tailwind classes
```tsx
// ═══ NAV WRAPPER ═══
const nav = "";  // không cần style wrapper

// ═══ LIST ═══
const list = "flex items-center text-[12px] flex-wrap";

// ═══ ITEM ═══
const item = `
  text-zinc-500
  hover:text-zinc-700 hover:underline
  cursor-pointer transition-colors duration-150
`;
const itemCurrent = "text-zinc-900 font-medium cursor-default hover:no-underline";
const itemMono = "font-mono text-[12px] tracking-wide";

// ═══ SEPARATOR ═══
const separator = "text-zinc-300 mx-1.5 select-none";  // nội dung: "/"

// ═══ ELLIPSIS (mobile truncate) ═══
const ellipsis = "text-zinc-400 mx-1 select-none";  // nội dung: "..."
```

---

# TỔNG KẾT ĐỢT 2

## Checklist hoàn thiện

| Component   | Mã       | Cấu trúc ASCII | Responsive | Props | Tailwind | Status |
|-------------|----------|-----------------|------------|-------|----------|--------|
| AppLayout   | LAY-APP  | ✅              | ✅ 3 breakpoints | ✅ 5 props + UserInfo | ✅ | Done |
| AuthLayout  | LAY-AUTH | ✅ Desktop + Mobile | ✅ panel ẩn/hiện | ✅ 3 props | ✅ | Done |
| Topbar      | LAY-TOP  | ✅              | ✅ hamburger | ✅ 4 props | ✅ | Done |
| Sidebar     | LAY-SIDE | ✅ Expanded + Collapsed | ✅ overlay mobile | ✅ 5 props + NavItem[] | ✅ | Done |
| PageHeader  | LAY-HDR  | ✅ Desktop + Mobile | ✅ actions wrap | ✅ 5 props | ✅ | Done |
| Breadcrumb  | CMP-BRD  | ✅              | ✅ truncate | ✅ 1 prop | ✅ | Done |

## Cách dùng khi viết Screen Spec

```
Màn SCR-001 (Đăng nhập) → paste: LAY-AUTH + CMP-BTN + CMP-INPUT
Màn SCR-010 (Dashboard)  → paste: LAY-APP + LAY-TOP + LAY-SIDE + LAY-HDR + CMP-BRD
Màn SCR-020 (DS Hồ sơ)   → paste: LAY-HDR + CMP-BRD (LAY-APP/TOP/SIDE đã biết)
```

> **Mẹo:** Sau khi Claude đã sinh code AppLayout 1 lần, các màn sau chỉ cần paste LAY-HDR + components trong content area — không cần paste lại LAY-APP/LAY-TOP/LAY-SIDE.

## Đợt tiếp theo

```
Đợt 3 — Feedback & Forms: CMP-TOAST, CMP-MODAL, CMP-CFIRM, CMP-DATE, CMP-TXT, CMP-FILE, CMP-CHK, CMP-RAD
Đợt 4 — Display: CMP-CARD, CMP-STAT, CMP-EMPTY, CMP-LOAD, CMP-TLINE, CMP-TAG, CMP-AVT, CMP-TABS, CMP-DRAWER, CMP-FILTER
Đợt 5 — Domain: CMP-MAP, CMP-NOTES, CMP-ALVL, CMP-ESCINFO, CMP-CAMERA, CMP-QBUILD, CMP-GEOEDIT
```
