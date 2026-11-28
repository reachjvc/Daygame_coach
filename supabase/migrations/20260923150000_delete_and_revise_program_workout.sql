-- ---------------------------------------------------------------------------
-- CORRECTING OR DELETING A FINISHED WORKOUT IS ONE TRANSACTION.
--
-- APPROVED AND MOVED HERE 2026-11-28, by the owner, out of
-- `supabase/pending-owner-approval/` (it had waited there since 2026-09-23).
-- Being in this folder is not the same as being applied: `supabase db push`
-- takes every pending file here at once, so `supabase migration list --remote`
-- comes first and says what else would go with it. The file's stamp is older
-- than production's newest migration, so a plain push refuses it and
-- `--include-all` is needed.
--
-- THE TWO GRANTs AT THE BOTTOM ARE A PERMISSION CHANGE, and that is what the
-- approval covers. Nothing in the app calls these functions yet, so applying
-- it changes nothing on its own: `deleteWorkoutLog` and `reviseWorkout` still
-- do what they do today.
--
-- THREE FIXES MADE AT THE MOVE, 2026-11-28, found by the first test that ever
-- called these functions as a signed-in person (tests/integration/db/
-- deleteAndReviseWorkout.integration.test.ts). The file was written before
-- 20261022110000 and had never run against the schema as it is now:
--   1. BOTH functions now start with `set_config('app.program_engine', 'on')`,
--      as `finish_program_workout` and `replace_sets_and_replay` do. Without
--      it `program_numbers_only_by_the_app` refused the program write with
--      42501, so every delete and every correction of a program workout failed.
--   2. `revise_program_workout` now writes `completed_at`, `prescribed_index`,
--      `slot_id` and `set_group_id` too. It named twelve columns and left those
--      four NULL on every corrected row: the same loss
--      20260927120000_corrections_keep_set_order.sql repaired for the other
--      correction function. Two small matches to that function: `rpe` is read
--      as NUMERIC (the column takes half steps, 6.5; SMALLINT cut them), and a
--      missing `set_kind` becomes 'working' instead of failing NOT NULL.
--   3. The anonymous role is revoked by name. `REVOKE ... FROM PUBLIC` does not
--      take away the direct grant this project's default privileges give
--      `anon`, so "never the anonymous role" was not true. The signed-in grant
--      is unchanged: this narrows, it widens nothing.
--
-- WHAT IS WRONG TODAY. Deleting a session that belongs to a program is two
-- writes: delete the row, then recalculate the weights the program had worked
-- up to. A failure between them reports a completed delete as failed and
-- leaves the weights standing on a session that no longer exists. Correcting
-- one has the same shape: the sets are replaced, and then the program is
-- recalculated from them.
--
-- Modelled on `finish_program_workout` (20260919100000) with two deliberate
-- differences:
--
--   * the lock predicate is the FINISHED one. Finish's is `ended_at IS NULL`,
--     which would refuse every workout these two exist for.
--   * a NULL `p_exercise_state` skips the enrollment block entirely, which is
--     a loose workout, or a program row whose enrollment has since been
--     deleted.
--
-- NO ROW-LEVEL POLICY IS ADDED OR CHANGED. Under SECURITY INVOKER the
-- statements run as the signed-in person against the policies that already
-- exist: own-row read/insert/update/delete on `workout_logs` and, through the
-- log, on `workout_sets` (20260305_create_health_tracking_tables.sql:81-121),
-- and own-row update on `program_enrollments`
-- (20260618_create_program_tables.sql:41). A person who could not delete their
-- workout before still cannot.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION delete_program_workout(
  p_workout_id UUID,
  -- NULL for a workout with no program: the enrollment block is skipped.
  p_exercise_state JSONB,
  p_cursor JSONB,
  -- What the caller believed the program had done when it replayed it. If the
  -- program has moved since, that replay is stale and this is refused.
  p_expected_session_count INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_enrollment UUID;
BEGIN
  -- The program's numbers may be written only by the app's own program
  -- functions (`program_numbers_only_by_the_app`); this is one of them.
  PERFORM set_config('app.program_engine', 'on', true);

  -- Lock the workout and confirm it is FINISHED. A workout still open has a
  -- screen of its own and a Discard of its own.
  SELECT enrollment_id INTO v_enrollment
  FROM workout_logs
  WHERE id = p_workout_id AND (ended_at IS NOT NULL OR started_at IS NULL)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout is not there any more — reload to see where it got to'
      USING ERRCODE = '55000';
  END IF;

  IF v_enrollment IS NOT NULL AND p_exercise_state IS NOT NULL THEN
    PERFORM 1
    FROM program_enrollments
    WHERE id = v_enrollment
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being deleted — reload and try again'
        USING ERRCODE = '55000';
    END IF;

    UPDATE program_enrollments
    SET exercise_state = p_exercise_state,
        cursor = p_cursor
    WHERE id = v_enrollment;
  END IF;

  -- The sets go with it: `workout_sets.log_id` cascades.
  DELETE FROM workout_logs WHERE id = p_workout_id;

  RETURN p_workout_id;
END $$;

CREATE OR REPLACE FUNCTION revise_program_workout(
  p_workout_id UUID,
  -- The whole set list as it should be after the correction. The rows are
  -- replaced, not merged: the editor shows exactly what will remain.
  p_sets JSONB,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_expected_session_count INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_enrollment UUID;
BEGIN
  -- The program's numbers may be written only by the app's own program
  -- functions (`program_numbers_only_by_the_app`); this is one of them.
  PERFORM set_config('app.program_engine', 'on', true);

  SELECT enrollment_id INTO v_enrollment
  FROM workout_logs
  WHERE id = p_workout_id AND (ended_at IS NOT NULL OR started_at IS NULL)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout is not there any more — reload to see where it got to'
      USING ERRCODE = '55000';
  END IF;

  IF v_enrollment IS NOT NULL AND p_exercise_state IS NOT NULL THEN
    PERFORM 1
    FROM program_enrollments
    WHERE id = v_enrollment
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being corrected — reload and try again'
        USING ERRCODE = '55000';
    END IF;

    UPDATE program_enrollments
    SET exercise_state = p_exercise_state,
        cursor = p_cursor
    WHERE id = v_enrollment;
  END IF;

  DELETE FROM workout_sets WHERE log_id = p_workout_id;

  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe, completed_at, prescribed_index,
    slot_id, set_group_id
  )
  SELECT
    p_workout_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
    s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
    s.exercise_notes, s.rpe, s.completed_at, s.prescribed_index,
    s.slot_id, s.set_group_id
  FROM jsonb_to_recordset(p_sets) AS s(
    exercise TEXT,
    exercise_id TEXT,
    library_id TEXT,
    weight_kg NUMERIC,
    reps INTEGER,
    set_number INTEGER,
    set_kind TEXT,
    side TEXT,
    notes TEXT,
    exercise_notes TEXT,
    rpe NUMERIC,
    completed_at TIMESTAMPTZ,
    prescribed_index SMALLINT,
    slot_id TEXT,
    set_group_id TEXT
  );

  RETURN p_workout_id;
END $$;

-- Nobody but a signed-in person, and never the anonymous role. These two lines
-- are the permission change the owner approved.
REVOKE ALL ON FUNCTION delete_program_workout(UUID, JSONB, JSONB, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION delete_program_workout(UUID, JSONB, JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION revise_program_workout(UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION revise_program_workout(UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;
