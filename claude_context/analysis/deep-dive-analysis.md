# PHÂN TÍCH CHUYÊN SÂU (DEEP-DIVE ANALYSIS)
## Hệ thống Quản lý, Theo dõi và Truy vết Đối tượng thuộc Diện Quản lý
### Subject Management, Tracking & Tracing System (SMTTS)

---

**Phiên bản:** Final  
**Vai trò phân tích:** Lead Business Analyst & Senior System Architect  
**Ngày:** 15/03/2026  

---

# MỤC LỤC

1. [Toàn cảnh Hệ thống](#1-toàn-cảnh-hệ-thống)
2. [Ma trận Tính năng Chi tiết](#2-ma-trận-tính-năng-chi-tiết)
3. [Scenario Engine — Hệ thống Kịch bản Động](#3-scenario-engine--hệ-thống-kịch-bản-động)
4. [Luồng Nghiệp vụ Phức tạp](#4-luồng-nghiệp-vụ-phức-tạp)
5. [Phân tích Rủi ro và Edge Cases](#5-phân-tích-rủi-ro-và-edge-cases)
6. [Câu hỏi Phản biện](#6-câu-hỏi-phản-biện)

---

# 1. TOÀN CẢNH HỆ THỐNG

## 1.1. Mô hình Vận hành

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HỆ THỐNG SMTTS                             │
│                                                                     │
│   ┌───────────────────┐                    ┌─────────────────────┐  │
│   │   CÁN BỘ          │                    │  NGƯỜI BỊ QUẢN LÝ  │  │
│   │   (Có thẩm quyền) │                    │  (Đối tượng)        │  │
│   │                    │                    │                     │  │
│   │  • Xây kịch bản   │                    │  • Đăng nhập CCCD   │  │
│   │  • Gán kịch bản   │                    │  • Trình báo online │  │
│   │  • Giám sát       │                    │    (NFC + Face)     │  │
│   │  • Xử lý Alert    │                    │  • Xin phép         │  │
│   │  • Quản lý Case   │                    │  • Xem lịch / KQ    │  │
│   │  • Truy vết       │                    │                     │  │
│   │  • Chụp ảnh/ghi   │                    │                     │  │
│   │    chú thực địa   │                    │                     │  │
│   │    (trên trình     │                    │                     │  │
│   │    duyệt mobile)  │                    │                     │  │
│   └────────┬──────────┘                    └──────────┬──────────┘  │
│            │                                          │             │
│            ▼                                          ▼             │
│   ┌───────────────────┐    ┌──────────────┐  ┌──────────────────┐  │
│   │   WEB DASHBOARD   │◀──▶│   BACKEND    │◀▶│   MOBILE APP     │  │
│   │   (Responsive)    │    │              │  │   (Đối tượng)    │  │
│   │                    │    │  API, Logic, │  │                  │  │
│   │  Desktop: Quản lý │    │  Scenario    │  │  Trình báo,      │  │
│   │  đầy đủ           │    │  Engine,     │  │  Xin phép,       │  │
│   │                    │    │  Biometric,  │  │  Thông báo       │  │
│   │  Mobile browser:  │    │  Data        │  │                  │  │
│   │  Chụp ảnh, ghi   │    │              │  │                  │  │
│   │  chú thực địa    │    │              │  │                  │  │
│   └───────────────────┘    └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Triết lý thiết kế

> 1. **Kịch bản do cán bộ xây dựng** → gán cho đối tượng → hệ thống tự vận hành.
> 2. **Đối tượng tự chấp hành** — trình báo online bằng NFC + Face. App lấy GPS + timestamp lúc đó, không chạy nền.
> 3. **Mọi sự kiện thành Event** → Kịch bản Alert (bao gồm Alert Rules mặc định + Alert Rules tùy chỉnh) quyết định Event nào thành Alert → Alert có thể **tự động hoặc thủ công** escalate thành Case (tùy cấu hình mức nguy hiểm).
> 4. **Cán bộ dùng Web Responsive** — Desktop cho quản lý đầy đủ, mobile browser cho chụp ảnh và ghi chú thực địa. Không có app riêng cho cán bộ. Không có cơ chế giao task tự động.
> 5. **Dashboard scope theo địa bàn** — mặc định chỉ thấy khu vực quản lý. Tìm kiếm mở rộng khi cần (có quyền).
> 6. **Bảo mật đa lớp** — Hỗ trợ xác thực OTP bên ngoài (Google Authenticator, SMS OTP...) cho tài khoản cán bộ.

## 1.2. Phạm vi Bài toán

| Khía cạnh | Mô tả |
|---|---|
| **Who** | Đối tượng thuộc diện quản lý (chấp hành) + Cán bộ (giám sát, xử lý) |
| **What** | Hồ sơ, kịch bản, trình báo online, Event/Alert/Case, truy vết |
| **Where** | Đa cấp: phường/xã → quận/huyện → tỉnh/thành |
| **When** | Toàn vòng đời: Enrollment → Đang quản lý → Kết thúc |
| **How** | Mobile App (đối tượng) + Responsive Web (cán bộ) + Scenario Engine (tự động) |

## 1.3. Stakeholders

| Stakeholder | Vai trò | Sử dụng |
|---|---|---|
| **Người bị quản lý** | Chấp hành kịch bản, tự trình báo, gửi yêu cầu | Mobile App |
| **Cán bộ cơ sở (Phường/Xã)** | Giám sát trong khu vực, xử lý Alert/Case, xét duyệt, chụp ảnh/ghi chú thực địa | Web (Desktop + Mobile browser) |
| **Cán bộ quản lý (Quận/Huyện)** | Xây kịch bản, gán kịch bản, giám sát tổng hợp, truy vết | Web Desktop |
| **Lãnh đạo (Tỉnh/TP)** | Phê duyệt kịch bản, xem báo cáo chiến lược | Web Desktop |
| **IT Admin** | Cấu hình hệ thống, phân quyền, bảo trì | Web Admin Panel |

## 1.4. Giá trị Cốt lõi

| # | Giá trị | Mô tả |
|---|---|---|
| V1 | **Trình báo Online** | NFC CCCD + Face. GPS chỉ lấy lúc trình báo. |
| V2 | **Xác thực 4 yếu tố** | NFC chip (thẻ thật) + Face (đúng người) + GPS (vị trí) + Timestamp (thời điểm) |
| V3 | **Kịch bản Linh hoạt** | Kịch bản Quản lý + Kịch bản Alert (có Alert Rules mặc định + tùy chỉnh) |
| V4 | **Event → Alert → Case** | Event tự động. Alert theo kịch bản (mặc định + tùy chỉnh). Case: auto-escalate hoặc thủ công, ghi lại nguồn escalate. |
| V5 | **Web Responsive** | Cán bộ dùng desktop lẫn mobile browser. Chụp ảnh, ghi chú thực địa trên trình duyệt điện thoại. |
| V6 | **Bảo mật đa lớp** | Mã hóa CCCD + mật khẩu. Hỗ trợ OTP ngoài (Google Authenticator, SMS OTP...) cho cán bộ. Biometric tách biệt. |

## 1.5. Pain Points giải quyết

| # | Pain Point | Giải pháp |
|---|---|---|
| P1 | Trình báo bất tiện, phải đến trụ sở | Trình báo online NFC + Face |
| P2 | Giả mạo trình báo | Xác thực 4 yếu tố |
| P3 | Quy trình cứng nhắc | Scenario Engine + Alert Rules mặc định + tùy chỉnh |
| P4 | Không biết khi nào cần can thiệp | Event → Alert (tự động theo kịch bản) → Case (auto hoặc thủ công) |
| P5 | Cán bộ không thể ghi chú tại hiện trường | Web Responsive: chụp ảnh + ghi chú trên trình duyệt mobile |
| P6 | Truy vết chậm | Timeline + Spatial Trace + Search |
| P7 | Cán bộ quá tải | Đối tượng tự chấp hành. Alert Rules mặc định tự phát hiện vi phạm cơ bản. |
| P8 | Tài khoản cán bộ dễ bị xâm nhập | OTP ngoài (Google Authenticator, SMS OTP...) |

---

# 2. MA TRẬN TÍNH NĂNG CHI TIẾT

## 2.1. MOBILE APP — NGƯỜI BỊ QUẢN LÝ

> **1 app duy nhất.** Smartphone có NFC. GPS chỉ bật khi trình báo.

### 2.1.1. Đăng ký & Đăng nhập

| ID | Tính năng | Mô tả |
|---|---|---|
| SA-01 | **Enrollment (Lần đầu)** | Có mặt cán bộ. Quẹt NFC CCCD → đọc chip → quét Face so khớp với ảnh chip → nếu khớp → tạo tài khoản: username = số CCCD (mã hóa lưu trữ), đối tượng đặt mật khẩu (hash bcrypt/argon2). Cán bộ xác nhận enrollment trên Web. |
| SA-02 | **Đăng nhập** | Số CCCD + mật khẩu. Cả hai mã hóa khi truyền (TLS) và lưu trữ. "Quên mật khẩu" → phải gặp cán bộ để reset (xác minh danh tính trực tiếp). |
| SA-03 | **Quản lý thiết bị** | Bind 1 thiết bị. Đổi thiết bị → gửi yêu cầu → cán bộ duyệt trên Web. |
| SA-04 | **Đổi mật khẩu** | Tự đổi trong app (nhập mật khẩu cũ). |

### 2.1.2. Trình báo Online

| ID | Tính năng | Mô tả |
|---|---|---|
| SA-05 | **Màn hình chính** | "Lần trình báo tiếp theo: [ngày/giờ]", countdown, nút "TRÌNH BÁO NGAY". Quá hạn: cảnh báo đỏ. |
| SA-06 | **Quy trình trình báo** | Nhấn "Trình báo" → App lấy GPS + timestamp → Quẹt NFC CCCD (xác minh chip hợp lệ + đúng số đăng ký) → Quét Face (liveness + so khớp) → Gửi Backend: NFC data + face image + GPS + timestamp → Backend trả kết quả. |
| SA-07 | **Liveness Detection** | Hành động ngẫu nhiên: quay đầu, nháy mắt, mở miệng. Chống ảnh/video giả. |
| SA-08 | **NFC Chip Verification** | Đọc chip NFC CCCD + xác minh chữ ký số → CCCD thật, chưa giả mạo. |
| SA-09 | **Xử lý kết quả** | **Thành công + trong geofence:** "✓ Trình báo thành công." **Thành công + ngoài geofence:** "✓ Đã ghi nhận. Lưu ý: ngoài khu vực quản lý." (lưu vết event). **NFC fail:** retry 3 lần. **Face fail:** retry 3 lần → gợi ý liên hệ cán bộ. |
| SA-10 | **Trình báo tự nguyện** | Chủ động trình báo ngoài lịch. Ghi event "trình báo tự nguyện". |

### 2.1.3. Xin phép & Yêu cầu

| ID | Tính năng | Mô tả |
|---|---|---|
| SA-11 | **Xin phép đi xa** | Lý do, nơi đến, từ ngày — đến ngày → Cán bộ duyệt. Trạng thái: Chờ / Duyệt / Từ chối. |
| SA-12 | **Báo thay đổi nơi cư trú** | Địa chỉ mới → Cán bộ ghi nhận/duyệt. |
| SA-13 | **Xin hoãn trình báo** | Lý do → Cán bộ duyệt → hệ thống điều chỉnh lịch. |
| SA-14 | **Yêu cầu đổi thiết bị** | Khi đổi điện thoại → Cán bộ duyệt. |
| SA-15 | **Phản hồi / Khiếu nại** | Text + ảnh gửi cán bộ quản lý. |

### 2.1.4. Thông tin & Thông báo

| ID | Tính năng | Mô tả |
|---|---|---|
| SA-16 | **Xem kịch bản** | Ngôn ngữ phổ thông: "Trình báo 2 lần/tháng", "Khu vực: [tên]", "Giới nghiêm: 22:00-05:00". |
| SA-17 | **Lịch trình báo** | Calendar: đã trình báo (xanh), bỏ lỡ (đỏ), sắp tới (vàng). |
| SA-18 | **Lịch sử trình báo** | Danh sách: ngày giờ, vị trí, kết quả, trong/ngoài geofence. |
| SA-19 | **Push notification** | Nhắc deadline (tần suất theo kịch bản). Thông báo kịch bản thay đổi. Kết quả xét duyệt. |
| SA-20 | **Liên hệ cán bộ** | Tên, SĐT cán bộ phụ trách. |
| SA-21 | **Trạng thái yêu cầu** | Danh sách yêu cầu: loại, ngày, trạng thái, ghi chú cán bộ. |
| SA-22 | **Hướng dẫn sử dụng** | Hướng dẫn có hình, FAQ, hotline. |

---

## 2.2. WEB DASHBOARD — CÁN BỘ (Responsive Web)

> **Thiết kế Responsive Web (Mobile-friendly).** Desktop: quản lý đầy đủ. Mobile browser: cán bộ dùng trình duyệt điện thoại tại hiện trường để chụp ảnh qua camera, ghi chú, xem Alert/Case, tra cứu đối tượng.

### 2.2.1. Dashboard & Tổng quan

| ID | Tính năng | Mô tả |
|---|---|---|
| W-01 | **Dashboard (Scope theo địa bàn)** | **Mặc định chỉ hiện đối tượng trong khu vực quản lý** của cán bộ đăng nhập. Tổng đối tượng, compliance rate, Event hôm nay, Alert đang mở, Case đang mở. Responsive: hiển thị tốt trên mobile. |
| W-02 | **Executive Dashboard** | Cấp quận/tỉnh: tổng hợp nhiều đơn vị, bản đồ nhiệt, so sánh compliance. |
| W-03 | **KPI** | Tỷ lệ trình báo đúng hạn, online vs trực tiếp, face match rate, Alert/Case theo thời gian, thời gian đóng Case. |
| W-04 | **Widget customization** | Kéo thả, chọn metric, lưu layout. |

### 2.2.2. Quản lý Hồ sơ

| ID | Tính năng | Mô tả |
|---|---|---|
| W-05 | **Hồ sơ CRUD** | Nhân thân, ảnh, gia đình, pháp lý, kịch bản áp dụng, thiết bị, trạng thái. |
| W-06 | **Version History** | Ai thay đổi gì, khi nào. Diff. |
| W-07 | **Merge / Deduplicate** | Phát hiện trùng CCCD, gộp hồ sơ + lịch sử. |
| W-08 | **Import / Export** | Import Excel/CSV, export Excel/PDF/CSV. |
| W-09 | **Document Management** | Đính kèm tài liệu (bản án, quyết định). Phân loại, preview. |
| W-10 | **Template hồ sơ** | Template theo loại đối tượng. |
| W-11 | **Lifecycle** | Khởi tạo → Enrollment → Đang quản lý → Tái hòa nhập → Kết thúc. |
| W-12 | **Enrollment Management** | Danh sách enrollment, thiết bị, reset, duyệt đổi thiết bị. |
| W-13 | **Tìm kiếm** | **Mặc định:** đối tượng trong khu vực (giảm tải). **Nâng cao:** tìm toàn hệ thống (nếu có quyền) — tên, CCCD, địa bàn, trạng thái, kịch bản. Saved search. |

### 2.2.3. EVENT — Sổ ghi Sự kiện

> **Event = mọi sự kiện, ghi tự động. Dữ liệu thô.**

| ID | Tính năng | Mô tả |
|---|---|---|
| W-14 | **Event Log** | Toàn bộ Event: trình báo thành công/thất bại, ngoài geofence, quá hạn, NFC fail, face mismatch, trình báo tự nguyện, thay đổi kịch bản, yêu cầu xin phép, đăng nhập... Lọc: đối tượng, loại, thời gian, khu vực. **Scope theo địa bàn mặc định.** |
| W-15 | **Event Detail** | Chi tiết: đối tượng, thời gian, GPS, ảnh face capture, NFC data, match score, geofence result. |
| W-16 | **Event Timeline** | Event 1 đối tượng theo trục thời gian. |
| W-17 | **Event Export** | Xuất Excel/CSV. |

### 2.2.4. ALERT — Cảnh báo

> **Alert = sinh ra khi Event thỏa điều kiện trong kịch bản Alert. Có 2 nguồn: Alert Rules mặc định (System Default — luôn có) + Alert Rules tùy chỉnh (cán bộ tự xây).**

| ID | Tính năng | Mô tả |
|---|---|---|
| W-18 | **Alert Dashboard** | Alert đang mở: đối tượng, loại, mức độ (Thấp/Trung bình/Cao/Khẩn cấp), thời gian, nguồn (mặc định/tùy chỉnh). Scope theo địa bàn. **Responsive: xem được trên mobile browser.** |
| W-19 | **Alert Detail** | Event gốc, đối tượng, kịch bản trigger (mặc định hay tùy chỉnh), mức độ, lịch sử xử lý, **thông tin escalation (nếu đã escalate):** auto hay thủ công, ai/hệ thống escalate. |
| W-20 | **Xử lý Alert** | Xem → ghi chú → "Đã xử lý" → HOẶC "Escalate thành Case". **2 flow escalation:** (1) **Tự động:** nếu mức Alert đạt ngưỡng nguy hiểm cấu hình trong kịch bản → hệ thống tự tạo Case, ghi "Escalated by: SYSTEM, reason: [quy tắc kịch bản]". (2) **Thủ công:** cán bộ nhấn "Escalate" → ghi "Escalated by: [tên cán bộ]". |
| W-21 | **Alert History** | Alert đã xử lý: ai, khi nào, ghi chú, kết quả, escalation info. |

### 2.2.5. CASE — Quản lý Vụ việc

> **Case = vi phạm nghiêm trọng. Tạo bởi: auto-escalate từ Alert HOẶC cán bộ thủ công. Case Mở / Case Đóng.**

| ID | Tính năng | Mô tả |
|---|---|---|
| W-22 | **Case Dashboard** | **Case Mở** (chưa kiểm tra/chưa xử lý) + **Case Đóng** (đã xử lý). Lọc: trạng thái, đối tượng, mức độ, thời gian. Scope theo địa bàn. **Responsive.** |
| W-23 | **Tạo Case** | **Từ Alert (auto):** hệ thống tự tạo khi Alert đạt ngưỡng nguy hiểm. Ghi: "Tạo bởi: SYSTEM — Auto-escalate từ Alert #[ID], kịch bản [tên], quy tắc [mô tả]". **Từ Alert (thủ công):** cán bộ nhấn "Escalate". Ghi: "Tạo bởi: [cán bộ] — Escalate từ Alert #[ID]". **Tạo mới (thủ công):** cán bộ tự tạo Case cho tình huống ngoài hệ thống. Ghi: "Tạo bởi: [cán bộ] — Tạo thủ công". Thông tin: đối tượng, mô tả, mức độ, Alert/Event liên quan, tài liệu. |
| W-24 | **Case Detail** | Toàn bộ: đối tượng, nguồn tạo (auto/thủ công + ai tạo), Alert/Event liên quan, ghi chú thread, tài liệu, trạng thái. |
| W-25 | **Case Notes (Ghi chú)** | Cán bộ ghi chú: hành động, kết quả, quyết định. Mỗi ghi chú: nội dung + cán bộ + thời gian + **ảnh đính kèm (chụp từ mobile browser)**. Nhiều ghi chú / 1 Case (dạng thread). |
| W-26 | **Đóng Case** | Bắt buộc ghi chú kết quả khi đóng. **Ghi lại: cán bộ đóng + thời gian đóng + ghi chú đóng.** Case Đóng: chỉ xem, không sửa. Mở lại: tạo Case Mở mới liên kết với Case Đóng cũ. |
| W-27 | **Case Timeline** | Ngày tạo (auto/thủ công + nguồn) → ghi chú → đóng. Kết hợp Event timeline đối tượng. |
| W-28 | **Case Export** | Xuất PDF: thông tin, diễn biến, ghi chú, kết quả, nguồn escalation. |

### 2.2.6. Tính năng Thực địa (Mobile Browser)

> **Cán bộ dùng trình duyệt điện thoại để thao tác tại hiện trường.** Web Responsive đảm bảo UX tốt trên mobile.

| ID | Tính năng | Mô tả |
|---|---|---|
| W-29 | **Chụp ảnh thực địa** | Từ mobile browser: chụp ảnh qua camera điện thoại (sử dụng HTML5 Media Capture). Ảnh tự động gắn metadata: GPS trình duyệt + timestamp. Đính kèm vào Case Note hoặc Event. |
| W-30 | **Ghi chú nhanh thực địa** | Nhập ghi chú text + chọn đối tượng + đính kèm ảnh. Lưu như Event "ghi nhận thực địa" hoặc thêm vào Case Note. Giao diện tối ưu cho màn hình nhỏ. |
| W-31 | **Tra cứu đối tượng (Mobile)** | Tìm kiếm nhanh trên mobile browser: nhập tên/CCCD → xem hồ sơ tóm tắt, kịch bản, Alert/Case đang mở. |
| W-32 | **Xem/Xử lý Alert (Mobile)** | Xem danh sách Alert, acknowledge, ghi chú, escalate → tất cả trên mobile browser. |
| W-33 | **Xem/Ghi chú Case (Mobile)** | Xem Case, thêm ghi chú + ảnh từ hiện trường. |

### 2.2.7. Xét duyệt Yêu cầu

| ID | Tính năng | Mô tả |
|---|---|---|
| W-34 | **Hàng đợi yêu cầu** | Yêu cầu từ đối tượng: đi xa, hoãn trình báo, đổi thiết bị, đổi nơi ở. Lọc theo loại, trạng thái. |
| W-35 | **Xét duyệt** | Xem chi tiết → Duyệt/Từ chối + ghi chú. Hệ thống tự điều chỉnh (lịch, geofence, device). Đối tượng nhận push. |

### 2.2.8. Truy vết & Phân tích

| ID | Tính năng | Mô tả |
|---|---|---|
| W-36 | **Timeline View** | Lịch sử 1 đối tượng: Event, Alert, Case, kịch bản, trạng thái. Filter. |
| W-37 | **Spatial Trace** | Bản đồ GPS từ tất cả trình báo. Overlay geofence. Xem theo thời gian. |
| W-38 | **Tìm kiếm chéo** | Tất cả đối tượng trình báo tại khu vực X trong thời gian Y. |
| W-39 | **Comparison View** | So sánh 2 đối tượng: hồ sơ, compliance, timeline. |

### 2.2.9. Bản đồ Số (GIS)

| ID | Tính năng | Mô tả |
|---|---|---|
| W-40 | **Bản đồ tương tác** | Layer: vị trí trình báo, geofence, ranh giới hành chính. Zoom mặc định vào khu vực quản lý. |
| W-41 | **Heatmap** | Mật độ trình báo, vi phạm geofence, điểm nóng. |
| W-42 | **Geofence Management** | Tạo/sửa/xóa vùng geofence. Vẽ polygon/circle. Nhúng vào kịch bản. |
| W-43 | **Layer Toggle + Export** | Bật/tắt layer. Xuất PNG/PDF. |

### 2.2.10. Báo cáo

| ID | Tính năng | Mô tả |
|---|---|---|
| W-44 | **Báo cáo định kỳ** | Tự động ngày/tuần/tháng/quý. |
| W-45 | **Báo cáo tùy chỉnh** | Kéo thả, biểu đồ, bộ lọc, lưu template. |
| W-46 | **Biểu đồ tương tác** | Bar, line, pie, scatter. Drill-down. |
| W-47 | **Export** | PDF, Excel. |

### 2.2.11. Quản trị Hệ thống

| ID | Tính năng | Mô tả |
|---|---|---|
| W-48 | **Quản lý tài khoản cán bộ** | CRUD, gán vai trò, gán địa bàn. **Cấu hình bắt buộc OTP cho từng vai trò** (VD: Admin, Lãnh đạo bắt buộc OTP; Cán bộ cơ sở tùy chọn). |
| W-49 | **Xác thực OTP cho cán bộ** | Hỗ trợ: **Google Authenticator (TOTP)**, SMS OTP, hoặc các app authenticator khác tương thích TOTP. Cán bộ tự cài đặt trong phần quản lý tài khoản: quét QR code → link với authenticator app. Đăng nhập: username + password + OTP code. |
| W-50 | **RBAC + Data Scope** | Vai trò: Admin, Lãnh đạo, Cán bộ quản lý, Cán bộ cơ sở, Viewer. Data scope: dashboard chỉ thấy khu vực. Tìm kiếm nâng cao xem ngoài phạm vi (nếu vai trò cho phép). Quyền kịch bản theo cấp. |
| W-51 | **Cấu hình danh mục** | Loại đối tượng, loại sự kiện, loại vi phạm, trạng thái, đơn vị hành chính. |
| W-52 | **Cấu hình Biometric** | Face match threshold mặc định, liveness params. |
| W-53 | **Cấu hình Auto-escalation Levels** | Cấu hình system-wide: mức Alert nào auto-escalate thành Case (VD: mặc định KHẨN CẤP = auto-escalate). Kịch bản có thể override. |
| W-54 | **Audit Log** | Log mọi hành vi cán bộ. Append-only. Bao gồm: log escalation (ai/hệ thống escalate Case). |
| W-55 | **System Health** | Uptime, response time, face service, NFC service, error rate. |
| W-56 | **Backup & Recovery** | Backup tự động, restore, retention. |
| W-57 | **Notification Template** | Template thông báo cho đối tượng (push/SMS). |

---

## 2.3. BACKEND

### 2.3.1. API & Authentication

| ID | Tính năng | Mô tả |
|---|---|---|
| B-01 | **RESTful API** | Cho Mobile App + Web. Versioning, rate limiting, validation. |
| B-02 | **Authentication** | **Đối tượng:** CCCD (mã hóa) + password (hash) + device binding. **Cán bộ:** username + password (hash) + **OTP (TOTP — Google Authenticator compatible, hoặc SMS OTP)**. JWT + refresh token. |
| B-03 | **Authorization** | Role-based + data scope. Đối tượng chỉ xem dữ liệu mình. Cán bộ theo scope địa bàn (mở rộng nếu có quyền). |
| B-04 | **Rate Limiting** | Per endpoint, per user. Chống brute force. |
| B-05 | **TOTP Service** | Sinh secret key, QR code cho cán bộ link authenticator. Validate OTP code khi đăng nhập. Hỗ trợ backup codes. |

### 2.3.2. Biometric Processing

| ID | Tính năng | Mô tả |
|---|---|---|
| B-06 | **Face Recognition** | Embedding → scoring → threshold check. Liveness. Server-side hoặc on-device. |
| B-07 | **NFC Processing** | Parse chip CCCD. Passive Authentication (chữ ký số). Kiểm tra hợp lệ. |
| B-08 | **Biometric Storage** | Face embedding + NFC hash. Mã hóa. **Tách biệt DB riêng.** |
| B-09 | **Match Score Tracking** | Ghi score mỗi trình báo. Phát hiện trend giảm → gợi ý re-enroll. |

### 2.3.3. Scenario Engine

| ID | Tính năng | Mô tả |
|---|---|---|
| B-10 | **Scenario Runtime** | Đọc kịch bản Quản lý → check geofence, thời gian, face score khi trình báo. Scheduled job check deadline. |
| B-11 | **Alert Rule Engine** | Đọc kịch bản Alert (mặc định + tùy chỉnh) → check Event mới → tạo Alert nếu thỏa. **Đánh giá mức Alert → so sánh với ngưỡng auto-escalation → nếu đạt → tự tạo Case** (ghi "SYSTEM"). |
| B-12 | **Escalation Manager** | Quản lý 2 flow escalation: **Auto** (từ Alert Rule Engine khi mức ≥ ngưỡng) và **Manual** (từ API khi cán bộ nhấn escalate). Ghi metadata: nguồn (SYSTEM/cán bộ), thời gian, Alert gốc, lý do. |
| B-13 | **Dynamic State Machine** | Trạng thái + transition theo kịch bản. |
| B-14 | **Scheduled Processor** | Job hàng ngày: deadline, kịch bản hết hạn, nhắc nhở. |
| B-15 | **Notification Dispatcher** | Push/SMS/Email cho đối tượng. Web notification + email cho cán bộ. |

### 2.3.4. Data Management

| ID | Tính năng | Mô tả |
|---|---|---|
| B-16 | **Data Encryption** | CCCD + password: hash. Biometric: AES-256. Transit: TLS 1.3. OTP secret: encrypted at-rest. |
| B-17 | **Audit Trail** | Append-only. Log escalation, Case close, mọi thay đổi. |
| B-18 | **File Storage** | Face capture (retention policy), tài liệu, ảnh thực địa từ mobile browser. |
| B-19 | **Search Engine** | Full-text search. Tiếng Việt. |
| B-20 | **Data Archival** | Cold storage cho hồ sơ kết thúc. Biometric xóa theo retention. |
| B-21 | **Cache** | Redis: session, scenario, geofence, dashboard. |

---

# 3. SCENARIO ENGINE — HỆ THỐNG KỊCH BẢN ĐỘNG

## 3.1. Hai loại Kịch bản

| Loại | Mục đích | Kết quả |
|---|---|---|
| **Kịch bản Quản lý** | Quy định cách đối tượng chấp hành: trình báo, geofence, giới nghiêm | Sinh lịch, nhắc nhở, ghi Event khi trình báo |
| **Kịch bản Alert** | Quy định Event nào → Alert nào → mức nào → auto-escalate hay không | Sinh Alert từ Event. Auto-escalate Case nếu đạt ngưỡng. |

## 3.2. Kịch bản Quản lý — Cấu trúc

```
┌─────────────────────────────────────────────────────┐
│            KỊCH BẢN QUẢN LÝ (Management)           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  THÔNG TIN CHUNG                                   │
│  - Tên, mã, mô tả, phạm vi, trạng thái           │
│  - Người tạo, người phê duyệt                     │
│  - Ngày hiệu lực / kết thúc                       │
│                                                     │
│  QUY TẮC TRÌNH BÁO                                │
│  - Tần suất (X lần/tuần hoặc Y lần/tháng)         │
│  - Khung giờ (HH:MM — HH:MM)                      │
│  - Grace period (± N ngày)                         │
│  - Face threshold (% tối thiểu)                    │
│  - NFC bắt buộc: có/không                         │
│  - Fallback trực tiếp: có/không                    │
│                                                     │
│  QUY TẮC GIÁM SÁT                                 │
│  - Geofence (GPS chỉ check khi trình báo,         │
│    ngoài geofence = lưu vết Event, không block)    │
│  - Giờ giới nghiêm (nếu có)                       │
│  - Phê duyệt đi xa / đổi nơi ở                   │
│                                                     │
│  CHUYỂN TRẠNG THÁI TỰ ĐỘNG                        │
│  - VD: 12 tháng compliance ≥ 95% → "Giảm mức"    │
│                                                     │
│  TRƯỜNG DỮ LIỆU BỔ SUNG                           │
│  - VD: "Số quyết định quản chế" (bắt buộc)       │
│                                                     │
│  CẤU HÌNH THÔNG BÁO                               │
│  - Nhắc trước deadline: ngày/giờ                   │
│  - Nhắc lại nếu quá hạn: tần suất                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 3.3. Kịch bản Alert — Cấu trúc

```
┌──────────────────────────────────────────────────────────┐
│               KỊCH BẢN ALERT (Alert Rules)               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  THÔNG TIN CHUNG                                        │
│  - Tên, mã, mô tả, trạng thái                          │
│                                                          │
│  ╔══════════════════════════════════════════════════╗    │
│  ║  ALERT RULES MẶC ĐỊNH (System Default)          ║    │
│  ║  Luôn có, đi kèm mọi kịch bản Quản lý.        ║    │
│  ║  Cán bộ KHÔNG THỂ xóa, nhưng CÓ THỂ điều      ║    │
│  ║  chỉnh tham số (ngưỡng, mức độ).               ║    │
│  ║                                                  ║    │
│  ║  Default 1: Quá hạn trình báo                  ║    │
│  ║    Trigger: Event "quá hạn" ≥ [N] ngày         ║    │
│  ║    Mức: TRUNG BÌNH (mặc định, có thể chỉnh)    ║    │
│  ║                                                  ║    │
│  ║  Default 2: Face mismatch liên tiếp            ║    │
│  ║    Trigger: Event "face mismatch" ≥ 3 lần      ║    │
│  ║    Mức: CAO (mặc định)                          ║    │
│  ║                                                  ║    │
│  ║  Default 3: NFC anomaly                         ║    │
│  ║    Trigger: Event "NFC CCCD mismatch"           ║    │
│  ║    Mức: KHẨN CẤP (mặc định)                    ║    │
│  ║                                                  ║    │
│  ║  Default 4: Quá hạn trình báo nghiêm trọng     ║    │
│  ║    Trigger: Event "quá hạn" ≥ [M] ngày         ║    │
│  ║    Mức: KHẨN CẤP                               ║    │
│  ╚══════════════════════════════════════════════════╝    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ALERT RULES TÙY CHỈNH (Custom)                 │   │
│  │  Cán bộ tự tạo thêm, tùy ý.                    │   │
│  │                                                   │   │
│  │  Custom 1: Trình báo ngoài geofence lặp lại     │   │
│  │    Trigger: Event "ngoài geofence" ≥ 2 lần/30d  │   │
│  │    Mức: TRUNG BÌNH                              │   │
│  │                                                   │   │
│  │  Custom 2: Trình báo ngoài khung giờ            │   │
│  │    Trigger: Event "trình báo ngoài giờ"         │   │
│  │    Mức: THẤP                                     │   │
│  │                                                   │   │
│  │  Custom N: ...                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  CẤU HÌNH AUTO-ESCALATION                              │
│  - Mức Alert nào tự động escalate thành Case:          │
│    VD: KHẨN CẤP → auto-escalate (mặc định)            │
│    VD: CAO → auto-escalate (tùy chỉnh)                │
│    VD: TRUNG BÌNH → không auto, chỉ thủ công          │
│  - Khi auto-escalate: ghi "Escalated by: SYSTEM,      │
│    rule: [tên quy tắc], alert: #[ID]"                 │
│                                                          │
│  THÔNG BÁO                                             │
│  - Mỗi quy tắc: kênh (push/email/SMS)                 │
│  - Người nhận: cán bộ phụ trách / trưởng đơn vị       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 3.4. Dòng chảy: Event → Alert → Case

```
[Sự kiện xảy ra: trình báo, lỗi, quá hạn...]
       ↓
   ┌─────────┐
   │  EVENT  │  ← Tự động ghi nhận. Lưu Event Log.
   └────┬────┘
        │
        ▼
   ┌──────────────────────────────────────────────┐
   │  ALERT RULE ENGINE (B-11)                     │
   │                                               │
   │  1. Kiểm tra Alert Rules MẶC ĐỊNH:           │
   │     - Quá hạn? Face mismatch? NFC anomaly?   │
   │                                               │
   │  2. Kiểm tra Alert Rules TÙY CHỈNH:          │
   │     - Ngoài geofence lặp? Ngoài giờ? ...     │
   │                                               │
   │  → Nếu thỏa → Tạo ALERT (ghi mức + nguồn)  │
   └──────────────┬───────────────────────────────┘
                  │
                  ▼
             ┌─────────┐
             │  ALERT  │
             └────┬────┘
                  │
      ┌───────────┼───────────┐
      ▼                       ▼
 Mức < ngưỡng           Mức ≥ ngưỡng auto-escalation
 auto-escalation         (cấu hình trong kịch bản)
      │                       │
      ▼                       ▼
 CHỜ CÁN BỘ              AUTO-ESCALATE → CASE
 xử lý thủ công          Ghi: "Escalated by: SYSTEM"
      │                   "Rule: [tên]"
      │                   "Alert: #[ID]"
      ▼                       │
 Cán bộ xem Alert             │
      │                       │
  ┌───┴───┐                  │
  ▼       ▼                  │
"Đã    "Escalate              │
xử lý"  thủ công"            │
          │                   │
          ▼                   ▼
     ┌──────────────────────────┐
     │         CASE             │
     │                          │
     │  Nguồn tạo:             │
     │  • SYSTEM (auto) +      │
     │    rule + alert ID      │
     │  • [Cán bộ X] (thủ     │
     │    công) + alert ID     │
     │  • [Cán bộ X] (tạo     │
     │    mới, không từ Alert) │
     │                          │
     │  Case Mở → Ghi chú     │
     │  → Đóng Case (bắt buộc │
     │    ghi chú + cán bộ     │
     │    đóng)                │
     └──────────────────────────┘
```

## 3.5. Scenario Builder

| ID | Tính năng | Mô tả |
|---|---|---|
| SE-01 | **Danh sách Kịch bản** | 2 tab: Quản lý + Alert. Lọc trạng thái, cấp, người tạo. Số đối tượng, compliance rate. |
| SE-02 | **Tạo Kịch bản Quản lý** | Form: trình báo, giám sát, auto-transition, custom fields, thông báo. **Khi tạo → hệ thống tự gắn Alert Rules mặc định.** Cán bộ có thể điều chỉnh tham số mặc định (ngưỡng ngày, mức độ) nhưng không xóa. |
| SE-03 | **Tạo/Chỉnh sửa Kịch bản Alert** | Xem Alert Rules mặc định (chỉnh tham số được, không xóa). Thêm Alert Rules tùy chỉnh. **Cấu hình auto-escalation: mức nào auto → Case.** |
| SE-04 | **Template** | Template mẫu cho cả 2 loại. Clone + tùy chỉnh. |
| SE-05 | **Versioning** | Sửa → version mới. Diff, rollback, rolling update. |
| SE-06 | **Simulation** | "Nếu Event X → Alert gì? Auto-escalate không?" |
| SE-07 | **Phê duyệt** | Nháp → Duyệt → Hiệu lực. |
| SE-08 | **Tạm dừng / Kết thúc** | Tạm dừng / sunset kịch bản. |

## 3.6. Gán Kịch bản

| Hình thức | Mô tả |
|---|---|
| Gán cá nhân | 1 đối tượng → chọn kịch bản Quản lý + Alert |
| Gán hàng loạt | Lọc đối tượng → gán tất cả |
| Gán theo nhóm | Group → gán → thêm vào group = tự áp dụng |
| Auto-assignment | Quy tắc: loại X + địa bàn Y → kịch bản Z |
| Transition-based | Chuyển trạng thái → gỡ cũ + gán mới |

Conflict: nghiêm ngặt hơn thắng. Geofence: union. Alert trùng: deduplicate.

## 3.7. Giám sát Kịch bản

| ID | Tính năng | Mô tả |
|---|---|---|
| SE-09 | **Performance Dashboard** | Compliance rate, Alert/Case từ kịch bản, so sánh. |
| SE-10 | **Audit Trail** | Ai tạo, duyệt, sửa, gán, gỡ, chỉnh Alert Rules mặc định. |

## 3.8. Kịch bản Mẫu

### Mẫu 1: Kịch bản Quản lý "Quản chế Cơ bản"

```
Trình báo: 2 lần/tháng, 07:00-19:00, NFC + Face ≥ 85%, Grace ±2 ngày, Fallback: cho phép
Geofence: Phường cư trú 5km (check khi trình báo, ngoài vùng = lưu vết)
Phải xin phép đi xa > 3 ngày
Thông báo: Nhắc trước 3 ngày, 1 ngày, 3 giờ. Nhắc lại mỗi ngày nếu quá hạn.
Auto-transition: 12 tháng compliance ≥ 95% → đề xuất "Giảm mức"
Custom field: Số quyết định quản chế (bắt buộc)
```

### Mẫu 1b: Kịch bản Alert cho "Quản chế Cơ bản"

```
[MẶC ĐỊNH — tự động có, cán bộ chỉnh tham số:]
  D1: Quá hạn ≥ 3 ngày → Alert THẤP → push cán bộ
  D2: Face mismatch ≥ 3 lần liên tiếp → Alert CAO → push + email
  D3: NFC CCCD mismatch → Alert KHẨN CẤP → push + email + SMS
  D4: Quá hạn ≥ 30 ngày → Alert KHẨN CẤP → push + email + SMS

[TÙY CHỈNH — cán bộ tự thêm:]
  C1: Ngoài geofence ≥ 2 lần/30 ngày → Alert TRUNG BÌNH → push cán bộ
  C2: Quá hạn ≥ 7 ngày → Alert TRUNG BÌNH → push + email cấp quận

[AUTO-ESCALATION:]
  KHẨN CẤP → tự động tạo Case (ghi SYSTEM)
  CAO → không auto, cán bộ tự quyết định escalate
```

### Mẫu 2: Kịch bản Quản lý "Giám sát Biên giới"

```
Trình báo: 1 lần/tuần, 06:00-20:00, NFC + Face ≥ 90%, Grace ±0 ngày
Geofence: Vùng cấm = cửa khẩu + 2km. Giới nghiêm 21:00-05:00. Phải xin phép đi xa.
Thông báo: Nhắc trước 2 ngày, 12 giờ, 1 giờ. Nhắc lại mỗi 6 giờ.
```

### Mẫu 2b: Kịch bản Alert "Biên giới — Nghiêm ngặt"

```
[MẶC ĐỊNH — chỉnh tham số nghiêm ngặt hơn:]
  D1: Quá hạn ≥ 1 ngày → Alert TRUNG BÌNH (thay vì 3 ngày)
  D2: Face mismatch ≥ 2 lần → Alert CAO (thay vì 3 lần)
  D3: NFC CCCD mismatch → Alert KHẨN CẤP
  D4: Quá hạn ≥ 14 ngày → Alert KHẨN CẤP (thay vì 30 ngày)

[TÙY CHỈNH:]
  C1: Trình báo trong vùng cấm → Alert KHẨN CẤP
  C2: NFC chip không xác thực chữ ký → Alert CAO (nghi CCCD giả)

[AUTO-ESCALATION:]
  KHẨN CẤP → auto-escalate Case (SYSTEM)
  CAO → auto-escalate Case (SYSTEM) ← nghiêm ngặt hơn mẫu 1
```

### Mẫu 3: Kịch bản Quản lý "Tái hòa nhập"

```
Trình báo: 1 lần/tháng, 07:00-21:00, NFC + Face ≥ 80%, Grace ±5 ngày, Fallback: cho phép
Không geofence, không giới nghiêm.
Thông báo: Nhắc trước 5 ngày, 1 ngày. Nhắc lại mỗi 3 ngày.
Auto-transition: 6 tháng compliance ≥ 90% → đề xuất "Kết thúc quản lý"
Custom field: Nơi làm việc, Tình trạng việc làm
```

### Mẫu 3b: Kịch bản Alert "Tái hòa nhập — Nhẹ"

```
[MẶC ĐỊNH — chỉnh tham số thoáng hơn:]
  D1: Quá hạn ≥ 14 ngày → Alert THẤP (thay vì 3 ngày)
  D2: Face mismatch ≥ 3 lần → Alert CAO (giữ nguyên)
  D3: NFC CCCD mismatch → Alert KHẨN CẤP (giữ nguyên)
  D4: Quá hạn ≥ 60 ngày → Alert KHẨN CẤP (thay vì 30 ngày)

[TÙY CHỈNH:] Không thêm.

[AUTO-ESCALATION:]
  KHẨN CẤP → auto-escalate Case (SYSTEM)
```

---

# 4. LUỒNG NGHIỆP VỤ PHỨC TẠP

## 4.1. Luồng 1: Enrollment + Gán Kịch bản

```
[Có quyết định pháp lý]
       ↓
[Web: Cán bộ tạo hồ sơ (W-05)]
       ↓
[ENROLLMENT — Có mặt cán bộ + đối tượng:]
  → Đối tượng cài app → Quẹt NFC CCCD → Quét Face → So khớp
  → Tạo tài khoản: CCCD (mã hóa) + mật khẩu (hash)
  → Bind thiết bị. Lưu face embedding + NFC hash (tách biệt).
  → Cán bộ xác nhận enrollment trên Web (W-12)
       ↓
[Web: Cán bộ GÁN KỊCH BẢN]
  → Gán Kịch bản Quản lý → hệ thống tự gắn Alert Rules mặc định
  → Cán bộ chỉnh tham số mặc định nếu cần
  → Thêm Alert Rules tùy chỉnh nếu cần
  → Cấu hình auto-escalation levels
  → Xác nhận
       ↓
[Backend: Scenario Engine kích hoạt]
  → Tính lịch trình báo → push thông báo đầu tiên cho đối tượng
  → Alert Rule Engine sẵn sàng (mặc định + tùy chỉnh)
```

## 4.2. Luồng 2: Trình báo Online + Event → Alert → Case

```
[App: Đối tượng nhấn "TRÌNH BÁO" (SA-06)]
  → App lấy GPS + timestamp → Quẹt NFC → Quét Face → Gửi Backend
       ↓
[Backend xử lý + GHI EVENT:]
  NFC OK + Face OK + Trong geofence → Event "trình báo thành công"
  NFC OK + Face OK + Ngoài geofence → Event "thành công" + Event "ngoài geofence"
  NFC FAIL → Event "NFC fail" (retry)
  Face MISMATCH → Event "face mismatch" (retry)
  CCCD khác đăng ký → Event "NFC CCCD mismatch"
       ↓
[ALERT RULE ENGINE (B-11):]
  → Kiểm tra Alert Rules MẶC ĐỊNH:
    • Quá hạn? → Alert theo ngưỡng cấu hình
    • Face mismatch ≥ 3 liên tiếp? → Alert CAO
    • NFC CCCD mismatch? → Alert KHẨN CẤP
  → Kiểm tra Alert Rules TÙY CHỈNH:
    • Ngoài geofence ≥ N lần? → Alert TRUNG BÌNH
    • ...
       ↓
[Nếu tạo Alert:]
  → Kiểm tra mức Alert vs ngưỡng auto-escalation:
    ┌─ Mức ≥ ngưỡng auto:
    │  → TỰ ĐỘNG tạo Case
    │  → Ghi: "Escalated by: SYSTEM"
    │  → Ghi: "Rule: [tên quy tắc], Alert: #[ID]"
    │  → Case Mở xuất hiện trên W-22
    │
    └─ Mức < ngưỡng auto:
       → Alert hiển thị trên W-18 cho cán bộ
       → Cán bộ xem → ghi chú → "Đã xử lý"
       → HOẶC: nhấn "Escalate thành Case" (THỦ CÔNG)
         → Ghi: "Escalated by: [Cán bộ Nguyễn Văn B]"
         → Ghi: "Alert: #[ID]"
         → Case Mở xuất hiện trên W-22
       ↓
[Case Mở:]
  → Cán bộ ghi chú (W-25) — có thể đính ảnh từ mobile browser (W-29)
  → Khi xử lý xong → Đóng Case (W-26)
    → Bắt buộc: ghi chú kết quả + ghi cán bộ đóng + thời gian

[SONG SONG — Scheduled Job hàng ngày:]
  → Quét quá hạn → Event "quá hạn [N] ngày" → Alert Rule Engine xử lý
  → Gửi nhắc đối tượng (push)
```

## 4.3. Luồng 3: Xét duyệt Yêu cầu

```
[App: Đối tượng gửi yêu cầu (SA-11/12/13/14)]
       ↓
[Backend: Tạo yêu cầu + Event]
       ↓
[Web: Cán bộ xem hàng đợi (W-34) → Duyệt/Từ chối (W-35)]
  → Duyệt: hệ thống điều chỉnh (lịch, geofence, device) + push đối tượng
  → Từ chối: push đối tượng kèm lý do
```

## 4.4. Luồng 4: Cán bộ Thực địa (Mobile Browser)

```
[Cán bộ đi xác minh tại hiện trường]
       ↓
[Mở Web trên trình duyệt điện thoại]
       ↓
[Tra cứu đối tượng (W-31)]
  → Xem hồ sơ, kịch bản, Alert/Case đang mở
       ↓
[Chụp ảnh qua camera (W-29)]
  → HTML5 Media Capture → ảnh gắn GPS + timestamp tự động
       ↓
[Ghi chú thực địa (W-30)]
  → Text + ảnh → lưu như Event "ghi nhận thực địa"
  → HOẶC thêm vào Case Note (W-33)
       ↓
[Xử lý Alert nếu cần (W-32)]
  → Acknowledge, ghi chú, escalate
```

## 4.5. Luồng 5: Xây dựng Kịch bản

```
[Cán bộ quản lý mở Scenario Builder]
       ↓
[Tạo Kịch bản Quản lý (SE-02)]
  → Hệ thống tự gắn Alert Rules mặc định
       ↓
[Chỉnh sửa Kịch bản Alert (SE-03)]
  → Chỉnh tham số mặc định (ngưỡng, mức)
  → Thêm Alert Rules tùy chỉnh
  → Cấu hình auto-escalation levels
       ↓
[Simulation (SE-06)] → "Quá hạn 5 ngày → Alert gì? Auto Case?"
       ↓
[Phê duyệt (SE-07)] → Gán cho đối tượng/nhóm
```

## 4.6. Business Rules Hệ thống

| ID | Quy tắc | Áp dụng |
|---|---|---|
| SBR-01 | CCCD chip NFC hợp lệ = bắt buộc enrollment | Enrollment |
| SBR-02 | Enrollment phải có cán bộ xác nhận | App |
| SBR-03 | Tài khoản: CCCD (mã hóa) + mật khẩu (hash). Bind 1 thiết bị. | Auth |
| SBR-04 | Cán bộ đăng nhập: username + password + OTP (cấu hình theo vai trò) | Auth |
| SBR-05 | GPS chỉ lấy khi trình báo, không chạy nền | App |
| SBR-06 | Ngoài geofence = lưu vết Event, không block trình báo | Geofence |
| SBR-07 | Event ghi tự động mọi sự kiện | Event |
| SBR-08 | Mọi kịch bản Quản lý luôn đi kèm Alert Rules mặc định. Không xóa được, chỉ chỉnh tham số. | Alert |
| SBR-09 | Alert auto-escalate thành Case khi mức ≥ ngưỡng (cấu hình trong kịch bản). Ghi "SYSTEM" + rule + alert ID. | Escalation |
| SBR-10 | Alert thủ công escalate thành Case: ghi tên cán bộ + alert ID. | Escalation |
| SBR-11 | Case tạo mới thủ công: ghi tên cán bộ + lý do. | Case |
| SBR-12 | Đóng Case: bắt buộc ghi chú + ghi cán bộ đóng + thời gian. | Case |
| SBR-13 | Case Đóng: chỉ xem, không sửa. Mở lại = tạo Case Mở mới liên kết. | Case |
| SBR-14 | Kịch bản mới/sửa phải phê duyệt cấp trên | Scenario |
| SBR-15 | Dashboard scope theo địa bàn. Tìm kiếm mở rộng nếu có quyền. | Data scope |
| SBR-16 | Soft delete only | Toàn hệ thống |
| SBR-17 | Audit trail cho mọi thay đổi + mọi escalation | Toàn hệ thống |
| SBR-18 | Biometric data mã hóa, lưu tách biệt | Security |
| SBR-19 | Không có cơ chế giao task tự động | Process |
| SBR-20 | Đối tượng chỉ xem dữ liệu chính mình | Authorization |

---

# 5. PHÂN TÍCH RỦI RO VÀ EDGE CASES

## 5.1. Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R-01 | Face false rejection | Cao | Threshold configurable/kịch bản, retry, fallback, re-enroll |
| R-02 | Face spoofing | Cao | Liveness detection, NFC cross-check |
| R-03 | NFC relay/clone | Trung bình | Passive Authentication, device binding |
| R-04 | Không có smartphone NFC | Cao | Fallback trực tiếp |
| R-05 | Không biết dùng app | Trung bình | UX đơn giản, hướng dẫn, hotline |
| R-06 | Nhờ người trình báo hộ | Cao | NFC + Face + device binding |
| R-07 | Kịch bản sai logic | Trung bình | Alert Rules mặc định (luôn có), simulation, phê duyệt |
| R-08 | Server down | Cao | HA, failover, backup |
| R-09 | Breach biometric | Rất cao | Encryption, isolation, audit, pentest |
| R-10 | Tài khoản cán bộ bị xâm nhập | Cao | **OTP (Google Authenticator / SMS OTP)**, bắt buộc theo vai trò |
| R-11 | Auto-escalate tạo quá nhiều Case | Trung bình | Cấu hình ngưỡng hợp lý, simulation, monitor Case volume |

## 5.2. Edge Cases

### Trình báo

| # | Edge Case | Xử lý |
|---|---|---|
| EC-01 | NFC fail (CCCD cũ/bẩn) | Retry 3 → Event "NFC fail" → Alert Rule mặc định: NFC fail ≥ 5 liên tiếp → Alert THẤP |
| EC-02 | Face fail ánh sáng kém | Hướng dẫn app. Retry. Event "face mismatch". |
| EC-03 | Trình báo đúng hạn + ngoài geofence | Trình báo OK. Event "ngoài geofence" riêng. Alert Rule tùy chỉnh quyết định. |
| EC-04 | Trình báo sớm quá | `earliest_before_deadline`. Ngoài cửa sổ → Event "trình báo sớm", không tính. |
| EC-05 | Trình báo 2 lần cùng kỳ | Lần 2 = Event "trình báo bổ sung". Chỉ lần 1 tính compliance. |
| EC-06 | Hết pin giữa trình báo | Lưu state. Resume. Timeout 5 phút → làm lại. |
| EC-07 | CCCD người khác | NFC → CCCD mismatch → REJECT. Event "NFC CCCD mismatch" → Alert Rule mặc định: KHẨN CẤP → **auto-escalate Case (SYSTEM)**. |
| EC-08 | Thay CCCD mới | Cán bộ re-enroll. Lưu lịch sử CCCD cũ. |
| EC-09 | Không có sóng | Future: offline on-device. Hiện tại: fallback trực tiếp. |
| EC-10 | GPS kém (indoor) | Ghi GPS accuracy. Event "GPS low accuracy". Alert Rule tùy chỉnh quyết định. |

### Alert & Case

| # | Edge Case | Xử lý |
|---|---|---|
| EC-11 | Auto-escalate tạo Case nhưng là false positive | Cán bộ xem Case → ghi chú "False positive" → Đóng Case. Gợi ý: chỉnh ngưỡng kịch bản. |
| EC-12 | Cán bộ escalate thủ công Alert đã được auto-escalate | Hệ thống kiểm tra: Alert đã có Case → thông báo "Alert này đã được escalate thành Case #[ID]". |
| EC-13 | Nhiều Alert cùng auto-escalate → nhiều Case | Mỗi Alert tạo 1 Case riêng (traceability). Cán bộ có thể ghi chú liên kết giữa các Case. |
| EC-14 | Case Đóng nhưng tình huống mới | Tạo Case Mở mới, liên kết Case Đóng cũ. |
| EC-15 | Cán bộ quên đóng Case | Dashboard hiện Case Mở quá lâu. Không auto-close. |

### Kịch bản & Hệ thống

| # | Edge Case | Xử lý |
|---|---|---|
| EC-16 | Kịch bản hết hạn, chưa gán mới | Cảnh báo trước N ngày. Hết hạn → "Chờ gán kịch bản". Alert Rules mặc định ngừng (không có kịch bản Quản lý). |
| EC-17 | Sửa kịch bản → Alert Rules mặc định bị chỉnh | Version mới. Diff hiện thay đổi mặc định. Rolling update. |
| EC-18 | Đối tượng chết / mất năng lực | "Kết thúc". Gỡ kịch bản. Đóng Alert/Case. Biometric xóa theo retention. |
| EC-19 | 2 hồ sơ = 1 người | Merge hồ sơ + Event + Alert + Case + kịch bản. Re-enroll biometric. |
| EC-20 | Mất điện thoại | Suspend device. Re-enroll mới (cần cán bộ). Tạm fallback. |
| EC-21 | Phá app để tránh trình báo | Scheduled job detect quá hạn → Event → Alert → auto-escalate nếu đạt ngưỡng. Không phụ thuộc app. |
| EC-22 | Cán bộ chuyển công tác | Deactivate. OTP secret xóa. Đối tượng chuyển cán bộ mới. Kịch bản vẫn chạy. |
| EC-23 | Cán bộ mất authenticator app | Dùng backup codes (B-05) để đăng nhập. Admin có thể reset OTP. |

---

# 6. CÂU HỎI PHẢN BIỆN

> Dưới đây là danh sách câu hỏi cần bạn trả lời trước khi viết SRS. Mỗi câu đều ảnh hưởng trực tiếp đến nội dung SRS. Tôi gom thành các nhóm để dễ trả lời.

---

## NHÓM A — PHẠM VI & BỐI CẢNH

**A1. Nhóm đối tượng cụ thể?**
Hệ thống nhắm đến nhóm nào? (quản chế sau án, thi hành án tại cộng đồng, giám sát hành chính, hay tổng quát nhiều loại?)
→ *Ảnh hưởng: template kịch bản mẫu, danh mục loại đối tượng, luồng enrollment, custom fields mặc định.*
ANS: tổng quát nhiều loại, dành cho người nào cần phải trình báo sự hiện diện 

**A2. Cấp triển khai demo?**
Demo phạm vi nào? (1 phường, 1 quận + nhiều phường, hay mô phỏng 3 cấp phường/quận/tỉnh?)
→ *Ảnh hưởng: độ phức tạp RBAC + data scope, số lượng vai trò cần implement, kịch bản phê duyệt đa cấp.*
ANS: demo có lẽ chỉ cần 1 quận, nhưng tốt nhất code nên đầy đủ nhất từ cấp thành phố 

**A3. Quy mô dữ liệu thử nghiệm?**
Dự kiến bao nhiêu hồ sơ đối tượng (50/500/5000)? Bao nhiêu kịch bản mẫu (3/5/10)?
→ *Ảnh hưởng: yêu cầu performance, thiết kế database, khối lượng fake data cần tạo.*
ANS: càng nhiều càng tốt, sau này phải scale, nên chọn tối đa

**A4. Người bị quản lý có bắt buộc phải có smartphone NFC?**
Tỷ lệ dự kiến đối tượng không có smartphone NFC? Fallback trực tiếp (đến gặp cán bộ) có đủ không, hay cần phương án khác (cấp thiết bị tạm)?
→ *Ảnh hưởng: có cần thiết kế flow "trình báo trực tiếp" trên Web cho cán bộ (cán bộ quẹt NFC hộ) hay không.*
ANS: nên có phần trình báo trực tiếp, cán bộ tự điền vào hệ thống và tự đồng bộ luôn 
---

## NHÓM B — KỸ THUẬT BIOMETRIC (NFC + FACE)

**B1. Face Recognition: on-device hay server-side?**
(a) On-device: TensorFlow Lite / CoreML — nhanh, offline, nhưng accuracy thấp hơn, model lớn.
(b) Server-side: InsightFace / DeepFace / AWS Rekognition / Azure Face — accuracy cao, cần internet.
(c) Hybrid: liveness on-device, matching on-server.
→ *Ảnh hưởng: kiến trúc Backend, yêu cầu server GPU, khả năng offline, chi phí.*
ANS: face recog nếu có thể nên là model nhẹ và chạy on-device

**B2. Có tài liệu kỹ thuật chip NFC CCCD Việt Nam không?**
Chip CCCD VN theo chuẩn nào (ICAO 9303, BAC, PACE)? Có SDK / thư viện đọc chip nào sẵn có cho Android/iOS? Có access được ảnh trên chip không?
→ *Ảnh hưởng: khả năng implement NFC verification, có cần mock NFC cho demo hay implement thật.*
ANS: sẽ trả lời sau ở đoạn code 

**B3. Liveness detection mức nào cho đồ án?**
(a) Cơ bản: yêu cầu nháy mắt / quay đầu (detect bằng landmark model).
(b) Nâng cao: 3D depth sensor, IR camera (cần hardware đặc biệt).
(c) SDK bên thứ ba: FaceTec, iProov...
→ *Ảnh hưởng: độ khó implement, thiết bị test cần có.*
ANS: Chỉ cần cơ bản, random cho mỗi lần nếu model có, không thì bỏ cũng được 

**B4. Cần offline face match cho MVP không?**
Nếu đối tượng ở vùng không có sóng → cho phép verify on-device rồi sync sau? Hay bắt buộc phải có mạng?
→ *Ảnh hưởng: có cần on-device ML model hay không.*
ANS: Nếu có thì tốt
---

## NHÓM C — TECH STACK

**C1. Frontend Web?**
React / Vue / Angular / Next.js? Có framework CSS nào ưa thích (Tailwind, Bootstrap, Ant Design)?
→ *Ảnh hưởng: Responsive Web implementation, component library.*
ANS: React + Tailwind

**C2. Backend?**
Java Spring Boot / Node.js (Express/NestJS) / Python (Django/FastAPI) / .NET?
→ *Ảnh hưởng: kiến trúc API, Scenario Engine implementation, performance.*
ANS: Node.js(NestJS)

**C3. Mobile App?**
(a) Native Android (Kotlin) + Native iOS (Swift) — NFC tốt nhất.
(b) Flutter — cross-platform, NFC plugin có sẵn.
(c) React Native — cross-platform, NFC plugin có nhưng hạn chế hơn.
(d) Chỉ Android? (NFC phổ biến, đối tượng thường dùng Android giá rẻ.)
→ *Ảnh hưởng: khả năng NFC, face capture, development effort.*
ANS: Android xây dựng bằng kotlin, IOS nếu tương lai phát triển sẽ xây dựng sau 

**C4. Database?**
PostgreSQL / MySQL / MongoDB? Có cần tách DB cho biometric (SBR-18) ngay từ MVP không?
→ *Ảnh hưởng: schema design, biometric isolation.*
PostgreSQL, tách DB cho biometric nếu code không bị quá khó 

**C5. Bản đồ?**
Google Maps API / OpenStreetMap + Leaflet / Mapbox?
→ *Ảnh hưởng: chi phí, tính năng GIS, offline map.*
ANS: ưu tiên GGmap API, trong trường hợp không trả phí được, sẽ sử dụng OpenStreetMap

**C6. Hosting?**
On-premise / AWS / GCP / Azure / VPS?
→ *Ảnh hưởng: deployment, bảo mật dữ liệu nhạy cảm, chi phí.*
ANS: Sử dụng server hosting riêng tự thuê, chỉ cần viết docker và tài liệu để chạy

**C7. Search Engine?**
Elasticsearch / Meilisearch / chỉ dùng database full-text search?
→ *Ảnh hưởng: tốc độ tìm kiếm, phức tạp deploy.*
ANS: gợi ý các trường mặc định để query, sau đó sử dụng các thuật toán AND OR để có thể kết nối câu Query để lọc các trường cần thiết, có cả sử dụng fulltext nếu dấu = và elastic nếu dùng ~, có thêm ! ở trước (!=, !~) nghĩa là không chứa từ đó 

---

## NHÓM D — SCENARIO ENGINE

**D1. Mức độ Scenario Builder cho MVP?**
(a) Form cơ bản: điền tham số → lưu. (Nhanh implement, đủ demo.)
(b) Visual builder: kéo thả block. (Ấn tượng hơn, tốn effort.)
(c) Full simulation + preview. (Ấn tượng nhất, tốn effort nhất.)
→ *Gợi ý: (a) + simulation đơn giản cho MVP. (b)(c) cho demo ấn tượng nếu đủ thời gian.*
ANS: Form cơ bản, kết hợp bằng các vùng AND, OR sau đó lọc theo trường

**D2. Số kịch bản mẫu cần demo?**
3 mẫu (cơ bản/nghiêm ngặt/nhẹ) đủ chưa? Hay cần thêm?
→ *Ảnh hưởng: khối lượng data seeding, test cases.*
ANS: Demo chỉ cần khoảng 3-4 mẫu mỗi loại 

**D3. Auto-assignment cần cho MVP không?**
Gán tự động khi tạo đối tượng mới? Hay chỉ gán thủ công?
→ *Ảnh hưởng: complexity Scenario Engine.*
ANS: sẽ có thêm gán cho đối tượng nào sau khi tạo, tuy nhiên phần này có thể bỏ qua nếu chưa muốn gán cho ai trong thời điểm hiện tại 

**D4. Alert Rules mặc định — có bao nhiêu?**
Tôi đề xuất 4 mặc định (quá hạn, face mismatch liên tiếp, NFC CCCD mismatch, quá hạn nghiêm trọng). Cần thêm/bớt?
→ *Ảnh hưởng: logic Alert Rule Engine, test cases.*
ANS: cứ mặc định như hiện tại, nếu có thêm sẽ bổ sung sau 

**D5. Auto-escalation — ngưỡng mặc định system-wide?**
Mặc định: chỉ KHẨN CẤP auto-escalate? Hay cả CAO? Kịch bản có thể override?
→ *Ảnh hưởng: cấu hình W-53, logic B-12.*
ANS: có 4 mức cơ bản là nhẹ, vừa, cao, nghiêm trọng, chỉ nên auto escalate từ cao. Tôi muốn có phần tự đánh giá mức độ bằng AI nhưng hiện tại chưa phát triển được 
---

## NHÓM E — WEB RESPONSIVE & THỰC ĐỊA

**E1. Cán bộ dùng mobile browser: scope tính năng?**
MVP cần những gì trên mobile browser? Đề xuất: tra cứu + xem Alert/Case + chụp ảnh + ghi chú. Hay cần thêm?
→ *Ảnh hưởng: design responsive, tính năng cần tối ưu mobile.*
ANS: thực hiện theo đề xuất, chụp ảnh ghi lại vào case

**E2. Chụp ảnh thực địa: metadata gì?**
GPS + timestamp đủ chưa? Hay cần: device info, cán bộ ID watermark, chống chỉnh sửa ảnh?
→ *Ảnh hưởng: HTML5 Media Capture implementation, backend processing.*
ANS: cần GPS và Timestamp và tên cán bộ thực hiện (lấy từ tài khoản)
---

## NHÓM F — BẢO MẬT

**F1. OTP cho cán bộ: TOTP (Google Authenticator) hay SMS OTP hay cả hai?**
TOTP: miễn phí, không cần SMS gateway. SMS OTP: tiện hơn cho cán bộ ít quen công nghệ, nhưng cần SMS provider + chi phí.
→ *Ảnh hưởng: tích hợp SMS gateway, cost, UX.*
ANS: Dùng TOTP 

**F2. Vai trò nào bắt buộc OTP?**
Đề xuất: Admin + Lãnh đạo bắt buộc. Cán bộ quản lý + cán bộ cơ sở tùy chọn. Hay bắt buộc tất cả?
→ *Ảnh hưởng: cấu hình W-48.*
ANS: tất cả cán bộ và IT-ADMIN cần OTP. Người bị quản lý thì không cần

**F3. Biometric retention policy?**
Giữ face capture (ảnh mỗi lần trình báo) bao lâu? 6 tháng? 1 năm? Vĩnh viễn?
→ *Ảnh hưởng: storage cost, data archival policy.*
ANS: tùy thuộc vào lượng scale sẽ điều chỉnh sau, hiện tại hãy để 1 năm 

**F4. Quy định pháp luật tham chiếu?**
Luật An ninh mạng 2018? NĐ 13/2023/NĐ-CP (BVDLCN)? Có quy định cụ thể từ giáo viên?
→ *Ảnh hưởng: phần Non-functional Requirements trong SRS.*
ANS: sẽ được nghiên cứu và trả lời sau 
---

## NHÓM G — DỮ LIỆU & THỬ NGHIỆM

**G1. Fake data hay dữ liệu mẫu thực?**
Hoàn toàn fake (sinh ngẫu nhiên)? Có template mẫu thực từ cơ quan? Hay dùng dữ liệu giả nhưng realistic?
→ *Ảnh hưởng: data seeding script, demo quality.*
ANS: lúc code thì fake, sau đó sẽ tự làm để dữ liệu realistic cho demo cuối 
**G2. NFC testing?**
Có CCCD thật để test NFC không? Hay cần mock NFC service cho development/demo?
→ *Ảnh hưởng: cần thiết kế NFC mock adapter.*
ANS: có dùng NFC thật, sử dụng NFC của người phát triển

**G3. Face Recognition testing?**
Test với ảnh thật hay mock face service? Cần bao nhiêu face samples?
→ *Ảnh hưởng: test data, face service mock.*
ANS: test với MOCK, nếu có model có sẵn thì có thể áp dụng ảnh thật
---

## NHÓM H — MVP SCOPE & DELIVERABLE

**H1. Tính năng bắt buộc cho đồ án (Must-have)?**
Trong tất cả tính năng đã liệt kê (SA: 22, W: 57, B: 21, SE: 10), đâu là must-have, đâu là nice-to-have?
→ *Đề xuất must-have tối thiểu: SA-01→SA-10 (enrollment + trình báo), W-01/05/14/18/22/34/36/40/48 (dashboard + hồ sơ + Event + Alert + Case + xét duyệt + timeline + bản đồ + admin), SE-01→SE-07 (Scenario Builder cơ bản), B-01→B-15.*
ANS: Hãy làm theo đề xuất must-have tối thiểu: SA-01→SA-10 (enrollment + trình báo), W-01/05/14/18/22/34/36/40/48 (dashboard + hồ sơ + Event + Alert + Case + xét duyệt + timeline + bản đồ + admin), SE-01→SE-07 (Scenario Builder cơ bản), B-01→B-15. Các nice-to-have có thể ưu tiên sau nhưng vẫn phải có 

**H2. Tính năng "showcase" cho demo?**
Tính năng nào gây ấn tượng nhất khi demo? Đề xuất: (1) Trình báo NFC + Face live, (2) Event → Alert → auto-escalate Case realtime, (3) Bản đồ GPS trình báo + geofence, (4) Scenario Builder.
ANS : Quan trọng nhất là tính năng 1, các tính năng còn lại cũng cần nói 

**H3. Tài liệu cần nộp?**
SRS? SDD (System Design Document)? Test Plan? User Manual? API Documentation? ERD?
→ *Ảnh hưởng: khối lượng tài liệu cần viết.*
ANS : một bản tổng kết cuối quyển theo template nhưng cần viết đầy đủ để hoàn thiện phần mềm đầy đủ và có tài liệu nhất 

**H4. Hình thức demo?**
Live demo (chạy thật trên máy)? Video quay sẵn? Poster? Slide thuyết trình?
→ *Ảnh hưởng: cần prepare test data, environment, device NFC cho demo.*
ANS: thuyết trình slide ban đầu sau đó cần live demo, nếu lỗi có thể dùng video quay sẵn

**H5. Thời gian còn lại?**
Còn bao nhiêu tuần/tháng đến deadline nộp đồ án?
→ *Ảnh hưởng: scope MVP phù hợp, phân chia sprint.*
Ans: thời gian còn lại 3,5 tháng cả cho việc viết báo cáo cuối 
---

> **Mã tính năng:**
> - **SA** = Subject App (Người bị quản lý): SA-01 → SA-22
> - **W** = Web Dashboard (Cán bộ): W-01 → W-57
> - **B** = Backend: B-01 → B-21
> - **SE** = Scenario Engine: SE-01 → SE-10