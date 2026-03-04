-- Health & Appearance tracking tables
-- Phase 1-4: weight, sleep, workout, nutrition logging
-- Idempotent: safe to re-run

-- ============================================================================
-- Weight Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'post_workout', 'evening')),
  photo_url TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, logged_at DESC);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own weight logs" ON weight_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own weight logs" ON weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own weight logs" ON weight_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own weight logs" ON weight_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Sleep Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bedtime TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  quality SMALLINT NOT NULL DEFAULT 3 CHECK (quality >= 1 AND quality <= 5),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, logged_at DESC);

ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own sleep logs" ON sleep_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own sleep logs" ON sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own sleep logs" ON sleep_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own sleep logs" ON sleep_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Workout Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('weights', 'cardio', 'mobility', 'yoga', 'running')),
  duration_min INTEGER NOT NULL CHECK (duration_min > 0 AND duration_min < 600),
  intensity SMALLINT NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  distance_km NUMERIC(6,2),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, logged_at DESC);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own workout logs" ON workout_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own workout logs" ON workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own workout logs" ON workout_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own workout logs" ON workout_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Workout Sets (child of workout_logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg >= 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  set_number INTEGER NOT NULL CHECK (set_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_log ON workout_sets(log_id);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own workout sets" ON workout_sets FOR SELECT
    USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own workout sets" ON workout_sets FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own workout sets" ON workout_sets FOR UPDATE
    USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own workout sets" ON workout_sets FOR DELETE
    USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Nutrition Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quality_score SMALLINT NOT NULL CHECK (quality_score >= 1 AND quality_score <= 5),
  note TEXT NOT NULL DEFAULT '',
  protein_g NUMERIC(5,1),
  calories INTEGER CHECK (calories IS NULL OR (calories > 0 AND calories < 10000)),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON nutrition_logs(user_id, logged_at DESC);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own nutrition logs" ON nutrition_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own nutrition logs" ON nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own nutrition logs" ON nutrition_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own nutrition logs" ON nutrition_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Body Measurements
-- ============================================================================
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('chest', 'waist', 'hips', 'arms', 'thighs', 'neck', 'shoulders', 'calves')),
  value_cm NUMERIC(5,1) NOT NULL CHECK (value_cm > 0 AND value_cm < 300),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, logged_at DESC);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own body measurements" ON body_measurements FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own body measurements" ON body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own body measurements" ON body_measurements FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own body measurements" ON body_measurements FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Backfill columns for tables that may already exist from earlier partial run
-- ============================================================================

-- Add distance_km to workout_logs if missing
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2);

-- Add calories to nutrition_logs if missing
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS calories INTEGER CHECK (calories IS NULL OR (calories > 0 AND calories < 10000));

-- Expand session_type CHECK on workout_logs to include yoga/running
-- Drop old constraint, add new one (idempotent via IF EXISTS)
DO $$ BEGIN
  ALTER TABLE workout_logs DROP CONSTRAINT IF EXISTS workout_logs_session_type_check;
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_session_type_check
    CHECK (session_type IN ('weights', 'cardio', 'mobility', 'yoga', 'running'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
