-- ============================================================================
-- THE PROGRAM FORMAT, PART B — a program's calculated numbers are written only
-- by the app's own program functions (Q17).
--
-- Plans/program-builder.md, Phase 3.2. Checked on production on 2026-10-22:
-- `authenticated` held UPDATE on every column of `program_enrollments`, so a
-- signed-in user could write their own working weights and week counter
-- straight into the table. `docs/plans/training-three-doors.md` (Q12) meant to
-- close this in September and it was never written.
--
-- A trigger, not a policy: a policy decides WHICH ROWS, not which columns, and
-- column grants cannot tell the app's own write from a hand-made one — both
-- arrive as `authenticated`. The program functions below switch the guard off
-- for their own transaction (`app.program_engine`, transaction-local, which a
-- client cannot set: PostgREST exposes no function that sets it). Scripts,
-- migrations and the test harness run as the database owner and are not
-- guarded.
--
-- WHAT THIS DOES NOT CLOSE, said plainly: the app works out the numbers on its
-- server and passes them to these functions, which a signed-in user can also
-- call. The direct route is shut; that one stays, limited to the user's own
-- program as before. Recorded in the plan's "Security" section for Phase 10.
--
-- Also here, because every program function is being rewritten anyway:
--   · finish_program_workout takes the session RPE in half steps (NUMERIC);
--   · the set-writing functions keep each set's slot and set group;
--   · starting a program records version 1 of its spec; `save_program_state`
--     is the one door for the four writes the app used to make directly
--     (reset, an edit, a change of unit, a skip), and records a new version
--     when the spec changes.
--
-- The way back: supabase/migrations/rollback/20261022110000_program_numbers_only_by_the_app.down.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION program_numbers_only_by_the_app()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.program_engine', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'A program is started through the app, not written into the table.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.exercise_state IS DISTINCT FROM OLD.exercise_state
     OR NEW.cursor IS DISTINCT FROM OLD.cursor
     OR NEW.replay_events IS DISTINCT FROM OLD.replay_events
     OR NEW.initial_exercise_state IS DISTINCT FROM OLD.initial_exercise_state
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'A program''s numbers are worked out by the app and cannot be written directly.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS program_numbers_only_by_the_app ON program_enrollments;
CREATE TRIGGER program_numbers_only_by_the_app
  BEFORE INSERT OR UPDATE ON program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION program_numbers_only_by_the_app();

COMMENT ON FUNCTION program_numbers_only_by_the_app IS
  'Refuses a client write of a program''s calculated columns (exercise_state, cursor, replay_events, initial_exercise_state, user_id) and a client insert, unless one of the app''s program functions is doing it.';

-- ---------------------------------------------------------------------------
-- Starting a program: its spec, its start date, its maxes, and version 1
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
  PERFORM set_config('app.program_engine', 'on', true);
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;
  SELECT * INTO v_row FROM jsonb_populate_record(null::program_enrollments, p_row);
  INSERT INTO program_enrollments (
    user_id, program_id, level, unit_system,
    exercise_state, initial_exercise_state, cursor,
    custom_schedule, replay_events, bar_weight_kg, label, is_active,
    spec, spec_version, started_on, maxes
  ) VALUES (
    v_row.user_id, v_row.program_id, v_row.level, v_row.unit_system,
    v_row.exercise_state, v_row.initial_exercise_state, v_row.cursor,
    v_row.custom_schedule, COALESCE(v_row.replay_events, '[]'::jsonb),
    v_row.bar_weight_kg, v_row.label, true,
    v_row.spec, v_row.spec_version, v_row.started_on, v_row.maxes
  )
  RETURNING * INTO v_new;
  IF v_new.spec IS NOT NULL THEN
    INSERT INTO program_versions (enrollment_id, user_id, version, spec, spec_version)
    VALUES (v_new.id, v_new.user_id, 1, v_new.spec, v_new.spec_version);
  END IF;
  RETURN to_jsonb(v_new);
END $$;

-- ---------------------------------------------------------------------------
-- The one door for the writes the app used to make directly
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION save_program_state(p_id UUID, p_fields JSONB, p_expect JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_old program_enrollments;
  v_row program_enrollments;
  v_has_spec BOOLEAN := p_fields ? 'spec' AND jsonb_typeof(p_fields -> 'spec') = 'object';
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  SELECT * INTO v_old FROM program_enrollments WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  -- "Only if it is still in kilograms": a second conversion of the same switch
  -- matches nothing and says so, rather than converting twice.
  IF p_expect ? 'unit_system' AND v_old.unit_system IS DISTINCT FROM (p_expect ->> 'unit_system') THEN
    RETURN NULL;
  END IF;
  IF p_expect ? 'sessionCount'
     AND (v_old.cursor ->> 'sessionCount')::int IS DISTINCT FROM (p_expect ->> 'sessionCount')::int THEN
    RAISE EXCEPTION 'Your program moved on while this was being worked out — reload and try again'
      USING ERRCODE = '55000';
  END IF;

  UPDATE program_enrollments SET
    exercise_state = CASE WHEN p_fields ? 'exercise_state' THEN p_fields -> 'exercise_state' ELSE exercise_state END,
    cursor = CASE WHEN p_fields ? 'cursor' THEN p_fields -> 'cursor' ELSE cursor END,
    replay_events = CASE WHEN p_fields ? 'replay_events' THEN p_fields -> 'replay_events' ELSE replay_events END,
    initial_exercise_state = CASE WHEN p_fields ? 'initial_exercise_state'
      THEN NULLIF(p_fields -> 'initial_exercise_state', 'null'::jsonb) ELSE initial_exercise_state END,
    custom_schedule = CASE WHEN p_fields ? 'custom_schedule'
      THEN NULLIF(p_fields -> 'custom_schedule', 'null'::jsonb) ELSE custom_schedule END,
    unit_system = CASE WHEN p_fields ? 'unit_system' THEN p_fields ->> 'unit_system' ELSE unit_system END,
    spec = CASE WHEN p_fields ? 'spec' THEN NULLIF(p_fields -> 'spec', 'null'::jsonb) ELSE spec END,
    spec_version = CASE WHEN p_fields ? 'spec_version' THEN (p_fields ->> 'spec_version')::int ELSE spec_version END,
    maxes = CASE WHEN p_fields ? 'maxes' THEN NULLIF(p_fields -> 'maxes', 'null'::jsonb) ELSE maxes END,
    started_on = CASE WHEN p_fields ? 'started_on' THEN (p_fields ->> 'started_on')::date ELSE started_on END
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_has_spec THEN
    INSERT INTO program_versions (enrollment_id, user_id, version, spec, spec_version)
    VALUES (
      p_id,
      v_row.user_id,
      COALESCE((SELECT max(version) FROM program_versions WHERE enrollment_id = p_id), 0) + 1,
      v_row.spec,
      v_row.spec_version
    );
  END IF;
  RETURN to_jsonb(v_row);
END $$;

COMMENT ON FUNCTION save_program_state IS
  'Writes the given columns of one program (the app''s calculated numbers, its schedule or spec, its unit) in one statement. p_expect: {"unit_system": ...} answers null when it no longer holds; {"sessionCount": n} refuses a calculation made against a different history. A new spec is recorded as the next version.';

-- ---------------------------------------------------------------------------
-- Finishing a workout: RPE in half steps
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
);

CREATE OR REPLACE FUNCTION finish_program_workout(
  p_workout_id UUID,
  p_ended_at TIMESTAMPTZ,
  p_duration_min INTEGER,
  p_intensity SMALLINT,
  p_rpe NUMERIC,
  p_notes TEXT,
  p_exercise_state JSONB,
  p_cursor JSONB,
  p_replay_events JSONB,
  p_expected_session_count INTEGER,
  p_changes JSONB,
  p_records JSONB,
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
  PERFORM set_config('app.program_engine', 'on', true);
  SELECT enrollment_id INTO v_enrollment
  FROM workout_logs
  WHERE id = p_workout_id AND started_at IS NOT NULL AND ended_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout has already been finished' USING ERRCODE = '55000';
  END IF;
  IF v_enrollment IS NOT NULL THEN
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
      started_at = COALESCE(p_started_at, started_at),
      logged_at = COALESCE(p_started_at, logged_at),
      session_type = COALESCE(p_session_type, session_type),
      distance_km = p_distance_km
  WHERE id = p_workout_id;
  RETURN p_workout_id;
END $$;

COMMENT ON FUNCTION finish_program_workout IS
  'Closes a live workout, moves the program''s weights and writes the receipt the screen showed — all in one transaction. Refuses a second call for the same workout, so a retry cannot advance the program twice. Also sets, when given: the start instant (started_at and logged_at together, so a session written up later is filed under the day it happened), the session kind, and the distance. The session RPE moves in half steps.';

-- ---------------------------------------------------------------------------
-- Correcting and deleting sessions, and writing one up afterwards: the guard
-- switched off, and each set's slot and set group kept
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_session_and_replay(
  p_log_id UUID,
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
  v_gone UUID;
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  PERFORM 1 FROM program_enrollments
  WHERE id = p_enrollment_id
    AND (cursor ->> 'sessionCount')::int = p_expected_session_count
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
      USING ERRCODE = '55000';
  END IF;
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

CREATE OR REPLACE FUNCTION replace_sets_and_replay(
  p_log_id UUID,
  p_sets JSONB,
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
  PERFORM set_config('app.program_engine', 'on', true);
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
  PERFORM 1 FROM workout_logs WHERE id = p_log_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout no longer exists' USING ERRCODE = '55000';
  END IF;
  DELETE FROM workout_sets WHERE log_id = p_log_id;
  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe, completed_at, prescribed_index,
    slot_id, set_group_id
  )
  SELECT p_log_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe, s.completed_at, s.prescribed_index,
         s.slot_id, s.set_group_id
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
  PERFORM set_config('app.program_engine', 'on', true);
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
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM workout_logs
    WHERE user_id = v_row.user_id AND client_key = v_row.client_key;
    RETURN jsonb_build_object('workout_id', v_id, 'inserted', false);
  END IF;
  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe, slot_id, set_group_id
  )
  SELECT v_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe, s.slot_id, s.set_group_id
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

-- ---------------------------------------------------------------------------
-- Who may call them: signed-in users, as before
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION start_enrollment(JSONB, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_enrollment(JSONB, UUID[]) TO authenticated;
REVOKE ALL ON FUNCTION save_program_state(UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_program_state(UUID, JSONB, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, NUMERIC, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, NUMERIC, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) TO authenticated;
REVOKE ALL ON FUNCTION remove_session_and_replay(UUID, UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_session_and_replay(UUID, UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION replace_sets_and_replay(UUID, JSONB, UUID, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_sets_and_replay(UUID, JSONB, UUID, JSONB, JSONB, JSONB, INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION log_session_and_advance(JSONB, JSONB, JSONB, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_session_and_advance(JSONB, JSONB, JSONB, JSONB, INTEGER) TO authenticated;
