-- ============================================================================
-- THE WAY BACK from 20261022110000_program_numbers_only_by_the_app.sql.
--
-- Run BEFORE the way back from 20261022100000 (this file's functions name
-- columns and a table that one removes). Not applied by `supabase db push`:
-- files in this folder are run by hand, with `supabase db query --linked -f`,
-- and then the migration's row is removed from
-- supabase_migrations.schema_migrations so the history matches.
--
-- What it does: removes the guard and `save_program_state`, and puts every
-- program function back as 20260918100000, 20260919100000 and 20260927120000
-- left it (session RPE as a whole number again; sets without slot or group).
-- Nothing stored is changed. The app must be on a build that does not call
-- `save_program_state` before this runs.
-- ============================================================================

DROP TRIGGER IF EXISTS program_numbers_only_by_the_app ON program_enrollments;
DROP FUNCTION IF EXISTS program_numbers_only_by_the_app();
DROP FUNCTION IF EXISTS save_program_state(UUID, JSONB, JSONB);

CREATE OR REPLACE FUNCTION start_enrollment(p_row JSONB, p_displace UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_row program_enrollments;
  v_new program_enrollments;
BEGIN
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;
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

DROP FUNCTION IF EXISTS finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, NUMERIC, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
);
CREATE OR REPLACE FUNCTION finish_program_workout(
  p_workout_id UUID, p_ended_at TIMESTAMPTZ, p_duration_min INTEGER, p_intensity SMALLINT,
  p_rpe SMALLINT, p_notes TEXT, p_exercise_state JSONB, p_cursor JSONB, p_replay_events JSONB,
  p_expected_session_count INTEGER, p_changes JSONB, p_records JSONB,
  p_started_at TIMESTAMPTZ DEFAULT NULL, p_session_type TEXT DEFAULT NULL, p_distance_km NUMERIC DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_enrollment UUID;
BEGIN
  SELECT enrollment_id INTO v_enrollment FROM workout_logs
  WHERE id = p_workout_id AND started_at IS NOT NULL AND ended_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout has already been finished' USING ERRCODE = '55000';
  END IF;
  IF v_enrollment IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = v_enrollment AND (cursor ->> 'sessionCount')::int = p_expected_session_count FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this workout was open — reload and finish it again'
        USING ERRCODE = '55000';
    END IF;
    UPDATE program_enrollments
    SET exercise_state = p_exercise_state, cursor = p_cursor,
        replay_events = COALESCE(p_replay_events, replay_events)
    WHERE id = v_enrollment;
  END IF;
  UPDATE workout_logs
  SET ended_at = p_ended_at, duration_min = p_duration_min, intensity = p_intensity,
      rpe = COALESCE(p_rpe, rpe), notes = COALESCE(p_notes, notes),
      progression_changes = p_changes, personal_records = p_records,
      started_at = COALESCE(p_started_at, started_at), logged_at = COALESCE(p_started_at, logged_at),
      session_type = COALESCE(p_session_type, session_type), distance_km = p_distance_km
  WHERE id = p_workout_id;
  RETURN p_workout_id;
END $$;
REVOKE ALL ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finish_program_workout(
  UUID, TIMESTAMPTZ, INTEGER, SMALLINT, SMALLINT, TEXT, JSONB, JSONB, JSONB, INTEGER, JSONB, JSONB,
  TIMESTAMPTZ, TEXT, NUMERIC
) TO authenticated;

CREATE OR REPLACE FUNCTION remove_session_and_replay(
  p_log_id UUID, p_enrollment_id UUID, p_exercise_state JSONB, p_cursor JSONB,
  p_replay_events JSONB, p_expected_session_count INTEGER
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_row program_enrollments;
  v_gone UUID;
BEGIN
  PERFORM 1 FROM program_enrollments
  WHERE id = p_enrollment_id AND (cursor ->> 'sessionCount')::int = p_expected_session_count FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
      USING ERRCODE = '55000';
  END IF;
  DELETE FROM workout_logs WHERE id = p_log_id AND enrollment_id = p_enrollment_id RETURNING id INTO v_gone;
  IF v_gone IS NULL THEN
    RAISE EXCEPTION 'That session was not found, so nothing was deleted' USING ERRCODE = '55000';
  END IF;
  UPDATE program_enrollments
  SET exercise_state = p_exercise_state, cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION replace_sets_and_replay(
  p_log_id UUID, p_sets JSONB, p_enrollment_id UUID, p_exercise_state JSONB, p_cursor JSONB,
  p_replay_events JSONB, p_expected_session_count INTEGER
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_row program_enrollments;
BEGIN
  IF p_enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = p_enrollment_id AND (cursor ->> 'sessionCount')::int = p_expected_session_count FOR UPDATE;
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
    set_kind, side, notes, exercise_notes, rpe, completed_at, prescribed_index
  )
  SELECT p_log_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe, s.completed_at, s.prescribed_index
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;
  IF p_enrollment_id IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE program_enrollments
  SET exercise_state = p_exercise_state, cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION log_session_and_advance(
  p_workout JSONB, p_sets JSONB, p_exercise_state JSONB, p_cursor JSONB, p_expected_session_count INTEGER
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM workout_logs WHERE user_id = v_row.user_id AND client_key = v_row.client_key;
    RETURN jsonb_build_object('workout_id', v_id, 'inserted', false);
  END IF;
  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe
  )
  SELECT v_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes, s.exercise_notes, s.rpe
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;
  IF v_row.enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = v_row.enrollment_id AND (cursor ->> 'sessionCount')::int = p_expected_session_count FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being written up — reload and try again'
        USING ERRCODE = '55000';
    END IF;
    UPDATE program_enrollments SET exercise_state = p_exercise_state, cursor = p_cursor
    WHERE id = v_row.enrollment_id;
  END IF;
  RETURN jsonb_build_object('workout_id', v_id, 'inserted', true);
END $$;
