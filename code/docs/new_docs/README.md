# SMTTS — TÀI LIỆU THIẾT KẾ KỸ THUẬT (PHIÊN BẢN CẬP NHẬT v2)

> Bộ tài liệu **độc lập**, viết lại toàn bộ thiết kế kỹ thuật theo trạng thái **thực tế của mã nguồn**
> tại thời điểm 15/04/2026, sau khi đã triển khai và điều chỉnh so với bản thiết kế gốc v1.0 (15/03/2026).
>
> Mục tiêu: phục vụ bảo vệ đồ án và bàn giao kỹ thuật. Không cần đọc kèm tài liệu cũ.

## Danh mục tài liệu

| File | Nội dung |
|------|----------|
| [01_DATABASE_DESIGN_v2.md](./01_DATABASE_DESIGN_v2.md) | Thiết kế Cơ sở dữ liệu — schema thực tế, ERD, từ điển dữ liệu, index, lý do thay đổi |
| [02_FUNCTIONAL_SPEC_v2.md](./02_FUNCTIONAL_SPEC_v2.md) | Đặc tả chức năng — module hiện có, hạng mục cần bổ sung, đề xuất tương lai |
| [03_API_DESIGN_v2.md](./03_API_DESIGN_v2.md) | Thiết kế API — toàn bộ endpoint REST, request/response, quy ước chung |

## Phạm vi sản phẩm

Hệ thống **SMTTS — Subject Management, Tracking & Tracing System** gồm 3 hợp phần:
- **Backend** NestJS (Node.js) + 2 PostgreSQL (`smtts_main`, `smtts_biometric`) + Redis
- **Web Dashboard** React + TailwindCSS (cán bộ)
- **Mobile App** Android (Kotlin) (đối tượng quản lý)
- **Service phụ trợ**: Face Recognition (Python/FastAPI, InsightFace/ArcFace) — gọi qua HTTP từ backend

## Quy ước

- Ngôn ngữ giao diện và nghiệp vụ: **Tiếng Việt**
- Mã nguồn / API / tên cột: **Tiếng Anh, snake_case** (DB) và **camelCase** (TS/JS)
- Mã định danh chức năng kế thừa từ tài liệu phân tích: SA-xx (Mobile), W-xx (Web), B-xx (Backend), SE-xx (Scenario Engine)
