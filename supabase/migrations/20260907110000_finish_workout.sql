-- Finishing a workout is one statement, or it is nothing.
--
-- WHY
-- ---
-- Finishing does two things that must both happen: the workout is closed
-- (its end, its length, how hard it was), and the program's weights move for
-- next time. They were two separate writes, so a failure between them left the
-- weights advanced with no workout to replay from — and there is no
-- client-side transaction in supabase-js to wrap them in. A function is the
-- only thing that is actually atomic here.
--
-- It is also the double-finish guard. A retry, a double tap, or two tabs would
-- otherwise each read "not finished yet", each compute the next weights, and
-- each apply them — advancing the program twice for one session. The row is
-- locked and re-checked inside the transaction, so the second caller is told
-- the workout is already finished rather than quietly doubling it.
--
-- SECURITY INVOKER, deliberately. The statements inside run as the signed-in
-- user, so the row rules on `workout_logs` and `program_enrollments` apply
-- exactly as they would from the app: a person can only finish their own
-- workout and only move their own program. DEFINER would bypass every one of
-- them, which is the whole reason `.claude/rules/database.md` says a policy is
-- not enforcement.
--
-- Idempotent: safe to re-run.

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
      notes = COALESCE(p_notes, notes)
  WHERE id = p_workout_id;

  RETURN p_workout_id;
END $$;

-- Nobody but a signed-in person, and never the anonymous role.
REVOKE ALL ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER
) TO authenticated;

COMMENT ON FUNCTION finish_program_workout IS
  'Closes a live workout and moves the program''s weights in one transaction. Refuses a second call for the same workout, so a retry cannot advance the program twice.';
