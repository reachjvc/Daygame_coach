-- ---------------------------------------------------------------------------
-- CORRECTING OR DELETING A FINISHED WORKOUT IS ONE TRANSACTION.
--
-- NOT APPLIED, AND OUT OF THE PUSH PATH. This file is written and waiting for
-- the owner: the two GRANTs at the bottom are a permission change, which is
-- theirs to approve. Nothing in the app calls these functions yet, so applying
-- it changes nothing on its own and NOT applying it breaks nothing —
-- `deleteWorkoutLog` and `reviseWorkout` still do what they do today.
--
-- IT SITS IN `supabase/pending-owner-approval/`, OUTSIDE `migrations/`, because
-- `supabase db push` takes every unapplied migration in that folder at once.
-- Left there, nobody else could ship an unrelated migration without also
-- shipping this permission change — which is somebody else deciding a question
-- that was parked for the owner. Outside the folder rather than in a subfolder
-- of it: `migrations/` is globbed by the CLI and read entry-by-entry by
-- `tests/unit/shared/weight.test.ts`, and a directory inside it is a surprise
-- to both. Move the file into `supabase/migrations/` when it is approved;
-- nothing else about it changes.
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
    set_kind, side, notes, exercise_notes, rpe
  )
  SELECT
    p_workout_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
    s.set_number, s.set_kind, s.side, s.notes, s.exercise_notes, s.rpe
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
    rpe SMALLINT
  );

  RETURN p_workout_id;
END $$;

-- Nobody but a signed-in person, and never the anonymous role. These two lines
-- are the permission change this file asks the owner to approve.
REVOKE ALL ON FUNCTION delete_program_workout(UUID, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_program_workout(UUID, JSONB, JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION revise_program_workout(UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revise_program_workout(UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;
