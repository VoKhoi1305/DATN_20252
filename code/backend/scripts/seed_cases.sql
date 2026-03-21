-- ========================================
-- CASES + CASE_NOTES
-- ========================================

-- CASE 1: AUTO từ DT-003 face mismatch 3 lần liên tiếp (alert AL-003)
INSERT INTO cases (id, code, subject_id, status, severity, source, description,
  escalated_from_alert_id, escalation_type, escalation_reason, escalation_rule_name,
  linked_event_ids, assignee_id, created_by_name, created_at) VALUES
  ('30000001-0000-0000-0000-000000000001', 'CS-20260303-001',
   'd1000000-0000-0000-0000-000000000003', 'OPEN', 'CAO', 'AUTO',
   'Phát hiện 3 lần liên tiếp khuôn mặt không khớp khi check-in (25/02, 28/02, 03/03). Nghi ngờ có người khác sử dụng thiết bị của đối tượng Lê Đức Anh.',
   '20000001-0000-0000-0000-000000000003', 'AUTO',
   'Cảnh báo FACE_MISMATCH_STREAK đạt mức CAO - 3 lần vi phạm trong 7 ngày',
   'AR-FACE-STREAK: Sai khuôn mặt liên tiếp',
   '["10000001-0003-0000-0000-000000000002","10000001-0003-0000-0000-000000000003","10000001-0003-0000-0000-000000000004"]',
   'e1000000-0000-0000-0000-000000000004', 'HỆ THỐNG', '2026-03-03 10:00:00+07');

-- CASE 2: AUTO từ DT-003 severe overdue (alert AL-005)
INSERT INTO cases (id, code, subject_id, status, severity, source, description,
  escalated_from_alert_id, escalation_type, escalation_reason, escalation_rule_name,
  linked_event_ids, assignee_id, created_by_name, created_at) VALUES
  ('30000001-0000-0000-0000-000000000002', 'CS-20260312-002',
   'd1000000-0000-0000-0000-000000000003', 'OPEN', 'KHAN_CAP', 'AUTO',
   'Đối tượng Lê Đức Anh không thực hiện check-in trong 72 giờ liên tiếp (từ 09/03 đến 12/03). Hệ thống tự động tạo vụ việc khẩn cấp.',
   '20000001-0000-0000-0000-000000000005', 'AUTO',
   'Cảnh báo SEVERE_OVERDUE đạt mức KHẨN CẤP - Không check-in >72h',
   'AR-SEVERE-OVERDUE: Quá hạn nghiêm trọng',
   '["10000001-0003-0000-0000-000000000007"]',
   'e1000000-0000-0000-0000-000000000004', 'HỆ THỐNG', '2026-03-12 06:05:00+07');

-- CASE 3: AUTO từ DT-005 severe overdue (alert AL-010)
INSERT INTO cases (id, code, subject_id, status, severity, source, description,
  escalated_from_alert_id, escalation_type, escalation_reason, escalation_rule_name,
  linked_event_ids, assignee_id, created_by_name, created_at) VALUES
  ('30000001-0000-0000-0000-000000000003', 'CS-20260301-003',
   'd1000000-0000-0000-0000-000000000005', 'CLOSED', 'KHAN_CAP', 'AUTO',
   'Đối tượng Hoàng Minh Tuấn không check-in quá 72 giờ. Đã xác minh đối tượng nằm viện tại BV Bạch Mai.',
   '20000001-0000-0000-0000-000000000010', 'AUTO',
   'Cảnh báo SEVERE_OVERDUE mức KHẨN CẤP',
   'AR-SEVERE-OVERDUE: Quá hạn nghiêm trọng',
   '["10000001-0005-0000-0000-000000000003"]',
   'e1000000-0000-0000-0000-000000000004', 'HỆ THỐNG', '2026-03-01 06:05:00+07');

-- Close case 3
UPDATE cases SET
  status = 'CLOSED',
  closing_note = 'Đã xác minh đối tượng Hoàng Minh Tuấn nằm viện tại BV Bạch Mai từ ngày 27/02 đến 03/03/2026. Có giấy xác nhận xuất viện. Đối tượng đã check-in trở lại ngày 04/03. Đóng vụ việc.',
  closed_by_id = 'e1000000-0000-0000-0000-000000000004',
  closed_at = '2026-03-04 14:00:00+07'
WHERE id = '30000001-0000-0000-0000-000000000003';

-- CASE 4: MANUAL_NEW từ DT-005 (cán bộ tạo thủ công)
INSERT INTO cases (id, code, subject_id, status, severity, source, description,
  linked_event_ids, assignee_id, created_by_id, created_by_name, created_at) VALUES
  ('30000001-0000-0000-0000-000000000004', 'CS-20260317-004',
   'd1000000-0000-0000-0000-000000000005', 'OPEN', 'TRUNG_BINH', 'MANUAL_NEW',
   'Nhận được phản ánh từ tổ dân phố số 5 về việc đối tượng Hoàng Minh Tuấn thường xuyên vắng nhà vào ban đêm sau 22h. Tạo vụ việc để xác minh và theo dõi.',
   '["10000001-0005-0000-0000-000000000007","10000001-0005-0000-0000-000000000008"]',
   'e1000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-17 09:00:00+07');

-- CASE 5: MANUAL_ESCALATE từ DT-007 (cán bộ leo thang alert face mismatch)
INSERT INTO cases (id, code, subject_id, status, severity, source, description,
  escalated_from_alert_id, escalation_type, escalation_reason,
  linked_event_ids, assignee_id, created_by_id, created_by_name, created_at) VALUES
  ('30000001-0000-0000-0000-000000000005', 'CS-20260310-005',
   'd1000000-0000-0000-0000-000000000007', 'CLOSED', 'CAO', 'MANUAL_ESCALATE',
   'Cán bộ Đặng Văn Minh leo thang cảnh báo sai khuôn mặt của đối tượng Bùi Văn Đạt. Cần xác minh danh tính trực tiếp.',
   '20000001-0000-0000-0000-000000000015', 'MANUAL',
   'Đối tượng có biểu hiện bất thường, cần xác minh trực tiếp tại phường',
   '["10000001-0007-0000-0000-000000000005"]',
   'e1000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-10 10:00:00+07');

-- Close case 5
UPDATE cases SET
  status = 'CLOSED',
  closing_note = 'Đã mời đối tượng Bùi Văn Đạt lên phường xác minh danh tính. Xác nhận đúng người, camera nhận diện sai do đối tượng mới cắt tóc và đeo kính. Đã cập nhật ảnh mới vào hệ thống.',
  closed_by_id = 'e1000000-0000-0000-0000-000000000004',
  closed_at = '2026-03-12 16:00:00+07'
WHERE id = '30000001-0000-0000-0000-000000000005';

-- Link case_id back to escalated alerts
UPDATE alerts SET case_id = '30000001-0000-0000-0000-000000000001' WHERE id = '20000001-0000-0000-0000-000000000003';
UPDATE alerts SET case_id = '30000001-0000-0000-0000-000000000002' WHERE id = '20000001-0000-0000-0000-000000000005';
UPDATE alerts SET case_id = '30000001-0000-0000-0000-000000000003' WHERE id = '20000001-0000-0000-0000-000000000010';
UPDATE alerts SET case_id = '30000001-0000-0000-0000-000000000005' WHERE id = '20000001-0000-0000-0000-000000000015';

-- ========================================
-- CASE NOTES
-- ========================================

-- Notes cho Case 1 (DT-003 face mismatch)
INSERT INTO case_notes (id, case_id, content, created_by_id, created_by_name, created_at) VALUES
  ('40000001-0000-0000-0000-000000000001', '30000001-0000-0000-0000-000000000001',
   'Kiểm tra log check-in cho thấy 3 lần liên tiếp khuôn mặt không khớp vào ngày 25/02, 28/02, 03/03. Điểm nhận diện lần lượt: 42.3, 38.7, 35.1 (ngưỡng yêu cầu: 85).',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-03 14:00:00+07'),
  ('40000001-0000-0000-0000-000000000002', '30000001-0000-0000-0000-000000000001',
   'Đã mời đối tượng Lê Đức Anh lên phường để xác minh danh tính trực tiếp. Đối tượng xác nhận là chính mình nhưng giải thích do bị sưng mặt sau khi nhổ răng khôn.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-05 10:30:00+07'),
  ('40000001-0000-0000-0000-000000000003', '30000001-0000-0000-0000-000000000001',
   'Đã yêu cầu đối tượng cập nhật lại ảnh nhận diện khuôn mặt. Chờ theo dõi kết quả check-in các lần tiếp theo.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-05 11:00:00+07');

-- Notes cho Case 2 (DT-003 severe overdue)
INSERT INTO case_notes (id, case_id, content, created_by_id, created_by_name, created_at) VALUES
  ('40000001-0000-0000-0000-000000000004', '30000001-0000-0000-0000-000000000002',
   'Đã kiểm tra hệ thống camera khu vực ngõ 15 Lê Thanh Nghị. Không phát hiện đối tượng trong 3 ngày qua.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-12 09:00:00+07'),
  ('40000001-0000-0000-0000-000000000005', '30000001-0000-0000-0000-000000000002',
   'Đã liên hệ đối tượng qua số 0978123456, không nhận được phản hồi. Cử cán bộ đến kiểm tra trực tiếp tại nhà.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-12 14:00:00+07'),
  ('40000001-0000-0000-0000-000000000006', '30000001-0000-0000-0000-000000000002',
   'Cán bộ đã đến kiểm tra tại Số 8, ngõ 15 Lê Thanh Nghị. Hàng xóm cho biết đối tượng đã đi đâu đó từ ngày 09/03. Báo cáo lãnh đạo.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-13 10:00:00+07'),
  ('40000001-0000-0000-0000-000000000007', '30000001-0000-0000-0000-000000000002',
   'Đối tượng đã quay về và check-in ngày 15/03. Giải trình đi thăm người thân ở Hải Dương mà không xin phép. Lãnh đạo yêu cầu tăng tần suất check-in lên 2 lần/ngày trong 2 tuần.',
   'e1000000-0000-0000-0000-000000000003', 'Trần Thị Hồng', '2026-03-15 15:00:00+07');

-- Notes cho Case 3 (DT-005 severe overdue - CLOSED)
INSERT INTO case_notes (id, case_id, content, created_by_id, created_by_name, created_at) VALUES
  ('40000001-0000-0000-0000-000000000008', '30000001-0000-0000-0000-000000000003',
   'Liên hệ gia đình đối tượng Hoàng Minh Tuấn. Vợ đối tượng xác nhận chồng đang nằm viện tại BV Bạch Mai từ ngày 27/02 do viêm ruột thừa cấp.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-01 10:00:00+07'),
  ('40000001-0000-0000-0000-000000000009', '30000001-0000-0000-0000-000000000003',
   'Đã nhận giấy xác nhận nằm viện từ BV Bạch Mai. Đối tượng xuất viện ngày 03/03. Đã check-in lại ngày 04/03.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-04 11:00:00+07');

-- Notes cho Case 4 (DT-005 manual new - vắng đêm)
INSERT INTO case_notes (id, case_id, content, created_by_id, created_by_name, created_at) VALUES
  ('40000001-0000-0000-0000-000000000010', '30000001-0000-0000-0000-000000000004',
   'Tổ trưởng tổ dân phố số 5 phản ánh: đối tượng Hoàng Minh Tuấn thường ra ngoài sau 23h và về nhà khoảng 4-5h sáng liên tục trong tuần 10-16/03.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-17 09:30:00+07'),
  ('40000001-0000-0000-0000-000000000011', '30000001-0000-0000-0000-000000000004',
   'Đã trao đổi trực tiếp với đối tượng. Đối tượng giải trình do đi làm ca đêm tại nhà hàng trên phố Bạch Mai. Yêu cầu cung cấp xác nhận từ chủ nhà hàng.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-18 14:00:00+07'),
  ('40000001-0000-0000-0000-000000000012', '30000001-0000-0000-0000-000000000004',
   'Đối tượng đã nộp giấy xác nhận làm việc ca đêm có xác nhận của chủ nhà hàng Phở Bách Khoa, phố Bạch Mai. Đề xuất điều chỉnh khung giờ check-in cho phù hợp với lịch làm việc.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-19 10:00:00+07');

-- Notes cho Case 5 (DT-007 manual escalate - CLOSED)
INSERT INTO case_notes (id, case_id, content, created_by_id, created_by_name, created_at) VALUES
  ('40000001-0000-0000-0000-000000000013', '30000001-0000-0000-0000-000000000005',
   'Mời đối tượng Bùi Văn Đạt lên phường xác minh danh tính. Đối tượng xác nhận là chính mình, do mới cắt tóc và đeo kính nên camera không nhận diện đúng.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-11 09:00:00+07'),
  ('40000001-0000-0000-0000-000000000014', '30000001-0000-0000-0000-000000000005',
   'Đã chụp lại ảnh nhận diện mới và cập nhật vào hệ thống. Đối tượng cam kết sẽ thông báo trước khi có thay đổi về ngoại hình đáng kể.',
   'e1000000-0000-0000-0000-000000000004', 'Đặng Văn Minh', '2026-03-12 14:00:00+07');
