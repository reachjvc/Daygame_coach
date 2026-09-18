-- Every write that moves a program happens completely, or not at all.
--
-- WHY
-- ---
-- Six buttons in the gym screens each wrote two or three separate things with
-- nothing holding them together, because there is no way to wrap two requests
-- in one transaction from the browser or from a Next.js route. What that cost,
-- in plain language:
--
--   * "Start this program" switched the old program OFF and then inserted the
--     new one. If the insert was refused you were left on no program at all.
--   * "Run it again" did the same two steps in the same order.
--   * Deleting a past session removed the session and then recalculated the
--     weights in a second write. The delete committed; the recalculation could
--     fail; the weights then stayed where the deleted session had put them,
--     for ever, and the screen said the delete had failed.
--   * Correcting a session deleted every set, inserted the new ones, and put
--     the old ones back by hand if that failed — a rollback written in
--     application code, which is exactly what a database does for free.
--   * Writing up a session after the fact inserted the workout, then the sets,
--     then advanced the program: three writes, so a failure part-way left a
--     session with no sets, or a program advanced by a session with none.
--
-- Each of these is now one function, and a function is one transaction. If any
-- part of it is refused, none of it happened.
--
-- WHAT THIS DOES NOT DO. Two tabs starting two DIFFERENT strength programs at
-- the same moment can still both end up running: "one program per kind of
-- training" is not a rule the database can enforce, because which kind a
-- program is lives in the app's catalogue and not in any column. That state was
-- representable before this migration and still is. It is named here so nobody
-- reads "one statement" as "no race".
--
-- WHOSE ROWS. Every function is SECURITY INVOKER, exactly like
-- `finish_program_workout` — it runs as the signed-in person under the existing
-- row rules, so it can only read and write that person's own rows. It adds no
-- row rule and changes none. The only permission it adds is the right for a
-- signed-in person to CALL these six (the GRANTs at the bottom), the same right
-- `finish_program_workout` already has.
--
-- ONE OWNER FOR "IS A WORKOUT OPEN ON THIS PROGRAM". None of these functions
-- asks that question. The trigger `program_busy_while_workout_open`
-- (20260917100100) already refuses to switch a program off while a workout is
-- open on it, for everybody including scripts — so ending a program, and
-- pausing one to make room for another, are refused by the trigger the moment
-- they try to write, with the same sentence. Asking twice would be two places
-- to change one rule.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Stop prescribing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION end_enrollment(p_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Not filtered on `is_active`: ending a program that is already ended is a
  -- no-op that succeeded, and answering "not found" for it would be a sentence
  -- nobody can act on. A row belonging to somebody else is invisible under the
  -- row rules, so it reaches the NOT FOUND below instead.
  UPDATE program_enrollments SET is_active = false WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That program is not on your account' USING ERRCODE = '55000';
  END IF;

  RETURN p_id;
END $$;

-- ---------------------------------------------------------------------------
-- Start one, pausing whatever it makes room for.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION start_enrollment(p_row JSONB, p_displace UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
  v_new program_enrollments;
BEGIN
  -- WHY THE PAUSE COMES FIRST. Both statements are inside one function, so they
  -- are inside one transaction: if the insert is refused, the pause is undone
  -- with it and the program you were on is still running — which is the rule
  -- this function exists for. Ordering it the other way would additionally
  -- break starting the same program again from scratch, because
  -- `uq_program_enrollments_active` allows only one live row per program and
  -- the old one would still be live when the new one went in.
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;

  -- The row the app built, field by field. `jsonb_populate_record` against a
  -- NULL row gives NULL for anything the app did not send, so every column that
  -- has a default is written explicitly rather than nulled out.
  SELECT * INTO v_row FROM jsonb_populate_record(null::program_enrollments, p_row);

  INSERT INTO program_enrollments (
    user_id, program_id, level, unit_system,
    exercise_state, initial_exercise_state, cursor,
    custom_schedule, replay_events, bar_weight_kg, label, is_active
  ) VALUES (
    v_row.user_id, v_row.program_id, v_row.level, v_row.unit_system,
    v_row.exercise_state, v_row.initial_exercise_state, v_row.cursor,
    v_row.custom_schedule, COALESCE(v_row.replay_events, '[]'::jsonb),
    v_row.bar_weight_kg, v_row.label, true
  )
  RETURNING * INTO v_new;

  RETURN to_jsonb(v_new);
END $$;

-- ---------------------------------------------------------------------------
-- Pick a finished one back up, at the weights it was left at.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resume_enrollment(p_id UUID, p_displace UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
BEGIN
  -- Pausing first, for the same two reasons as `start_enrollment`: one
  -- transaction makes the order irrelevant to safety, and only one row per
  -- program may be live, so the running one has to go off before this one
  -- comes on.
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;

  UPDATE program_enrollments SET is_active = true
  WHERE id = p_id AND NOT is_active
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That program is already running, or is not on your account'
      USING ERRCODE = '55000';
  END IF;

  RETURN to_jsonb(v_row);
END $$;

-- ---------------------------------------------------------------------------
-- Remove one logged session and move the weights back, together.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_session_and_replay(
  p_log_id UUID,
  p_enrollment_id UUID,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_replay_events JSONB,
  -- How many sessions the app had counted when it worked out the new weights.
  -- If the program has moved since, that calculation describes a different
  -- history and is refused rather than written.
  p_expected_session_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
  v_gone UUID;
BEGIN
  PERFORM 1 FROM program_enrollments
  WHERE id = p_enrollment_id
    AND (cursor ->> 'sessionCount')::int = p_expected_session_count
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
      USING ERRCODE = '55000';
  END IF;

  -- The sets go with the workout (ON DELETE CASCADE), and so does its place in
  -- every count, chart and export — there is one record of a session now.
  DELETE FROM workout_logs
  WHERE id = p_log_id AND enrollment_id = p_enrollment_id
  RETURNING id INTO v_gone;

  IF v_gone IS NULL THEN
    RAISE EXCEPTION 'That session was not found, so nothing was deleted'
      USING ERRCODE = '55000';
  END IF;

  UPDATE program_enrollments
  SET exercise_state = p_exercise_state,
      cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $$;

-- ---------------------------------------------------------------------------
-- Correct a session's sets and move the weights, together.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION replace_sets_and_replay(
  p_log_id UUID,
  p_sets JSONB,
  -- NULL for a workout that answers no program: the sets are still replaced in
  -- one statement, there is simply nothing to recalculate.
  p_enrollment_id UUID,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_replay_events JSONB,
  p_expected_session_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row program_enrollments;
BEGIN
  IF p_enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = p_enrollment_id
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  -- The workout is locked, so the old sets can go before the new ones arrive:
  -- if the insert is refused, the delete never happened either. This is what
  -- replaces the hand-written "put the old rows back" rollback.
  PERFORM 1 FROM workout_logs WHERE id = p_log_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout no longer exists' USING ERRCODE = '55000';
  END IF;

  DELETE FROM workout_sets WHERE log_id = p_log_id;

  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe
  )
  SELECT p_log_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;

  IF p_enrollment_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE program_enrollments
  SET exercise_state = p_exercise_state,
      cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $$;

-- ---------------------------------------------------------------------------
-- Write up a session that already happened, and advance the program.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_session_and_advance(
  p_workout JSONB,
  p_sets JSONB,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_expected_session_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row workout_logs;
  v_id UUID;
BEGIN
  SELECT * INTO v_row FROM jsonb_populate_record(null::workout_logs, p_workout);

  INSERT INTO workout_logs (
    user_id, session_type, duration_min, intensity, distance_km,
    enrollment_id, program_day_id, program_cycle, program_week,
    adjustments, rpe, notes, client_key, logged_at
  ) VALUES (
    v_row.user_id, v_row.session_type, v_row.duration_min, v_row.intensity,
    v_row.distance_km, v_row.enrollment_id, v_row.program_day_id,
    v_row.program_cycle, v_row.program_week,
    COALESCE(v_row.adjustments, '{}'::jsonb), v_row.rpe, v_row.notes,
    v_row.client_key, COALESCE(v_row.logged_at, now())
  )
  ON CONFLICT (user_id, client_key) WHERE client_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  -- ALREADY WRITTEN. The same write-up arriving twice — a retry after a reply
  -- was lost on gym wifi — is the session that is already there, and the
  -- program must not be advanced a second time for it. Nothing is touched.
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM workout_logs
    WHERE user_id = v_row.user_id AND client_key = v_row.client_key;
    RETURN jsonb_build_object('workout_id', v_id, 'inserted', false);
  END IF;

  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe
  )
  SELECT v_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;

  IF v_row.enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = v_row.enrollment_id
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being written up — reload and try again'
        USING ERRCODE = '55000';
    END IF;

    UPDATE program_enrollments
    SET exercise_state = p_exercise_state,
        cursor = p_cursor
    WHERE id = v_row.enrollment_id;
  END IF;

  RETURN jsonb_build_object('workout_id', v_id, 'inserted', true);
END $$;

-- Nobody but a signed-in person, and never the anonymous role. The same shape
-- `finish_program_workout` already has.
REVOKE ALL ON FUNCTION end_enrollment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION end_enrollment(UUID) TO authenticated;

REVOKE ALL ON FUNCTION start_enrollment(JSONB, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_enrollment(JSONB, UUID[]) TO authenticated;

REVOKE ALL ON FUNCTION resume_enrollment(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resume_enrollment(UUID, UUID[]) TO authenticated;

REVOKE ALL ON FUNCTION remove_session_and_replay(UUID, UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_session_and_replay(UUID, UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION replace_sets_and_replay(UUID, JSONB, UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_sets_and_replay(UUID, JSONB, UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION log_session_and_advance(JSONB, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_session_and_advance(JSONB, JSONB, JSONB, JSONB, INTEGER) TO authenticated;

COMMENT ON FUNCTION end_enrollment IS
  'Stops a program prescribing. The busy-program trigger refuses it while a workout is open on it.';
COMMENT ON FUNCTION start_enrollment IS
  'Starts a program and pauses the ones it makes room for, in one transaction — so a refused start leaves the program you were on running.';
COMMENT ON FUNCTION resume_enrollment IS
  'Runs a finished program again at the weights it was left at, pausing what it displaces, in one transaction.';
COMMENT ON FUNCTION remove_session_and_replay IS
  'Removes one logged session and writes the recalculated weights together. Refuses a calculation made against a different history.';
COMMENT ON FUNCTION replace_sets_and_replay IS
  'Replaces a workout''s sets and writes the recalculated weights together. Nothing is half-written.';
COMMENT ON FUNCTION log_session_and_advance IS
  'Writes up a session that already happened and advances the program together. The same write-up sent twice records one session and advances once.';

COMMENT ON COLUMN program_enrollments.replay_events IS
  'Everything that changed this program''s state and was not a logged workout: a skipped session, a reset, a weight set by hand, and the schedule it started with plus every edit since. Replay folds these over initial_exercise_state, so a correction cannot undo them.';
