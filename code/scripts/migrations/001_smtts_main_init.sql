-- ============================================================================
-- SMTTS — Main Database Migration: 001_smtts_main_init.sql
-- Subject Management, Tracking & Tracing System
-- Database: smtts_main (PostgreSQL 15+)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE area_level AS ENUM ('PROVINCE', 'DISTRICT', 'WARD');

CREATE TYPE user_role AS ENUM (
  'IT_ADMIN', 'LANH_DAO', 'CAN_BO_QUAN_LY', 'CAN_BO_CO_SO', 'SUBJECT'
);

CREATE TYPE user_status AS ENUM ('ACTIVE', 'LOCKED', 'DEACTIVATED');

CREATE TYPE data_scope_level AS ENUM ('WARD', 'DISTRICT', 'PROVINCE', 'SYSTEM');

CREATE TYPE subject_status AS ENUM (
  'ENROLLED', 'ACTIVE', 'SUSPENDED', 'REINTEGRATING', 'COMPLETED'
);

CREATE TYPE subject_lifecycle AS ENUM (
  'KHOI_TAO', 'ENROLLMENT', 'DANG_QUAN_LY', 'TAI_HOA_NHAP', 'KET_THUC'
);

CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE');

CREATE TYPE device_status AS ENUM ('ACTIVE', 'SUSPENDED', 'REPLACED');

CREATE TYPE geofence_type AS ENUM ('CIRCLE', 'POLYGON');

CREATE TYPE scenario_status AS ENUM (
  'DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'
);

CREATE TYPE alert_rule_source AS ENUM ('DEFAULT', 'CUSTOM');

CREATE TYPE alert_level AS ENUM ('THAP', 'TRUNG_BINH', 'CAO', 'KHAN_CAP');

CREATE TYPE event_result AS ENUM ('SUCCESS', 'FAILED', 'WARNING');

CREATE TYPE alert_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED');

CREATE TYPE alert_history_action AS ENUM (
  'CREATED', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED'
);

CREATE TYPE case_status AS ENUM ('OPEN', 'CLOSED');

CREATE TYPE case_source AS ENUM ('AUTO', 'MANUAL_ESCALATE', 'MANUAL_NEW');

CREATE TYPE escalation_type AS ENUM ('AUTO', 'MANUAL');

CREATE TYPE request_type AS ENUM (
  'TRAVEL', 'POSTPONE', 'CHANGE_DEVICE', 'CHANGE_ADDRESS'
);

CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE notification_channel AS ENUM ('WEB', 'PUSH', 'EMAIL', 'SMS');

CREATE TYPE file_type AS ENUM ('DOCUMENT', 'PHOTO', 'FIELD_PHOTO');

CREATE TYPE assignment_status AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 areas — Đơn vị hành chính (3 cấp)
-- ----------------------------------------------------------------------------
CREATE TABLE areas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  level       area_level   NOT NULL,
  parent_id   UUID         REFERENCES areas(id) ON DELETE RESTRICT,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.2 users — Tài khoản (cán bộ + đối tượng)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username           VARCHAR(100) NOT NULL UNIQUE,
  password_hash      VARCHAR(255) NOT NULL,
  full_name          VARCHAR(200) NOT NULL,
  email              VARCHAR(200),
  phone              VARCHAR(15),
  role               user_role    NOT NULL,
  area_id            UUID         REFERENCES areas(id) ON DELETE RESTRICT,
  data_scope_level   data_scope_level NOT NULL,
  otp_secret         VARCHAR(255),
  otp_enabled        BOOLEAN      NOT NULL DEFAULT false,
  backup_codes       JSONB,
  status             user_status  NOT NULL DEFAULT 'ACTIVE',
  last_login_at      TIMESTAMPTZ,
  failed_login_count SMALLINT     NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2.3 subjects — Hồ sơ đối tượng
-- ----------------------------------------------------------------------------
CREATE TABLE subjects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(30)    NOT NULL UNIQUE,
  user_account_id  UUID           UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  full_name        VARCHAR(200)   NOT NULL,
  cccd_encrypted   VARCHAR(500)   NOT NULL,
  cccd_hash        VARCHAR(64)    NOT NULL UNIQUE,
  date_of_birth    DATE           NOT NULL,
  gender           gender_type    NOT NULL,
  ethnicity        VARCHAR(50),
  address          TEXT           NOT NULL,
  permanent_address TEXT,
  phone            VARCHAR(15),
  photo_url        VARCHAR(500),
  area_id          UUID           NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  status           subject_status NOT NULL DEFAULT 'ENROLLED',
  lifecycle        subject_lifecycle NOT NULL DEFAULT 'KHOI_TAO',
  compliance_rate  DECIMAL(5,2)   CHECK (compliance_rate >= 0 AND compliance_rate <= 100),
  enrollment_date  TIMESTAMPTZ,
  custom_fields    JSONB          DEFAULT '{}',
  notes            TEXT,
  created_by_id    UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2.4 subject_families — Thông tin gia đình (1:1)
-- ----------------------------------------------------------------------------
CREATE TABLE subject_families (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id   UUID         NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE RESTRICT,
  father_name  VARCHAR(200),
  mother_name  VARCHAR(200),
  spouse_name  VARCHAR(200),
  dependents   SMALLINT     DEFAULT 0,
  family_notes TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.5 subject_legals — Thông tin pháp lý (1:1)
-- ----------------------------------------------------------------------------
CREATE TABLE subject_legals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id        UUID         NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE RESTRICT,
  decision_number   VARCHAR(100),
  decision_date     DATE,
  management_type   VARCHAR(50)  NOT NULL,
  start_date        DATE         NOT NULL,
  end_date          DATE,
  issuing_authority VARCHAR(300),
  legal_notes       TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.6 devices — Thiết bị đối tượng
-- ----------------------------------------------------------------------------
CREATE TABLE devices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id   UUID          NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  device_id    VARCHAR(200)  NOT NULL,
  device_model VARCHAR(200),
  os_version   VARCHAR(50),
  status       device_status NOT NULL DEFAULT 'ACTIVE',
  enrolled_at  TIMESTAMPTZ   NOT NULL,
  replaced_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.7 geofences — Vùng giám sát GPS
-- ----------------------------------------------------------------------------
CREATE TABLE geofences (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(30)   NOT NULL UNIQUE,
  name          VARCHAR(200)  NOT NULL,
  type          geofence_type NOT NULL,
  center_lat    DECIMAL(10,7),
  center_lng    DECIMAL(10,7),
  radius        INTEGER,
  coordinates   JSONB,
  area_id       UUID          NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_by_id UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2.8 management_scenarios — Kịch bản Quản lý
-- ----------------------------------------------------------------------------
CREATE TABLE management_scenarios (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                     VARCHAR(30)     NOT NULL UNIQUE,
  name                     VARCHAR(200)    NOT NULL,
  description              TEXT,
  status                   scenario_status NOT NULL DEFAULT 'DRAFT',
  version                  INTEGER         NOT NULL DEFAULT 1,
  parent_version_id        UUID            REFERENCES management_scenarios(id) ON DELETE RESTRICT,
  scope                    data_scope_level NOT NULL,
  checkin_frequency        VARCHAR(30)     NOT NULL,
  checkin_window_start     TIME            NOT NULL,
  checkin_window_end       TIME            NOT NULL,
  grace_period_days        SMALLINT        NOT NULL DEFAULT 2,
  face_threshold           SMALLINT        NOT NULL DEFAULT 85 CHECK (face_threshold >= 0 AND face_threshold <= 100),
  nfc_required             BOOLEAN         NOT NULL DEFAULT true,
  fallback_allowed         BOOLEAN         NOT NULL DEFAULT true,
  geofence_id              UUID            REFERENCES geofences(id) ON DELETE SET NULL,
  curfew_start             TIME,
  curfew_end               TIME,
  travel_approval_required BOOLEAN         NOT NULL DEFAULT true,
  travel_threshold_days    SMALLINT        DEFAULT 3,
  auto_transitions         JSONB           DEFAULT '[]',
  custom_field_definitions JSONB           DEFAULT '[]',
  notification_config      JSONB           NOT NULL DEFAULT '{}',
  auto_escalation_config   JSONB           NOT NULL DEFAULT '{"KHAN_CAP":true,"CAO":false,"TRUNG_BINH":false,"THAP":false}',
  effective_from           DATE,
  effective_to             DATE,
  created_by_id            UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by_id           UUID            REFERENCES users(id) ON DELETE RESTRICT,
  approved_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2.9 alert_rules — Quy tắc Alert (mặc định + tùy chỉnh)
-- ----------------------------------------------------------------------------
CREATE TABLE alert_rules (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id           UUID             NOT NULL REFERENCES management_scenarios(id) ON DELETE RESTRICT,
  code                  VARCHAR(50)      NOT NULL,
  name                  VARCHAR(200)     NOT NULL,
  source                alert_rule_source NOT NULL,
  event_type            VARCHAR(50)      NOT NULL,
  condition_operator    VARCHAR(10)      NOT NULL DEFAULT '>=',
  condition_value       INTEGER          NOT NULL DEFAULT 1,
  condition_window_days INTEGER,
  condition_extra       JSONB,
  alert_level           alert_level      NOT NULL,
  notification_channels JSONB            DEFAULT '["PUSH"]',
  is_editable           BOOLEAN          NOT NULL DEFAULT true,
  is_deletable          BOOLEAN          NOT NULL,
  is_active             BOOLEAN          NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.10 scenario_assignments — Gán kịch bản cho đối tượng
-- ----------------------------------------------------------------------------
CREATE TABLE scenario_assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id          UUID              NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  scenario_id         UUID              NOT NULL REFERENCES management_scenarios(id) ON DELETE RESTRICT,
  alert_rule_overrides JSONB,
  status              assignment_status NOT NULL DEFAULT 'ACTIVE',
  assigned_by_id      UUID              NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  unassigned_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Unique: one active assignment per subject per scenario
CREATE UNIQUE INDEX uq_sa_active ON scenario_assignments(subject_id, scenario_id)
  WHERE status = 'ACTIVE';

-- ----------------------------------------------------------------------------
-- 2.11 events — Sự kiện (immutable, append-only)
-- ----------------------------------------------------------------------------
CREATE TABLE events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(30)   NOT NULL UNIQUE,
  type             VARCHAR(50)   NOT NULL,
  subject_id       UUID          NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  scenario_id      UUID          REFERENCES management_scenarios(id) ON DELETE RESTRICT,
  result           event_result  NOT NULL,
  gps_lat          DECIMAL(10,7),
  gps_lng          DECIMAL(10,7),
  gps_accuracy     DECIMAL(8,2),
  in_geofence      BOOLEAN,
  geofence_distance INTEGER,
  face_match_score DECIMAL(5,2),
  nfc_verified     BOOLEAN,
  nfc_cccd_match   BOOLEAN,
  liveness_score   DECIMAL(5,2),
  face_image_url   VARCHAR(500),
  device_id        VARCHAR(200),
  device_info      JSONB,
  is_voluntary     BOOLEAN       NOT NULL DEFAULT false,
  extra_data       JSONB,
  client_timestamp TIMESTAMPTZ,
  created_by_id    UUID          REFERENCES users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- NO updated_at, NO deleted_at — immutable log
);

-- ----------------------------------------------------------------------------
-- 2.12 alerts — Cảnh báo
-- ----------------------------------------------------------------------------
CREATE TABLE alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(30)   NOT NULL UNIQUE,
  type             VARCHAR(50)   NOT NULL,
  level            alert_level   NOT NULL,
  status           alert_status  NOT NULL DEFAULT 'OPEN',
  source           alert_rule_source NOT NULL,
  subject_id       UUID          NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  trigger_event_id UUID          NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  alert_rule_id    UUID          NOT NULL REFERENCES alert_rules(id) ON DELETE RESTRICT,
  scenario_id      UUID          NOT NULL REFERENCES management_scenarios(id) ON DELETE RESTRICT,
  case_id          UUID,  -- FK added after cases table created
  resolved_at      TIMESTAMPTZ,
  escalated_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.13 alert_histories — Lịch sử xử lý Alert (immutable)
-- ----------------------------------------------------------------------------
CREATE TABLE alert_histories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id     UUID                 NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
  action       alert_history_action NOT NULL,
  user_id      UUID                 REFERENCES users(id) ON DELETE RESTRICT,
  performed_by VARCHAR(100)         NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW()
  -- NO updated_at, NO deleted_at — immutable
);

-- ----------------------------------------------------------------------------
-- 2.14 cases — Vụ việc
-- ----------------------------------------------------------------------------
CREATE TABLE cases (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                     VARCHAR(30)    NOT NULL UNIQUE,
  subject_id               UUID           NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  status                   case_status    NOT NULL DEFAULT 'OPEN',
  severity                 alert_level    NOT NULL,
  source                   case_source    NOT NULL,
  description              TEXT,
  escalated_from_alert_id  UUID           REFERENCES alerts(id) ON DELETE RESTRICT,
  escalation_type          escalation_type,
  escalation_reason        TEXT,
  escalation_rule_name     VARCHAR(200),
  linked_event_ids         JSONB          DEFAULT '[]',
  assignee_id              UUID           REFERENCES users(id) ON DELETE RESTRICT,
  created_by_id            UUID           REFERENCES users(id) ON DELETE RESTRICT,
  created_by_name          VARCHAR(100)   NOT NULL,
  closing_note             TEXT,
  closed_by_id             UUID           REFERENCES users(id) ON DELETE RESTRICT,
  closed_at                TIMESTAMPTZ,
  related_case_id          UUID           REFERENCES cases(id) ON DELETE RESTRICT,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Add deferred FK from alerts to cases
ALTER TABLE alerts ADD CONSTRAINT fk_alerts_case
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE RESTRICT;

-- ----------------------------------------------------------------------------
-- 2.15 case_notes — Ghi chú vụ việc (immutable thread)
-- ----------------------------------------------------------------------------
CREATE TABLE case_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id         UUID    NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  content         TEXT    NOT NULL,
  author_id       UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  photos          JSONB   DEFAULT '[]',
  is_closing_note BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at, NO deleted_at — immutable
);

-- ----------------------------------------------------------------------------
-- 2.16 requests — Yêu cầu xin phép
-- ----------------------------------------------------------------------------
CREATE TABLE requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           VARCHAR(30)    NOT NULL UNIQUE,
  subject_id     UUID           NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  type           request_type   NOT NULL,
  status         request_status NOT NULL DEFAULT 'PENDING',
  reason         TEXT           NOT NULL,
  details        JSONB          NOT NULL,
  reviewed_by_id UUID           REFERENCES users(id) ON DELETE RESTRICT,
  review_note    TEXT,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.17 notifications — Thông báo
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type        VARCHAR(50)          NOT NULL,
  title       VARCHAR(300)         NOT NULL,
  message     TEXT                 NOT NULL,
  entity_type VARCHAR(30),
  entity_id   UUID,
  link        VARCHAR(500),
  channel     notification_channel NOT NULL DEFAULT 'WEB',
  is_read     BOOLEAN              NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.18 files — File upload
-- ----------------------------------------------------------------------------
CREATE TABLE files (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name  VARCHAR(500) NOT NULL,
  stored_path    VARCHAR(500) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  size           INTEGER      NOT NULL CHECK (size <= 10485760),
  file_type      file_type    NOT NULL,
  entity_type    VARCHAR(30)  NOT NULL,
  entity_id      UUID         NOT NULL,
  gps_lat        DECIMAL(10,7),
  gps_lng        DECIMAL(10,7),
  captured_at    TIMESTAMPTZ,
  uploaded_by_id UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2.19 audit_logs — Nhật ký hệ thống (append-only, SBR-17)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_name   VARCHAR(200) NOT NULL,
  user_role   VARCHAR(30)  NOT NULL,
  action      VARCHAR(50)  NOT NULL,
  target_type VARCHAR(30)  NOT NULL,
  target_id   UUID,
  target_name VARCHAR(200),
  details     JSONB,
  ip_address  VARCHAR(45),
  user_agent  VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- NO updated_at, NO deleted_at — append-only
);

-- ----------------------------------------------------------------------------
-- 2.20 configs — Cấu hình hệ thống
-- ----------------------------------------------------------------------------
CREATE TABLE configs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key           VARCHAR(100) NOT NULL UNIQUE,
  value         JSONB        NOT NULL,
  category      VARCHAR(50)  NOT NULL,
  description   TEXT,
  updated_by_id UUID         REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2.21 refresh_tokens — JWT Refresh Tokens
-- ----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  revoked    BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- areas
CREATE INDEX idx_areas_parent ON areas(parent_id);
CREATE INDEX idx_areas_level  ON areas(level);

-- users
CREATE INDEX idx_users_role   ON users(role)   WHERE deleted_at IS NULL;
CREATE INDEX idx_users_area   ON users(area_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- subjects
CREATE INDEX idx_subjects_area       ON subjects(area_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_status     ON subjects(status)        WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_cccd_hash  ON subjects(cccd_hash)     WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_code       ON subjects(code)          WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_full_name  ON subjects USING GIN(to_tsvector('simple', full_name));
CREATE INDEX idx_subjects_created_by ON subjects(created_by_id);

-- events (read-heavy)
CREATE INDEX idx_events_subject         ON events(subject_id);
CREATE INDEX idx_events_type            ON events(type);
CREATE INDEX idx_events_created_at      ON events(created_at DESC);
CREATE INDEX idx_events_subject_created ON events(subject_id, created_at DESC);
CREATE INDEX idx_events_scenario        ON events(scenario_id);
CREATE INDEX idx_events_result          ON events(result);

-- alerts
CREATE INDEX idx_alerts_subject      ON alerts(subject_id);
CREATE INDEX idx_alerts_status       ON alerts(status);
CREATE INDEX idx_alerts_level        ON alerts(level);
CREATE INDEX idx_alerts_status_level ON alerts(status, level);
CREATE INDEX idx_alerts_created_at   ON alerts(created_at DESC);
CREATE INDEX idx_alerts_scenario     ON alerts(scenario_id);

-- cases
CREATE INDEX idx_cases_subject    ON cases(subject_id);
CREATE INDEX idx_cases_status     ON cases(status);
CREATE INDEX idx_cases_severity   ON cases(severity);
CREATE INDEX idx_cases_assignee   ON cases(assignee_id);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

-- case_notes
CREATE INDEX idx_case_notes_case ON case_notes(case_id, created_at ASC);

-- scenario_assignments
CREATE INDEX idx_sa_subject  ON scenario_assignments(subject_id);
CREATE INDEX idx_sa_scenario ON scenario_assignments(scenario_id);
CREATE INDEX idx_sa_active   ON scenario_assignments(subject_id, status) WHERE status = 'ACTIVE';

-- requests
CREATE INDEX idx_requests_subject    ON requests(subject_id);
CREATE INDEX idx_requests_status     ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);

-- notifications
CREATE INDEX idx_notif_user   ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(user_id) WHERE is_read = false;

-- audit_logs
CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_action  ON audit_logs(action);
CREATE INDEX idx_audit_target  ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- files
CREATE INDEX idx_files_entity ON files(entity_type, entity_id);

-- refresh_tokens
CREATE INDEX idx_rt_user    ON refresh_tokens(user_id);
CREATE INDEX idx_rt_expires ON refresh_tokens(expires_at) WHERE revoked = false;

-- ============================================================================
-- 4. TRIGGER: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'areas', 'users', 'subjects', 'subject_families', 'subject_legals',
      'devices', 'geofences', 'management_scenarios', 'alert_rules',
      'scenario_assignments', 'alerts', 'requests', 'configs'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
