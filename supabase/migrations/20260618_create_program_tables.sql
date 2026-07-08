-- Workout Programs (M1) — enrollments + session logs
-- Trackable fitness programs (StrongLifts 5×5, 5/3/1, …). The progression
-- engine (src/programs/programsService.ts) computes exercise_state + cursor
-- server-side; these are stored in the user's OWN row. Structurally identical
-- to workout_logs (personal, user-owned training data) → own-row CRUD policies,
-- mirroring the health tracking tables. No cross-user / earned / leaderboard
-- stake.  Idempotent: safe to re-run.

-- ============================================================================
-- Program Enrollments
-- ============================================================================
CREATE TABLE IF NOT EXISTS program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  unit_system TEXT NOT NULL CHECK (unit_system IN ('kg', 'lb')),
  exercise_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  cursor JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_enrollments_user_active
  ON program_enrollments(user_id, is_active);

-- At most one ACTIVE enrollment per (user, program). Discipline-level
-- "one active per discipline" is enforced server-side in programRepo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_program_enrollments_active
  ON program_enrollments(user_id, program_id) WHERE is_active;

ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own enrollments" ON program_enrollments FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own enrollments" ON program_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own enrollments" ON program_enrollments FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own enrollments" ON program_enrollments FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Program Session Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS program_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id TEXT NOT NULL,
  cycle INTEGER NOT NULL,
  week INTEGER NOT NULL,
  entries JSONB NOT NULL,
  rpe SMALLINT CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_session_logs_enrollment
  ON program_session_logs(enrollment_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_program_session_logs_user
  ON program_session_logs(user_id, logged_at DESC);

ALTER TABLE program_session_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own program logs" ON program_session_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own program logs" ON program_session_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own program logs" ON program_session_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
