-- Migration 011: Add is_public column to files and FACE_PHOTO to file_type enum
-- For document visibility (public docs visible to subjects, private docs only for officers)
-- and storing CCCD face photos from enrollment

-- Add FACE_PHOTO to file_type enum
ALTER TYPE file_type ADD VALUE IF NOT EXISTS 'FACE_PHOTO';

-- Add is_public column (default false = officer-only)
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Add requests table for subject requests (device change, address change, etc.)
CREATE TABLE IF NOT EXISTS requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  UUID         NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  type        VARCHAR(50)  NOT NULL,  -- DEVICE_CHANGE, ADDRESS_CHANGE, SCHEDULE_CHANGE, OTHER
  reason      TEXT         NOT NULL,
  details     JSONB,
  status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  reviewed_by UUID         REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_subject_id ON requests(subject_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

-- Add notifications table if not exists (for mobile push)
-- (Already exists in 001 init, but adding index)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread
  ON notifications(user_id, is_read) WHERE is_read = false;
