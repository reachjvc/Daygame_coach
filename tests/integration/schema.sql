-- Test database schema for integration tests
-- Generated from src/db/trackingTypes.ts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Sessions
-- ============================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  goal INTEGER,
  goal_met BOOLEAN NOT NULL DEFAULT FALSE,
  total_approaches INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  primary_location TEXT,
  location_data JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  with_wingman BOOLEAN NOT NULL DEFAULT FALSE,
  wingman_name TEXT,
  session_focus TEXT,
  technique_focus TEXT,
  if_then_plan TEXT,
  custom_intention TEXT,
  pre_session_mood INTEGER CHECK (pre_session_mood >= 1 AND pre_session_mood <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_is_active ON sessions(user_id, is_active);

-- ============================================
-- Approaches
-- ============================================

CREATE TYPE approach_outcome AS ENUM ('blowout', 'short', 'good', 'number', 'instadate');
CREATE TYPE set_type AS ENUM (
  'solo', 'two_set', 'three_plus', 'mixed_group', 'mom_daughter',
  'sisters', 'tourist', 'moving', 'seated', 'working', 'gym',
  'foreign_language', 'celebrity_vibes', 'double_set', 'triple_set'
);

CREATE TABLE approaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome approach_outcome,
  set_type set_type,
  tags TEXT[],
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  note TEXT,
  voice_note_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approaches_user_id ON approaches(user_id);
CREATE INDEX idx_approaches_session_id ON approaches(session_id);
CREATE INDEX idx_approaches_timestamp ON approaches(user_id, timestamp);

-- ============================================
-- Field Report Templates
-- ============================================

CREATE TABLE field_report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_minutes INTEGER,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  base_template_id UUID REFERENCES field_report_templates(id),
  static_fields JSONB NOT NULL DEFAULT '[]',
  dynamic_fields JSONB NOT NULL DEFAULT '[]',
  active_dynamic_fields TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Field Reports
-- ============================================

CREATE TABLE field_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  template_id UUID REFERENCES field_report_templates(id),
  fields JSONB NOT NULL DEFAULT '{}',
  approach_count INTEGER,
  location TEXT,
  tags TEXT[],
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_field_reports_user_id ON field_reports(user_id);

-- ============================================
-- Review Templates
-- ============================================

CREATE TYPE review_type AS ENUM ('weekly', 'monthly', 'quarterly');

CREATE TABLE review_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_minutes INTEGER,
  review_type review_type NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  base_template_id UUID REFERENCES review_templates(id),
  static_fields JSONB NOT NULL DEFAULT '[]',
  dynamic_fields JSONB NOT NULL DEFAULT '[]',
  active_dynamic_fields TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Reviews
-- ============================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  review_type review_type NOT NULL,
  template_id UUID REFERENCES review_templates(id),
  fields JSONB NOT NULL DEFAULT '{}',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  previous_commitment TEXT,
  commitment_fulfilled BOOLEAN,
  new_commitment TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- ============================================
-- User Tracking Stats
-- ============================================

CREATE TABLE user_tracking_stats (
  user_id UUID PRIMARY KEY,
  total_approaches INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_numbers INTEGER NOT NULL DEFAULT 0,
  total_instadates INTEGER NOT NULL DEFAULT 0,
  total_field_reports INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_approach_date DATE,
  current_week TEXT,
  current_week_sessions INTEGER NOT NULL DEFAULT 0,
  current_week_approaches INTEGER NOT NULL DEFAULT 0,
  current_week_streak INTEGER NOT NULL DEFAULT 0,
  longest_week_streak INTEGER NOT NULL DEFAULT 0,
  last_active_week TEXT,
  unique_locations TEXT[] NOT NULL DEFAULT '{}',
  weekly_reviews_completed INTEGER NOT NULL DEFAULT 0,
  current_weekly_streak INTEGER NOT NULL DEFAULT 0,
  monthly_review_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  quarterly_review_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Milestones
-- ============================================

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  milestone_type TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, milestone_type)
);

CREATE INDEX idx_milestones_user_id ON milestones(user_id);

-- ============================================
-- Sticking Points
-- ============================================

CREATE TYPE sticking_point_status AS ENUM ('active', 'working_on', 'resolved');

CREATE TABLE sticking_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status sticking_point_status NOT NULL DEFAULT 'active',
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sticking_points_user_id ON sticking_points(user_id);
