-- ============================================================================
-- SMTTS — Seed Data: 003_seed_data.sql
-- Database: smtts_main
-- ============================================================================

-- ============================================================================
-- 1. AREAS — Đơn vị hành chính mẫu (TP.HCM) — 2 cấp
-- ============================================================================

-- Tỉnh/TP
INSERT INTO areas (id, code, name, level, parent_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'PROV_HCM', 'Thành phố Hồ Chí Minh', 'PROVINCE', NULL);

-- Quận/Huyện
INSERT INTO areas (id, code, name, level, parent_id) VALUES
  ('a0000000-0000-0000-0000-000000000010', 'DIST_Q1',   'Quận 1',            'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000011', 'DIST_Q3',   'Quận 3',            'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000012', 'DIST_BT',   'Quận Bình Thạnh',   'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000013', 'DIST_TD',   'TP Thủ Đức',        'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000014', 'DIST_GV',   'Quận Gò Vấp',       'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000015', 'DIST_TB',   'Quận Tân Bình',     'DISTRICT', 'a0000000-0000-0000-0000-000000000001');

-- ============================================================================
-- 2. CONFIGS — Cấu hình hệ thống mặc định
-- ============================================================================

INSERT INTO configs (key, value, category, description) VALUES
  ('system.default_page_size',     '20',    'SYSTEM',     'Số item mặc định mỗi trang'),
  ('system.max_file_size_bytes',   '10485760', 'SYSTEM',  'Kích thước file tối đa (10MB)'),
  ('biometric.face_threshold',     '85',    'BIOMETRIC',  'Ngưỡng face match mặc định (%)'),
  ('biometric.liveness_enabled',   'true',  'BIOMETRIC',  'Bật liveness detection'),
  ('biometric.retention_months',   '12',    'BIOMETRIC',  'Thời gian lưu biometric (tháng)'),
  ('escalation.auto_levels',       '{"KHAN_CAP": true, "CAO": false}', 'ESCALATION', 'Mức Alert auto-escalate thành Case'),
  ('category.management_types',    '["QUAN_CHE","GIAM_SAT","TAI_HOA_NHAP","KHAC"]', 'CATEGORY', 'Danh mục loại quản lý'),
  ('category.subject_types',       '["LOAI_1","LOAI_2","LOAI_3"]', 'CATEGORY', 'Danh mục loại đối tượng');

-- ============================================================================
-- 3. USERS — Tài khoản demo
-- ============================================================================
-- Password: "Admin@123" -> bcrypt hash

INSERT INTO users (id, username, password_hash, full_name, email, phone, role, area_id, data_scope_level, status) VALUES
  -- IT Admin (system-wide scope)
  ('e0000000-0000-0000-0000-000000000001',
   'admin',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Quản trị viên Hệ thống',
   'admin@smtts.local',
   '0900000001',
   'IT_ADMIN',
   NULL,
   'SYSTEM',
   'ACTIVE'),

  -- Lãnh đạo (Province scope)
  ('e0000000-0000-0000-0000-000000000002',
   'lanhdao.hcm',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Nguyễn Văn Lãnh Đạo',
   'lanhdao@smtts.local',
   '0900000002',
   'LANH_DAO',
   'a0000000-0000-0000-0000-000000000001',
   'PROVINCE',
   'ACTIVE'),

  -- Cán bộ quản lý (District scope — Quận 1)
  ('e0000000-0000-0000-0000-000000000003',
   'canbo.quanly.q1',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Trần Thị Quản Lý',
   'quanly.q1@smtts.local',
   '0900000003',
   'CAN_BO_QUAN_LY',
   'a0000000-0000-0000-0000-000000000010',
   'DISTRICT',
   'ACTIVE'),

  -- Cán bộ cơ sở (District scope — Quận 1)
  ('e0000000-0000-0000-0000-000000000004',
   'canbo.coso.bn',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Lê Văn Cơ Sở',
   'coso.bn@smtts.local',
   '0900000004',
   'CAN_BO_CO_SO',
   'a0000000-0000-0000-0000-000000000010',
   'DISTRICT',
   'ACTIVE');
