-- ============================================================================
-- 007 — Simplify areas to 2 levels + make geofence.area_id nullable
-- Vietnam administrative reform: remove WARD (Phường/Xã) level
-- ============================================================================

-- 1. Update subjects pointing to WARD areas → point to parent DISTRICT
UPDATE subjects s
SET area_id = a.parent_id
FROM areas a
WHERE s.area_id = a.id AND a.level = 'WARD' AND a.parent_id IS NOT NULL;

-- 2. Update users pointing to WARD areas → point to parent DISTRICT
UPDATE users u
SET area_id = a.parent_id, data_scope_level = 'DISTRICT'
FROM areas a
WHERE u.area_id = a.id AND a.level = 'WARD' AND a.parent_id IS NOT NULL;

-- 3. Update any users with WARD scope but no ward area → DISTRICT
UPDATE users SET data_scope_level = 'DISTRICT' WHERE data_scope_level = 'WARD';

-- 4. Deactivate WARD-level areas (soft disable, keep for audit trail)
UPDATE areas SET is_active = false WHERE level = 'WARD';

-- 5. Make geofences.area_id nullable (geofences are standalone, linked via scenarios)
ALTER TABLE geofences ALTER COLUMN area_id DROP NOT NULL;
