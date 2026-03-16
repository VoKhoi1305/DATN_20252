-- ============================================================================
-- SMTTS — Biometric Database Migration: 002_smtts_biometric_init.sql
-- Database: smtts_biometric (PostgreSQL 15+)
-- Hoàn toàn tách biệt khỏi main DB (SBR-18)
-- AES-256 encryption at-rest
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 face_templates — Face Embedding
-- ----------------------------------------------------------------------------
CREATE TABLE face_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id        UUID          NOT NULL,
  embedding         BYTEA         NOT NULL,
  embedding_version VARCHAR(20)   NOT NULL,
  source_image_hash VARCHAR(64)   NOT NULL,
  quality_score     DECIMAL(5,2),
  enrolled_at       TIMESTAMPTZ   NOT NULL,
  re_enrolled_at    TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 1.2 nfc_records — NFC Hash
-- ----------------------------------------------------------------------------
CREATE TABLE nfc_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id        UUID          NOT NULL,
  cccd_chip_hash    VARCHAR(128)  NOT NULL,
  chip_serial       VARCHAR(100),
  passive_auth_data BYTEA,
  enrolled_at       TIMESTAMPTZ   NOT NULL,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 1.3 biometric_logs — Log match mỗi lần trình báo
-- ----------------------------------------------------------------------------
CREATE TABLE biometric_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id       UUID         NOT NULL,
  event_id         UUID         NOT NULL,
  face_match_score DECIMAL(5,2) NOT NULL,
  face_threshold   SMALLINT     NOT NULL,
  face_result      VARCHAR(20)  NOT NULL CHECK (face_result IN ('MATCH', 'MISMATCH', 'ERROR')),
  liveness_result  VARCHAR(20)  CHECK (liveness_result IN ('PASS', 'FAIL', 'SKIPPED')),
  nfc_result       VARCHAR(20)  NOT NULL CHECK (nfc_result IN ('VERIFIED', 'FAILED', 'MISMATCH')),
  match_duration_ms INTEGER,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE UNIQUE INDEX idx_face_subject  ON face_templates(subject_id) WHERE is_active = true;
CREATE UNIQUE INDEX idx_nfc_subject   ON nfc_records(subject_id)    WHERE is_active = true;
CREATE INDEX idx_bio_logs_subject     ON biometric_logs(subject_id, created_at DESC);
CREATE INDEX idx_bio_logs_event       ON biometric_logs(event_id);

-- ============================================================================
-- 3. TRIGGER: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_face_templates_updated_at
  BEFORE UPDATE ON face_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_nfc_records_updated_at
  BEFORE UPDATE ON nfc_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
