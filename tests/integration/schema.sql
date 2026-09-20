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
