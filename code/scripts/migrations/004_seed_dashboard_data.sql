-- ============================================================================
-- SMTTS — Seed Data: 004_seed_dashboard_data.sql
-- Database: smtts_main
-- Purpose: Seed subjects, scenarios, events, alerts, cases for dashboard
-- ============================================================================

-- ============================================================================
-- 1. SUBJECTS — 8 đối tượng mẫu
-- ============================================================================
-- Areas (from 003):
--   a0...100 = Phường Bến Nghé (Q1)
--   a0...101 = Phường Bến Thành (Q1)
--   a0...102 = Phường 1 (Q3)
--   a0...103 = Phường 2 (Q3)
--   a0...104 = Phường 15 (Bình Thạnh)
--   a0...105 = Phường 22 (Bình Thạnh)
-- Officer (created_by): e0...003 = canbo.quanly.q1

INSERT INTO subjects (id, code, full_name, cccd_encrypted, cccd_hash, date_of_birth, gender, address, area_id, status, lifecycle, compliance_rate, enrollment_date, created_by_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'DT-001', 'Nguyễn Văn Hùng',
   'enc_079200001001', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d401',
   '1990-05-15', 'MALE', '12 Đồng Khởi, Phường Bến Nghé, Quận 1',
   'a0000000-0000-0000-0000-000000000100', 'ACTIVE', 'DANG_QUAN_LY', 95.0,
   NOW() - INTERVAL '60 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000002', 'DT-002', 'Trần Thị Mai',
   'enc_079200001002', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d402',
   '1988-11-22', 'FEMALE', '45 Lê Lợi, Phường Bến Thành, Quận 1',
   'a0000000-0000-0000-0000-000000000101', 'ACTIVE', 'DANG_QUAN_LY', 88.5,
   NOW() - INTERVAL '45 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000003', 'DT-003', 'Lê Văn Đức',
   'enc_079200001003', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d403',
   '1995-03-10', 'MALE', '78 Nguyễn Huệ, Phường Bến Nghé, Quận 1',
   'a0000000-0000-0000-0000-000000000100', 'ACTIVE', 'DANG_QUAN_LY', 92.0,
   NOW() - INTERVAL '90 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000004', 'DT-004', 'Phạm Thị Hoa',
   'enc_079200001004', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d404',
   '1992-08-05', 'FEMALE', '23 Võ Văn Tần, Phường 1, Quận 3',
   'a0000000-0000-0000-0000-000000000102', 'ACTIVE', 'DANG_QUAN_LY', 75.0,
   NOW() - INTERVAL '30 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000005', 'DT-005', 'Hoàng Văn Bình',
   'enc_079200001005', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d405',
   '1987-01-20', 'MALE', '56 Nguyễn Thị Minh Khai, Phường 2, Quận 3',
   'a0000000-0000-0000-0000-000000000103', 'ACTIVE', 'DANG_QUAN_LY', 100.0,
   NOW() - INTERVAL '120 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000006', 'DT-006', 'Đỗ Thị Lan',
   'enc_079200001006', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d406',
   '1993-06-18', 'FEMALE', '89 Xô Viết Nghệ Tĩnh, Phường 15, Bình Thạnh',
   'a0000000-0000-0000-0000-000000000104', 'ACTIVE', 'DANG_QUAN_LY', 82.5,
   NOW() - INTERVAL '75 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000007', 'DT-007', 'Vũ Văn Tâm',
   'enc_079200001007', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d407',
   '1991-12-03', 'MALE', '34 Điện Biên Phủ, Phường 22, Bình Thạnh',
   'a0000000-0000-0000-0000-000000000105', 'ACTIVE', 'DANG_QUAN_LY', 90.0,
   NOW() - INTERVAL '55 days', 'e0000000-0000-0000-0000-000000000003'),

  ('d0000000-0000-0000-0000-000000000008', 'DT-008', 'Ngô Thị Yến',
   'enc_079200001008', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d408',
   '1996-09-27', 'FEMALE', '67 Lý Chính Thắng, Phường 1, Quận 3',
   'a0000000-0000-0000-0000-000000000102', 'ENROLLED', 'ENROLLMENT', 97.5,
   NOW() - INTERVAL '10 days', 'e0000000-0000-0000-0000-000000000003');

-- ============================================================================
-- 2. MANAGEMENT SCENARIO — 1 kịch bản quản lý
-- ============================================================================

INSERT INTO management_scenarios (
  id, code, name, description, status, scope,
  checkin_frequency, checkin_window_start, checkin_window_end,
  grace_period_days, face_threshold, nfc_required, fallback_allowed,
  travel_approval_required, notification_config, auto_escalation_config,
  effective_from, created_by_id
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'KB-HCM-001',
  'Kịch bản quản lý TP.HCM',
  'Kịch bản quản lý chung cho các đối tượng khu vực TP.HCM',
  'ACTIVE',
  'PROVINCE',
  'DAILY',
  '06:00:00',
  '22:00:00',
  2,
  85,
  true,
  true,
  true,
  '{"channels": ["WEB", "PUSH"]}',
  '{"KHAN_CAP": true, "CAO": false, "TRUNG_BINH": false, "THAP": false}',
  CURRENT_DATE - INTERVAL '90 days',
  'e0000000-0000-0000-0000-000000000002'
);

-- ============================================================================
-- 3. ALERT RULES — 4 default rules cho kịch bản
-- ============================================================================

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
-- 4. SCENARIO ASSIGNMENTS — Gán 8 đối tượng vào kịch bản
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
-- 5. EVENTS — 20 sự kiện (spread over 7 days)
-- ============================================================================
-- Day 0 = today, Day 6 = 6 days ago
-- Types: CHECKIN, CHECKIN_OVERDUE, FACE_MISMATCH
-- Results: SUCCESS, FAILED, WARNING

INSERT INTO events (id, code, type, subject_id, scenario_id, result, gps_lat, gps_lng, face_match_score, nfc_verified, nfc_cccd_match, in_geofence, created_at) VALUES
  -- Day 6 (6 days ago) — 2 events, 100% compliance
  ('10000000-0000-0000-0000-000000000001', 'EV-20250309-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7769, 106.7009, 92.5, true, true, true,
   NOW() - INTERVAL '6 days' + INTERVAL '7 hours 45 minutes'),
  ('10000000-0000-0000-0000-000000000002', 'EV-20250309-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7750, 106.7020, 90.0, true, true, true,
   NOW() - INTERVAL '6 days' + INTERVAL '8 hours 30 minutes'),

  -- Day 5 (5 days ago) — 3 events, 2/3 = 66.7%
  ('10000000-0000-0000-0000-000000000003', 'EV-20250310-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.8050, 106.7100, 88.0, true, true, true,
   NOW() - INTERVAL '5 days' + INTERVAL '7 hours'),
  ('10000000-0000-0000-0000-000000000004', 'EV-20250310-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7760, 106.7015, 95.0, true, true, true,
   NOW() - INTERVAL '5 days' + INTERVAL '8 hours 20 minutes'),
  ('10000000-0000-0000-0000-000000000005', 'EV-20250310-003', 'CHECKIN_OVERDUE',
   'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', 10.8100, 106.7200, NULL, false, false, false,
   NOW() - INTERVAL '5 days' + INTERVAL '14 hours'),

  -- Day 4 (4 days ago) — 3 events, 100%
  ('10000000-0000-0000-0000-000000000006', 'EV-20250311-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7800, 106.6900, 91.0, true, true, true,
   NOW() - INTERVAL '4 days' + INTERVAL '7 hours 15 minutes'),
  ('10000000-0000-0000-0000-000000000007', 'EV-20250311-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.8100, 106.7200, 87.0, true, true, true,
   NOW() - INTERVAL '4 days' + INTERVAL '8 hours 45 minutes'),
  ('10000000-0000-0000-0000-000000000008', 'EV-20250311-003', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7740, 106.6980, 93.0, true, true, true,
   NOW() - INTERVAL '4 days' + INTERVAL '9 hours 30 minutes'),

  -- Day 3 (3 days ago) — 3 events, 2/3 = 66.7%
  ('10000000-0000-0000-0000-000000000009', 'EV-20250312-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7765, 106.7010, 94.0, true, true, true,
   NOW() - INTERVAL '3 days' + INTERVAL '7 hours 30 minutes'),
  ('10000000-0000-0000-0000-000000000010', 'EV-20250312-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7830, 106.6950, 89.5, true, true, true,
   NOW() - INTERVAL '3 days' + INTERVAL '8 hours'),
  ('10000000-0000-0000-0000-000000000011', 'EV-20250312-003', 'FACE_MISMATCH',
   'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', 10.7755, 106.7025, 42.0, true, true, true,
   NOW() - INTERVAL '3 days' + INTERVAL '10 hours'),

  -- Day 2 (2 days ago) — 3 events, 100%
  ('10000000-0000-0000-0000-000000000012', 'EV-20250313-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7742, 106.6985, 91.0, true, true, true,
   NOW() - INTERVAL '2 days' + INTERVAL '7 hours 20 minutes'),
  ('10000000-0000-0000-0000-000000000013', 'EV-20250313-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.8055, 106.7105, 86.0, true, true, true,
   NOW() - INTERVAL '2 days' + INTERVAL '9 hours 15 minutes'),
  ('10000000-0000-0000-0000-000000000014', 'EV-20250313-003', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7835, 106.6955, 90.0, true, true, true,
   NOW() - INTERVAL '2 days' + INTERVAL '10 hours'),

  -- Day 1 (yesterday) — 4 events, 3/4 = 75%
  ('10000000-0000-0000-0000-000000000015', 'EV-20250314-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7770, 106.7012, 96.0, true, true, true,
   NOW() - INTERVAL '1 day' + INTERVAL '7 hours 45 minutes'),
  ('10000000-0000-0000-0000-000000000016', 'EV-20250314-002', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7805, 106.6905, 92.0, true, true, true,
   NOW() - INTERVAL '1 day' + INTERVAL '8 hours 15 minutes'),
  ('10000000-0000-0000-0000-000000000017', 'EV-20250314-003', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7832, 106.6952, 88.0, true, true, true,
   NOW() - INTERVAL '1 day' + INTERVAL '9 hours'),
  ('10000000-0000-0000-0000-000000000018', 'EV-20250314-004', 'CHECKIN_OVERDUE',
   'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', NULL, NULL, NULL, false, false, false,
   NOW() - INTERVAL '1 day' + INTERVAL '23 hours'),

  -- Day 0 (today) — 2 events so far, 1/2 = 50%
  ('10000000-0000-0000-0000-000000000019', 'EV-20250315-001', 'CHECKIN',
   'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'SUCCESS', 10.7768, 106.7011, 97.0, true, true, true,
   NOW() - INTERVAL '2 hours'),
  ('10000000-0000-0000-0000-000000000020', 'EV-20250315-002', 'FACE_MISMATCH',
   'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'FAILED', 10.7831, 106.6953, 35.0, true, true, true,
   NOW() - INTERVAL '1 hour');

-- ============================================================================
-- 6. ALERTS — 8 cảnh báo (5 OPEN, 3 RESOLVED)
-- ============================================================================

INSERT INTO alerts (id, code, type, level, status, source, subject_id, trigger_event_id, alert_rule_id, scenario_id, created_at, resolved_at) VALUES
  -- OPEN alerts (5)
  ('20000000-0000-0000-0000-000000000001', 'AL-20250315-001', 'FACE_MISMATCH_STREAK', 'CAO', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000020',
   'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '30 minutes', NULL),

  ('20000000-0000-0000-0000-000000000002', 'AL-20250314-001', 'OVERDUE', 'TRUNG_BINH', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000018',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '1 day', NULL),

  ('20000000-0000-0000-0000-000000000003', 'AL-20250312-001', 'FACE_MISMATCH_STREAK', 'CAO', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000011',
   'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '3 days', NULL),

  ('20000000-0000-0000-0000-000000000004', 'AL-20250310-001', 'SEVERE_OVERDUE', 'KHAN_CAP', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '5 days', NULL),

  ('20000000-0000-0000-0000-000000000005', 'AL-20250314-002', 'OVERDUE', 'THAP', 'OPEN', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '1 day' + INTERVAL '2 hours', NULL),

  -- RESOLVED alerts (3)
  ('20000000-0000-0000-0000-000000000006', 'AL-20250309-001', 'OVERDUE', 'TRUNG_BINH', 'RESOLVED', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),

  ('20000000-0000-0000-0000-000000000007', 'AL-20250311-001', 'NFC_CCCD_MISMATCH', 'CAO', 'RESOLVED', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008',
   'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),

  ('20000000-0000-0000-0000-000000000008', 'AL-20250313-001', 'OVERDUE', 'THAP', 'RESOLVED', 'DEFAULT',
   'd0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 7. CASES — 4 vụ việc (2 OPEN, 2 CLOSED)
-- ============================================================================

INSERT INTO cases (id, code, subject_id, status, severity, source, description, escalated_from_alert_id, escalation_type, escalation_reason, assignee_id, created_by_id, created_by_name, closing_note, closed_by_id, closed_at, created_at) VALUES
  -- OPEN cases (2)
  ('30000000-0000-0000-0000-000000000001', 'CS-20250315-001',
   'd0000000-0000-0000-0000-000000000004', 'OPEN', 'CAO', 'AUTO',
   'Đối tượng Phạm Thị Hoa liên tục sai mặt khi check-in',
   '20000000-0000-0000-0000-000000000001', 'AUTO', 'Face mismatch streak >= 3',
   'e0000000-0000-0000-0000-000000000003', NULL, 'HỆ THỐNG',
   NULL, NULL, NULL,
   NOW() - INTERVAL '30 minutes'),

  ('30000000-0000-0000-0000-000000000002', 'CS-20250310-001',
   'd0000000-0000-0000-0000-000000000006', 'OPEN', 'KHAN_CAP', 'AUTO',
   'Đối tượng Đỗ Thị Lan quá hạn check-in nghiêm trọng (>5 ngày)',
   '20000000-0000-0000-0000-000000000004', 'AUTO', 'Severe overdue >= 5 days',
   'e0000000-0000-0000-0000-000000000003', NULL, 'HỆ THỐNG',
   NULL, NULL, NULL,
   NOW() - INTERVAL '5 days'),

  -- CLOSED cases (2)
  ('30000000-0000-0000-0000-000000000003', 'CS-20250309-001',
   'd0000000-0000-0000-0000-000000000001', 'CLOSED', 'TRUNG_BINH', 'MANUAL_NEW',
   'Kiểm tra quá hạn check-in đối tượng Nguyễn Văn Hùng',
   NULL, NULL, NULL,
   'e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Lê Văn Cơ Sở',
   'Đối tượng đã giải trình, lý do bệnh viện. Hồ sơ đã cập nhật.',
   'e0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days',
   NOW() - INTERVAL '6 days'),

  ('30000000-0000-0000-0000-000000000004', 'CS-20250311-001',
   'd0000000-0000-0000-0000-000000000002', 'CLOSED', 'CAO', 'MANUAL_ESCALATE',
   'NFC CCCD không khớp khi check-in của Trần Thị Mai',
   '20000000-0000-0000-0000-000000000007', 'MANUAL', 'Cán bộ phát hiện bất thường NFC',
   'e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'Trần Thị Quản Lý',
   'Đã xác minh trực tiếp. CCCD hợp lệ, lỗi do thiết bị NFC reader cũ.',
   'e0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '2 days',
   NOW() - INTERVAL '4 days');
