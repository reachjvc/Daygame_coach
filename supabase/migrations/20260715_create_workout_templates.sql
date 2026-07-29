-- ============================================================================
-- Workout Templates — user-saved workout presets that prefill the logger form.
-- User-entered data (not earned/computed) → standard own-row CRUD RLS,
-- same pattern as workout_logs (20260305_create_health_tracking_tables.sql).
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  session_type TEXT NOT NULL CHECK (session_type IN ('weights', 'cardio', 'mobility', 'yoga', 'running')),
  duration_min INTEGER CHECK (duration_min IS NULL OR (duration_min > 0 AND duration_min < 600)),
  intensity SMALLINT NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  distance_km NUMERIC(6,2) CHECK (distance_km IS NULL OR (distance_km >= 0 AND distance_km <= 1000)),
  -- Template sets are prefill payloads, not analytics rows → JSONB, validated
  -- at the API layer. Shape: [{ "exercise": text, "weight_kg": num, "reps": int }]
  sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id, created_at DESC);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own workout templates" ON workout_templates FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own workout templates" ON workout_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own workout templates" ON workout_templates FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own workout templates" ON workout_templates FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
