-- =============================================================================
-- Migration 009: Fix CCCD hash uniqueness for soft-delete compatibility
-- =============================================================================
--
-- VẤN ĐỀ:
--   Cột cccd_hash có UNIQUE constraint cứng (subjects_cccd_hash_key).
--   Khi soft-delete hồ sơ (deleted_at IS NOT NULL), row vẫn còn trong DB,
--   và PostgreSQL vẫn enforce constraint này → không thể INSERT hồ sơ mới
--   với cùng CCCD dù hồ sơ cũ đã bị xóa.
--
-- GIẢI PHÁP:
--   Thay hard UNIQUE constraint bằng PARTIAL UNIQUE INDEX chỉ áp dụng cho
--   các hồ sơ chưa bị xóa (WHERE deleted_at IS NULL).
--
--   Kết quả:
--   ✅  2 hồ sơ ACTIVE không thể trùng CCCD           (giữ nguyên bảo mật)
--   ✅  Hồ sơ đã xóa + hồ sơ mới có thể trùng CCCD   (fix bài toán re-enroll)
--   ✅  Hiệu năng query không đổi (index vẫn còn)
--
-- CÁCH CHẠY:
--   psql -U <user> -d <smtts_db> -f 009_fix_cccd_hash_partial_unique.sql
-- =============================================================================

BEGIN;

-- Bước 1: Xóa hard UNIQUE constraint cũ (tên auto-generate của PostgreSQL)
-- Tên này được tạo tự động từ: CREATE TABLE subjects (..., cccd_hash ... UNIQUE, ...)
ALTER TABLE subjects
  DROP CONSTRAINT IF EXISTS subjects_cccd_hash_key;

-- Bước 2: Xóa non-unique partial index cũ (sẽ được thay bằng unique version bên dưới)
DROP INDEX IF EXISTS idx_subjects_cccd_hash;

-- Bước 3: Tạo PARTIAL UNIQUE INDEX — chỉ enforce unique khi hồ sơ chưa bị xóa
-- Đây là cách chuẩn để xử lý soft-delete + unique constraint trong PostgreSQL.
CREATE UNIQUE INDEX UQ_subjects_cccd_hash_active
  ON subjects (cccd_hash)
  WHERE deleted_at IS NULL;

COMMIT;

-- Xác nhận kết quả
-- \d subjects          → không còn thấy "subjects_cccd_hash_key" trong Indexes
-- \di UQ_subjects_*    → thấy UQ_subjects_cccd_hash_active với "unique, partial"
