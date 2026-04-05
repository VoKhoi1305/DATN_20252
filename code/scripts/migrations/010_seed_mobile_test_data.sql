-- =====================================================================
-- SMTTS — Seed: Mobile App Test Data (010_seed_mobile_test_data.sql)
-- Database: smtts_main
--
-- Bổ sung dữ liệu đầy đủ cho đối tượng hiện có (HS-2026-0001)
-- và tạo thêm 1 đối tượng test mới (HS-2026-TEST) có sẵn tài khoản:
--   - Kịch bản quản lý + gán kịch bản + vùng geofence
--   - Thông tin gia đình + pháp lý
--   - Thiết bị (1 đang dùng + 1 đã thay thế)
--   - Tài liệu/hình ảnh
--   - Lịch sử check-in (events) + cảnh báo
--
-- Tài khoản test:
--   Username: 079200099001
--   Password: Test@123
-- =====================================================================

-- =====================================================================
-- 1. GEOFENCE — Vùng giám sát tại Quận 1
-- =====================================================================
INSERT INTO geofences (
  id, code, name, type, address,
  center_lat, center_lng, radius,
  area_id, is_active, created_by_id
) VALUES (
  'a0000000-0000-0000-0000-000000000099',
  'GF-Q1-001',
  'Khu vực cư trú Quận 1',
  'CIRCLE',
  '100 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
  10.7731,
  106.6980,
  2000,
  'a0000000-0000-0000-0000-000000000010',
  true,
  'e0000000-0000-0000-0000-000000000003'
) ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 2. SCENARIO — Kịch bản quản lý tiêu chuẩn
-- =====================================================================
INSERT INTO management_scenarios (
  id, code, name, description, status, version, scope,
  checkin_frequency, checkin_window_start, checkin_window_end,
  grace_period_days, face_threshold, nfc_required, fallback_allowed,
  geofence_id,
  travel_approval_required, travel_threshold_days,
  notification_config, auto_escalation_config,
  effective_from, created_by_id
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'KB-001',
  'Kịch bản Tiêu chuẩn',
  'Kịch bản quản lý tiêu chuẩn: check-in hàng ngày trong khung giờ 06:00-22:00, giám sát GPS vùng cư trú.',
  'ACTIVE', 1, 'DISTRICT',
  'DAILY', '06:00', '22:00', 2, 85, true, true,
  'a0000000-0000-0000-0000-000000000099',
  true, 3,
  '{"push": true, "web": true}',
  '{"KHAN_CAP": true, "CAO": false}',
  '2025-01-01',
  'e0000000-0000-0000-0000-000000000003'
) ON CONFLICT (code) DO UPDATE SET
  geofence_id = EXCLUDED.geofence_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- =====================================================================
-- 3. ALERT RULES — 4 luật cảnh báo mặc định
-- =====================================================================
INSERT INTO alert_rules (
  id, scenario_id, code, name, source,
  event_type, condition_operator, condition_value, condition_window_days,
  alert_level, notification_channels, is_editable, is_deletable, is_active
) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'AR-OVERDUE', 'Quá hạn check-in', 'DEFAULT',
   'CHECKIN_OVERDUE', '>=', 1, NULL,
   'TRUNG_BINH', '["PUSH","WEB"]', true, false, true),
  ('c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'AR-FACE-STREAK', 'Sai khuôn mặt liên tiếp', 'DEFAULT',
   'FACE_MISMATCH', '>=', 3, 7,
   'CAO', '["PUSH","WEB"]', true, false, true),
  ('c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'AR-NFC-MISMATCH', 'NFC CCCD không khớp', 'DEFAULT',
   'NFC_MISMATCH', '>=', 1, NULL,
   'CAO', '["PUSH","WEB"]', true, false, true),
  ('c0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001',
   'AR-SEVERE-OVERDUE', 'Quá hạn nghiêm trọng', 'DEFAULT',
   'SEVERE_OVERDUE', '>=', 1, NULL,
   'KHAN_CAP', '["PUSH","WEB"]', true, false, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 4. SUBJECT TEST — Tạo đối tượng test mới với tài khoản sẵn
--    CCCD: 079200099001 → Username: 079200099001 → Password: Test@123
-- =====================================================================
INSERT INTO subjects (
  id, code, full_name, cccd_encrypted, cccd_hash,
  date_of_birth, gender, ethnicity,
  address, permanent_address, phone, photo_url,
  area_id, status, lifecycle,
  compliance_rate, enrollment_date,
  notes, created_by_id
) VALUES (
  'd0000000-0000-0000-0000-000000000201',
  'HS-2026-TEST',
  'Trần Minh Tuấn',
  '079200099001',
  '491ea3b633295d2c0988626a65414b28636ef77238a3ec912452a6e6d0c366b4',
  '1995-06-15',
  'MALE',
  'Kinh',
  '100 Nguyễn Trãi, Quận 1, TP.HCM',
  '25 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
  '0912345678',
  NULL,
  'a0000000-0000-0000-0000-000000000010',
  'ACTIVE',
  'DANG_QUAN_LY',
  85.50,
  '2026-01-15 10:00:00+07',
  'Đối tượng chấp hành tốt, check-in đều đặn.',
  'e0000000-0000-0000-0000-000000000003'
) ON CONFLICT (code) DO UPDATE SET
  full_name       = EXCLUDED.full_name,
  ethnicity       = EXCLUDED.ethnicity,
  address         = EXCLUDED.address,
  permanent_address = EXCLUDED.permanent_address,
  phone           = EXCLUDED.phone,
  status          = EXCLUDED.status,
  lifecycle       = EXCLUDED.lifecycle,
  compliance_rate = EXCLUDED.compliance_rate,
  enrollment_date = EXCLUDED.enrollment_date,
  notes           = EXCLUDED.notes;

-- User account cho test subject
-- Password: Test@123
INSERT INTO users (
  id, username, password_hash, full_name, phone,
  role, area_id, data_scope_level, status
) VALUES (
  'e0000000-0000-0000-0000-000000000201',
  '079200099001',
  '$2a$10$uad4pj1aZW50DnnmJn2bg.zRxxFI/R1QYEbPSrNHGOJCOXBECERTC',
  'Trần Minh Tuấn',
  '0912345678',
  'SUBJECT',
  'a0000000-0000-0000-0000-000000000010',
  'DISTRICT',
  'ACTIVE'
) ON CONFLICT (username) DO NOTHING;

-- Link subject ↔ user
UPDATE subjects
SET user_account_id = 'e0000000-0000-0000-0000-000000000201'
WHERE id = 'd0000000-0000-0000-0000-000000000201'
  AND user_account_id IS NULL;

-- =====================================================================
-- 5. Cập nhật đối tượng hiện có (HS-2026-0001) thành DANG_QUAN_LY
--    Để test với tài khoản thật của bạn
-- =====================================================================
UPDATE subjects SET
  lifecycle = 'DANG_QUAN_LY',
  status = 'ACTIVE',
  compliance_rate = 92.00,
  ethnicity = 'Kinh',
  permanent_address = '123 Đường ABC, Quận 1, TP.HCM',
  phone = '0901234567'
WHERE code = 'HS-2026-0001';

-- =====================================================================
-- 6. SCENARIO ASSIGNMENTS — Gán kịch bản cho cả 2 đối tượng
-- =====================================================================
-- Cho test subject mới
INSERT INTO scenario_assignments (
  id, subject_id, scenario_id, status, assigned_by_id, assigned_at
) VALUES (
  'f0000000-0000-0000-0000-000000000201',
  'd0000000-0000-0000-0000-000000000201',
  'b0000000-0000-0000-0000-000000000001',
  'ACTIVE',
  'e0000000-0000-0000-0000-000000000003',
  '2026-01-15 10:30:00+07'
) ON CONFLICT (id) DO NOTHING;

-- Cho đối tượng hiện có (HS-2026-0001)
INSERT INTO scenario_assignments (
  id, subject_id, scenario_id, status, assigned_by_id, assigned_at
) SELECT
  'f0000000-0000-0000-0000-000000000202',
  s.id,
  'b0000000-0000-0000-0000-000000000001',
  'ACTIVE',
  'e0000000-0000-0000-0000-000000000003',
  '2026-01-20 09:00:00+07'
FROM subjects s WHERE s.code = 'HS-2026-0001'
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 7. FAMILY — Thông tin gia đình cho cả 2 đối tượng
-- =====================================================================
-- Test subject
INSERT INTO subject_families (
  id, subject_id,
  father_name, mother_name, spouse_name, dependents, family_notes
) VALUES (
  'fa000000-0000-0000-0000-000000000201',
  'd0000000-0000-0000-0000-000000000201',
  'Trần Văn Bình',
  'Nguyễn Thị Lan',
  'Lê Thị Hương',
  2,
  'Gia đình ổn định, vợ đang làm việc tại công ty may mặc.'
) ON CONFLICT ON CONSTRAINT subject_families_pkey DO NOTHING;

-- Existing subject (HS-2026-0001)
INSERT INTO subject_families (
  subject_id,
  father_name, mother_name, spouse_name, dependents, family_notes
)
SELECT
  s.id,
  'Võ Văn An',
  'Nguyễn Thị Mai',
  NULL,
  0,
  'Chưa lập gia đình.'
FROM subjects s WHERE s.code = 'HS-2026-0001'
  AND NOT EXISTS (SELECT 1 FROM subject_families sf WHERE sf.subject_id = s.id);

-- =====================================================================
-- 8. LEGAL — Thông tin pháp lý cho cả 2 đối tượng
-- =====================================================================
-- Test subject
INSERT INTO subject_legals (
  id, subject_id,
  decision_number, decision_date, management_type,
  start_date, end_date, issuing_authority, legal_notes
) VALUES (
  'ae000000-0000-0000-0000-000000000201',
  'd0000000-0000-0000-0000-000000000201',
  'QĐ-2025/CA-Q1-0042',
  '2025-12-20',
  'QUAN_CHE',
  '2026-01-01',
  '2027-01-01',
  'Công an Quận 1, TP.HCM',
  'Quản chế 12 tháng theo Điều 43 BLHS.'
) ON CONFLICT ON CONSTRAINT subject_legals_pkey DO NOTHING;

-- Existing subject (HS-2026-0001)
INSERT INTO subject_legals (
  subject_id,
  decision_number, decision_date, management_type,
  start_date, end_date, issuing_authority, legal_notes
)
SELECT
  s.id,
  'QĐ-2026/CA-Q1-0088',
  '2026-01-10',
  'GIAM_SAT',
  '2026-02-01',
  '2027-02-01',
  'Công an Quận 1, TP.HCM',
  'Giám sát 12 tháng.'
FROM subjects s WHERE s.code = 'HS-2026-0001'
  AND NOT EXISTS (SELECT 1 FROM subject_legals sl WHERE sl.subject_id = s.id);

-- =====================================================================
-- 9. DEVICES — Thiết bị cho cả 2 đối tượng
-- =====================================================================
-- === Test subject ===
-- Thiết bị cũ (đã thay thế)
INSERT INTO devices (
  id, subject_id, device_id, device_model, os_version,
  status, enrolled_at, replaced_at
) VALUES (
  'de000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000201',
  'android-old-device-001',
  'Samsung Galaxy A34',
  'Android 13',
  'REPLACED',
  '2026-01-15 10:30:00+07',
  '2026-02-20 09:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- Thiết bị hiện tại
INSERT INTO devices (
  id, subject_id, device_id, device_model, os_version,
  status, enrolled_at, replaced_at
) VALUES (
  'de000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000201',
  'android-current-device-002',
  'Samsung Galaxy A54',
  'Android 14',
  'ACTIVE',
  '2026-02-20 09:00:00+07',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- === Existing subject (HS-2026-0001) ===
INSERT INTO devices (
  id, subject_id, device_id, device_model, os_version,
  status, enrolled_at
)
SELECT
  'de000000-0000-0000-0000-000000000003',
  s.id,
  'android-khoi-device-001',
  'Samsung Galaxy S24',
  'Android 15',
  'ACTIVE',
  '2026-02-01 08:00:00+07'
FROM subjects s WHERE s.code = 'HS-2026-0001'
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 10. FILES/DOCUMENTS — Tài liệu cho cả 2 đối tượng
-- =====================================================================
-- === Test subject ===
INSERT INTO files (id, original_name, stored_path, mime_type, size, file_type, entity_type, entity_id, uploaded_by_id) VALUES
  ('af000000-0000-0000-0000-000000000001',
   'QD-2025-CA-Q1-0042.pdf',
   '/uploads/subjects/d0000000-0000-0000-0000-000000000201/qd-quan-che.pdf',
   'application/pdf', 524288, 'DOCUMENT', 'SUBJECT',
   'd0000000-0000-0000-0000-000000000201', 'e0000000-0000-0000-0000-000000000003'),
  ('af000000-0000-0000-0000-000000000002',
   'Ban-cam-ket-chap-hanh.pdf',
   '/uploads/subjects/d0000000-0000-0000-0000-000000000201/cam-ket.pdf',
   'application/pdf', 256000, 'DOCUMENT', 'SUBJECT',
   'd0000000-0000-0000-0000-000000000201', 'e0000000-0000-0000-0000-000000000003'),
  ('af000000-0000-0000-0000-000000000003',
   'anh-chan-dung.jpg',
   '/uploads/subjects/d0000000-0000-0000-0000-000000000201/chan-dung.jpg',
   'image/jpeg', 184320, 'PHOTO', 'SUBJECT',
   'd0000000-0000-0000-0000-000000000201', 'e0000000-0000-0000-0000-000000000003'),
  ('af000000-0000-0000-0000-000000000004',
   'anh-xac-minh-noi-cu-tru.jpg',
   '/uploads/subjects/d0000000-0000-0000-0000-000000000201/xac-minh.jpg',
   'image/jpeg', 245760, 'FIELD_PHOTO', 'SUBJECT',
   'd0000000-0000-0000-0000-000000000201', 'e0000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- === Existing subject (HS-2026-0001) ===
INSERT INTO files (id, original_name, stored_path, mime_type, size, file_type, entity_type, entity_id, uploaded_by_id)
SELECT
  'af000000-0000-0000-0000-000000000005',
  'QD-2026-CA-Q1-0088.pdf',
  '/uploads/subjects/' || s.id || '/qd-giam-sat.pdf',
  'application/pdf', 410000, 'DOCUMENT', 'SUBJECT',
  s.id, 'e0000000-0000-0000-0000-000000000003'
FROM subjects s WHERE s.code = 'HS-2026-0001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO files (id, original_name, stored_path, mime_type, size, file_type, entity_type, entity_id, uploaded_by_id)
SELECT
  'af000000-0000-0000-0000-000000000006',
  'anh-chan-dung-khoi.jpg',
  '/uploads/subjects/' || s.id || '/chan-dung.jpg',
  'image/jpeg', 198000, 'PHOTO', 'SUBJECT',
  s.id, 'e0000000-0000-0000-0000-000000000003'
FROM subjects s WHERE s.code = 'HS-2026-0001'
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 11. EVENTS — Lịch sử check-in cho test subject (15 events)
-- =====================================================================
INSERT INTO events (
  id, code, type, subject_id, scenario_id, result,
  gps_lat, gps_lng, gps_accuracy, in_geofence, geofence_distance,
  face_match_score, nfc_verified, nfc_cccd_match, liveness_score,
  device_id, device_info, client_timestamp, created_by_id, created_at
) VALUES
  -- 1: SUCCESS
  ('11000000-0201-0000-0000-000000000001', 'EV-20260120-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7731, 106.6980, 8.50, true, 50, 92.50, true, true, 95.30,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-01-20 08:15:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-01-20 08:15:00+07'),

  -- 2: SUCCESS
  ('11000000-0201-0000-0000-000000000002', 'EV-20260123-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7728, 106.6975, 6.20, true, 80, 94.10, true, true, 96.10,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-01-23 07:45:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-01-23 07:45:00+07'),

  -- 3: SUCCESS
  ('11000000-0201-0000-0000-000000000003', 'EV-20260126-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7735, 106.6982, 5.80, true, 30, 91.80, true, true, 94.50,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-01-26 09:30:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-01-26 09:30:00+07'),

  -- 4: CHECKIN_OVERDUE (WARNING)
  ('11000000-0201-0000-0000-000000000004', 'EV-20260129-T01', 'CHECKIN_OVERDUE',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'WARNING',
   10.7740, 106.6990, 12.10, true, 150, 89.30, true, true, 93.20,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-01-29 22:45:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-01-29 22:45:00+07'),

  -- 5: SUCCESS
  ('11000000-0201-0000-0000-000000000005', 'EV-20260201-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7733, 106.6978, 7.30, true, 60, 93.70, true, true, 97.00,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-01 08:00:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-01 08:00:00+07'),

  -- 6: SUCCESS
  ('11000000-0201-0000-0000-000000000006', 'EV-20260204-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7729, 106.6976, 9.00, true, 40, 95.20, true, true, 96.80,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-04 07:30:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-04 07:30:00+07'),

  -- 7: FACE_MISMATCH (FAILED)
  ('11000000-0201-0000-0000-000000000007', 'EV-20260207-T01', 'FACE_MISMATCH',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'FAILED',
   10.7732, 106.6981, 6.50, true, 55, 45.20, true, true, 88.50,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-07 08:20:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-07 08:20:00+07'),

  -- 8: SUCCESS
  ('11000000-0201-0000-0000-000000000008', 'EV-20260210-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7730, 106.6979, 7.80, true, 45, 92.00, true, true, 94.90,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-10 09:10:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-10 09:10:00+07'),

  -- 9: SUCCESS
  ('11000000-0201-0000-0000-000000000009', 'EV-20260213-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7734, 106.6983, 5.50, true, 35, 94.50, true, true, 97.20,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-13 07:55:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-13 07:55:00+07'),

  -- 10: GEOFENCE_VIOLATION (WARNING)
  ('11000000-0201-0000-0000-000000000010', 'EV-20260216-T01', 'GEOFENCE_VIOLATION',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'WARNING',
   10.7900, 106.7100, 15.00, false, 2500, 91.50, true, true, 95.00,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-16 08:30:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-16 08:30:00+07'),

  -- 11: SUCCESS
  ('11000000-0201-0000-0000-000000000011', 'EV-20260219-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7731, 106.6980, 4.20, true, 20, 96.00, true, true, 98.10,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-19 07:00:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-19 07:00:00+07'),

  -- 12: SUCCESS
  ('11000000-0201-0000-0000-000000000012', 'EV-20260222-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7727, 106.6974, 6.80, true, 70, 93.80, true, true, 96.50,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-22 08:15:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-22 08:15:00+07'),

  -- 13: NFC_FAIL (FAILED)
  ('11000000-0201-0000-0000-000000000013', 'EV-20260225-T01', 'NFC_FAIL',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'FAILED',
   10.7733, 106.6980, 8.00, true, 50, 94.00, false, false, 95.80,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-25 09:00:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-25 09:00:00+07'),

  -- 14: SUCCESS
  ('11000000-0201-0000-0000-000000000014', 'EV-20260228-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7730, 106.6978, 5.00, true, 25, 95.50, true, true, 97.80,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-02-28 07:20:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-02-28 07:20:00+07'),

  -- 15: SUCCESS (gần nhất)
  ('11000000-0201-0000-0000-000000000015', 'EV-20260303-T01', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'SUCCESS',
   10.7732, 106.6981, 4.50, true, 30, 96.20, true, true, 98.50,
   'android-current-device-002', '{"model":"Samsung Galaxy A54","os":"Android 14"}',
   '2026-03-03 07:30:00+07', 'e0000000-0000-0000-0000-000000000201', '2026-03-03 07:30:00+07')
ON CONFLICT (code) DO NOTHING;

-- Events cho existing subject (HS-2026-0001) - 5 events
INSERT INTO events (
  id, code, type, subject_id, scenario_id, result,
  gps_lat, gps_lng, gps_accuracy, in_geofence, geofence_distance,
  face_match_score, nfc_verified, nfc_cccd_match, liveness_score,
  device_id, device_info, client_timestamp, created_by_id, created_at
)
SELECT
  ('11000000-0202-0000-0000-00000000000' || n)::uuid,
  'EV-202603' || LPAD((n * 5)::text, 2, '0') || '-K01',
  'CHECKIN',
  s.id,
  'b0000000-0000-0000-0000-000000000001',
  'SUCCESS',
  10.7731 + (random() * 0.002 - 0.001),
  106.6980 + (random() * 0.002 - 0.001),
  5.0 + (random() * 5),
  true,
  (random() * 100)::int,
  90 + (random() * 8),
  true, true,
  95 + (random() * 4),
  'android-khoi-device-001',
  '{"model":"Samsung Galaxy S24","os":"Android 15"}',
  ('2026-03-' || LPAD((n * 5)::text, 2, '0') || ' 08:00:00+07')::timestamptz,
  s.user_account_id,
  ('2026-03-' || LPAD((n * 5)::text, 2, '0') || ' 08:00:00+07')::timestamptz
FROM subjects s, generate_series(1, 5) AS n
WHERE s.code = 'HS-2026-0001'
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 12. ALERTS — Cảnh báo cho test subject
-- =====================================================================
-- Alert từ Event 4: Quá hạn check-in (đã giải quyết)
INSERT INTO alerts (
  id, code, type, level, status, source,
  subject_id, trigger_event_id, alert_rule_id, scenario_id,
  resolved_at, created_at
) VALUES (
  '21000000-0201-0000-0000-000000000001',
  'AL-20260129-T01',
  'OVERDUE', 'TRUNG_BINH', 'RESOLVED', 'DEFAULT',
  'd0000000-0000-0000-0000-000000000201',
  '11000000-0201-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  '2026-01-30 10:00:00+07',
  '2026-01-29 22:50:00+07'
) ON CONFLICT (id) DO NOTHING;

-- Alert từ Event 7: Face mismatch (đã giải quyết)
INSERT INTO alerts (
  id, code, type, level, status, source,
  subject_id, trigger_event_id, alert_rule_id, scenario_id,
  resolved_at, created_at
) VALUES (
  '21000000-0201-0000-0000-000000000002',
  'AL-20260207-T01',
  'FACE_MISMATCH_STREAK', 'CAO', 'RESOLVED', 'DEFAULT',
  'd0000000-0000-0000-0000-000000000201',
  '11000000-0201-0000-0000-000000000007',
  'c0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000001',
  '2026-02-08 14:00:00+07',
  '2026-02-07 08:25:00+07'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- DONE — Verify
-- =====================================================================
SELECT '=== SEED COMPLETED ===' AS status;
SELECT 'Subjects: ' || COUNT(*) FROM subjects;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Scenarios: ' || COUNT(*) FROM management_scenarios;
SELECT 'Assignments: ' || COUNT(*) FROM scenario_assignments;
SELECT 'Geofences: ' || COUNT(*) FROM geofences;
SELECT 'Families: ' || COUNT(*) FROM subject_families;
SELECT 'Legals: ' || COUNT(*) FROM subject_legals;
SELECT 'Devices: ' || COUNT(*) FROM devices;
SELECT 'Files: ' || COUNT(*) FROM files;
SELECT 'Events: ' || COUNT(*) FROM events;
SELECT 'Alerts: ' || COUNT(*) FROM alerts;
SELECT '--- TEST ACCOUNT ---' AS info;
SELECT 'Username: 079200099001 | Password: Test@123' AS credentials;
SELECT 'Your account (HS-2026-0001) also has test data' AS note;
