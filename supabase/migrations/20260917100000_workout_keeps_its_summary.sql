-- A finished workout keeps the receipt it showed you.
--
-- WHY
-- ---
-- When a workout is saved the screen tells you two things: what you beat ("New
-- best: Squat 105 kg × 5") and what the program will ask for next time
-- ("Squat: +2.5 kg"). Neither was written down anywhere. The only copy was the
-- reply to the Save request — so if that reply was lost on gym wifi, or you
-- opened the workout again later, the app had to work the answer out a second
-- time from scratch.
--
-- Working it out again is not the same answer. Both depend on the state of the
-- program at the moment the workout was finished, and editing the program
-- afterwards changes it; for a program started before June it cannot be
-- computed at all, because its starting weights were never kept. So the app
-- would have shown a receipt that quietly disagreed with the one it printed at
-- the time, or none.
--
-- Both are now written in the SAME statement that closes the workout, so the
-- receipt is exactly what the screen said.
--
-- NULL MEANS "NOT KEPT", NEVER "NONE". Every workout finished before this
-- migration has null in both columns, and the receipt for one of those says so
-- rather than claiming nothing changed and nothing was beaten.
--
-- No policy changes, no column dropped, no row deleted.

ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS progression_changes JSONB,
  ADD COLUMN IF NOT EXISTS personal_records JSONB;

COMMENT ON COLUMN workout_logs.progression_changes IS
  'What the finish screen said the program would do next time. NULL means it was not kept (any workout finished before 2026-09-17), never "nothing changed".';
COMMENT ON COLUMN workout_logs.personal_records IS
  'The bests and first-time lifts the finish screen named: { records, firstTimeLifts }. NULL means it was not kept, or the history could not be read — never "nothing was beaten".';

-- The finish itself gains the two values. The whole signature is replaced, so
-- the old one is dropped first — Postgres would otherwise keep both and
-- PostgREST would not know which one the app meant.
DROP FUNCTION IF EXISTS finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER
);

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
  p_expected_session_count INTEGER,
  -- The receipt, written in this same transaction so it cannot drift from what
  -- the screen showed. NULL for either means "not kept", not "empty".
  p_changes JSONB,
  p_records JSONB
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
      notes = COALESCE(p_notes, notes),
      progression_changes = p_changes,
      personal_records = p_records
  WHERE id = p_workout_id;

  RETURN p_workout_id;
END $$;

-- Nobody but a signed-in person, and never the anonymous role.
REVOKE ALL ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB
) TO authenticated;

COMMENT ON FUNCTION finish_program_workout IS
  'Closes a live workout, moves the program''s weights and writes the receipt the screen showed — all in one transaction. Refuses a second call for the same workout, so a retry cannot advance the program twice.';
