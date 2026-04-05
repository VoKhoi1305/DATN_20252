-- Migration 012: Enrollment approval workflow
-- When a subject completes biometric enrollment, it enters DANG_CHO_PHE_DUYET
-- (Pending Officer Approval) instead of directly becoming DANG_QUAN_LY.
-- Officers in the matching area must review and approve/reject.
--
-- Area routing:
--   - DISTRICT scope officer: approves subjects whose area_id = officer.area_id
--   - PROVINCE scope officer: approves subjects in province + all child districts
--   - SYSTEM scope (IT_ADMIN): approves any subject regardless of area

-- 1. Add new lifecycle state
ALTER TYPE subject_lifecycle ADD VALUE IF NOT EXISTS 'DANG_CHO_PHE_DUYET';

-- 2. Enrollment submission tracking columns
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS submitted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_id  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_note   TEXT,
  ADD COLUMN IF NOT EXISTS rejection_note  TEXT;

-- 3. Index for fast pending-approval queries
CREATE INDEX IF NOT EXISTS idx_subjects_pending_approval
  ON subjects(area_id, submitted_at DESC)
  WHERE lifecycle = 'DANG_CHO_PHE_DUYET' AND deleted_at IS NULL;
