-- Health & Appearance tracking tables
-- Phase 1-4: weight, sleep, workout, nutrition logging

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

-- RLS: users can only read/write their own data
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own weight logs" ON weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight logs" ON weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight logs" ON weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight logs" ON weight_logs FOR DELETE USING (auth.uid() = user_id);

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
CREATE POLICY "Users can read own sleep logs" ON sleep_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sleep logs" ON sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sleep logs" ON sleep_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sleep logs" ON sleep_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Workout Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('weights', 'cardio', 'mobility')),
  duration_min INTEGER NOT NULL CHECK (duration_min > 0 AND duration_min < 600),
  intensity SMALLINT NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, logged_at DESC);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own workout logs" ON workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout logs" ON workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout logs" ON workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout logs" ON workout_logs FOR DELETE USING (auth.uid() = user_id);

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

-- workout_sets inherits RLS from workout_logs via the FK.
-- But we need direct policies for Supabase client access.
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own workout sets" ON workout_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
CREATE POLICY "Users can insert own workout sets" ON workout_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
CREATE POLICY "Users can update own workout sets" ON workout_sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));
CREATE POLICY "Users can delete own workout sets" ON workout_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM workout_logs WHERE workout_logs.id = workout_sets.log_id AND workout_logs.user_id = auth.uid()));

-- ============================================================================
-- Nutrition Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quality_score SMALLINT NOT NULL CHECK (quality_score >= 1 AND quality_score <= 5),
  note TEXT NOT NULL DEFAULT '',
  protein_g NUMERIC(5,1),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON nutrition_logs(user_id, logged_at DESC);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own nutrition logs" ON nutrition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nutrition logs" ON nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition logs" ON nutrition_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nutrition logs" ON nutrition_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Add new linked metrics to goal enum constraint (if applicable)
-- The LINKED_METRICS array in goalEnums.ts now includes:
-- body_weight_current, sleep_hours_avg_weekly,
-- gym_sessions_weekly, gym_sessions_cumulative,
-- nutrition_quality_avg_weekly
-- ============================================================================
