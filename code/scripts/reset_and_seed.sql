-- ============================================================================
-- SMTTS — RESET & SEED CHUẨN
-- Dùng cho test cả Web (cán bộ) và Mobile (đối tượng)
-- Chạy: docker exec -i smtts-postgres-main psql -U smtts_user -d smtts_main < code/scripts/reset_and_seed.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. XÓA SẠCH DỮ LIỆU (giữ schema + enum)
-- ============================================================================
TRUNCATE TABLE
  case_notes, cases, alert_histories, alerts, events,
  scenario_assignments, alert_rules, management_scenarios,
  files, notifications, requests, audit_logs,
  devices, subject_legals, subject_families, subjects,
  refresh_tokens, users, configs, geofences, areas
CASCADE;

-- ============================================================================
-- 1. AREAS — Đơn vị hành chính TP.HCM (2 cấp)
-- ============================================================================
INSERT INTO areas (id, code, name, level, parent_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'PROV_HCM', 'Thành phố Hồ Chí Minh', 'PROVINCE', NULL);

INSERT INTO areas (id, code, name, level, parent_id) VALUES
  ('a0000000-0000-0000-0000-000000000010', 'DIST_Q1',   'Quận 1',            'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000011', 'DIST_Q3',   'Quận 3',            'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000012', 'DIST_BT',   'Quận Bình Thạnh',   'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000013', 'DIST_TD',   'TP Thủ Đức',        'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000014', 'DIST_GV',   'Quận Gò Vấp',       'DISTRICT', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000015', 'DIST_TB',   'Quận Tân Bình',     'DISTRICT', 'a0000000-0000-0000-0000-000000000001');

-- ============================================================================
-- 2. CONFIGS
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
-- 3. USERS — Tài khoản cán bộ (Web)
--    Password cho tất cả: Admin@123
-- ============================================================================
INSERT INTO users (id, username, password_hash, full_name, email, phone, role, area_id, data_scope_level, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'admin',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Quản trị viên Hệ thống', 'admin@smtts.local', '0900000001',
   'IT_ADMIN', NULL, 'SYSTEM', 'ACTIVE'),

  ('e0000000-0000-0000-0000-000000000002', 'lanhdao.hcm',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Nguyễn Văn Lãnh Đạo', 'lanhdao@smtts.local', '0900000002',
   'LANH_DAO', 'a0000000-0000-0000-0000-000000000001', 'PROVINCE', 'ACTIVE'),

  ('e0000000-0000-0000-0000-000000000003', 'canbo.quanly.q1',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Trần Thị Quản Lý', 'quanly.q1@smtts.local', '0900000003',
   'CAN_BO_QUAN_LY', 'a0000000-0000-0000-0000-000000000010', 'DISTRICT', 'ACTIVE'),

  ('e0000000-0000-0000-0000-000000000004', 'canbo.coso.bn',
   '$2a$10$TpvCidP5fJGVe1U1OXQcQ.Ai2lNPKHpwnYdOeIEDu3CVBlgsjJ/7i',
   'Lê Văn Cơ Sở', 'coso.bn@smtts.local', '0900000004',
   'CAN_BO_CO_SO', 'a0000000-0000-0000-0000-000000000010', 'DISTRICT', 'ACTIVE');

-- ============================================================================
-- 4. SUBJECTS — Đối tượng quản lý
--    CCCD hash: SHA-256 thật (dùng để kích hoạt trên Mobile)
--
--    NHÓM A: Đã đang quản lý (web dashboard demo)
--    NHÓM B: Chờ kích hoạt (mobile activation test)
-- ============================================================================

-- ── NHÓM A: 8 đối tượng ĐANG QUẢN LÝ (cho dashboard web) ──
-- Đã có lifecycle=DANG_QUAN_LY, có compliance_rate, có enrollment_date
-- CCCD hash đúng → sau kích hoạt có thể đăng nhập mobile

INSERT INTO subjects (id, code, full_name, cccd_encrypted, cccd_hash, date_of_birth, gender, address, area_id, status, lifecycle, compliance_rate, enrollment_date, created_by_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'DT-001', 'Nguyễn Văn Hùng',
   '079200001001', '8a86bfe3f17bdce399ee6c30b198e9aa8f33b2d29f94476dfa201ca73afd7fba',
   '1990-05-15', 'MALE', '12 Đồng Khởi, Quận 1',
   'a0000000-0000-0000-0000-000000000010', 'ACTIVE', 'DANG_QUAN_LY', 95.0,
   NOW() - INTERVAL '60 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000002', 'DT-002', 'Trần Thị Mai',
   '079200001002', 'd88380b85c8df70e92b669795602c3629ed056e3d9d84e09f4c4a807025c36a4',
   '1988-11-22', 'FEMALE', '45 Lê Lợi, Quận 1',
   'a0000000-0000-0000-0000-000000000010', 'ACTIVE', 'DANG_QUAN_LY', 88.5,
   NOW() - INTERVAL '45 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000003', 'DT-003', 'Lê Văn Đức',
   '079200001003', '56b106c93b2dc31b34e571361863ac64ffc5a490dda71bc8a236cb44ae68622b',
   '1995-03-10', 'MALE', '78 Nguyễn Huệ, Quận 1',
   'a0000000-0000-0000-0000-000000000010', 'ACTIVE', 'DANG_QUAN_LY', 92.0,
   NOW() - INTERVAL '90 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000004', 'DT-004', 'Phạm Thị Hoa',
   '079200001004', 'd9b0470d55af84ba9ed7ba72afd71c1281d97fbd649080945d1a57c6a464f980',
   '1992-08-05', 'FEMALE', '23 Võ Văn Tần, Quận 3',
   'a0000000-0000-0000-0000-000000000011', 'ACTIVE', 'DANG_QUAN_LY', 75.0,
   NOW() - INTERVAL '30 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000005', 'DT-005', 'Hoàng Văn Bình',
   '079200001005', 'a81a12fe1c3816f0ab755c0b5e2fafe9a16b33f95318820059f7ac34e87f0ff7',
   '1987-01-20', 'MALE', '56 Nguyễn Thị Minh Khai, Quận 3',
   'a0000000-0000-0000-0000-000000000011', 'ACTIVE', 'DANG_QUAN_LY', 100.0,
   NOW() - INTERVAL '120 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000006', 'DT-006', 'Đỗ Thị Lan',
   '079200001006', '75441ea3eebf1bcf14780caf348bfbf2d9e4b3720223989ca91ba024965c0076',
   '1993-06-18', 'FEMALE', '89 Xô Viết Nghệ Tĩnh, Bình Thạnh',
   'a0000000-0000-0000-0000-000000000012', 'ACTIVE', 'DANG_QUAN_LY', 82.5,
   NOW() - INTERVAL '75 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000007', 'DT-007', 'Vũ Văn Tâm',
   '079200001007', 'eebca2032044b0ce5fd6790f6b046d343784122a6e67027806a59a6a73efa45c',
   '1991-12-03', 'MALE', '34 Điện Biên Phủ, Bình Thạnh',
   'a0000000-0000-0000-0000-000000000012', 'ACTIVE', 'DANG_QUAN_LY', 90.0,
   NOW() - INTERVAL '55 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000008', 'DT-008', 'Ngô Thị Yến',
   '079200001008', '2c5fc5e28e658ae3e4019dff372e183903a31ddf5167ba5091fc410f0a94c5dd',
   '1996-09-27', 'FEMALE', '67 Lý Chính Thắng, Quận 3',
   'a0000000-0000-0000-0000-000000000011', 'ENROLLED', 'ENROLLMENT', 97.5,
   NOW() - INTERVAL '10 days', 'e0000000-0000-0000-0000-000000000003');

-- ── NHÓM B: 5 đối tượng CHỜ KÍCH HOẠT (cho mobile test) ──
-- lifecycle=KHOI_TAO, user_account_id=NULL, chưa có enrollment_date

-- CCCD 079200099001 → SHA-256: 491ea3b633295d2c0988626a65414b28636ef77238a3ec912452a6e6d0c366b4
-- CCCD 079200099002 → SHA-256: 64a0c352e49a8edafe15b332381eefc85545d0cab58ea9c3223f4bb645cdfe36
-- CCCD 079200099003 → SHA-256: 1effeaaf3d3565ed2279fb456b9401a0606837c539bc3afeaec34c66cd9ea53f
-- CCCD 079200099004 → SHA-256: 891bef2a321cd8c4810e3767db5324cdcdffabac88f1952f192a42fef0c2338f
-- CCCD 079200099005 → SHA-256: dc9c8a595da83e5740a89af818d51cbe7efa642e696d66622ce1100d920b6e03

INSERT INTO subjects (id, code, full_name, cccd_encrypted, cccd_hash, date_of_birth, gender, address, area_id, status, lifecycle, created_by_id) VALUES
  ('d0000000-0000-0000-0000-000000000101', 'HS-2026-0001', 'Trần Minh Tuấn',
   '079200099001', '491ea3b633295d2c0988626a65414b28636ef77238a3ec912452a6e6d0c366b4',
   '1995-06-15', 'MALE', '100 Nguyễn Trãi, Quận 1',
   'a0000000-0000-0000-0000-000000000010', 'ENROLLED', 'KHOI_TAO',
   'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000102', 'HS-2026-0002', 'Nguyễn Thị Hạnh',
   '079200099002', '64a0c352e49a8edafe15b332381eefc85545d0cab58ea9c3223f4bb645cdfe36',
   '1998-03-20', 'FEMALE', '50 Lê Lợi, Quận 1',
   'a0000000-0000-0000-0000-000000000010', 'ENROLLED', 'KHOI_TAO',
   'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000103', 'HS-2026-0003', 'Phạm Văn Long',
   '079200099003', '1effeaaf3d3565ed2279fb456b9401a0606837c539bc3afeaec34c66cd9ea53f',
   '1992-11-08', 'MALE', '88 Hai Bà Trưng, Quận 3',
   'a0000000-0000-0000-0000-000000000011', 'ENROLLED', 'KHOI_TAO',
   'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000104', 'HS-2026-0004', 'Lê Thị Ngọc',
   '079200099004', '891bef2a321cd8c4810e3767db5324cdcdffabac88f1952f192a42fef0c2338f',
   '1997-07-25', 'FEMALE', '15 Phan Đình Phùng, Bình Thạnh',
   'a0000000-0000-0000-0000-000000000012', 'ENROLLED', 'KHOI_TAO',
   'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000105', 'HS-2026-0005', 'Hoàng Đức Anh',
   '079200099005', 'dc9c8a595da83e5740a89af818d51cbe7efa642e696d66622ce1100d920b6e03',
   '1994-01-30', 'MALE', '22 Lê Duẩn, Quận 1',
   'a0000000-0000-0000-0000-000000000010', 'ENROLLED', 'KHOI_TAO',
   'e0000000-0000-0000-0000-000000000004');

-- ============================================================================
-- 5. MANAGEMENT SCENARIO + ALERT RULES
-- ============================================================================
INSERT INTO management_scenarios (
  id, code, name, description, status, scope,
  checkin_frequency, checkin_window_start, checkin_window_end,
  grace_period_days, face_threshold, nfc_required, fallback_allowed,
  travel_approval_required, notification_config, auto_escalation_config,
  effective_from, created_by_id
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'KB-HCM-001', 'Kịch bản quản lý TP.HCM',
  'Kịch bản quản lý chung cho các đối tượng khu vực TP.HCM',
  'ACTIVE', 'PROVINCE', 'DAILY', '06:00:00', '22:00:00',
  2, 85, true, true, true,
  '{"channels": ["WEB", "PUSH"]}',
  '{"KHAN_CAP": true, "CAO": false, "TRUNG_BINH": false, "THAP": false}',
  CURRENT_DATE - INTERVAL '90 days',
  'e0000000-0000-0000-0000-000000000002'
);

INSERT INTO alert_rules (id, scenario_id, code, name, source, event_type, condition_operator, condition_value, alert_level, is_editable, is_deletable, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'AR-OVERDUE', 'Quá hạn check-in', 'DEFAULT', 'CHECKIN_OVERDUE', '>=', 1, 'TRUNG_BINH', true, false, true),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'AR-FACE-STREAK', 'Sai mặt liên tiếp', 'DEFAULT', 'FACE_MISMATCH', '>=', 3, 'CAO', true, false, true),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'AR-NFC-MISMATCH', 'NFC CCCD không khớp', 'DEFAULT', 'NFC_MISMATCH', '>=', 1, 'CAO', true, false, true),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'AR-SEVERE-OVERDUE', 'Quá hạn nghiêm trọng', 'DEFAULT', 'CHECKIN_OVERDUE', '>=', 5, 'KHAN_CAP', true, false, true);

-- ============================================================================
-- 6. SCENARIO ASSIGNMENTS — Gán 8 đối tượng nhóm A vào kịch bản
-- ============================================================================
INSERT INTO scenario_assignments (id, subject_id, scenario_id, status, assigned_by_id) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'ACTIVE', 'e0000000-0000-0000-0000-000000000003');

-- ============================================================================
-- 7. EVENTS — 20 sự kiện (7 ngày gần nhất)
-- ============================================================================
INSERT INTO events (id, code, type, subject_id, scenario_id, result, gps_lat, gps_lng, face_match_score, nfc_verified, nfc_cccd_match, in_geofence, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'EV-D6-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7769, 106.7009, 92.5, true, true, true,
   NOW() - INTERVAL '6 days' + INTERVAL '7 hours 45 minutes'),
  ('10000000-0000-0000-0000-000000000002', 'EV-D6-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7750, 106.7020, 90.0, true, true, true,
   NOW() - INTERVAL '6 days' + INTERVAL '8 hours 30 minutes'),
  ('10000000-0000-0000-0000-000000000003', 'EV-D5-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.8050, 106.7100, 88.0, true, true, true,
   NOW() - INTERVAL '5 days' + INTERVAL '7 hours'),
  ('10000000-0000-0000-0000-000000000004', 'EV-D5-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7760, 106.7015, 95.0, true, true, true,
   NOW() - INTERVAL '5 days' + INTERVAL '8 hours 20 minutes'),
  ('10000000-0000-0000-0000-000000000005', 'EV-D5-003', 'CHECKIN_OVERDUE',
   'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', 10.8100, 106.7200, NULL, false, false, false,
   NOW() - INTERVAL '5 days' + INTERVAL '14 hours'),
  ('10000000-0000-0000-0000-000000000006', 'EV-D4-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7800, 106.6900, 91.0, true, true, true,
   NOW() - INTERVAL '4 days' + INTERVAL '7 hours 15 minutes'),
  ('10000000-0000-0000-0000-000000000007', 'EV-D4-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.8100, 106.7200, 87.0, true, true, true,
   NOW() - INTERVAL '4 days' + INTERVAL '8 hours 45 minutes'),
  ('10000000-0000-0000-0000-000000000008', 'EV-D4-003', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7740, 106.6980, 93.0, true, true, true,
   NOW() - INTERVAL '4 days' + INTERVAL '9 hours 30 minutes'),
  ('10000000-0000-0000-0000-000000000009', 'EV-D3-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7765, 106.7010, 94.0, true, true, true,
   NOW() - INTERVAL '3 days' + INTERVAL '7 hours 30 minutes'),
  ('10000000-0000-0000-0000-000000000010', 'EV-D3-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7830, 106.6950, 89.5, true, true, true,
   NOW() - INTERVAL '3 days' + INTERVAL '8 hours'),
  ('10000000-0000-0000-0000-000000000011', 'EV-D3-003', 'FACE_MISMATCH',
   'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', 10.7755, 106.7025, 42.0, true, true, true,
   NOW() - INTERVAL '3 days' + INTERVAL '10 hours'),
  ('10000000-0000-0000-0000-000000000012', 'EV-D2-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7742, 106.6985, 91.0, true, true, true,
   NOW() - INTERVAL '2 days' + INTERVAL '7 hours 20 minutes'),
  ('10000000-0000-0000-0000-000000000013', 'EV-D2-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.8055, 106.7105, 86.0, true, true, true,
   NOW() - INTERVAL '2 days' + INTERVAL '9 hours 15 minutes'),
  ('10000000-0000-0000-0000-000000000014', 'EV-D2-003', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7835, 106.6955, 90.0, true, true, true,
   NOW() - INTERVAL '2 days' + INTERVAL '10 hours'),
  ('10000000-0000-0000-0000-000000000015', 'EV-D1-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7770, 106.7012, 96.0, true, true, true,
   NOW() - INTERVAL '1 day' + INTERVAL '7 hours 45 minutes'),
  ('10000000-0000-0000-0000-000000000016', 'EV-D1-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7805, 106.6905, 92.0, true, true, true,
   NOW() - INTERVAL '1 day' + INTERVAL '8 hours 15 minutes'),
  ('10000000-0000-0000-0000-000000000017', 'EV-D1-003', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7832, 106.6952, 88.0, true, true, true,
   NOW() - INTERVAL '1 day' + INTERVAL '9 hours'),
  ('10000000-0000-0000-0000-000000000018', 'EV-D1-004', 'CHECKIN_OVERDUE',
   'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', NULL, NULL, NULL, false, false, false,
   NOW() - INTERVAL '1 day' + INTERVAL '23 hours'),
  ('10000000-0000-0000-0000-000000000019', 'EV-D0-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7768, 106.7011, 97.0, true, true, true,
   NOW() - INTERVAL '2 hours'),
  ('10000000-0000-0000-0000-000000000020', 'EV-D0-002', 'FACE_MISMATCH',
   'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', 10.7831, 106.6953, 35.0, true, true, true,
   NOW() - INTERVAL '1 hour');

-- ============================================================================
-- 8. ALERTS — 8 cảnh báo (5 OPEN, 3 RESOLVED)
-- ============================================================================
INSERT INTO alerts (id, code, type, level, status, source, subject_id, trigger_event_id, alert_rule_id, scenario_id, created_at, resolved_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'AL-001', 'FACE_MISMATCH_STREAK', 'CAO', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000020',
   'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '30 minutes', NULL),
  ('20000000-0000-0000-0000-000000000002', 'AL-002', 'OVERDUE', 'TRUNG_BINH', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000018',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '1 day', NULL),
  ('20000000-0000-0000-0000-000000000003', 'AL-003', 'FACE_MISMATCH_STREAK', 'CAO', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000011',
   'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '3 days', NULL),
  ('20000000-0000-0000-0000-000000000004', 'AL-004', 'SEVERE_OVERDUE', 'KHAN_CAP', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '5 days', NULL),
  ('20000000-0000-0000-0000-000000000005', 'AL-005', 'OVERDUE', 'THAP', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '1 day' + INTERVAL '2 hours', NULL),
  ('20000000-0000-0000-0000-000000000006', 'AL-006', 'OVERDUE', 'TRUNG_BINH', 'RESOLVED', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
  ('20000000-0000-0000-0000-000000000007', 'AL-007', 'NFC_CCCD_MISMATCH', 'CAO', 'RESOLVED', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008',
   'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
  ('20000000-0000-0000-0000-000000000008', 'AL-008', 'OVERDUE', 'THAP', 'RESOLVED', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 9. CASES — 4 vụ việc (2 OPEN, 2 CLOSED)
-- ============================================================================
INSERT INTO cases (id, code, subject_id, status, severity, source, description, escalated_from_alert_id, escalation_type, escalation_reason, assignee_id, created_by_id, created_by_name, closing_note, closed_by_id, closed_at, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', 'CS-001',
   'd0000000-0000-0000-0000-000000000004', 'OPEN', 'CAO', 'AUTO',
   'Đối tượng Phạm Thị Hoa liên tục sai mặt khi check-in',
   '20000000-0000-0000-0000-000000000001', 'AUTO', 'Face mismatch streak >= 3',
   'e0000000-0000-0000-0000-000000000003', NULL, 'HỆ THỐNG',
   NULL, NULL, NULL, NOW() - INTERVAL '30 minutes'),
  ('30000000-0000-0000-0000-000000000002', 'CS-002',
   'd0000000-0000-0000-0000-000000000006', 'OPEN', 'KHAN_CAP', 'AUTO',
   'Đối tượng Đỗ Thị Lan quá hạn check-in nghiêm trọng (>5 ngày)',
   '20000000-0000-0000-0000-000000000004', 'AUTO', 'Severe overdue >= 5 days',
   'e0000000-0000-0000-0000-000000000003', NULL, 'HỆ THỐNG',
   NULL, NULL, NULL, NOW() - INTERVAL '5 days'),
  ('30000000-0000-0000-0000-000000000003', 'CS-003',
   'd0000000-0000-0000-0000-000000000001', 'CLOSED', 'TRUNG_BINH', 'MANUAL_NEW',
   'Kiểm tra quá hạn check-in đối tượng Nguyễn Văn Hùng',
   NULL, NULL, NULL,
   'e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Lê Văn Cơ Sở',
   'Đối tượng đã giải trình, lý do bệnh viện. Hồ sơ đã cập nhật.',
   'e0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days', NOW() - INTERVAL '6 days'),
  ('30000000-0000-0000-0000-000000000004', 'CS-004',
   'd0000000-0000-0000-0000-000000000002', 'CLOSED', 'CAO', 'MANUAL_ESCALATE',
   'NFC CCCD không khớp khi check-in của Trần Thị Mai',
   '20000000-0000-0000-0000-000000000007', 'MANUAL', 'Cán bộ phát hiện bất thường NFC',
   'e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'Trần Thị Quản Lý',
   'Đã xác minh trực tiếp. CCCD hợp lệ, lỗi do thiết bị NFC reader cũ.',
   'e0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days');

COMMIT;

-- ============================================================================
-- DONE! Kiểm tra nhanh:
-- ============================================================================
-- SELECT 'Users' as tbl, count(*) FROM users
-- UNION ALL SELECT 'Subjects', count(*) FROM subjects
-- UNION ALL SELECT 'Events', count(*) FROM events
-- UNION ALL SELECT 'Alerts', count(*) FROM alerts
-- UNION ALL SELECT 'Cases', count(*) FROM cases;
