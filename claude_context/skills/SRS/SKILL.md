---
name: srs-writer
description: >
  Tạo tài liệu SRS (Software Requirements Specification) đầy đủ, chuẩn IEEE 830/ISO 29148 từ bản phân tích phần mềm, mô tả dự án, hoặc tài liệu yêu cầu thô của người dùng. Kích hoạt skill này bất cứ khi nào người dùng muốn: viết SRS, tạo tài liệu đặc tả yêu cầu phần mềm, chuyển đổi phân tích phần mềm thành SRS, lập tài liệu yêu cầu hệ thống, viết functional/non-functional requirements, hoặc cần một bản SRS hoàn chỉnh từ mô tả dự án. Dùng skill này ngay cả khi người dùng chỉ nói "viết SRS cho tôi", "tạo tài liệu yêu cầu", hay "tôi có bản phân tích, hãy viết SRS".
---

# SRS Writer Skill

Skill này hướng dẫn Claude tạo ra tài liệu **Software Requirements Specification (SRS)** hoàn chỉnh, chuẩn theo IEEE 830 / ISO/IEC/IEEE 29148:2018, từ bất kỳ loại đầu vào nào: bản phân tích phần mềm, mô tả dự án ngắn, tài liệu thô, hoặc hội thoại với người dùng.

---

## 1. Thu thập thông tin đầu vào

Trước khi viết, Claude phải xác định các thông tin sau (nếu chưa có trong đầu vào, hỏi người dùng):

| Thông tin | Bắt buộc | Ghi chú |
|-----------|----------|---------|
| Tên dự án / hệ thống | ✅ | |
| Mục tiêu tổng quát của hệ thống | ✅ | |
| Đối tượng người dùng chính | ✅ | |
| Phạm vi hệ thống (in-scope / out-of-scope) | ✅ | |
| Các chức năng chính (feature list thô) | ✅ | |
| Môi trường triển khai (web, mobile, desktop, cloud) | ✅ | |
| Các ràng buộc kỹ thuật / phi kỹ thuật | ⚠️ nếu có | |
| Các bên liên quan (stakeholders) | ⚠️ nếu có | |
| Yêu cầu hiệu năng, bảo mật, khả năng mở rộng | ⚠️ nếu có | |
| Tích hợp với hệ thống ngoài | ⚠️ nếu có | |

Nếu người dùng cung cấp tài liệu phân tích, Claude phải **đọc toàn bộ** và trích xuất thông tin từ đó trước khi hỏi thêm.

---

## 2. Cấu trúc tài liệu SRS chuẩn

Tạo SRS theo đúng cấu trúc sau. **Không được bỏ bất kỳ mục nào**, chỉ được ghi "N/A" kèm giải thích nếu mục thực sự không áp dụng.

---

### PHẦN 1 — GIỚI THIỆU (Introduction)

#### 1.1 Mục đích tài liệu (Purpose)
- Nêu rõ tài liệu này mô tả gì, phục vụ ai.
- Xác định phiên bản tài liệu và phạm vi áp dụng.

#### 1.2 Phạm vi hệ thống (Scope)
- Tên chính thức của hệ thống / phần mềm.
- Mô tả ngắn gọn hệ thống làm gì và không làm gì.
- Lợi ích mong đợi, mục tiêu kinh doanh, mục tiêu kỹ thuật.

#### 1.3 Định nghĩa, từ viết tắt, thuật ngữ (Definitions, Acronyms, Abbreviations)
- Bảng định nghĩa tất cả thuật ngữ chuyên ngành, từ viết tắt xuất hiện trong tài liệu.

#### 1.4 Tài liệu tham chiếu (References)
- Liệt kê các tài liệu liên quan: bản phân tích đầu vào, tiêu chuẩn, giao thức, API specs nếu có.

#### 1.5 Tổng quan tài liệu (Document Overview)
- Mô tả cấu trúc của tài liệu SRS này.

---

### PHẦN 2 — MÔ TẢ TỔNG QUÁT (Overall Description)

#### 2.1 Bối cảnh hệ thống (Product Perspective)
- Hệ thống là sản phẩm độc lập hay một phần của hệ thống lớn hơn?
- Sơ đồ ngữ cảnh hệ thống (context diagram) — mô tả bằng text hoặc ASCII nếu có thể.
- Giao diện với hệ thống ngoài.

#### 2.2 Chức năng tổng quát (Product Functions)
- Liệt kê tóm tắt các nhóm chức năng chính theo dạng bullet phân cấp.

#### 2.3 Đặc điểm người dùng (User Classes and Characteristics)
- Mô tả từng nhóm người dùng: vai trò, kỹ năng kỹ thuật, tần suất sử dụng, quyền hạn.

#### 2.4 Môi trường vận hành (Operating Environment)
- Hệ điều hành, nền tảng (web/mobile/desktop/cloud).
- Yêu cầu phần cứng tối thiểu.
- Cơ sở dữ liệu, framework, thư viện chính.

#### 2.5 Ràng buộc thiết kế và cài đặt (Design and Implementation Constraints)
- Ràng buộc về ngôn ngữ lập trình, công nghệ bắt buộc.
- Tiêu chuẩn pháp lý, bảo mật, tuân thủ (GDPR, HIPAA, v.v.).
- Giới hạn phần cứng, băng thông, chi phí.

#### 2.6 Giả định và phụ thuộc (Assumptions and Dependencies)
- Những điều được giả định là đúng khi viết tài liệu này.
- Các thành phần / dịch vụ bên ngoài mà hệ thống phụ thuộc.

---

### PHẦN 3 — YÊU CẦU GIAO DIỆN NGOÀI (External Interface Requirements)

#### 3.1 Giao diện người dùng (User Interfaces)
- Mô tả từng màn hình / giao diện chính: tên, mục đích, các thành phần chính.
- Tiêu chuẩn giao diện (responsive, accessibility WCAG, ngôn ngữ).

#### 3.2 Giao diện phần cứng (Hardware Interfaces)
- Thiết bị ngoại vi, cảm biến, máy in, máy quét, v.v. (nếu có).

#### 3.3 Giao diện phần mềm (Software Interfaces)
- API bên thứ ba, dịch vụ tích hợp (payment gateway, email service, SMS, v.v.).
- Định dạng dữ liệu trao đổi (JSON, XML, CSV).

#### 3.4 Giao diện truyền thông (Communication Interfaces)
- Giao thức mạng (HTTPS, WebSocket, REST, gRPC).
- Yêu cầu băng thông, độ trễ, mã hóa.

---

### PHẦN 4 — YÊU CẦU CHỨC NĂNG (Functional Requirements)

> **Quy tắc viết Use Case / Functional Requirement:**
> - Mỗi yêu cầu có ID duy nhất: `FR-[MODULE]-[NUMBER]` (ví dụ: `FR-AUTH-001`)
> - Dùng động từ chủ động: "Hệ thống **phải** cho phép...", "Hệ thống **sẽ**..."
> - Mỗi yêu cầu là một câu, đo lường được, không mơ hồ

Tổ chức theo module/nhóm chức năng. Với **mỗi use case / tính năng**, viết đầy đủ:

```
#### [Tên Module] — [FR-XX-NNN]

**Mô tả:** [Mô tả ngắn chức năng]

**Tác nhân:** [Ai thực hiện]

**Tiền điều kiện:** [Điều kiện cần thỏa mãn trước]

**Luồng chính (Main Flow):**
1. [Bước 1]
2. [Bước 2]
...

**Luồng thay thế (Alternative Flow):**
- [Trường hợp ngoại lệ / lỗi]

**Hậu điều kiện:** [Trạng thái hệ thống sau khi hoàn thành]

**Quy tắc nghiệp vụ:** [Ràng buộc đặc biệt nếu có]
```

**Các nhóm module cần bao quát (điều chỉnh theo dự án):**
- Quản lý người dùng & xác thực (Authentication & Authorization)
- Chức năng nghiệp vụ cốt lõi (Core Business Features)
- Báo cáo & thống kê (Reporting & Analytics)
- Quản trị hệ thống (Administration)
- Thông báo & truyền thông (Notifications)
- Tìm kiếm & lọc (Search & Filter)

---

### PHẦN 5 — YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements)

Mỗi yêu cầu có ID: `NFR-[TYPE]-[NUMBER]`

#### 5.1 Hiệu năng (Performance Requirements)
- Thời gian phản hồi trang: ≤ X giây
- Throughput: X requests/giây
- Số người dùng đồng thời hỗ trợ: X
- Kích thước tệp upload tối đa

#### 5.2 Bảo mật (Security Requirements)
- Xác thực: phương thức (JWT, OAuth 2.0, MFA...)
- Phân quyền: mô hình phân quyền (RBAC, ABAC...)
- Mã hóa: dữ liệu in-transit (TLS 1.2+), at-rest (AES-256)
- Chống tấn công: XSS, CSRF, SQL Injection, Rate limiting
- Audit log: những thao tác nào cần ghi log

#### 5.3 Độ tin cậy & Khả dụng (Reliability & Availability)
- Uptime SLA: X% (ví dụ: 99.9%)
- RTO (Recovery Time Objective): X giờ
- RPO (Recovery Point Objective): X giờ
- Chiến lược backup: tần suất, vị trí lưu

#### 5.4 Khả năng mở rộng (Scalability)
- Horizontal / vertical scaling
- Chiến lược xử lý tải tăng đột biến

#### 5.5 Khả năng bảo trì (Maintainability)
- Chuẩn code (coding standards)
- Yêu cầu về tài liệu kỹ thuật
- Môi trường test (unit test coverage ≥ X%)

#### 5.6 Khả năng sử dụng (Usability)
- Thời gian học sử dụng cho user mới
- Hỗ trợ ngôn ngữ, quốc tế hóa (i18n)
- Khả năng tiếp cận (accessibility)
- Hỗ trợ thiết bị / trình duyệt

#### 5.7 Tuân thủ & Pháp lý (Compliance & Legal)
- Tiêu chuẩn tuân thủ (GDPR, PCI-DSS, ISO 27001...)
- Chính sách lưu trữ dữ liệu
- Yêu cầu bản quyền, giấy phép

---

### PHẦN 6 — YÊU CẦU DỮ LIỆU (Data Requirements)

#### 6.1 Mô hình dữ liệu logic (Logical Data Model)
- Mô tả các thực thể chính (entities) và quan hệ giữa chúng.
- Có thể dùng dạng bảng hoặc mô tả ERD bằng text.

#### 6.2 Dictionary dữ liệu (Data Dictionary)
Với mỗi thực thể quan trọng:

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc |
|--------|-------------|----------|-------|-----------|
| ... | ... | ... | ... | ... |

#### 6.3 Yêu cầu toàn vẹn dữ liệu (Data Integrity)
- Quy tắc validation
- Ràng buộc unique, foreign key
- Chính sách xóa dữ liệu (soft delete / hard delete)

#### 6.4 Khối lượng dữ liệu (Data Volume)
- Ước tính số bản ghi ban đầu và tăng trưởng hàng năm.
- Chính sách lưu trữ và archiving.

---

### PHẦN 7 — RÀNG BUỘC HỆ THỐNG (System Constraints)

- Ngân sách / timeline nếu ảnh hưởng đến thiết kế
- Công nghệ bắt buộc / cấm sử dụng
- Yêu cầu về đội ngũ, kỹ năng
- Phụ thuộc vào hệ thống/dự án khác

---

### PHẦN 8 — YÊU CẦU CHUYỂN ĐỔI (Transition Requirements) *(nếu có)*

- Di chuyển dữ liệu từ hệ thống cũ (data migration)
- Chiến lược rollout: pilot → rollout dần / big-bang
- Đào tạo người dùng
- Kế hoạch song song vận hành (parallel run)

---

### PHẦN 9 — PHỤ LỤC (Appendices)

#### Phụ lục A — Ma trận truy xuất yêu cầu (Requirements Traceability Matrix)
Bảng liên kết giữa FR/NFR với use cases, module, test cases.

| Requirement ID | Mô tả | Module | Use Case | Độ ưu tiên | Trạng thái |
|---------------|-------|--------|----------|-----------|-----------|
| FR-AUTH-001 | ... | Auth | UC-01 | High | Draft |

#### Phụ lục B — Danh sách câu hỏi mở (Open Issues)
Liệt kê những điểm chưa rõ, cần xác nhận từ stakeholders.

#### Phụ lục C — Lịch sử thay đổi (Change History)
| Phiên bản | Ngày | Người thực hiện | Mô tả thay đổi |
|-----------|------|----------------|---------------|
| 1.0 | YYYY-MM-DD | ... | Tạo tài liệu |

---

## 3. Quy tắc viết chất lượng cao

Claude phải tuân thủ các nguyên tắc sau khi viết SRS:

### ✅ Phải làm
- **Mỗi yêu cầu chỉ diễn đạt MỘT điều** — không gộp nhiều yêu cầu vào một câu
- **Dùng ngôn ngữ bắt buộc chuẩn:** "Hệ thống **phải** (SHALL)...", "Hệ thống **nên** (SHOULD)...", "Hệ thống **có thể** (MAY)..."
- **Đo lường được:** thay "nhanh" bằng "≤ 2 giây", thay "nhiều" bằng "tối thiểu 1000 bản ghi"
- **Nhất quán:** dùng cùng tên cho cùng một khái niệm xuyên suốt tài liệu
- **Có ID duy nhất** cho mỗi yêu cầu
- **Phân loại độ ưu tiên:** Critical / High / Medium / Low

### ❌ Tránh làm
- Viết yêu cầu mơ hồ: "thân thiện người dùng", "hiệu suất tốt", "dễ sử dụng"
- Mô tả giải pháp kỹ thuật thay vì mô tả yêu cầu ("Hệ thống dùng Redis để cache" → sai; "Hệ thống phải phản hồi trong 2 giây" → đúng)
- Sử dụng "và/hoặc" để gộp nhiều yêu cầu
- Bỏ sót các luồng thay thế / trường hợp lỗi

---

## 4. Định dạng đầu ra

- **Ngôn ngữ:** Viết theo ngôn ngữ của người dùng (Tiếng Việt hoặc Tiếng Anh)
- **Định dạng:** Markdown đầy đủ, sẵn sàng export sang `.docx` hoặc PDF
- **Độ dài:** Không giới hạn — ưu tiên đầy đủ và chính xác hơn ngắn gọn
- **Tiêu đề:** Đánh số phân cấp rõ ràng (1, 1.1, 1.1.1)
- **Bảng biểu:** Dùng Markdown table cho tất cả danh sách dữ liệu có cấu trúc

---

## 5. Quy trình làm việc

```
1. Nhận đầu vào (phân tích phần mềm / mô tả dự án)
       ↓
2. Đọc và trích xuất thông tin → Xác định những gì còn thiếu
       ↓
3. Hỏi người dùng (tối đa 1 lần, gộp tất cả câu hỏi còn thiếu)
       ↓
4. Viết SRS đầy đủ theo cấu trúc 9 phần ở trên
       ↓
5. Tóm tắt cuối: liệt kê số lượng FR, NFR, open issues cần xác nhận
```

**Lưu ý:** Nếu thông tin đầu vào đã đủ, bỏ qua bước 3 và viết SRS ngay.

---

## 6. Ví dụ ID yêu cầu

```
FR-AUTH-001   → Chức năng đăng nhập
FR-AUTH-002   → Chức năng đăng xuất
FR-USER-001   → Quản lý hồ sơ người dùng
FR-ORDER-001  → Tạo đơn hàng
NFR-PERF-001  → Thời gian phản hồi
NFR-SEC-001   → Mã hóa mật khẩu
NFR-AVAIL-001 → Uptime 99.9%
```