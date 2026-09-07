-- Replay from what the person typed, and remember what was not a workout.
--
-- WHY
-- ---
-- Rebuilding an enrollment's weights ("replay") folds its history over the
-- state it started from. Two things were wrong with that:
--
--   1. THE STARTING STATE WAS NOT KEPT. `reviseSessionLog` re-seeded from the
--      CATALOGUE's level defaults, so somebody who entered their real 100 kg
--      squat, trained to 125 and then deleted one mistyped session had their
--      next squat computed from the catalogue's beginner 60 — silently. On a
--      self-built program, or any program with no level seeds, there was
--      nothing to seed from at all: the delete went through and then errored.
--
--   2. ONLY SESSIONS WERE IN THE HISTORY. Skipping a session advances the plan
--      without logging anything, a reset rewinds the cursor on purpose, and a
--      manual weight change is the lifter overruling the engine. None were
--      replayed, so deleting any one session re-prescribed every session that
--      had been skipped and quietly undid a reset.
--
-- Also adds the bar this program is trained on, because nothing could be
-- prescribed below the 20 kg Olympic bar: a lighter lifter's 15 kg press was
-- rounded up to 20 at enrolment and "deloading 10%" from 20 landed back on 20,
-- so they were stuck at a weight they could not lift with no way down.
--
-- NO NEW POLICY. All three columns are on `program_enrollments`, which already
-- carries own-row SELECT/INSERT/UPDATE/DELETE from
-- 20260618_create_program_tables.sql. Same personal, user-owned training data
-- as `exercise_state` beside them.
--
-- Idempotent: safe to re-run.

ALTER TABLE program_enrollments
  ADD COLUMN IF NOT EXISTS initial_exercise_state JSONB,
  ADD COLUMN IF NOT EXISTS replay_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bar_weight_kg NUMERIC(5,2);

DO $$ BEGIN
  ALTER TABLE program_enrollments
    ADD CONSTRAINT program_enrollments_bar_weight_sane
    CHECK (bar_weight_kg IS NULL OR (bar_weight_kg >= 0 AND bar_weight_kg <= 50));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN program_enrollments.initial_exercise_state IS
  'The state this enrollment started from — what the person typed at enrolment. Replay folds history over THIS, never over the catalogue''s defaults.';
COMMENT ON COLUMN program_enrollments.replay_events IS
  'Skips, resets and manual weight changes, in order: [{at, kind:"skip"}] | [{at, kind:"reset", cursor:true, weights:false}] | [{at, kind:"weight", exerciseId, to}].';
COMMENT ON COLUMN program_enrollments.bar_weight_kg IS
  'The bar this program is trained on, in kg. NULL follows the account default. A 15 kg or 10 kg bar is a real bar.';

-- ---------------------------------------------------------------------------
-- Backfill, with the check that makes it safe.
--
-- Read before writing (2026-09-07): all five existing enrollments still hold
-- exactly the weights they were seeded with, because every session ever logged
-- recorded the BOTTOM of its rep range — the one-tap save seeded the floor, and
-- the rule for adding weight is hitting the top. So no weight has ever
-- advanced, and the current state IS the starting state.
--
-- That is a fact about today's rows, not a law, so it is verified rather than
-- assumed: if any enrollment's stored weight differs from the weight of its
-- FIRST logged session, progress has happened, copying would invent a seed, and
-- this migration stops instead.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  drifted INTEGER;
BEGIN
  SELECT count(*) INTO drifted
  FROM program_enrollments e
  JOIN LATERAL (
    SELECT l.entries
    FROM program_session_logs l
    WHERE l.enrollment_id = e.id
    ORDER BY l.logged_at ASC
    LIMIT 1
  ) first_log ON true
  WHERE e.initial_exercise_state IS NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(first_log.entries) entry
      CROSS JOIN LATERAL jsonb_array_elements(entry -> 'sets') s
      WHERE e.exercise_state ? (entry ->> 'exerciseId')
        AND (e.exercise_state -> (entry ->> 'exerciseId') ->> 'workingWeight') IS NOT NULL
        AND (e.exercise_state -> (entry ->> 'exerciseId') ->> 'workingWeight')::numeric
            <> (s ->> 'weight')::numeric
    );

  IF drifted > 0 THEN
    RAISE EXCEPTION
      'Refusing to backfill: % enrollment(s) have progressed past their first logged session, so their current state is not their starting state. Reconstruct those seeds by hand before re-running.', drifted;
  END IF;
END $$;

UPDATE program_enrollments
SET initial_exercise_state = exercise_state
WHERE initial_exercise_state IS NULL;
