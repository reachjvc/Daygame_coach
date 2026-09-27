-- A CORRECTION MUST NOT DESTROY THE ORDER OF THE WORKOUT IT CORRECTS.
--
-- PARKED FOR THE OWNER. `supabase db push` takes every file in
-- `supabase/migrations/` at once, so this waits here until it is approved.
-- Moving it into that folder is the only step needed.
--
-- WHAT IS WRONG TODAY. `replace_sets_and_replay` deletes every set of a
-- workout and re-inserts the payload, and its INSERT names twelve columns —
-- `completed_at` and `prescribed_index` are not among them. So both are NULL
-- on every corrected row.
--
-- Measured on 2026-09-27, one correction on a three-lift workout:
--
--   before: Squat 1 completed_at 2026-09-27T02:44:38.187Z, Press 1 …:52.9Z, …
--   after:  every row completed_at NULL
--
-- `inWorkoutOrder` (src/db/healthRepo.ts:288) sorts on set_number, then
-- warm-up-ness, then `completed_at`. With the tiebreaker gone the order falls
-- back to a uuid, and the receipt's "What you did" reordered from
-- `Squat, Overhead Press, Deadlift` to `Overhead Press, Squat, Deadlift`. It
-- is not recoverable: the instants are gone.
--
-- `prescribed_index` going null turns every corrected program set into one the
-- app reads as "added on the day".
--
-- WHY THIS IS A MIGRATION AND NOT TYPESCRIPT. The repo already sends both
-- fields (`CorrectedSet.completedAt` / `.prescribedIndex`, added 2026-09-27) and
-- `jsonb_populate_recordset(null::workout_sets, …)` already parses them into
-- `s`. Only the INSERT's column list drops them, and that list is inside this
-- function. Applying this changes no behaviour on its own — it starts keeping
-- two columns that are currently thrown away.
--
-- WHAT BREAKS IF IT IS LEFT: every correction keeps destroying the order, and
-- each one destroys a little more history that cannot be rebuilt.

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

  -- The two added columns are the whole change.
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
  SET exercise_state = p_exercise_state,
      cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $$;
