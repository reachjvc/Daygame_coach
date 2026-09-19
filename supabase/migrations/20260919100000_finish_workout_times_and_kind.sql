-- ---------------------------------------------------------------------------
-- A WORKOUT WRITTEN UP AFTERWARDS NEEDS TO SAY WHEN IT HAPPENED.
--
-- Everything the app records about a workout is written when you finish it, in
-- one transaction — except the time it STARTED, which is fixed when you press
-- Start and cannot be changed afterwards. That was fine while the only way to
-- record a workout was to do it live. It stops being fine the moment you write
-- up Tuesday's session on Thursday: the workout is filed under Thursday, the
-- minutes are the wall-clock gap since you pressed Start, and the day you
-- actually trained is recorded nowhere.
--
-- THREE MORE PARAMETERS, all optional, all NULL-means-leave-it-alone:
--
--   p_started_at    moves `started_at` AND `logged_at` together, because
--                   `workout_logs_logged_is_start` requires them to be equal.
--                   `workout_logs_ended_after_start` then refuses an end
--                   before the new start, which is exactly the check we want
--                   and one the app cannot forget.
--   p_session_type  what kind of session it was. A run started through the
--                   loose-workout path was stored as a gym session, so it
--                   appeared in no running total anywhere.
--   p_distance_km   how far. Passed through as given, so NULL clears it.
--
-- BUILT ON 20260917100000, NOT on 20260907110000. That earlier migration is
-- where this function was born, but Phase 0 has since added `p_changes` and
-- `p_records` — the receipt. Dropping the ten-parameter signature would have
-- left the twelve-parameter one in place and created a THIRD overload beside
-- it. The DROP below names the signature that is actually on the database.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB
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
  p_records JSONB,
  -- When the session really happened, what kind it was, and how far.
  p_started_at TIMESTAMPTZ DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL,
  p_distance_km NUMERIC DEFAULT NULL
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
      personal_records = p_records,
      -- Together, always: `workout_logs_logged_is_start` requires it, and a
      -- session filed under the day you wrote it up rather than the day you
      -- did it is the fault this exists to fix.
      started_at = COALESCE(p_started_at, started_at),
      logged_at = COALESCE(p_started_at, logged_at),
      session_type = COALESCE(p_session_type, session_type),
      distance_km = p_distance_km
  WHERE id = p_workout_id;

  RETURN p_workout_id;
END $$;

-- Nobody but a signed-in person, and never the anonymous role.
REVOKE ALL ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) TO authenticated;

COMMENT ON FUNCTION finish_program_workout IS
  'Closes a live workout, moves the program''s weights and writes the receipt the screen showed — all in one transaction. Refuses a second call for the same workout, so a retry cannot advance the program twice. Also sets, when given: the start instant (started_at and logged_at together, so a session written up later is filed under the day it happened), the session kind, and the distance.';

-- ---------------------------------------------------------------------------
-- A DISTANCE NOBODY CAN MAKE NONSENSE OF.
--
-- `distance_km NUMERIC(6,2)` bounds the DIGITS and nothing else, so −5 km and
-- 9,999 km were both storable — by the app, by a script, by anything holding
-- the service key. A policy is not enforcement; a CHECK is. 1000 matches the
-- app's own MAX_DISTANCE_KM.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE workout_logs
    ADD CONSTRAINT workout_logs_distance_range
    CHECK (distance_km IS NULL OR (distance_km >= 0 AND distance_km <= 1000));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
