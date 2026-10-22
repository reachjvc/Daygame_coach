-- ============================================================================
-- THE PROGRAM FORMAT, PART A — new columns and tables, nothing removed.
--
-- Plans/program-builder.md, Phase 3.1. Additive only: every existing row keeps
-- every value it has, and the way back is
-- supabase/migrations/rollback/20261022100000_program_format_columns.down.sql.
--
--   1. RPE in half steps. `workout_sets.rpe` and `workout_logs.rpe` were
--      SMALLINT, so "8.5" — the RPE Starscream asks for on every top set — was
--      refused. NUMERIC(3,1), checked to 1–10 in steps of 0.5. On 2026-10-22
--      no row on production held an RPE at all, so nothing is converted but
--      the type.
--   2. A set says which slot of the program and which set group it answered,
--      and two new set kinds exist: a top set and a rest-pause set.
--   3. A running program keeps its own copy of the program it runs (`spec`,
--      with its format version), the day it started on the account's calendar
--      (`started_on`, for programs whose weeks run by the calendar) and the
--      maxes it was started with.
--   4. `program_versions`: every shape a running program has had, so the
--      history is judged against the version it was trained on (Q14).
--   5. `user_programs`: programs people build themselves, with the two saved
--      weeks that existed on 2026-10-22 copied in. `program_drafts` stays until
--      Phase 10.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RPE in half steps
-- ---------------------------------------------------------------------------
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_rpe_range;
ALTER TABLE workout_sets ALTER COLUMN rpe TYPE NUMERIC(3,1) USING rpe::numeric;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_rpe_range
  CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10 AND rpe * 2 = trunc(rpe * 2)));

ALTER TABLE workout_logs DROP CONSTRAINT IF EXISTS workout_logs_rpe_range;
ALTER TABLE workout_logs ALTER COLUMN rpe TYPE NUMERIC(3,1) USING rpe::numeric;
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_rpe_range
  CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10 AND rpe * 2 = trunc(rpe * 2)));

-- ---------------------------------------------------------------------------
-- 2. Which slot and set group a set answered; two more kinds of set
-- ---------------------------------------------------------------------------
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS slot_id TEXT;
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS set_group_id TEXT;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_slot_id_length
  CHECK (slot_id IS NULL OR char_length(slot_id) BETWEEN 1 AND 100);
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_set_group_id_length
  CHECK (set_group_id IS NULL OR char_length(set_group_id) BETWEEN 1 AND 100);

ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_kind;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_kind
  CHECK (set_kind IN ('warmup', 'working', 'amrap', 'backoff', 'drop', 'top', 'restpause'));

COMMENT ON COLUMN workout_sets.slot_id IS
  'The slot of the program this set answered (program format). "Last time" is per slot: Monday''s heavy bench and Friday''s volume bench are two histories of one lift.';
COMMENT ON COLUMN workout_sets.set_group_id IS
  'The set group within the slot (a top set, its back-offs). A back-off range is worked out from the group it names.';

-- ---------------------------------------------------------------------------
-- 3. A running program's own copy of its program
-- ---------------------------------------------------------------------------
ALTER TABLE program_enrollments ADD COLUMN IF NOT EXISTS spec JSONB;
ALTER TABLE program_enrollments ADD COLUMN IF NOT EXISTS spec_version INTEGER;
ALTER TABLE program_enrollments ADD COLUMN IF NOT EXISTS started_on DATE;
ALTER TABLE program_enrollments ADD COLUMN IF NOT EXISTS maxes JSONB;

-- The full shape is checked by the app on every read and write
-- (src/programs/spec/schema.ts); these stop a write that would make every
-- read of the row throw, and keep a stranger's program to 64 KB.
ALTER TABLE program_enrollments ADD CONSTRAINT program_enrollments_spec_shape
  CHECK (spec IS NULL OR (jsonb_typeof(spec) = 'object' AND octet_length(spec::text) <= 65536));
ALTER TABLE program_enrollments ADD CONSTRAINT program_enrollments_spec_version
  CHECK ((spec IS NULL) = (spec_version IS NULL) AND (spec_version IS NULL OR spec_version BETWEEN 2 AND 999));
ALTER TABLE program_enrollments ADD CONSTRAINT program_enrollments_maxes_shape
  CHECK (maxes IS NULL OR (jsonb_typeof(maxes) = 'object' AND octet_length(maxes::text) <= 8192));

COMMENT ON COLUMN program_enrollments.spec IS
  'The program this enrollment runs, in the program format, copied at start. Null on rows started before the format: those run the catalogue program converted on read.';
COMMENT ON COLUMN program_enrollments.started_on IS
  'The first day of the program on the account''s calendar. Programs whose weeks run by the calendar count from the Monday of this date''s week.';
COMMENT ON COLUMN program_enrollments.maxes IS
  'The maxes the program was started with, by lift, as typed. The numbers the program moves are in exercise_state.';

-- ---------------------------------------------------------------------------
-- 4. Every shape a running program has had
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version BETWEEN 1 AND 10000),
  spec JSONB NOT NULL,
  spec_version INTEGER NOT NULL CHECK (spec_version BETWEEN 2 AND 999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, version),
  CONSTRAINT program_versions_spec_shape
    CHECK (jsonb_typeof(spec) = 'object' AND octet_length(spec::text) <= 65536)
);

CREATE INDEX IF NOT EXISTS idx_program_versions_user ON program_versions(user_id);

-- Append-only from the app: a version is a fact about the past, so there is
-- no update or delete policy. Versions go when their enrollment goes.
ALTER TABLE program_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own program versions" ON program_versions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can add versions to own programs" ON program_versions
    FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM program_enrollments e
        WHERE e.id = program_versions.enrollment_id AND e.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE program_versions IS
  'Every version of a running program''s spec, numbered from 1 at start. A replay judges each session against the version in force when it was logged (Q14).';

-- ---------------------------------------------------------------------------
-- 5. Programs people build themselves
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  spec JSONB NOT NULL,
  spec_version INTEGER NOT NULL CHECK (spec_version BETWEEN 2 AND 999),
  -- The starting weights typed beside the program, by lift, in its unit.
  starting_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_program_id TEXT CHECK (source_program_id IS NULL OR char_length(source_program_id) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  CONSTRAINT user_programs_spec_shape
    CHECK (jsonb_typeof(spec) = 'object' AND octet_length(spec::text) <= 65536),
  CONSTRAINT user_programs_weights_shape
    CHECK (jsonb_typeof(starting_weights) = 'object' AND octet_length(starting_weights::text) <= 8192)
);

CREATE INDEX IF NOT EXISTS idx_user_programs_user ON user_programs(user_id, updated_at DESC);

-- A program somebody wrote is their own text about their own training:
-- nothing in it is earned or computed, so own-row CRUD, like program_drafts.
ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own programs" ON user_programs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own programs" ON user_programs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own programs" ON user_programs
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own programs" ON user_programs
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION user_programs_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_programs_updated_at ON user_programs;
CREATE TRIGGER trg_user_programs_updated_at
  BEFORE UPDATE ON user_programs
  FOR EACH ROW EXECUTE FUNCTION user_programs_touch_updated_at();

COMMENT ON TABLE user_programs IS
  'Programs people build themselves, in the program format. Private to their owner (Q6).';

-- ---------------------------------------------------------------------------
-- 6. The saved weeks that existed on 2026-10-22, copied in
--
-- Two rows, both the owner's, both made in July from old saved workouts. Each
-- is written here already converted by src/programs/spec/fromLegacy.ts (as a
-- draft: week "2" has a day with nothing in it yet), keyed by the draft it
-- came from, so on any database without those drafts — the test backend — this
-- inserts nothing. Run twice, it inserts nothing the second time.
-- ---------------------------------------------------------------------------
INSERT INTO user_programs (user_id, name, spec, spec_version, starting_weights, source_program_id, created_at, updated_at)
SELECT d.user_id, d.name, v.spec, 2, d.working_weights, d.source_program_id, d.created_at, d.updated_at
FROM (VALUES
  ('2ee2dd14-42a9-4e69-9420-dd3c66dc94ac'::uuid,
   '{"specVersion":2,"name":"2","unit":"kg","calendar":{"days":"in-order","weekCounting":"completed","lengthWeeks":null,"atEnd":"repeat"},"days":[{"id":"day1","label":"2","slots":[]}]}'::jsonb),
  ('e63befb5-4014-458b-b09e-50f38c27fb49'::uuid,
   '{"specVersion":2,"name":"12","unit":"kg","calendar":{"days":"in-order","weekCounting":"completed","lengthWeeks":null,"atEnd":"repeat"},"days":[{"id":"day1","label":"12","slots":[{"id":"incline","lift":{"name":"incline","loadStyle":"free"},"sets":[{"id":"work","kind":"working","count":3,"reps":8,"load":{"from":"working"}}],"progression":{"kind":"hold"}}]}]}'::jsonb)
) AS v(draft_id, spec)
JOIN program_drafts d ON d.id = v.draft_id
ON CONFLICT (user_id, name) DO NOTHING;
