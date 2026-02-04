-- Test database schema for integration tests
-- This schema mirrors the Supabase production schema.
-- IMPORTANT: Keep this in sync with Supabase migrations!
--
-- Last synced: 03-02-2026
-- Changelog:
-- - 03-02-2026: Added title column to field_reports table

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Profiles table (user data)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  has_purchased BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  primary_archetype TEXT,
  secondary_archetypes TEXT[],
  region TEXT,
  secondary_regions TEXT[],
  experience_level TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  difficulty TEXT,
  sandbox_settings JSONB,
  scenarios_completed INTEGER DEFAULT 0,
  subscription_cancelled_at TIMESTAMPTZ,
  -- Legacy preference fields
  age_range_start INTEGER,
  age_range_end INTEGER,
  archetype TEXT,
  secondary_archetype TEXT,
  tertiary_archetype TEXT,
  dating_foreigners BOOLEAN,
  user_is_foreign BOOLEAN,
  preferred_region TEXT,
  secondary_region TEXT,
  primary_goal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Purchases table
-- ============================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  product_id TEXT,
  amount INTEGER,
  currency TEXT,
  status TEXT NOT NULL,
  subscription_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);

-- ============================================
-- Scenarios table (practice history)
-- ============================================

CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_type TEXT,
  scenario_data JSONB,
  user_response TEXT,
  evaluation JSONB,
  xp_earned INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scenarios_user_id ON scenarios(user_id);

-- ============================================
-- Value comparisons table
-- Updated 02-02-2026: Schema aligned with valueComparisonRepo.ts
-- ============================================

CREATE TABLE value_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value_a_id TEXT NOT NULL,
  value_b_id TEXT NOT NULL,
  chosen_value_id TEXT NOT NULL,
  comparison_type TEXT NOT NULL CHECK (comparison_type IN ('pairwise', 'aspirational_vs_current')),
  round_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_value_comparisons_user_id ON value_comparisons(user_id);

-- ============================================
-- Inner game progress table
-- ============================================

CREATE TABLE inner_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  current_substep INTEGER NOT NULL DEFAULT 0,
  welcome_dismissed BOOLEAN NOT NULL DEFAULT false,
  -- Step completion flags
  values_completed BOOLEAN NOT NULL DEFAULT false,
  shadow_completed BOOLEAN NOT NULL DEFAULT false,
  peak_experience_completed BOOLEAN NOT NULL DEFAULT false,
  hurdles_completed BOOLEAN NOT NULL DEFAULT false,
  cutting_completed BOOLEAN NOT NULL DEFAULT false,
  -- Shadow step data
  shadow_response TEXT,
  shadow_inferred_values JSONB,
  -- Peak experience step data
  peak_experience_response TEXT,
  peak_experience_inferred_values JSONB,
  -- Hurdles step data
  hurdles_response TEXT,
  hurdles_inferred_values JSONB,
  -- Final results
  final_core_values JSONB,
  aspirational_values JSONB,
  -- Legacy fields (backward compatibility)
  step1_completed BOOLEAN DEFAULT false,
  step2_completed BOOLEAN DEFAULT false,
  step3_completed BOOLEAN DEFAULT false,
  deathbed_response TEXT,
  deathbed_inferred_values JSONB,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_inner_game_progress_user_id ON inner_game_progress(user_id);

-- ============================================
-- Sessions table
-- ============================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  goal INTEGER,
  goal_met BOOLEAN NOT NULL DEFAULT false,
  total_approaches INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  primary_location TEXT,
  location_data JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  with_wingman BOOLEAN NOT NULL DEFAULT false,
  wingman_name TEXT,
  -- Pre-session intentions
  session_focus TEXT,
  technique_focus TEXT,
  if_then_plan TEXT,
  custom_intention TEXT,
  pre_session_mood INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- ============================================
-- Approaches table
-- ============================================

CREATE TYPE approach_outcome AS ENUM ('blowout', 'short', 'good', 'number', 'instadate');

CREATE TABLE approaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome approach_outcome,
  set_type TEXT,
  tags TEXT[],
  mood INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  note TEXT,
  voice_note_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approaches_user_id ON approaches(user_id);
CREATE INDEX idx_approaches_session_id ON approaches(session_id);
CREATE INDEX idx_approaches_timestamp ON approaches(timestamp);

-- ============================================
-- Field report templates table
-- ============================================

CREATE TABLE field_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_minutes INTEGER,
  is_system BOOLEAN NOT NULL DEFAULT false,
  base_template_id UUID REFERENCES field_report_templates(id),
  static_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  dynamic_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  active_dynamic_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Field reports table
-- ============================================

CREATE TABLE field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  template_id UUID REFERENCES field_report_templates(id),
  system_template_slug TEXT,  -- For system templates (e.g., "quick-log")
  title TEXT,
  fields JSONB NOT NULL DEFAULT '{}'::JSONB,
  approach_count INTEGER,
  location TEXT,
  tags TEXT[],
  is_draft BOOLEAN NOT NULL DEFAULT false,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraint: can't have both template_id AND system_template_slug
  CONSTRAINT field_reports_template_check CHECK (
    NOT (template_id IS NOT NULL AND system_template_slug IS NOT NULL)
  )
);

CREATE INDEX idx_field_reports_user_id ON field_reports(user_id);
CREATE INDEX idx_field_reports_session_id ON field_reports(session_id);
CREATE INDEX idx_field_reports_system_template ON field_reports(system_template_slug)
  WHERE system_template_slug IS NOT NULL;

-- ============================================
-- Review templates table
-- ============================================

CREATE TYPE review_type AS ENUM ('weekly', 'monthly', 'quarterly');

CREATE TABLE review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_minutes INTEGER,
  review_type review_type NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  base_template_id UUID REFERENCES review_templates(id),
  static_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  dynamic_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  active_dynamic_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Reviews table
-- ============================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_type review_type NOT NULL,
  template_id UUID REFERENCES review_templates(id),
  fields JSONB NOT NULL DEFAULT '{}'::JSONB,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  previous_commitment TEXT,
  commitment_fulfilled BOOLEAN,
  new_commitment TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_review_type ON reviews(review_type);

-- ============================================
-- User tracking stats table
-- ============================================

CREATE TABLE user_tracking_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_approaches INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_numbers INTEGER NOT NULL DEFAULT 0,
  total_instadates INTEGER NOT NULL DEFAULT 0,
  total_field_reports INTEGER NOT NULL DEFAULT 0,
  -- Legacy daily streaks
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_approach_date DATE,
  -- Weekly activity tracking
  current_week TEXT,
  current_week_sessions INTEGER NOT NULL DEFAULT 0,
  current_week_approaches INTEGER NOT NULL DEFAULT 0,
  -- Weekly session streaks
  current_week_streak INTEGER NOT NULL DEFAULT 0,
  longest_week_streak INTEGER NOT NULL DEFAULT 0,
  last_active_week TEXT,
  -- Variety tracking
  unique_locations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Reviews
  weekly_reviews_completed INTEGER NOT NULL DEFAULT 0,
  current_weekly_streak INTEGER NOT NULL DEFAULT 0,
  monthly_review_unlocked BOOLEAN NOT NULL DEFAULT false,
  quarterly_review_unlocked BOOLEAN NOT NULL DEFAULT false,
  -- Favorite templates (max 3)
  favorite_template_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Milestones table
-- ============================================

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone_type)
);

CREATE INDEX idx_milestones_user_id ON milestones(user_id);

-- ============================================
-- Sticking points table
-- ============================================

CREATE TYPE sticking_point_status AS ENUM ('active', 'working_on', 'resolved');

CREATE TABLE sticking_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status sticking_point_status NOT NULL DEFAULT 'active',
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sticking_points_user_id ON sticking_points(user_id);

-- ============================================
-- Embeddings table (RAG training data)
-- Note: Using DOUBLE PRECISION[] instead of vector type for testcontainers
-- ============================================

CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  embedding DOUBLE PRECISION[] NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_source ON embeddings(source);

-- ============================================
-- Values table (reference data for inner game)
-- Added 02-02-2026 for valuesRepo tests
-- ============================================

CREATE TABLE values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- User values junction table
-- ============================================

CREATE TABLE user_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES values(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, value_id)
);

CREATE INDEX idx_user_values_user_id ON user_values(user_id);
