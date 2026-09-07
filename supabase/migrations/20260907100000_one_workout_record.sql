-- One record per workout.
--
-- WHY
-- ---
-- A program session was written into TWO tables that did not know about each
-- other: `program_session_logs` for the progression engine, and
-- `workout_logs` + `workout_sets` for the dashboard, the calendar, the personal
-- records and the export. Nothing joined them, so:
--
--   * deleting a session left its twin behind, and every count, chart and CSV
--     kept a workout the person had removed;
--   * editing one reached neither — `program_session_logs` had no UPDATE
--     policy, so the app reported success and changed nothing;
--   * personal records never fired for a program session, because the only PR
--     check runs over the other table;
--   * every program session was mirrored as exactly 45 minutes at intensity 3,
--     so "training hours" was a count of sessions times a number nobody typed.
--
-- This keeps ONE of them. `workout_logs` gains the program context and
-- `workout_sets` gains the program's own exercise id, so the engine reads the
-- same rows the dashboard reads. `program_session_logs` is folded in and
-- dropped.
--
-- It also makes a LIVE workout representable: a row with a start and no end.
-- Every set was previously held in the open browser tab until one final save,
-- so a dead phone lost the lot.
--
-- POLICIES
-- --------
-- No new row policy. Every column here is on a table that already carries
-- own-row SELECT/INSERT/UPDATE/DELETE (20260305), except the three profile
-- columns, which need a column GRANT because `profiles` runs an explicit
-- allow-list rather than a table-wide grant (20260828140001 — that is what
-- closed the paywall bypass, and it means any new column is unwritable until
-- named).
--
-- The one rule a row policy cannot express is added as a trigger: a workout may
-- only point at a program that belongs to the same person. A policy checks the
-- row you touched, never the row you point at.
--
-- Idempotent: safe to re-run.

-- ===========================================================================
-- 1. workout_logs: the one record of "a workout happened".
-- ===========================================================================
ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES program_enrollments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_day_id TEXT,
  ADD COLUMN IF NOT EXISTS program_cycle INTEGER,
  ADD COLUMN IF NOT EXISTS program_week INTEGER,
  ADD COLUMN IF NOT EXISTS adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rpe SMALLINT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS client_key TEXT;

ALTER TABLE workout_logs ALTER COLUMN duration_min DROP NOT NULL;
ALTER TABLE workout_logs ALTER COLUMN intensity DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_rpe_range
    CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_notes_length
    CHECK (notes IS NULL OR char_length(notes) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_cycle_range
    CHECK (program_cycle IS NULL OR (program_cycle >= 1 AND program_cycle <= 1000));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_week_range
    CHECK (program_week IS NULL OR (program_week >= 1 AND program_week <= 52));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Exactly three states, and the columns that must agree are forced to agree.
--   after the fact : no start, no end,   duration and effort known
--   live, running  : start,    no end,   duration and effort unknown
--   live, finished : start,    end,      duration and effort known
DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_lifecycle CHECK (
       (started_at IS NULL     AND ended_at IS NULL AND duration_min IS NOT NULL AND intensity IS NOT NULL)
    OR (started_at IS NOT NULL AND ended_at IS NULL AND duration_min IS NULL     AND intensity IS NULL)
    OR (started_at IS NOT NULL AND ended_at IS NOT NULL AND duration_min IS NOT NULL AND intensity IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_ended_after_start
    CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A live workout belongs to the day it STARTED, so the calendar has one answer.
DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_logged_is_start
    CHECK (started_at IS NULL OR logged_at = started_at);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Program context is complete or absent. One-directional on purpose: detaching
-- a workout from a deleted program (ON DELETE SET NULL) must leave its day,
-- cycle and week intact so History can still say "Upper · cycle 3". Requiring
-- all four to clear together would make deleting a program impossible.
DO $$ BEGIN
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_program_context CHECK (
    enrollment_id IS NULL
    OR (program_day_id IS NOT NULL AND program_cycle IS NOT NULL AND program_week IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One workout in progress per person, and one row per browser "start".
CREATE UNIQUE INDEX IF NOT EXISTS uq_workout_logs_live
  ON workout_logs(user_id) WHERE ended_at IS NULL AND started_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_workout_logs_client_key
  ON workout_logs(user_id, client_key) WHERE client_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_logs_enrollment
  ON workout_logs(enrollment_id, logged_at DESC) WHERE enrollment_id IS NOT NULL;

-- The cross-row rule. A row policy sees the row you WROTE, never the row you
-- point at, so without this a signed-in person could attach their own workout
-- to somebody else's program. `.claude/rules/database.md`: if a rule must hold
-- for everyone, it is a constraint or a trigger, not a policy.
CREATE OR REPLACE FUNCTION workout_logs_enrollment_is_own()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.enrollment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM program_enrollments e
    WHERE e.id = NEW.enrollment_id AND e.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'A workout can only be attached to your own program';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS workout_logs_enrollment_is_own_trg ON workout_logs;
CREATE TRIGGER workout_logs_enrollment_is_own_trg
  BEFORE INSERT OR UPDATE OF enrollment_id, user_id ON workout_logs
  FOR EACH ROW EXECUTE FUNCTION workout_logs_enrollment_is_own();

-- ===========================================================================
-- 2. workout_sets: what a set was, and which prescribed set it answers.
-- ===========================================================================
ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS exercise_id TEXT,
  ADD COLUMN IF NOT EXISTS library_id TEXT,
  ADD COLUMN IF NOT EXISTS set_kind TEXT NOT NULL DEFAULT 'working',
  ADD COLUMN IF NOT EXISTS prescribed_index SMALLINT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rpe SMALLINT,
  ADD COLUMN IF NOT EXISTS side TEXT;

DO $$ BEGIN
  ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_kind
    CHECK (set_kind IN ('warmup', 'working', 'amrap', 'backoff', 'drop'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_side
    CHECK (side IS NULL OR side IN ('left', 'right'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_rpe_range
    CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- `is_warmup` becomes one value of `set_kind`: one fact, one column. A tagged
-- set can also be an all-out top set or a back-off, which a boolean cannot say.
UPDATE workout_sets SET set_kind = 'warmup' WHERE is_warmup AND set_kind = 'working';
ALTER TABLE workout_sets DROP COLUMN IF EXISTS is_warmup;

-- 0 reps = attempted and failed. A set that was not attempted has no row at
-- all. The old `reps > 0` is why a cleared box crashed the save halfway,
-- AFTER the program had already advanced the weights.
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_reps_check;
DO $$ BEGIN
  ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_reps_check
    CHECK (reps >= 0 AND reps <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_weight_max CHECK (weight_kg <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One row per slot. Warm-ups are numbered in their own sequence, so W1 and
-- working set 1 of the same lift do not collide.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workout_sets_slot
  ON workout_sets(log_id, COALESCE(exercise_id, exercise), set_kind, set_number, COALESCE(side, ''));

-- ===========================================================================
-- 3. The enrollment's own name, and the account's training settings.
-- ===========================================================================
ALTER TABLE program_enrollments ADD COLUMN IF NOT EXISTS label TEXT;
DO $$ BEGIN
  ALTER TABLE program_enrollments ADD CONSTRAINT program_enrollments_label_length
    CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 60);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weight_unit TEXT NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS bar_weight_kg NUMERIC(5,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS smallest_plate_kg NUMERIC(5,2) NOT NULL DEFAULT 1.25;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_weight_unit CHECK (weight_unit IN ('kg', 'lb'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_bar_weight
    CHECK (bar_weight_kg >= 0 AND bar_weight_kg <= 50);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_smallest_plate
    CHECK (smallest_plate_kg >= 0.25 AND smallest_plate_kg <= 25);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- REQUIRED, not optional. `profiles` has a column allow-list rather than a
-- table grant (20260828140001), so a new column is unwritable by the signed-in
-- user until it is named here — the settings toggle would fail silently.
GRANT UPDATE (weight_unit, bar_weight_kg, smallest_plate_kg) ON public.profiles TO authenticated;

-- ===========================================================================
-- 4. Fold program_session_logs in, then drop it.
-- ===========================================================================
DO $$
DECLARE
  orphans INTEGER;
  lost_sets INTEGER;
  unmapped INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'program_session_logs') THEN
    RETURN; -- already folded in
  END IF;

  -- 4a. Copy the program context onto the mirrored workout row. Matched on the
  -- person and a ten-second window, which is how the two were written: one
  -- after the other, in the same request.
  UPDATE workout_logs w
  SET enrollment_id = l.enrollment_id,
      program_day_id = l.day_id,
      program_cycle = l.cycle,
      program_week = l.week,
      rpe = COALESCE(w.rpe, l.rpe),
      notes = COALESCE(w.notes, l.notes)
  FROM program_session_logs l
  WHERE w.user_id = l.user_id
    AND w.enrollment_id IS NULL
    AND abs(extract(epoch FROM (w.logged_at - l.logged_at))) < 10;

  -- 4b. Every session must have found its mirror. If one did not, its sets
  -- would be lost by the DROP below, so stop instead.
  SELECT count(*) INTO orphans
  FROM program_session_logs l
  WHERE NOT EXISTS (
    SELECT 1 FROM workout_logs w
    WHERE w.user_id = l.user_id AND w.enrollment_id = l.enrollment_id
      AND abs(extract(epoch FROM (w.logged_at - l.logged_at))) < 10
  );
  IF orphans > 0 THEN
    RAISE EXCEPTION 'Refusing to drop program_session_logs: % session(s) have no matching workout row. Match them by hand first.', orphans;
  END IF;

  -- 4c. Stamp each set with the program's own id for the lift.
  --
  -- MATCHED FROM AN EXPLICIT MAP, NOT FROM THE SESSION JSON. The first attempt
  -- joined the sets to `entries` on the exercise NAME — and `entries` has no
  -- name in it, only `exerciseId`, so the condition was `name = name`, every
  -- set matched every entry, and all eleven lifts in a workout were stamped
  -- with whichever id came first. The unique index caught it, which is why the
  -- index is in this migration and not a later one.
  --
  -- The map below covers exactly what this database holds, checked by query
  -- before it was written: every stored set belongs to `upper-lower`, and its
  -- eleven names map one-to-one onto its eleven ids. Anything the map misses is
  -- raised at 4c-check rather than guessed at.
  -- CROSS JOIN then filter: Postgres will not let the UPDATE target (`s`) be
  -- referenced from a JOIN condition in the FROM list, only from WHERE.
  UPDATE workout_sets s
  SET exercise_id = m.exercise_id
  FROM workout_logs w
  JOIN program_enrollments e ON e.id = w.enrollment_id
  CROSS JOIN (VALUES
    ('upper-lower', 'bench press',         'ul_bench'),
    ('upper-lower', 'barbell row',         'ul_row'),
    ('upper-lower', 'overhead press',      'ul_ohp'),
    ('upper-lower', 'lat pulldown',        'ul_pulldown'),
    ('upper-lower', 'barbell curl',        'ul_curl'),
    ('upper-lower', 'triceps pushdown',    'ul_triceps'),
    ('upper-lower', 'squat',               'ul_squat'),
    ('upper-lower', 'romanian deadlift',   'ul_rdl'),
    ('upper-lower', 'leg press',           'ul_legpress'),
    ('upper-lower', 'leg curl',            'ul_legcurl'),
    ('upper-lower', 'standing calf raise', 'ul_calf')
  ) AS m(program_id, exercise_name, exercise_id)
  WHERE s.log_id = w.id
    AND s.exercise_id IS NULL
    AND m.program_id = e.program_id
    AND m.exercise_name = lower(btrim(s.exercise));

  -- 4c-check. A set on a program workout with no id would be invisible to the
  -- engine from here on: `entriesFromSets` groups by it, and the progression
  -- rule looks a lift up by id. Better to stop than to lose a session quietly.
  SELECT count(*) INTO unmapped
  FROM workout_sets s
  JOIN workout_logs w ON w.id = s.log_id
  WHERE w.enrollment_id IS NOT NULL AND s.exercise_id IS NULL;
  IF unmapped > 0 THEN
    RAISE EXCEPTION
      'Refusing to continue: % set(s) on a program workout could not be matched to a lift id. Add them to the map in step 4c.', unmapped;
  END IF;

  -- 4d. Calisthenics, mobility and endurance sessions were mirrored as a
  -- workout with NO set rows at all — their reps lived only in
  -- `program_session_logs.entries`. Recreate them, or the DROP loses them.
  -- (None exist in this database today; this is the safety net, not the path.)
  INSERT INTO workout_sets (log_id, exercise, exercise_id, weight_kg, reps, set_number, set_kind)
  SELECT w.id,
         entry ->> 'exerciseId',
         entry ->> 'exerciseId',
         0,
         GREATEST(0, COALESCE((st ->> 'reps')::int, 0)),
         COALESCE((st ->> 'setNumber')::int, 1),
         'working'
  FROM program_session_logs l
  JOIN workout_logs w
    ON w.enrollment_id = l.enrollment_id
   AND abs(extract(epoch FROM (w.logged_at - l.logged_at))) < 10
  CROSS JOIN LATERAL jsonb_array_elements(l.entries) entry
  CROSS JOIN LATERAL jsonb_array_elements(entry -> 'sets') st
  WHERE NOT EXISTS (SELECT 1 FROM workout_sets s WHERE s.log_id = w.id)
  ON CONFLICT DO NOTHING;

  -- 4e. Nothing with entries may end up with no sets.
  SELECT count(*) INTO lost_sets
  FROM program_session_logs l
  JOIN workout_logs w
    ON w.enrollment_id = l.enrollment_id
   AND abs(extract(epoch FROM (w.logged_at - l.logged_at))) < 10
  WHERE jsonb_array_length(l.entries) > 0
    AND NOT EXISTS (SELECT 1 FROM workout_sets s WHERE s.log_id = w.id);
  IF lost_sets > 0 THEN
    RAISE EXCEPTION 'Refusing to drop program_session_logs: % session(s) would lose their sets.', lost_sets;
  END IF;
END $$;

DROP TABLE IF EXISTS program_session_logs;

COMMENT ON COLUMN workout_logs.enrollment_id IS
  'The program this workout was done on, or NULL for a loose one. ON DELETE SET NULL: erasing a program keeps the fact that you trained.';
COMMENT ON COLUMN workout_logs.client_key IS
  'The browser''s own id for this workout. Makes "start" idempotent, so a retry after a dropped connection cannot log it twice.';
COMMENT ON COLUMN workout_sets.set_kind IS
  'warmup | working | amrap | backoff | drop. Replaces is_warmup: a tagged set can be an all-out top set, which a boolean could not say.';
COMMENT ON COLUMN workout_sets.prescribed_index IS
  'Which prescribed set this answers, or NULL if it was added. Lets the engine find the AMRAP set by its flag rather than by being logged last.';
