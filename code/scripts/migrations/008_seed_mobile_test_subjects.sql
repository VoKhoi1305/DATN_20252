-- =============================================
-- Seed: Test subjects for mobile activation
-- These subjects have proper SHA-256 cccd_hash values
-- and lifecycle = KHOI_TAO (ready for activation)
-- =============================================

-- Test subject 1: Ready for activation (KHOI_TAO, no user account)
-- CCCD: 079200099001 → SHA-256: 491ea3b633295d2c0988626a65414b28636ef77238a3ec912452a6e6d0c366b4
INSERT INTO subjects (id, code, full_name, cccd_encrypted, cccd_hash, date_of_birth, gender, address, area_id, status, lifecycle, created_by_id)
VALUES (
  'd0000000-0000-0000-0000-000000000101',
  'HS-2026-0001',
  'Trần Minh Tuấn',
  '079200099001',
  '491ea3b633295d2c0988626a65414b28636ef77238a3ec912452a6e6d0c366b4',
  '1995-06-15',
  'MALE',
  '100 Nguyễn Trãi, Quận 1',
  'a0000000-0000-0000-0000-000000000010',
  'ENROLLED',
  'KHOI_TAO',
  'e0000000-0000-0000-0000-000000000003'
) ON CONFLICT (code) DO NOTHING;

-- Test subject 2: Also ready for activation
-- CCCD: 079200099002 → SHA-256: 64a0c352e49a8edafe15b332381eefc85545d0cab58ea9c3223f4bb645cdfe36
INSERT INTO subjects (id, code, full_name, cccd_encrypted, cccd_hash, date_of_birth, gender, address, area_id, status, lifecycle, created_by_id)
VALUES (
  'd0000000-0000-0000-0000-000000000102',
  'HS-2026-0002',
  'Nguyễn Thị Hạnh',
  '079200099002',
  '64a0c352e49a8edafe15b332381eefc85545d0cab58ea9c3223f4bb645cdfe36',
  '1998-03-20',
  'FEMALE',
  '50 Lê Lợi, Quận 1',
  'a0000000-0000-0000-0000-000000000010',
  'ENROLLED',
  'KHOI_TAO',
  'e0000000-0000-0000-0000-000000000003'
) ON CONFLICT (code) DO NOTHING;
