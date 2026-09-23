-- Test database schema for integration tests
-- This schema mirrors the Supabase production schema.
-- IMPORTANT: Keep this in sync with Supabase migrations!
--
-- Last synced: 18-09-2026
-- Changelog:
-- - 18-09-2026: profiles.timezone_source added with its CHECK, and
--   profiles.timezone gained the NOT NULL DEFAULT 'UTC' production has had
--   since 20260828100000 (20260917110000_timezone_source.sql).
-- - 28-08-2026: sessions.end_reason added; user_tracking_stats gained
--   week_start_date / last_active_week_start / last_review_week_start /
--   current_week_field_reports and lost the ISO-week label columns, matching
--   what production now has.
-- - 28-08-2026: approaches.session_id is ON DELETE CASCADE, as production has
--   always had it — this file said SET NULL.
-- - 28-08-2026: display_category CHECK gained 'scenarios' — the code enum and the
--   real database both had it, only this file did not, and enumConstraintSync
--   had been failing on that drift.
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
  -- From 20260907100000. The engine reads these to prescribe a weight the
  -- person's gym can actually load.
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  bar_weight_kg NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (bar_weight_kg >= 0 AND bar_weight_kg <= 50),
  smallest_plate_kg NUMERIC(5,2) NOT NULL DEFAULT 1.25
    CHECK (smallest_plate_kg >= 0.25 AND smallest_plate_kg <= 25),
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
  -- NOT NULL DEFAULT 'UTC' in production since 20260828100000_timezone_not_null;
  -- this file had a bare nullable TEXT, so a test could see a null the app can
  -- never get.
  timezone TEXT NOT NULL DEFAULT 'UTC',
  -- Where that zone came from. 'signup_default' means nobody has said, which is
  -- NOT the same as somebody choosing UTC. See 20260917110000_timezone_source.
  timezone_source TEXT NOT NULL DEFAULT 'signup_default'
    CHECK (timezone_source IN ('signup_default', 'detected', 'chosen')),
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
  -- How the session finished. Only 'completed' sessions count towards totals
  -- and badges; 'abandoned' ones are the ones replaced by starting a new one.
  end_reason TEXT CHECK (end_reason IN ('completed', 'abandoned')),
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
  -- CASCADE, matching production: deleting a session really does delete the
  -- approaches inside it. This file said SET NULL, so no test could exercise
  -- what the live app actually does when a session is deleted.
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome approach_outcome,
  set_type TEXT,
  tags TEXT[],
  mood INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  note TEXT,
  voice_note_url TEXT,
  quality INTEGER CHECK (quality >= 1 AND quality <= 10),
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
  -- THE PERIOD EACH COUNTER BELONGS TO. Monday dates in the user's timezone.
  -- The ISO-week label columns these replaced (current_week, last_active_week,
  -- last_session_week) were dropped from production on 28-08-2026.
  week_start_date DATE,
  current_week_sessions INTEGER NOT NULL DEFAULT 0,
  current_week_approaches INTEGER NOT NULL DEFAULT 0,
  current_week_numbers INTEGER NOT NULL DEFAULT 0,
  current_week_instadates INTEGER NOT NULL DEFAULT 0,
  current_week_field_reports INTEGER NOT NULL DEFAULT 0,
  -- Weekly session streaks
  current_week_streak INTEGER NOT NULL DEFAULT 0,
  longest_week_streak INTEGER NOT NULL DEFAULT 0,
  last_active_week_start DATE,
  last_review_week_start DATE,
  -- Variety tracking
  unique_locations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Reviews
  weekly_reviews_completed INTEGER NOT NULL DEFAULT 0,
  current_weekly_streak INTEGER NOT NULL DEFAULT 0,
  monthly_review_unlocked BOOLEAN NOT NULL DEFAULT false,
  quarterly_review_unlocked BOOLEAN NOT NULL DEFAULT false,
  -- Favorite templates (max 3)
  favorite_template_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone_type)
);

CREATE INDEX idx_milestones_user_id ON milestones(user_id);
CREATE INDEX idx_milestones_session_id ON milestones(session_id);

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
-- User goals table (goal tracking)
-- Added 15-02-2026 for goalRepo integration tests
-- ============================================

CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  tracking_type TEXT NOT NULL DEFAULT 'counter' CHECK (tracking_type IN ('counter', 'boolean')),
  period TEXT NOT NULL DEFAULT 'weekly' CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  period_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  custom_end_date DATE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  -- Mirrors the production `linked_metric` enum (src/db/goalEnums.ts LINKED_METRICS,
  -- migration 20260306_expand_goal_enum_constraints). Keep in sync when adding metrics.
  linked_metric TEXT CHECK (linked_metric IS NULL OR linked_metric IN ('approaches_weekly', 'sessions_weekly', 'numbers_weekly', 'instadates_weekly', 'field_reports_weekly', 'approaches_cumulative', 'sessions_cumulative', 'numbers_cumulative', 'instadates_cumulative', 'field_reports_cumulative', 'approach_quality_avg_weekly', 'high_quality_approaches_weekly', 'high_quality_approaches_cumulative', 'scenario_sessions_cumulative', 'scenario_types_cumulative', 'scenario_high_scores_cumulative', 'body_weight_current', 'sleep_hours_avg_weekly', 'gym_sessions_weekly', 'gym_sessions_cumulative', 'nutrition_quality_avg_weekly', 'cardio_sessions_weekly', 'training_hours_cumulative', 'consecutive_training_weeks', 'bench_press_1rm', 'squat_1rm', 'deadlift_1rm', 'overhead_press_1rm', 'pullups_max_reps', 'progress_photos_cumulative', 'protein_days_hit_weekly', 'calorie_days_hit_weekly', 'weight_lost_from_peak', 'weight_gained_from_lowest', 'body_measurements_count', 'mobility_sessions_weekly', 'yoga_sessions_weekly', 'flexibility_hours_cumulative', 'running_sessions_weekly', 'running_distance_cumulative', 'longest_run_km', 'consecutive_cardio_weeks')),
  position INTEGER NOT NULL DEFAULT 0,
  life_area TEXT NOT NULL DEFAULT 'custom',
  parent_goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE,
  target_date DATE,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'recurring' CHECK (goal_type IN ('recurring', 'milestone', 'habit_ramp')),
  goal_nature TEXT CHECK (goal_nature IS NULL OR goal_nature IN ('input', 'outcome')),
  display_category TEXT CHECK (display_category IS NULL OR display_category IN ('field_work', 'results', 'dirty_dog', 'texting', 'dates', 'relationship', 'scenarios', 'mindfulness', 'resilience', 'learning', 'reflection', 'discipline', 'strength', 'training', 'nutrition', 'body_comp', 'flexibility', 'endurance', 'income', 'saving', 'investing', 'career_growth', 'entrepreneurship', 'porn_freedom', 'digital_discipline', 'substance_control', 'self_control')),
  goal_level INTEGER,
  template_id TEXT,
  milestone_config JSONB,
  ramp_steps JSONB,
  motivation_note TEXT,
  streak_freezes_available INTEGER NOT NULL DEFAULT 0,
  streak_freezes_used INTEGER NOT NULL DEFAULT 0,
  last_freeze_date DATE,
  goal_phase TEXT CHECK (goal_phase IS NULL OR goal_phase IN ('acquisition', 'consolidation', 'graduated')),
  -- A goal NOT to do. Migration 20260920100000. Daily and yes-or-no like any
  -- standing rule, but rewarded by days accumulated rather than by a streak.
  is_abstinence BOOLEAN NOT NULL DEFAULT FALSE,
  -- The named steps a staged goal is reached by. Migration 20260920110000.
  stages TEXT[],
  -- Drift this file already carried: production has had aligned_values since
  -- the values work and this mirror never gained it, so any integration test
  -- that wrote one would have failed against a column that does exist.
  aligned_values TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_parent ON user_goals(parent_goal_id);
CREATE INDEX idx_user_goals_template ON user_goals(template_id);

-- Duplicate prevention: partial unique indexes (active goals only)
CREATE UNIQUE INDEX uq_user_goals_template
  ON user_goals (user_id, template_id)
  WHERE template_id IS NOT NULL AND is_archived = false;
CREATE UNIQUE INDEX uq_user_goals_linked_metric
  ON user_goals (user_id, linked_metric)
  WHERE linked_metric IS NOT NULL AND is_archived = false;

-- ============================================
-- Daily goal snapshots (heatmap + weekly review)
-- Added 21-02-2026 for Phase 6 daily experience
-- ============================================

CREATE TABLE daily_goal_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  current_value INTEGER NOT NULL,
  target_value INTEGER NOT NULL,
  was_complete BOOLEAN NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON daily_goal_snapshots(user_id, snapshot_date);

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

-- ============================================
-- Beta invite flow tables + claim function
-- Mirrors supabase/migrations/20260709_create_beta_tables.sql with two
-- test-container adaptations:
--   1. beta_testers.user_id references profiles(id) (no auth.users here)
--   2. auth.uid() is stubbed to read the 'test.uid' session setting
-- RLS + a non-owner `authenticated` role are modeled so the security
-- property (membership is NOT self-grantable) is actually exercised.
-- ============================================

CREATE SCHEMA IF NOT EXISTS auth;

-- Stub of Supabase's auth.uid(): tests set the caller via
-- SELECT set_config('test.uid', '<uuid>', false)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('test.uid', true), '')::uuid
$$ LANGUAGE sql STABLE;

CREATE TABLE beta_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  max_uses INT NOT NULL DEFAULT 60,
  use_count INT NOT NULL DEFAULT 0 CHECK (use_count >= 0 AND use_count <= max_uses),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE beta_invites ENABLE ROW LEVEL SECURITY;
-- NO policies (service role / definer function only)

CREATE TABLE beta_testers (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  invite_id UUID NOT NULL REFERENCES beta_invites(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beta_testers_select_own" ON beta_testers
  FOR SELECT USING (auth.uid() = user_id);
-- NO insert/update/delete policies (system-granted)

CREATE TABLE waitlist_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('beta_full', 'premium_teaser')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, source)
);
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;
-- NO policies (service role inserts only)

CREATE OR REPLACE FUNCTION claim_beta_slot(p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_invite beta_invites%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'invalid'; END IF;
  SELECT * INTO v_invite FROM beta_invites
    WHERE code = p_code AND active
    FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF EXISTS (SELECT 1 FROM beta_testers WHERE user_id = auth.uid())
    THEN RETURN 'already_member'; END IF;
  IF v_invite.use_count >= v_invite.max_uses THEN RETURN 'full'; END IF;
  UPDATE beta_invites SET use_count = use_count + 1 WHERE id = v_invite.id;
  INSERT INTO beta_testers (user_id, invite_id) VALUES (auth.uid(), v_invite.id);
  RETURN 'granted';
END $$;

-- Non-owner role mirroring Supabase's `authenticated` (table owner bypasses
-- RLS, so denial tests must run under this role via SET ROLE)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT SELECT ON beta_testers TO authenticated;
REVOKE EXECUTE ON FUNCTION claim_beta_slot(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION claim_beta_slot(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- ============================================
-- Life answers (the one thing, and the dated written answers to follow it)
-- Added 2026-08-27. Append-only: no UPDATE policy, and a trigger that binds
-- the service role too.
-- ============================================

CREATE TABLE life_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answer_key TEXT NOT NULL CHECK (answer_key IN ('one_thing')),
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX life_answers_current_idx ON life_answers (user_id, answer_key, answered_at DESC);

CREATE OR REPLACE FUNCTION life_answers_reject_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'life_answers is append-only: delete the row and write a new one (attempted update on %)', old.id
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER life_answers_no_update BEFORE UPDATE ON life_answers
  FOR EACH ROW EXECUTE FUNCTION life_answers_reject_update();

-- Row rules, from 20260827000000_create_life_answers.sql:59-69. Without these
-- the table was wide open in the test database, so any test asking "is someone
-- else refused?" would have passed for the wrong reason.
--
-- There is no UPDATE policy, and that absence is the enforcement: an answer
-- cannot be rewritten, only replaced by a newer one or deleted. The GRANT still
-- names UPDATE because Supabase grants all four to `authenticated` on every
-- table it creates, and the mirror has to be what production is, not what it
-- ought to be — an UPDATE gets past the grant and is then stopped by RLS.
ALTER TABLE life_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own life answers" ON life_answers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "write own life answers" ON life_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own life answers" ON life_answers
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON life_answers TO authenticated;

-- ============================================
-- Workout programs
-- Mirrors supabase/migrations/20260618_create_program_tables.sql and the
-- custom_schedule column from 20260818_program_custom_schedule.sql.
--
-- THE CONSTRAINTS ARE THE POINT, so they are copied verbatim rather than
-- approximated. Two of them carry the whole safety story of this feature:
--   * ON DELETE CASCADE on program_session_logs.enrollment_id — the reason
--     deleting an enrollment destroys a year of training, and the reason
--     ending one must archive instead.
--   * uq_program_enrollments_active, a PARTIAL unique index — the reason any
--     number of finished enrollments of the same program may sit beside one
--     live one, which is what makes archiving possible at all.
-- A test schema that softened either would pass while production lost data.
--
-- auth.users does not exist in the container, so user_id references profiles,
-- the same substitution every other table in this file makes.
-- ============================================

CREATE TABLE program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  unit_system TEXT NOT NULL CHECK (unit_system IN ('kg', 'lb')),
  exercise_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  cursor JSONB NOT NULL,
  custom_schedule JSONB,
  -- Verbatim from 20260907090000_replay_from_seed.sql. The seed is what the
  -- person typed at enrolment; replay folds history over it rather than
  -- re-deriving it from the catalogue. The events are the things that changed
  -- the state and were not workouts (a skip, a reset, a manual weight change).
  initial_exercise_state JSONB,
  replay_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  bar_weight_kg NUMERIC(5,2)
    CONSTRAINT program_enrollments_bar_weight_sane
    CHECK (bar_weight_kg IS NULL OR (bar_weight_kg >= 0 AND bar_weight_kg <= 50)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_enrollments_user_active
  ON program_enrollments(user_id, is_active);

CREATE UNIQUE INDEX uq_program_enrollments_active
  ON program_enrollments(user_id, program_id) WHERE is_active;

ALTER TABLE program_enrollments ADD COLUMN label TEXT
  CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 60);

-- Row rules, from 20260618_create_program_tables.sql:33-45. The GRANT is what
-- plain Postgres does not do for itself: Supabase gives `authenticated` all
-- four rights on every table, and RLS is what narrows them to your own rows.
-- Without the grant, a denial test would pass because of a missing privilege
-- rather than because of the policy, which proves nothing about production.
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own enrollments" ON program_enrollments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON program_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON program_enrollments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own enrollments" ON program_enrollments
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON program_enrollments TO authenticated;

-- ---------------------------------------------------------------------------
-- Workouts. Verbatim from 20260305 + 20260716 + 20260907100000, because these
-- are what the training feature now reads and writes: `program_session_logs`
-- was a SECOND copy of every program session and is gone.
--
-- The constraints are the point of having them here. Three of them replace a
-- whole class of bug (a workout that is both running and finished; two workouts
-- running at once; a retry logging the same session twice) and can only be
-- proven against a real Postgres.
-- ---------------------------------------------------------------------------
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('weights', 'cardio', 'mobility', 'yoga', 'running')),
  duration_min INTEGER CHECK (duration_min > 0 AND duration_min < 600),
  intensity SMALLINT CHECK (intensity >= 1 AND intensity <= 5),
  distance_km NUMERIC(6,2) CHECK (distance_km IS NULL OR (distance_km >= 0 AND distance_km <= 1000)),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  enrollment_id UUID REFERENCES program_enrollments(id) ON DELETE SET NULL,
  program_day_id TEXT,
  program_cycle INTEGER CHECK (program_cycle IS NULL OR (program_cycle >= 1 AND program_cycle <= 1000)),
  program_week INTEGER CHECK (program_week IS NULL OR (program_week >= 1 AND program_week <= 52)),
  adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  rpe SMALLINT CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  client_key TEXT,
  -- The receipt the finish screen showed: what the program will do next time,
  -- and what was beaten. NULL means "not kept" (every workout finished before
  -- 2026-09-17), never "nothing changed" or "nothing was beaten".
  progression_changes JSONB,
  personal_records JSONB,
  CONSTRAINT workout_logs_lifecycle CHECK (
       (started_at IS NULL     AND ended_at IS NULL AND duration_min IS NOT NULL AND intensity IS NOT NULL)
    OR (started_at IS NOT NULL AND ended_at IS NULL AND duration_min IS NULL     AND intensity IS NULL)
    OR (started_at IS NOT NULL AND ended_at IS NOT NULL AND duration_min IS NOT NULL AND intensity IS NOT NULL)
  ),
  CONSTRAINT workout_logs_ended_after_start
    CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  CONSTRAINT workout_logs_logged_is_start
    CHECK (started_at IS NULL OR logged_at = started_at),
  CONSTRAINT workout_logs_program_context CHECK (
    enrollment_id IS NULL
    OR (program_day_id IS NOT NULL AND program_cycle IS NOT NULL AND program_week IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_workout_logs_live
  ON workout_logs(user_id) WHERE ended_at IS NULL AND started_at IS NOT NULL;
CREATE UNIQUE INDEX uq_workout_logs_client_key
  ON workout_logs(user_id, client_key) WHERE client_key IS NOT NULL;
CREATE INDEX idx_workout_logs_enrollment
  ON workout_logs(enrollment_id, logged_at DESC) WHERE enrollment_id IS NOT NULL;

CREATE FUNCTION workout_logs_enrollment_is_own()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
BEGIN
  IF NEW.enrollment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM program_enrollments e
    WHERE e.id = NEW.enrollment_id AND e.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'A workout can only be attached to your own program';
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER workout_logs_enrollment_is_own_trg
  BEFORE INSERT OR UPDATE OF enrollment_id, user_id ON workout_logs
  FOR EACH ROW EXECUTE FUNCTION workout_logs_enrollment_is_own();

-- Row rules, from 20260305_create_health_tracking_tables.sql:79-91.
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own workout logs" ON workout_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout logs" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout logs" ON workout_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout logs" ON workout_logs
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON workout_logs TO authenticated;

CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg >= 0),
  reps INTEGER NOT NULL,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  exercise_notes TEXT CHECK (exercise_notes IS NULL OR char_length(exercise_notes) <= 500),
  exercise_id TEXT,
  library_id TEXT,
  set_kind TEXT NOT NULL DEFAULT 'working'
    CHECK (set_kind IN ('warmup', 'working', 'amrap', 'backoff', 'drop')),
  prescribed_index SMALLINT,
  completed_at TIMESTAMPTZ,
  rpe SMALLINT CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  side TEXT CHECK (side IS NULL OR side IN ('left', 'right')),
  CONSTRAINT workout_sets_reps_check CHECK (reps >= 0 AND reps <= 1000),
  -- 999.99, not 1000, since 20260910090000_weight_check_matches_column.sql:
  -- the column is NUMERIC(5,2), so 1000 is a weight it cannot physically hold.
  -- The two disagreed once and every validator in the app copied the wrong one.
  CONSTRAINT workout_sets_weight_max CHECK (weight_kg <= 999.99)
);

CREATE UNIQUE INDEX uq_workout_sets_slot
  ON workout_sets(log_id, COALESCE(exercise_id, exercise), set_kind, set_number, COALESCE(side, ''));

-- Row rules, from 20260305_create_health_tracking_tables.sql:107-123. A set has
-- no user_id of its own, so whose it is comes from the workout it hangs off.
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own workout sets" ON workout_sets
  FOR SELECT USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
CREATE POLICY "Users can insert own workout sets" ON workout_sets
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
CREATE POLICY "Users can update own workout sets" ON workout_sets
  FOR UPDATE USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
CREATE POLICY "Users can delete own workout sets" ON workout_sets
  FOR DELETE USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON workout_sets TO authenticated;

-- ---------------------------------------------------------------------------
-- finish_program_workout, copied from the latest migration that defines it:
-- supabase/migrations/20260919100000_finish_workout_times_and_kind.sql.
--
-- WHY IT IS HERE. Finishing a workout closes the workout and moves the
-- program's weights, and both must happen or neither. There is no client-side
-- transaction in supabase-js, so this function is the only thing that is
-- actually atomic — and it is also the double-finish guard. Until now it
-- existed nowhere under tests/, so nothing anywhere proved that a double tap
-- cannot advance your program twice.
--
-- KEEP IT IDENTICAL. tests/unit/db/schemaMirror.test.ts compares this text with
-- the latest migration's, word for word. When a migration changes the
-- signature, this copy changes with it or that test goes red.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finish_program_workout(
  p_workout_id UUID,
  p_ended_at TIMESTAMPTZ,
  p_duration_min INTEGER,
  p_intensity SMALLINT,
  p_rpe SMALLINT,
  p_notes TEXT,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_replay_events JSONB,
  -- What the caller believed the program had done when it computed the new
  -- weights. If it has moved since, the computation is stale and is refused.
  p_expected_session_count INTEGER,
  -- The receipt, written in this same transaction so it cannot drift from what
  -- the screen showed. NULL for either means "not kept", not "empty".
  p_changes JSONB,
  p_records JSONB,
  -- When the session really happened, what kind it was, and how far.
  p_started_at TIMESTAMPTZ DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL,
  p_distance_km NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_enrollment UUID;
BEGIN
  -- Lock the workout and confirm it is still running. Zero rows means somebody
  -- (or some retry) already finished it.
  SELECT enrollment_id INTO v_enrollment
  FROM workout_logs
  WHERE id = p_workout_id AND started_at IS NOT NULL AND ended_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout has already been finished' USING ERRCODE = '55000';
  END IF;

  IF v_enrollment IS NOT NULL THEN
    -- Lock the program and confirm it is where the caller thought it was.
    PERFORM 1
    FROM program_enrollments
    WHERE id = v_enrollment
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this workout was open — reload and finish it again'
        USING ERRCODE = '55000';
    END IF;

    UPDATE program_enrollments
    SET exercise_state = p_exercise_state,
        cursor = p_cursor,
        replay_events = COALESCE(p_replay_events, replay_events)
    WHERE id = v_enrollment;
  END IF;

  UPDATE workout_logs
  SET ended_at = p_ended_at,
      duration_min = p_duration_min,
      intensity = p_intensity,
      rpe = COALESCE(p_rpe, rpe),
      notes = COALESCE(p_notes, notes),
      progression_changes = p_changes,
      personal_records = p_records,
      -- Together, always: `workout_logs_logged_is_start` requires it, and a
      -- session filed under the day you wrote it up rather than the day you
      -- did it is the fault this exists to fix.
      started_at = COALESCE(p_started_at, started_at),
      logged_at = COALESCE(p_started_at, logged_at),
      session_type = COALESCE(p_session_type, session_type),
      distance_km = p_distance_km
  WHERE id = p_workout_id;

  RETURN p_workout_id;
END $$;

-- Nobody but a signed-in person, and never the anonymous role.
REVOKE ALL ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) TO authenticated;

COMMENT ON FUNCTION finish_program_workout IS
  'Closes a live workout, moves the program''s weights and writes the receipt the screen showed — all in one transaction. Refuses a second call for the same workout, so a retry cannot advance the program twice. Also sets, when given: the start instant (started_at and logged_at together, so a session written up later is filed under the day it happened), the session kind, and the distance.';

-- ---------------------------------------------------------------------------
-- refuse_to_pause_a_busy_program, copied from the migration that defines it:
-- supabase/migrations/20260917100100_program_busy_while_workout_open.sql.
--
-- WHY IT IS HERE. "End program", and starting a different program of the same
-- kind (which pauses the old one to make room), both just flipped `is_active`
-- off. Mid-workout, that workout then finished onto a plan nobody is shown any
-- more. The app checks first, but a check followed by a write has a gap, and a
-- script has no check at all — so the rule that actually holds for everybody is
-- this trigger, and the only place a trigger can be proven is a real Postgres.
--
-- KEEP IT IDENTICAL, the same way `finish_program_workout` above is.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refuse_to_pause_a_busy_program()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    -- "Open" is started-and-not-ended, and nothing looser: a workout typed in
    -- after the fact has no start time and is not something you are in.
    IF EXISTS (
      SELECT 1 FROM workout_logs
      WHERE enrollment_id = NEW.id
        AND started_at IS NOT NULL
        AND ended_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Finish or throw away the open workout first.' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS program_busy_while_workout_open ON program_enrollments;
CREATE TRIGGER program_busy_while_workout_open
  BEFORE UPDATE OF is_active ON program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION refuse_to_pause_a_busy_program();

COMMENT ON FUNCTION refuse_to_pause_a_busy_program IS
  'Refuses to switch a program off while a workout is open on it. The app checks this too, but a check followed by a write has a gap, and a script has no check at all.';

-- ============================================
-- Saved training weeks (program_drafts) — 20260908100000.
--
-- A week you build used to exist only while the page was open, and
-- `workout_templates` held a flat list of sets that could not be started as a
-- program. One table now, and every template became a row in it.
--
-- The RLS grants below matter to the tests: the table owner bypasses RLS, so a
-- denial test has to run under the `authenticated` role via SET ROLE.
-- ============================================
CREATE TABLE program_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  discipline TEXT NOT NULL DEFAULT 'strength'
    CHECK (discipline IN ('strength','bodybuilding','calisthenics','cardio','flexibility','triathlon','ironman')),
  unit_system TEXT NOT NULL DEFAULT 'kg' CHECK (unit_system IN ('kg','lb')),
  schedule JSONB NOT NULL DEFAULT '{"kind":"linear_rotation","days":[]}'::jsonb,
  working_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'built' CHECK (source IN ('built','catalog','saved_workout')),
  source_program_id TEXT CHECK (source_program_id IS NULL OR char_length(source_program_id) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  CONSTRAINT program_drafts_schedule_shape CHECK (
    jsonb_typeof(schedule) = 'object'
    AND jsonb_typeof(schedule -> 'days') = 'array'
    AND schedule ? 'kind'
  ),
  CONSTRAINT program_drafts_weights_shape CHECK (jsonb_typeof(working_weights) = 'object')
);

CREATE INDEX idx_program_drafts_user ON program_drafts(user_id, updated_at DESC);

ALTER TABLE program_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own program drafts" ON program_drafts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own program drafts" ON program_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- WITH CHECK spelled out; Postgres would fall back to USING anyway, so the
-- integration test that proves a draft cannot be handed to another account
-- passes either way. It is here so a later edit to USING cannot widen it.
CREATE POLICY "Users can update own program drafts" ON program_drafts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own program drafts" ON program_drafts
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON program_drafts TO authenticated;

CREATE OR REPLACE FUNCTION program_drafts_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_program_drafts_updated_at
  BEFORE UPDATE ON program_drafts
  FOR EACH ROW EXECUTE FUNCTION program_drafts_touch_updated_at();

-- ---------------------------------------------------------------------------
-- The six program-write functions, copied from the migration that defines
-- them: supabase/migrations/20260918100000_program_writes_are_one_statement.sql
--
-- WHY THEY ARE HERE. Each one is the only thing that makes a pair of writes
-- happen together — end a program, start one, run one again, remove a session
-- and move the weights, correct a session and move the weights, write up a
-- session and advance the program. "Together or not at all" can only be proven
-- against a real Postgres, so without this copy no test anywhere could show
-- that a refused half leaves the other half unwritten.
--
-- KEEP IT IDENTICAL, the same way finish_program_workout above is:
-- tests/unit/db/schemaMirror.test.ts compares this text with the latest
-- migration word for word.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Stop prescribing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION end_enrollment(p_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Not filtered on `is_active`: ending a program that is already ended is a
  -- no-op that succeeded, and answering "not found" for it would be a sentence
  -- nobody can act on. A row belonging to somebody else is invisible under the
  -- row rules, so it reaches the NOT FOUND below instead.
  UPDATE program_enrollments SET is_active = false WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That program is not on your account' USING ERRCODE = '55000';
  END IF;

  RETURN p_id;
END $$;

-- ---------------------------------------------------------------------------
-- Start one, pausing whatever it makes room for.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION start_enrollment(p_row JSONB, p_displace UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
  v_new program_enrollments;
BEGIN
  -- WHY THE PAUSE COMES FIRST. Both statements are inside one function, so they
  -- are inside one transaction: if the insert is refused, the pause is undone
  -- with it and the program you were on is still running — which is the rule
  -- this function exists for. Ordering it the other way would additionally
  -- break starting the same program again from scratch, because
  -- `uq_program_enrollments_active` allows only one live row per program and
  -- the old one would still be live when the new one went in.
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;

  -- The row the app built, field by field. `jsonb_populate_record` against a
  -- NULL row gives NULL for anything the app did not send, so every column that
  -- has a default is written explicitly rather than nulled out.
  SELECT * INTO v_row FROM jsonb_populate_record(null::program_enrollments, p_row);

  INSERT INTO program_enrollments (
    user_id, program_id, level, unit_system,
    exercise_state, initial_exercise_state, cursor,
    custom_schedule, replay_events, bar_weight_kg, label, is_active
  ) VALUES (
    v_row.user_id, v_row.program_id, v_row.level, v_row.unit_system,
    v_row.exercise_state, v_row.initial_exercise_state, v_row.cursor,
    v_row.custom_schedule, COALESCE(v_row.replay_events, '[]'::jsonb),
    v_row.bar_weight_kg, v_row.label, true
  )
  RETURNING * INTO v_new;

  RETURN to_jsonb(v_new);
END $$;

-- ---------------------------------------------------------------------------
-- Pick a finished one back up, at the weights it was left at.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resume_enrollment(p_id UUID, p_displace UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
BEGIN
  -- Pausing first, for the same two reasons as `start_enrollment`: one
  -- transaction makes the order irrelevant to safety, and only one row per
  -- program may be live, so the running one has to go off before this one
  -- comes on.
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;

  UPDATE program_enrollments SET is_active = true
  WHERE id = p_id AND NOT is_active
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That program is already running, or is not on your account'
      USING ERRCODE = '55000';
  END IF;

  RETURN to_jsonb(v_row);
END $$;

-- ---------------------------------------------------------------------------
-- Remove one logged session and move the weights back, together.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_session_and_replay(
  p_log_id UUID,
  p_enrollment_id UUID,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_replay_events JSONB,
  -- How many sessions the app had counted when it worked out the new weights.
  -- If the program has moved since, that calculation describes a different
  -- history and is refused rather than written.
  p_expected_session_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
  v_gone UUID;
BEGIN
  PERFORM 1 FROM program_enrollments
  WHERE id = p_enrollment_id
    AND (cursor ->> 'sessionCount')::int = p_expected_session_count
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
      USING ERRCODE = '55000';
  END IF;

  -- The sets go with the workout (ON DELETE CASCADE), and so does its place in
  -- every count, chart and export — there is one record of a session now.
  DELETE FROM workout_logs
  WHERE id = p_log_id AND enrollment_id = p_enrollment_id
  RETURNING id INTO v_gone;

  IF v_gone IS NULL THEN
    RAISE EXCEPTION 'That session was not found, so nothing was deleted'
      USING ERRCODE = '55000';
  END IF;

  UPDATE program_enrollments
  SET exercise_state = p_exercise_state,
      cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $$;

-- ---------------------------------------------------------------------------
-- Correct a session's sets and move the weights, together.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION replace_sets_and_replay(
  p_log_id UUID,
  p_sets JSONB,
  -- NULL for a workout that answers no program: the sets are still replaced in
  -- one statement, there is simply nothing to recalculate.
  p_enrollment_id UUID,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_replay_events JSONB,
  p_expected_session_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
BEGIN
  IF p_enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = p_enrollment_id
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  -- The workout is locked, so the old sets can go before the new ones arrive:
  -- if the insert is refused, the delete never happened either. This is what
  -- replaces the hand-written "put the old rows back" rollback.
  PERFORM 1 FROM workout_logs WHERE id = p_log_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout no longer exists' USING ERRCODE = '55000';
  END IF;

  DELETE FROM workout_sets WHERE log_id = p_log_id;

  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe
  )
  SELECT p_log_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;

  IF p_enrollment_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE program_enrollments
  SET exercise_state = p_exercise_state,
      cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $$;

-- ---------------------------------------------------------------------------
-- Write up a session that already happened, and advance the program.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_session_and_advance(
  p_workout JSONB,
  p_sets JSONB,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_expected_session_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row workout_logs;
  v_id UUID;
BEGIN
  SELECT * INTO v_row FROM jsonb_populate_record(null::workout_logs, p_workout);

  INSERT INTO workout_logs (
    user_id, session_type, duration_min, intensity, distance_km,
    enrollment_id, program_day_id, program_cycle, program_week,
    adjustments, rpe, notes, client_key, logged_at
  ) VALUES (
    v_row.user_id, v_row.session_type, v_row.duration_min, v_row.intensity,
    v_row.distance_km, v_row.enrollment_id, v_row.program_day_id,
    v_row.program_cycle, v_row.program_week,
    COALESCE(v_row.adjustments, '{}'::jsonb), v_row.rpe, v_row.notes,
    v_row.client_key, COALESCE(v_row.logged_at, now())
  )
  ON CONFLICT (user_id, client_key) WHERE client_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  -- ALREADY WRITTEN. The same write-up arriving twice — a retry after a reply
  -- was lost on gym wifi — is the session that is already there, and the
  -- program must not be advanced a second time for it. Nothing is touched.
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM workout_logs
    WHERE user_id = v_row.user_id AND client_key = v_row.client_key;
    RETURN jsonb_build_object('workout_id', v_id, 'inserted', false);
  END IF;

  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe
  )
  SELECT v_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;

  IF v_row.enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = v_row.enrollment_id
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being written up — reload and try again'
        USING ERRCODE = '55000';
    END IF;

    UPDATE program_enrollments
    SET exercise_state = p_exercise_state,
        cursor = p_cursor
    WHERE id = v_row.enrollment_id;
  END IF;

  RETURN jsonb_build_object('workout_id', v_id, 'inserted', true);
END $$;

-- Nobody but a signed-in person, and never the anonymous role. The same shape
-- `finish_program_workout` already has.
REVOKE ALL ON FUNCTION end_enrollment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION end_enrollment(UUID) TO authenticated;

REVOKE ALL ON FUNCTION start_enrollment(JSONB, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_enrollment(JSONB, UUID[]) TO authenticated;

REVOKE ALL ON FUNCTION resume_enrollment(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resume_enrollment(UUID, UUID[]) TO authenticated;

REVOKE ALL ON FUNCTION remove_session_and_replay(UUID, UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_session_and_replay(UUID, UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION replace_sets_and_replay(UUID, JSONB, UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_sets_and_replay(UUID, JSONB, UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION log_session_and_advance(JSONB, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_session_and_advance(JSONB, JSONB, JSONB, JSONB, INTEGER) TO authenticated;

COMMENT ON FUNCTION end_enrollment IS
  'Stops a program prescribing. The busy-program trigger refuses it while a workout is open on it.';
COMMENT ON FUNCTION start_enrollment IS
  'Starts a program and pauses the ones it makes room for, in one transaction — so a refused start leaves the program you were on running.';
COMMENT ON FUNCTION resume_enrollment IS
  'Runs a finished program again at the weights it was left at, pausing what it displaces, in one transaction.';
COMMENT ON FUNCTION remove_session_and_replay IS
  'Removes one logged session and writes the recalculated weights together. Refuses a calculation made against a different history.';
COMMENT ON FUNCTION replace_sets_and_replay IS
  'Replaces a workout''s sets and writes the recalculated weights together. Nothing is half-written.';
COMMENT ON FUNCTION log_session_and_advance IS
  'Writes up a session that already happened and advances the program together. The same write-up sent twice records one session and advances once.';

COMMENT ON COLUMN program_enrollments.replay_events IS
  'Everything that changed this program''s state and was not a logged workout: a skipped session, a reset, a weight set by hand, and the schedule it started with plus every edit since. Replay folds these over initial_exercise_state, so a correction cannot undo them.';


-- ============================================================================
-- THE LIFE PLAN — mirrored from the two migrations that created it.
--
-- `schemaMirror.test.ts` fails when the app calls a database function this file
-- has never heard of, which is how the absence of `save_life_plan` was caught
-- the moment it was written. Mirrored from:
--   supabase/migrations/20260922100000_life_plan_tables.sql
--   supabase/migrations/20260922110000_save_life_plan.sql
--   supabase/migrations/20260923130000_season_focus_is_any_node.sql
--
-- ONE TEST-CONTAINER ADAPTATION, the same one the beta tables above make and
-- for the same reason: there is no `auth.users` in this container, so every
-- `user_id` references `profiles(id)` instead. `auth.uid()` is already stubbed
-- above to read the `test.uid` session setting, so the hundred row-security
-- policies come across unchanged and are genuinely exercised rather than
-- modelled — which is the point, since `user_goals` next door has no RLS here
-- at all and every test that claims to prove owner isolation on it proves
-- nothing.
-- ============================================================================

-- ============================================================================
-- THE LIFE MASTERY PLAN GETS AN ACCOUNT TO LIVE ON.
--
-- Today the whole plan — north star, twelve areas, every goal, every routine,
-- every daily rating and journal entry — is one lump of JSON in one browser's
-- localStorage under `north-star-v1`. Clear your browsing data and it is gone.
-- Open it on your phone and it was never there. Three things reach the
-- database today and the other forty do not.
--
-- These 25 tables are that plan, as tables. Phase 1 of
-- docs/plans/life-mastery-deployment.md.
--
-- NOTHING IS MIGRATED BY THIS FILE. It creates empty tables and stops. The
-- browser copy is imported once, by the app, only when the account has no plan
-- row — because the import has to read a key that only exists in a browser.
--
-- ----------------------------------------------------------------------------
-- THE THREE RULES THE SHAPE FOLLOWS, so none of it is arbitrary:
--
-- 1. One per parent and nothing points at it: a COLUMN on the parent.
--    Many, or pointable, or worth finding on its own: its own TABLE with an id.
--    Many but only ever edited as a whole and never pointed at: a LIST column.
--    That is why `reasons_list` and `ramp_steps` stay on the goal row while
--    values get a table — "every goal that asks for Courage" is a question
--    worth asking; "the fourth reason you wrote" is not.
--
-- 2. Every row carries its owner, and a child links to its parent on
--    (parent, owner) TOGETHER. A child cannot be attached to someone else's
--    plan even if the app asks for it, because the foreign key has nothing to
--    match. That is why parents carry UNIQUE (id, user_id), which looks
--    redundant beside a primary key and is not.
--
-- 3. The four day tables are NEVER written by the whole-plan save. A day is
--    appended to; a plan is replaced. Saving the plan must not be able to wipe
--    a year of journal, so they are separated here rather than by remembering.
-- ============================================================================


-- ============================================================================
-- ONE PLAN PER PERSON.
--
-- `seq` is the id counter the flow mints local ids from, and it lives here
-- because it must survive the browser that created it: two devices minting
-- from a counter that resets to 0 would produce two different things both
-- called `g3`.
--
-- `revision` is the lock. Every save says which revision it read, and a save
-- built on a stale one is refused rather than merged — the page then says "this
-- plan changed on another device" instead of silently dropping what the other
-- device wrote.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- The plan's own schema version, as the flow writes it. Not the revision.
  version INTEGER NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 1000),
  -- Bumped by the app on every whole-plan save. See `save_life_plan`.
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  -- The id counter. Monotonic: it may only ever rise.
  seq INTEGER NOT NULL DEFAULT 0 CHECK (seq >= 0),
  -- The area this season is about. A node id, not a label.
  season_focus_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One plan per account, for now. Lifting this is a migration, not a redesign.
  CONSTRAINT life_plans_one_per_user UNIQUE (user_id),
  -- Rule 2: what every child's composite foreign key matches against.
  CONSTRAINT life_plans_owner_key UNIQUE (id, user_id)
);


-- ============================================================================
-- EVERY PART'S ID AND KIND.
--
-- Three pointers in the flow are genuinely polymorphic — each can name a goal,
-- a routine step, an experience or a sub-step, and the TypeScript says so:
-- `NsDailyField.targetId`, `NsSubStep.targetId`, and the ids inside
-- `plan.logged`. Those three reference this table, and only those three.
--
-- EVERYTHING ELSE REFERENCES ITS SPECIFIC TABLE, so the database still refuses
-- the wrong kind: a goal's area must be an area, a step's served goals must be
-- goals. Routing every link through one generic table would throw that away,
-- which is the mistake the first draft of this design made.
--
-- `local_id` is the plan's own id — `g3`, `area_health`, `stretch` — stored
-- verbatim and never rewritten. It is how a browser copy maps onto rows, and
-- how the app keeps talking in its own ids without caring about UUIDs.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'north_star','area','goal','checkpoint','obstacle','belief','habit',
    'routine','routine_step','split_day','experience','field','sub_step')),
  local_id TEXT NOT NULL CHECK (
    char_length(local_id) BETWEEN 1 AND 80
    AND local_id ~ '^[A-Za-z0-9_:.-]+$'),
  CONSTRAINT life_plan_nodes_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  -- Two parts of one plan cannot share an id. This is the constraint Phase 0
  -- existed to make satisfiable: `stretch` used to be both a morning step and a
  -- night step, and under database keys that save simply fails.
  CONSTRAINT life_plan_nodes_local_key UNIQUE (plan_id, local_id),
  -- What a detail table's composite key matches, so a row cannot lie about
  -- what kind of thing it is.
  CONSTRAINT life_plan_nodes_detail_key UNIQUE (id, user_id, kind),
  -- What the three polymorphic pointers match.
  CONSTRAINT life_plan_nodes_owner_key UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_life_plan_nodes_plan ON life_plan_nodes(plan_id, kind);


-- ============================================================================
-- THE NORTH STAR.
--
-- A node of its own rather than a column on `life_plans`, although there is
-- exactly one. That is a deliberate bet and not a defect report: every goal
-- carries a `servesOneThing` flag and a morning step can point at the star, and
-- both work today only because there is exactly one of each. It costs one small
-- table now and a migration later if a plan ever holds a five-year and a
-- twenty-year picture side by side.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_north_stars (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'north_star' CHECK (node_kind = 'north_star'),
  text TEXT NOT NULL DEFAULT '' CHECK (char_length(text) <= 20000),
  horizon_years SMALLINT NOT NULL DEFAULT 10 CHECK (horizon_years IN (5, 10, 20)),
  CONSTRAINT life_plan_north_stars_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_north_stars_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_north_stars_one_per_plan UNIQUE (plan_id)
);


-- ============================================================================
-- AREAS OF LIFE, and the review answers that hang off each one.
--
-- The review is one-per-area and nothing points at it, so by rule 1 it is
-- columns here rather than a table of its own.
--
-- `season_rank` is how an area is placed in this season's order; NULL means it
-- is not in the season. `position` is the area's place in the list itself.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_areas (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'area' CHECK (node_kind = 'area'),
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 200),
  sublabel TEXT NOT NULL DEFAULT '' CHECK (char_length(sublabel) <= 400),
  color TEXT NOT NULL DEFAULT '' CHECK (char_length(color) <= 40),
  custom BOOLEAN NOT NULL DEFAULT FALSE,
  -- The review. All optional; a half-answered area is the ordinary case.
  review_ten TEXT NOT NULL DEFAULT '' CHECK (char_length(review_ten) <= 20000),
  review_purpose TEXT NOT NULL DEFAULT '' CHECK (char_length(review_purpose) <= 20000),
  review_snapshot TEXT NOT NULL DEFAULT '' CHECK (char_length(review_snapshot) <= 20000),
  review_blockers TEXT NOT NULL DEFAULT '' CHECK (char_length(review_blockers) <= 20000),
  review_identity TEXT NOT NULL DEFAULT '' CHECK (char_length(review_identity) <= 20000),
  -- 0-10, and NULL is a real state: not rated yet is not the same as zero.
  review_fortnight SMALLINT CHECK (review_fortnight IS NULL OR review_fortnight BETWEEN 0 AND 10),
  -- "Do my goals aim at this?" — yes, no, or not answered.
  review_goals_aim TEXT CHECK (review_goals_aim IS NULL OR review_goals_aim IN ('yes','no')),
  season_rank INTEGER CHECK (season_rank IS NULL OR season_rank >= 0),
  CONSTRAINT life_plan_areas_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_areas_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_areas_owner_key UNIQUE (id, user_id),
  -- DEFERRABLE because reordering a list swaps positions inside one
  -- transaction and would otherwise collide halfway through.
  CONSTRAINT life_plan_areas_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- GOALS.
--
-- `user_goal_id` IS THE LINK TO THE COUNTED GOAL, and it is the only thing that
-- decides identity. The `ns:` tag written on `user_goals` is written and never
-- read back for identity — a tag whose run id lives in localStorage means
-- clearing your browser makes a second copy of every goal you push.
--
-- `ladder` and `ramp_steps` are JSONB by rule 1: many per goal, but only ever
-- edited as a whole and nothing points at one rung. `reasons_list` is a TEXT[]
-- for the same reason — the 100-reasons drill is a list, not a hundred rows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'goal' CHECK (node_kind = 'goal'),
  -- TWO ORDERS, BECAUSE THERE REALLY ARE TWO. `position` is the goals list's
  -- own order, which is what eight live screens render by reading `plan.goals`
  -- directly. `priority_rank` is the index in `priorityIds`, which `addGoal`
  -- maintains as a separate list. An earlier draft of this table stored only
  -- the rank, on the strength of a comment saying `orderedGoals` renders from
  -- the priority list — that function does not exist and has no callers, so
  -- collapsing the two would have silently reordered every goal screen on the
  -- first load after this shipped.
  position INTEGER NOT NULL CHECK (position >= 0),
  priority_rank INTEGER NOT NULL DEFAULT 0 CHECK (priority_rank >= 0),
  area_id UUID,
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  goal_type TEXT NOT NULL DEFAULT 'achievement'
    CHECK (goal_type IN ('milestone_ladder','habit_ramp','achievement')),
  why TEXT NOT NULL DEFAULT '' CHECK (char_length(why) <= 20000),
  pain_why TEXT NOT NULL DEFAULT '' CHECK (char_length(pain_why) <= 20000),
  sentence TEXT NOT NULL DEFAULT '' CHECK (char_length(sentence) <= 20000),
  feeling TEXT NOT NULL DEFAULT '' CHECK (char_length(feeling) <= 20000),
  reward TEXT NOT NULL DEFAULT '' CHECK (char_length(reward) <= 20000),
  stake TEXT NOT NULL DEFAULT '' CHECK (char_length(stake) <= 20000),
  unit TEXT NOT NULL DEFAULT '' CHECK (char_length(unit) <= 100),
  target_date DATE,
  belief_level SMALLINT CHECK (belief_level IS NULL OR belief_level BETWEEN 0 AND 10),
  desire_level SMALLINT CHECK (desire_level IS NULL OR desire_level BETWEEN 0 AND 10),
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  per_week NUMERIC CHECK (per_week IS NULL OR per_week >= 0),
  -- "No weed" is a daily practice you do NOT do. The badge engine suppresses
  -- streaks for these; nothing set the flag before this column existed.
  is_abstinence BOOLEAN NOT NULL DEFAULT FALSE,
  serves_one_thing BOOLEAN NOT NULL DEFAULT FALSE,
  -- Where the number comes from when it is not typed in. Null = typed.
  metric TEXT CHECK (metric IS NULL OR metric IN ('daily_area')),
  ladder JSONB CHECK (ladder IS NULL OR jsonb_typeof(ladder) = 'object'),
  ramp_steps JSONB CHECK (ramp_steps IS NULL OR jsonb_typeof(ramp_steps) = 'array'),
  reasons_list TEXT[] NOT NULL DEFAULT '{}',
  -- Which guide questions were answered or skipped, so the flow does not ask
  -- again about one somebody deliberately passed over.
  asked TEXT[] NOT NULL DEFAULT '{}',
  -- NO `stages` COLUMN, deliberately. The counted goal has stages and they look
  -- like they belong here too, but `northStarTrackService` DERIVES them at push
  -- time from the checkpoint titles. Storing them would be a second copy of a
  -- fact this schema already holds, and the two would drift the first time
  -- somebody renamed a checkpoint. Rule 1: every fact is stored once.
  -- THE LINK. Null until the goal is pushed to the counted-goals table.
  user_goal_id UUID REFERENCES user_goals(id) ON DELETE SET NULL,
  CONSTRAINT life_plan_goals_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goals_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goals_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_goals_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goals_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED,
  -- The priority list covers every goal exactly once; two goals cannot share a
  -- rank any more than they can share a place in the list.
  CONSTRAINT life_plan_goals_priority_key UNIQUE (plan_id, priority_rank) DEFERRABLE INITIALLY DEFERRED,
  -- One plan goal per counted goal. Two plan goals pointing at one row is how
  -- a rename on one silently overwrites the other.
  CONSTRAINT life_plan_goals_user_goal_key UNIQUE (user_goal_id)
);

CREATE INDEX IF NOT EXISTS idx_life_plan_goals_area ON life_plan_goals(area_id);


-- ============================================================================
-- WHAT HANGS OFF A GOAL.
--
-- Four tables rather than four JSONB columns, because each is pointable: a
-- checkpoint can carry a daily question, an obstacle is worth finding on its
-- own, a habit becomes a routine step. Rule 1.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_goal_checkpoints (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'checkpoint' CHECK (node_kind = 'checkpoint'),
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  celebration TEXT NOT NULL DEFAULT '' CHECK (char_length(celebration) <= 2000),
  CONSTRAINT life_plan_goal_checkpoints_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_checkpoints_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_checkpoints_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_checkpoints_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_goal_obstacles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'obstacle' CHECK (node_kind = 'obstacle'),
  position INTEGER NOT NULL CHECK (position >= 0),
  what TEXT NOT NULL DEFAULT '' CHECK (char_length(what) <= 5000),
  counter TEXT NOT NULL DEFAULT '' CHECK (char_length(counter) <= 5000),
  CONSTRAINT life_plan_goal_obstacles_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_obstacles_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_obstacles_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_obstacles_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_goal_beliefs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'belief' CHECK (node_kind = 'belief'),
  position INTEGER NOT NULL CHECK (position >= 0),
  old TEXT NOT NULL DEFAULT '' CHECK (char_length(old) <= 5000),
  -- Three states on purpose: not judged yet is not "not useful".
  useful BOOLEAN,
  evidence TEXT NOT NULL DEFAULT '' CHECK (char_length(evidence) <= 20000),
  replacement TEXT NOT NULL DEFAULT '' CHECK (char_length(replacement) <= 5000),
  CONSTRAINT life_plan_goal_beliefs_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_beliefs_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_beliefs_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_beliefs_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_goal_habits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'habit' CHECK (node_kind = 'habit'),
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  -- A placeholder is a habit the flow suggested and nobody has confirmed.
  placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  -- THE HABIT'S DESIGNED ROTATION: named days in cycle order, `{id, name}`
  -- each. NOT weekday numbers — "Upper", "Lower", "Rest" is the ordinary case
  -- and slot 1 of the week is the first day, so the ORDER is the meaning. A
  -- list column rather than a table by rule 1: many per habit, only ever edited
  -- as a whole, and nothing anywhere points at one of them.
  routine_days JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(routine_days) = 'array'),
  -- The template target this habit came from, if any. A code id, not a node.
  source_target_id TEXT CHECK (source_target_id IS NULL OR char_length(source_target_id) <= 120),
  CONSTRAINT life_plan_goal_habits_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_habits_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_habits_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_habits_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- WHICH GOAL FEEDS WHICH, AND WHICH AREAS EACH LIFTS.
--
-- Link tables, so the database refuses a link to something that is not a goal
-- or not an area. Both sides reference the specific table, not the node table.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_goal_feeds (
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  feeds_goal_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (goal_id, feeds_goal_id),
  CONSTRAINT life_plan_goal_feeds_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_feeds_target_fk FOREIGN KEY (feeds_goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  -- A goal feeding itself is a cycle of length one and always a mistake.
  CONSTRAINT life_plan_goal_feeds_not_self CHECK (goal_id <> feeds_goal_id)
);

CREATE TABLE IF NOT EXISTS life_plan_goal_serves (
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  area_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (goal_id, area_id),
  CONSTRAINT life_plan_goal_serves_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_serves_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);


-- ============================================================================
-- ROUTINES.
--
-- `enrollment_id` IS A REFERENCE, NEVER A COPY. Starting a program used to copy
-- its day names into the plan and nothing else, so a plan could say Upper/Lower
-- forever while the account was enrolled in something else, and no fact
-- anywhere could settle which was right. The enrollment is the truth about what
-- you train; the program's name, catalogue id and start date are read from it.
--
-- ON DELETE SET NULL, not cascade: ending a program must not delete the
-- training week you wrote.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_routines (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'routine' CHECK (node_kind = 'routine'),
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 200),
  blueprint_id TEXT NOT NULL DEFAULT '' CHECK (char_length(blueprint_id) <= 120),
  kind TEXT NOT NULL DEFAULT 'sequence' CHECK (kind IN ('sequence','weekly')),
  -- Null when the routine serves every area rather than one.
  area_id UUID,
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  enrollment_id UUID REFERENCES program_enrollments(id) ON DELETE SET NULL,
  CONSTRAINT life_plan_routines_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_routines_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routines_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_routines_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_routines_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_routine_serves (
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  area_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (routine_id, area_id),
  CONSTRAINT life_plan_routine_serves_routine_fk FOREIGN KEY (routine_id, user_id)
    REFERENCES life_plan_routines (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_serves_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);

-- ============================================================================
-- THE LINES IN A ROUTINE.
--
-- `library_step_id` is the library entry this step came from, and the step's
-- own id is a counter value. They were one field until Phase 0, which is why
-- `stretch` could be both a morning step and a night step — a save this schema
-- would simply refuse.
--
-- `goes_to` and `asks` each carry a COMPANION BOOLEAN, because absent is not
-- null. A step saved before those existed has no key at all and the loader
-- infers one from its own words; NULL is a destination somebody deliberately
-- cleared, and inference must never argue with that. One nullable column
-- cannot hold three states.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_routine_steps (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'routine_step' CHECK (node_kind = 'routine_step'),
  position INTEGER NOT NULL CHECK (position >= 0),
  library_step_id TEXT CHECK (library_step_id IS NULL OR char_length(library_step_id) <= 120),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  minutes SMALLINT NOT NULL DEFAULT 0 CHECK (minutes BETWEEN 0 AND 1440),
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  dimension TEXT CHECK (dimension IS NULL OR dimension IN ('mind','body','spirit')),
  -- Which days it runs on. 0=Monday.
  days SMALLINT[] NOT NULL DEFAULT '{}',
  start_min SMALLINT CHECK (start_min IS NULL OR start_min BETWEEN 0 AND 1439),
  goes_to TEXT CHECK (goes_to IS NULL OR char_length(goes_to) <= 200),
  goes_to_set BOOLEAN NOT NULL DEFAULT FALSE,
  asks TEXT CHECK (asks IS NULL OR char_length(asks) <= 2000),
  asks_set BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT life_plan_routine_steps_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_steps_routine_fk FOREIGN KEY (routine_id, user_id)
    REFERENCES life_plan_routines (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_steps_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_routine_steps_position_key UNIQUE (routine_id, position) DEFERRABLE INITIALLY DEFERRED,
  -- A cleared destination and an unset one must be distinguishable, so a value
  -- with the flag down is a contradiction.
  CONSTRAINT life_plan_routine_steps_goes_to_shape CHECK (goes_to IS NULL OR goes_to_set),
  CONSTRAINT life_plan_routine_steps_asks_shape CHECK (asks IS NULL OR asks_set)
);

CREATE TABLE IF NOT EXISTS life_plan_step_serves (
  user_id UUID NOT NULL,
  step_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (step_id, goal_id),
  CONSTRAINT life_plan_step_serves_step_fk FOREIGN KEY (step_id, user_id)
    REFERENCES life_plan_routine_steps (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_step_serves_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE
);

-- ============================================================================
-- NAMED TRAINING DAYS — A WEEK SOMEBODY WROTE BY HAND.
--
-- A routine with `enrollment_id` set has NO rows here: its days are derived
-- from the enrollment's own schedule, so that a swapped lift is named
-- correctly. Two answers to one question is the thing this whole design
-- refuses. A CHECK cannot span two tables, so the mapper enforces it and a unit
-- test asserts it.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_routine_split_days (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'split_day' CHECK (node_kind = 'split_day'),
  position INTEGER NOT NULL CHECK (position >= 0),
  name TEXT NOT NULL DEFAULT '' CHECK (char_length(name) <= 200),
  CONSTRAINT life_plan_routine_split_days_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_split_days_routine_fk FOREIGN KEY (routine_id, user_id)
    REFERENCES life_plan_routines (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_split_days_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_routine_split_days_position_key UNIQUE (routine_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- EXPERIENCES — things to have done, outside the goal machinery on purpose.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_experiences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'experience' CHECK (node_kind = 'experience'),
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  area_id UUID,
  goal_id UUID,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  done_on DATE,
  CONSTRAINT life_plan_experiences_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_experiences_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_experiences_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_experiences_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_experiences_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_experiences_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED,
  -- A date on something not done is one of the two fields having been written
  -- without the other.
  CONSTRAINT life_plan_experiences_done_shape CHECK (done_on IS NULL OR done)
);


-- ============================================================================
-- THE QUESTIONS YOU ASK YOURSELF DAILY.
--
-- `target_id` is one of the three genuinely polymorphic pointers: it can name a
-- goal, a routine step, an experience or a sub-step. ON DELETE SET NULL, which
-- matches what the flow does today — a field whose target is gone re-homes to
-- the day rather than vanishing.
--
-- `read_source_id` is the one id here that is NOT a node: it names an entry in
-- a code registry, so it gets no foreign key and could not have one.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_fields (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'field' CHECK (node_kind = 'field'),
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 500),
  kind TEXT NOT NULL DEFAULT 'write' CHECK (kind IN ('write','read','go')),
  target_id UUID,
  read_source_id TEXT CHECK (read_source_id IS NULL OR char_length(read_source_id) <= 200),
  CONSTRAINT life_plan_fields_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_fields_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_fields_target_fk FOREIGN KEY (target_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_fields_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_fields_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- SUB-STEPS — the to-do list under a bigger weekly thing.
--
-- The second polymorphic pointer. ON DELETE CASCADE, matching today: a sub-step
-- whose parent is gone has nothing to be a sub-step OF.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_sub_steps (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'sub_step' CHECK (node_kind = 'sub_step'),
  position INTEGER NOT NULL CHECK (position >= 0),
  target_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  CONSTRAINT life_plan_sub_steps_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_sub_steps_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_sub_steps_target_fk FOREIGN KEY (target_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_sub_steps_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_sub_steps_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- VALUES, IN ONE TABLE WITH A SCOPE.
--
-- Lived by, chosen, per area, per goal. One table because the question worth
-- asking is "every goal that asks for Courage", and that question is
-- unanswerable if the four live in four places.
--
-- A value has no id of its own — it is a word — so this is not a node table.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('past','chosen','area','goal')),
  value TEXT NOT NULL CHECK (char_length(btrim(value)) BETWEEN 1 AND 200),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  area_id UUID,
  goal_id UUID,
  CONSTRAINT life_plan_values_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_values_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_values_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  -- The scope and the parent must agree, or a row says "this is Health's value"
  -- while naming no area.
  CONSTRAINT life_plan_values_scope_shape CHECK (
    (scope = 'area' AND area_id IS NOT NULL AND goal_id IS NULL)
    OR (scope = 'goal' AND goal_id IS NOT NULL AND area_id IS NULL)
    OR (scope IN ('past','chosen') AND area_id IS NULL AND goal_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_life_plan_values_lookup ON life_plan_values(plan_id, value);


-- ============================================================================
-- WRITTEN ANSWERS TO THE FLOW'S QUESTIONS.
--
-- `rungs` and `answers` are both Record<string,string> in the plan and both
-- land here, told apart by `kind`. The key is a prompt id from a code registry,
-- not a node, so it gets no foreign key.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rung','answer')),
  prompt_id TEXT NOT NULL CHECK (char_length(prompt_id) BETWEEN 1 AND 200),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 100000),
  CONSTRAINT life_plan_answers_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_answers_key UNIQUE (plan_id, kind, prompt_id)
);


-- ============================================================================
-- THE FOUR DAY TABLES.
--
-- NEVER WRITTEN BY THE WHOLE-PLAN SAVE. This is the single most dangerous thing
-- the first draft of this plan got wrong: a plan is replaced on every save, and
-- if a day lived inside it then one keystroke on the Systems step could wipe a
-- year of journal. They are appended to, by their own route, and the plan save
-- cannot reach them.
--
-- The day is the USER'S calendar day, from their timezone, never the server's.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  on_date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 100000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT life_plan_days_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_days_key UNIQUE (plan_id, on_date),
  CONSTRAINT life_plan_days_owner_key UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_life_plan_days_recent ON life_plan_days(plan_id, on_date DESC);

CREATE TABLE IF NOT EXISTS life_plan_day_ratings (
  user_id UUID NOT NULL,
  day_id UUID NOT NULL,
  area_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 0 AND 10),
  PRIMARY KEY (day_id, area_id),
  CONSTRAINT life_plan_day_ratings_day_fk FOREIGN KEY (day_id, user_id)
    REFERENCES life_plan_days (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_day_ratings_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);

-- The third polymorphic pointer: what you actually did that day can be a goal,
-- a routine step, an experience or a sub-step.
CREATE TABLE IF NOT EXISTS life_plan_day_ticks (
  user_id UUID NOT NULL,
  day_id UUID NOT NULL,
  node_id UUID NOT NULL,
  PRIMARY KEY (day_id, node_id),
  CONSTRAINT life_plan_day_ticks_day_fk FOREIGN KEY (day_id, user_id)
    REFERENCES life_plan_days (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_day_ticks_node_fk FOREIGN KEY (node_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE CASCADE
);

-- What you wrote that day, keyed by the field or routine step that asked. The
-- key is a node id, but a question can also be a step's `asks`, so both land
-- here under one shape — one journal, two ways for a question to get into it.
CREATE TABLE IF NOT EXISTS life_plan_day_journal (
  user_id UUID NOT NULL,
  day_id UUID NOT NULL,
  node_id UUID NOT NULL,
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 100000),
  PRIMARY KEY (day_id, node_id),
  CONSTRAINT life_plan_day_journal_day_fk FOREIGN KEY (day_id, user_id)
    REFERENCES life_plan_days (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_day_journal_node_fk FOREIGN KEY (node_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE CASCADE
);


-- ============================================================================
-- THE SEASON FOCUS POINTS AT AN AREA.
--
-- Added after the areas table exists, because it points into it.
-- ============================================================================
-- Any node, not only an area: the focus is usually a GOAL. And the column list
-- on SET NULL, because a two-column key with a bare SET NULL nulls `user_id`
-- too and `user_id` is NOT NULL, so the parent delete aborted the whole save.
-- See supabase/migrations/20260923130000_season_focus_is_any_node.sql.
DO $$ BEGIN
  ALTER TABLE life_plans
    ADD CONSTRAINT life_plans_season_focus_fk
    FOREIGN KEY (season_focus_id, user_id)
    REFERENCES life_plan_nodes (id, user_id)
    ON DELETE SET NULL (season_focus_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- WHO MAY TOUCH ANY OF IT: ONLY THE PERSON WHOSE PLAN IT IS.
--
-- Own-row CRUD on all 25, enforced by the database rather than by the app, so a
-- bug in a route cannot get past it. Every one of these tables carries
-- `user_id` precisely so this policy is the same four lines everywhere.
--
-- Written as a loop rather than 100 hand-copied policies. One rule, one place:
-- a hand-copied set is where the twenty-third table quietly gets three policies
-- instead of four, and nothing would fail.
-- ============================================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'life_plans',
    'life_plan_nodes',
    'life_plan_north_stars',
    'life_plan_areas',
    'life_plan_goals',
    'life_plan_goal_checkpoints',
    'life_plan_goal_obstacles',
    'life_plan_goal_beliefs',
    'life_plan_goal_habits',
    'life_plan_goal_feeds',
    'life_plan_goal_serves',
    'life_plan_routines',
    'life_plan_routine_serves',
    'life_plan_routine_steps',
    'life_plan_routine_split_days',
    'life_plan_step_serves',
    'life_plan_experiences',
    'life_plan_fields',
    'life_plan_sub_steps',
    'life_plan_values',
    'life_plan_answers',
    'life_plan_days',
    'life_plan_day_ratings',
    'life_plan_day_ticks',
    'life_plan_day_journal'
  ];
BEGIN
  IF array_length(tables, 1) <> 25 THEN
    RAISE EXCEPTION 'Expected 25 life-plan tables in the policy list, found %',
      array_length(tables, 1);
  END IF;

  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Table % is in the policy list but was not created', t;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- WITH CHECK is spelled out on UPDATE rather than left implicit. Postgres
    -- falls back to USING when it is absent, so this changes nothing today; it
    -- is written down so a later edit to USING cannot silently widen what a row
    -- is allowed to BECOME.
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() = user_id)',
        t || '_select_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)',
        t || '_insert_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        t || '_update_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() = user_id)',
        t || '_delete_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;


-- ============================================================================
-- `updated_at` IS KEPT BY THE DATABASE.
--
-- The revision lock reads it and the day list is ordered by it, so a client
-- that forgets to set it would silently reorder somebody's record.
-- ============================================================================
CREATE OR REPLACE FUNCTION life_plan_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_life_plans_updated_at ON life_plans;
CREATE TRIGGER trg_life_plans_updated_at
  BEFORE UPDATE ON life_plans
  FOR EACH ROW EXECUTE FUNCTION life_plan_touch_updated_at();

DROP TRIGGER IF EXISTS trg_life_plan_days_updated_at ON life_plan_days;
CREATE TRIGGER trg_life_plan_days_updated_at
  BEFORE UPDATE ON life_plan_days
  FOR EACH ROW EXECUTE FUNCTION life_plan_touch_updated_at();


-- ============================================================================
-- THE COUNT, ASSERTED RATHER THAN HOPED FOR.
--
-- A migration that quietly creates 24 tables and 96 policies still "succeeds".
-- ============================================================================
DO $$
DECLARE
  made INTEGER;
  guarded INTEGER;
  policies INTEGER;
BEGIN
  SELECT count(*) INTO made FROM pg_tables
   WHERE schemaname = 'public' AND tablename LIKE 'life_plan%';
  SELECT count(*) INTO guarded FROM pg_tables
   WHERE schemaname = 'public' AND tablename LIKE 'life_plan%' AND rowsecurity;
  SELECT count(*) INTO policies FROM pg_policies
   WHERE schemaname = 'public' AND tablename LIKE 'life_plan%';

  IF made <> 25 THEN
    RAISE EXCEPTION 'Expected 25 life-plan tables, found %', made;
  END IF;
  IF guarded <> 25 THEN
    RAISE EXCEPTION 'Only % of 25 life-plan tables have row security on', guarded;
  END IF;
  IF policies <> 100 THEN
    RAISE EXCEPTION 'Expected 100 life-plan policies (4 x 25), found %', policies;
  END IF;

  RAISE NOTICE 'Life plan: % tables, all with row security, % policies.', made, policies;
END $$;

-- ============================================================================
-- SAVING THE WHOLE PLAN, IN ONE STATEMENT, WITHOUT TOUCHING THE DAYS.
--
-- The flow saves the entire plan on every keystroke-ish change. Doing that as
-- twenty-five round trips from the app means a half-saved plan the first time
-- a connection drops mid-way: areas updated, goals not, and nothing able to say
-- which half is real. This is one transaction — it all lands or none of it does.
--
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER, EXPLICITLY, copying `finish_program_workout`.
--
-- DEFINER would run as the function's owner and walk straight past every one of
-- the hundred row-security policies the previous migration just created — the
-- app would be the only thing standing between one account and another's plan.
-- INVOKER runs as the signed-in person, so the policies still apply to every
-- statement inside. The function is a transaction boundary, not a privilege.
--
-- ----------------------------------------------------------------------------
-- IT NEVER DELETES AND REINSERTS THE NODES, and that is the whole safety
-- design rather than an optimisation.
--
-- `life_plan_day_ticks` and `life_plan_day_journal` point at nodes and cascade.
-- A save that dropped every node and wrote them back with fresh UUIDs would
-- therefore delete every tick and every journal entry the person had ever
-- written, silently, on an ordinary edit to an unrelated step. So a node that
-- is still in the plan KEEPS ITS UUID; only a part genuinely removed from the
-- plan loses its ticks, which is what removing it means.
--
-- ----------------------------------------------------------------------------
-- THE REVISION IS THE LOCK. The caller says which revision it read. If the
-- stored one has moved, the save is refused with ERRCODE 55000 and the route
-- turns that into a 409 — "this plan changed on another device, reload" —
-- rather than merging two plans into a third thing neither device wrote.
--
-- ----------------------------------------------------------------------------
-- IT DOES NO MAPPING AND NO BRANCHING ON KIND. Every array arrives already
-- shaped like its table, with real UUIDs resolved by the mapper. Duplicating
-- the mapper's rules in PL/pgSQL would put untested policy in the database,
-- where none of the app's tests can reach it.
-- ============================================================================

CREATE OR REPLACE FUNCTION save_life_plan(p_rows JSONB, p_expected_rev INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_id UUID;
  v_rev INTEGER;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'object' THEN
    RAISE EXCEPTION 'save_life_plan needs an object of row arrays'
      USING ERRCODE = '22023';
  END IF;

  -- The plan the caller may actually see. Row security means this finds
  -- nothing at all for somebody else's plan, which is the refusal we want.
  SELECT id, revision INTO v_plan_id, v_rev
    FROM life_plans
   WHERE id = (p_rows ->> 'plan_id')::uuid
     FOR UPDATE;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No such plan, or it is not yours'
      USING ERRCODE = '42501';
  END IF;

  IF v_rev <> p_expected_rev THEN
    RAISE EXCEPTION 'Plan revision is % but the save was built on %', v_rev, p_expected_rev
      USING ERRCODE = '55000';
  END IF;

  -- ------------------------------------------------------------------ nodes
  -- Gone from the plan: gone from the database, taking its detail row and its
  -- ticks with it. Still present: keeps the UUID it already had.
  DELETE FROM life_plan_nodes n
   WHERE n.plan_id = v_plan_id
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(coalesce(p_rows -> 'nodes', '[]'::jsonb)) AS e
        WHERE (e.value ->> 'id')::uuid = n.id);

  INSERT INTO life_plan_nodes (id, plan_id, user_id, kind, local_id)
  SELECT (e.value ->> 'id')::uuid, v_plan_id, (e.value ->> 'user_id')::uuid,
         e.value ->> 'kind', e.value ->> 'local_id'
    FROM jsonb_array_elements(coalesce(p_rows -> 'nodes', '[]'::jsonb)) AS e
      ON CONFLICT (id) DO UPDATE
         SET local_id = EXCLUDED.local_id;

  -- ---------------------------------------------------------- detail tables
  -- One upsert each, in dependency order. No branching: every array is already
  -- exactly its table's shape.
  INSERT INTO life_plan_north_stars
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_north_stars,
    coalesce(p_rows -> 'north_stars', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text, horizon_years = EXCLUDED.horizon_years;

  INSERT INTO life_plan_areas
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_areas,
    coalesce(p_rows -> 'areas', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label, sublabel = EXCLUDED.sublabel,
    color = EXCLUDED.color, custom = EXCLUDED.custom,
    review_ten = EXCLUDED.review_ten, review_purpose = EXCLUDED.review_purpose,
    review_snapshot = EXCLUDED.review_snapshot, review_blockers = EXCLUDED.review_blockers,
    review_identity = EXCLUDED.review_identity, review_fortnight = EXCLUDED.review_fortnight,
    review_goals_aim = EXCLUDED.review_goals_aim, season_rank = EXCLUDED.season_rank;

  -- `user_goal_id` IS ABSENT FROM THIS UPDATE ON PURPOSE. It is the link to the
  -- counted goal and it is owned by the push, not by the plan save. Listing it
  -- here would let a plan written on a second device, which has never pushed,
  -- blank the link and make the next push create a duplicate of every goal.
  INSERT INTO life_plan_goals
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goals,
    coalesce(p_rows -> 'goals', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, priority_rank = EXCLUDED.priority_rank,
    area_id = EXCLUDED.area_id, title = EXCLUDED.title,
    goal_type = EXCLUDED.goal_type, why = EXCLUDED.why, pain_why = EXCLUDED.pain_why,
    sentence = EXCLUDED.sentence, feeling = EXCLUDED.feeling, reward = EXCLUDED.reward,
    stake = EXCLUDED.stake, unit = EXCLUDED.unit, target_date = EXCLUDED.target_date,
    belief_level = EXCLUDED.belief_level, desire_level = EXCLUDED.desire_level,
    days_per_week = EXCLUDED.days_per_week, per_week = EXCLUDED.per_week,
    is_abstinence = EXCLUDED.is_abstinence, serves_one_thing = EXCLUDED.serves_one_thing,
    metric = EXCLUDED.metric, ladder = EXCLUDED.ladder, ramp_steps = EXCLUDED.ramp_steps,
    reasons_list = EXCLUDED.reasons_list, asked = EXCLUDED.asked;

  INSERT INTO life_plan_goal_checkpoints
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_checkpoints,
    coalesce(p_rows -> 'checkpoints', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, title = EXCLUDED.title,
    done = EXCLUDED.done, celebration = EXCLUDED.celebration;

  INSERT INTO life_plan_goal_obstacles
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_obstacles,
    coalesce(p_rows -> 'obstacles', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position,
    what = EXCLUDED.what, counter = EXCLUDED.counter;

  INSERT INTO life_plan_goal_beliefs
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_beliefs,
    coalesce(p_rows -> 'beliefs', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, old = EXCLUDED.old,
    useful = EXCLUDED.useful, evidence = EXCLUDED.evidence, replacement = EXCLUDED.replacement;

  INSERT INTO life_plan_goal_habits
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_habits,
    coalesce(p_rows -> 'habits', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, title = EXCLUDED.title,
    days_per_week = EXCLUDED.days_per_week, placeholder = EXCLUDED.placeholder,
    routine_days = EXCLUDED.routine_days, source_target_id = EXCLUDED.source_target_id;

  INSERT INTO life_plan_routines
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routines,
    coalesce(p_rows -> 'routines', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label,
    blueprint_id = EXCLUDED.blueprint_id, kind = EXCLUDED.kind,
    area_id = EXCLUDED.area_id, days_per_week = EXCLUDED.days_per_week,
    enrollment_id = EXCLUDED.enrollment_id;

  INSERT INTO life_plan_routine_steps
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_steps,
    coalesce(p_rows -> 'steps', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    routine_id = EXCLUDED.routine_id, position = EXCLUDED.position,
    library_step_id = EXCLUDED.library_step_id, title = EXCLUDED.title,
    minutes = EXCLUDED.minutes, days_per_week = EXCLUDED.days_per_week,
    dimension = EXCLUDED.dimension, days = EXCLUDED.days, start_min = EXCLUDED.start_min,
    goes_to = EXCLUDED.goes_to, goes_to_set = EXCLUDED.goes_to_set,
    asks = EXCLUDED.asks, asks_set = EXCLUDED.asks_set;

  INSERT INTO life_plan_routine_split_days
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_split_days,
    coalesce(p_rows -> 'split_days', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    routine_id = EXCLUDED.routine_id, position = EXCLUDED.position, name = EXCLUDED.name;

  INSERT INTO life_plan_experiences
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_experiences,
    coalesce(p_rows -> 'experiences', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, title = EXCLUDED.title, area_id = EXCLUDED.area_id,
    goal_id = EXCLUDED.goal_id, done = EXCLUDED.done, done_on = EXCLUDED.done_on;

  INSERT INTO life_plan_fields
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_fields,
    coalesce(p_rows -> 'fields', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label, kind = EXCLUDED.kind,
    target_id = EXCLUDED.target_id, read_source_id = EXCLUDED.read_source_id;

  INSERT INTO life_plan_sub_steps
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_sub_steps,
    coalesce(p_rows -> 'sub_steps', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, target_id = EXCLUDED.target_id, title = EXCLUDED.title;

  -- ------------------------------------------------- link and list tables
  -- Replaced wholesale. Nothing points at one of these rows, so nothing can be
  -- orphaned by rewriting them, and a pair table has no stable id to upsert on.
  DELETE FROM life_plan_goal_feeds f
   USING life_plan_goals g
   WHERE f.goal_id = g.id AND g.plan_id = v_plan_id;
  INSERT INTO life_plan_goal_feeds
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_feeds,
    coalesce(p_rows -> 'goal_feeds', '[]'::jsonb));

  DELETE FROM life_plan_goal_serves s
   USING life_plan_goals g
   WHERE s.goal_id = g.id AND g.plan_id = v_plan_id;
  INSERT INTO life_plan_goal_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_serves,
    coalesce(p_rows -> 'goal_serves', '[]'::jsonb));

  DELETE FROM life_plan_routine_serves s
   USING life_plan_routines r
   WHERE s.routine_id = r.id AND r.plan_id = v_plan_id;
  INSERT INTO life_plan_routine_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_serves,
    coalesce(p_rows -> 'routine_serves', '[]'::jsonb));

  DELETE FROM life_plan_step_serves ss
   USING life_plan_routine_steps st, life_plan_routines r
   WHERE ss.step_id = st.id AND st.routine_id = r.id AND r.plan_id = v_plan_id;
  INSERT INTO life_plan_step_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_step_serves,
    coalesce(p_rows -> 'step_serves', '[]'::jsonb));

  DELETE FROM life_plan_values WHERE plan_id = v_plan_id;
  INSERT INTO life_plan_values
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_values,
    coalesce(p_rows -> 'values', '[]'::jsonb));

  DELETE FROM life_plan_answers WHERE plan_id = v_plan_id;
  INSERT INTO life_plan_answers
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_answers,
    coalesce(p_rows -> 'answers', '[]'::jsonb));

  -- ------------------------------------------------------------- the plan
  -- `seq` may only ever rise: it is the id counter, and letting a stale device
  -- lower it would mint an id that already belongs to something else.
  UPDATE life_plans
     SET version = coalesce((p_rows ->> 'version')::int, version),
         seq = greatest(seq, coalesce((p_rows ->> 'seq')::int, 0)),
         season_focus_id = (p_rows ->> 'season_focus_id')::uuid,
         revision = revision + 1
   WHERE id = v_plan_id
  RETURNING revision INTO v_rev;

  RETURN v_rev;
END;
$$;

-- The signed-in person may call it. It runs as them, so this grants no reach
-- beyond what their own policies already allow.
REVOKE ALL ON FUNCTION save_life_plan(JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_life_plan(JSONB, INTEGER) TO authenticated;


-- ============================================================================
-- THE DAY TABLES ARE NOT REACHABLE FROM HERE, and it is asserted rather than
-- remembered. If a later edit adds a write to one of them, this fails loudly at
-- migration time instead of quietly a year later when somebody's journal goes.
-- ============================================================================
DO $$
DECLARE
  body TEXT;
  forbidden TEXT;
BEGIN
  SELECT prosrc INTO body FROM pg_proc WHERE proname = 'save_life_plan';

  FOREACH forbidden IN ARRAY ARRAY[
    'life_plan_days', 'life_plan_day_ratings', 'life_plan_day_ticks', 'life_plan_day_journal'
  ] LOOP
    IF body ~ ('(INSERT INTO|UPDATE|DELETE FROM)\s+' || forbidden) THEN
      RAISE EXCEPTION 'save_life_plan writes to %, which it must never do', forbidden;
    END IF;
  END LOOP;

  IF body !~ 'ERRCODE = ''55000''' THEN
    RAISE EXCEPTION 'save_life_plan has lost its revision lock';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'save_life_plan' AND prosecdef
  ) THEN
    RAISE EXCEPTION 'save_life_plan is SECURITY DEFINER; it must be INVOKER';
  END IF;

  RAISE NOTICE 'save_life_plan: invoker, revision-locked, cannot reach the day tables.';
END $$;
