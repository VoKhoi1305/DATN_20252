# PROMPT TEMPLATE — Tạo Screen Spec cho từng màn hình SMTTS

> **Hướng dẫn sử dụng:**
> 1. Copy toàn bộ block `[CONTEXT]` bên dưới
> 2. Thay `[COMPONENTS]` bằng component specs mà màn đó dùng (chỉ paste component cần)
> 3. Thay `[YÊU CẦU]` bằng mô tả màn hình cụ thể
> 4. Paste vào prompt mới cho Claude

---

## PROMPT (copy từ đây)

```
[CONTEXT — DESIGN SYSTEM]

Dự án: SMTTS — Hệ thống Quản lý, Theo dõi và Truy vết Đối tượng
Tech: React + Tailwind CSS
Design language: Đỏ-Đen · Nghiêm túc · Gov-style · Compact

RÀNG BUỘC BẮT BUỘC — KHÔNG được thay đổi:
1. Primary: #b91c1c (red-700) — KHÔNG blue-600, KHÔNG màu khác
2. Font: IBM Plex Sans — KHÔNG Inter, KHÔNG Geist
3. Font mono: IBM Plex Mono — cho mã số, CCCD, ID
4. Border radius: tối đa 4px (rounded) — KHÔNG rounded-lg, rounded-xl
5. KHÔNG shadow-md, shadow-lg — chỉ border 1px hoặc shadow-xs/shadow-sm
6. KHÔNG gradient — flat color
7. Compact: body text 13px, label 12px, input h-9 (36px)
8. Topbar: h-10 bg-zinc-950, border-bottom 2px red-700
9. Accent bar: h-[3px] bg-red-700 trên cùng
10. Sidebar: w-[148px] bg-zinc-900, active item border-left 2px red-700

COLOR TOKENS:
  Primary: #b91c1c / hover #991b1b / press #7f1d1d / light #fee2e2
  Surface: zinc-950 #09090b / zinc-900 #18181b / zinc-100 #f4f4f5 / zinc-50 #fafafa
  Text: primary #09090b / secondary #52525b / disabled #a1a1aa / inverse #fafafa
  Semantic: success #166534 / warning #854d0e / error #b91c1c / info #1e40af

TYPOGRAPHY:
  h1: 18px/600 | h2: 15px/600 | body: 13px/400 | label: 12px/500
  caption: 11px/400 | mono: 12px/400 font-mono

LAYOUT CONSTANTS:
  Topbar: 40px | Accent: 3px | Sidebar: 148px | Content padding: 16px
  Input/Button md: 36px | Table row: 36px | Table header: 34px

---

[COMPONENTS — Paste component specs mà màn hình này dùng]

(Paste nội dung từ file 02-component-library-batchN.md,
 CHỈ component mà màn này sử dụng)

---

[YÊU CẦU]

Dựa vào Design System và Component Specs trên, hãy viết Screen Spec chi tiết cho:

Màn hình: [Tên màn hình] (SCR-[NNN])
Route: /[path]
Layout: [AppLayout / AuthLayout]
Chức năng: [Mô tả ngắn 1-2 câu]

Yêu cầu Screen Spec phải có đầy đủ:
1. Metadata (route, title, auth, layout)
2. Layout ASCII art cụ thể cho màn này
3. Components sử dụng (bảng: tên, ID, variant, props đặc biệt)
4. Form Fields chi tiết (nếu có): label, placeholder, type, monospace, validation rules
5. API Integration: endpoint, method, request body, response handling, error mapping
6. States màn hình: idle, loading, success, error, empty (nếu có)
7. Navigation: trigger → destination → method
8. Responsive: thay đổi trên mobile
9. Edge Cases: xử lý tình huống đặc biệt

Viết theo đúng format template screen spec chuẩn.
KHÔNG tự ý đổi hex values, font, border-radius đã định nghĩa.
```

---

## BẢNG TRA CỨU — Màn nào cần component nào

| Màn hình | Components cần paste |
|----------|---------------------|
| SCR-001 Đăng nhập | LAY-AUTH, CMP-BTN, CMP-INPUT |
| SCR-002 OTP | LAY-AUTH, CMP-BTN, CMP-INPUT |
| SCR-003 Setup OTP | LAY-AUTH, CMP-BTN, CMP-INPUT, CMP-MODAL |
| SCR-010 Dashboard | LAY-HDR, CMP-BRD, CMP-CARD/STAT, CMP-TABLE, CMP-BADGE |
| SCR-020 DS Hồ sơ | LAY-HDR, CMP-BRD, CMP-TABLE, CMP-PAGE, CMP-BADGE, CMP-BTN, CMP-INPUT(search), CMP-SEL |
| SCR-021 Chi tiết HS | LAY-HDR, CMP-BRD, CMP-TABS, CMP-CARD, CMP-BADGE, CMP-BTN, CMP-TLINE |
| SCR-022 Thêm HS | LAY-HDR, CMP-BRD, CMP-BTN, CMP-INPUT, CMP-SEL, CMP-DATE, CMP-TXT |
| SCR-040 Alert | LAY-HDR, CMP-BRD, CMP-TABLE, CMP-PAGE, CMP-BADGE, CMP-BTN, CMP-SEL |
| SCR-041 Chi tiết Alert | LAY-HDR, CMP-BRD, CMP-CARD, CMP-BADGE, CMP-BTN, CMP-CFIRM, CMP-TOAST |
| SCR-050 Case | LAY-HDR, CMP-BRD, CMP-TABLE, CMP-PAGE, CMP-BADGE, CMP-BTN, CMP-TABS |
| SCR-051 Chi tiết Case | LAY-HDR, CMP-BRD, CMP-CARD, CMP-BADGE, CMP-BTN, CMP-TXT, CMP-FILE, CMP-CFIRM |
| SCR-060 Xét duyệt | LAY-HDR, CMP-BRD, CMP-TABLE, CMP-PAGE, CMP-BADGE, CMP-BTN, CMP-SEL |
| SCR-061 Chi tiết YC | LAY-HDR, CMP-BRD, CMP-CARD, CMP-BTN, CMP-TXT, CMP-CFIRM, CMP-TOAST |
| SCR-090 DS Kịch bản | LAY-HDR, CMP-BRD, CMP-TABLE, CMP-PAGE, CMP-BADGE, CMP-BTN, CMP-TABS |
| SCR-110 Tài khoản | LAY-HDR, CMP-BRD, CMP-TABLE, CMP-PAGE, CMP-BADGE, CMP-BTN |

> Lưu ý: LAY-APP, LAY-TOP, LAY-SIDE chỉ cần paste 1 LẦN ĐẦU khi sinh code layout.
> Các màn sau chỉ cần paste LAY-HDR + components trong content area.
