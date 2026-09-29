-- A CORRECTION MUST NOT DESTROY THE ORDER OF THE WORKOUT IT CORRECTS.
--
-- APPROVED AND MOVED HERE 2026-09-28, by the owner, out of
-- `supabase/pending-owner-approval/`. Being in this folder is not the same as
-- being applied: `supabase db push` takes every pending file here at once, so
-- `supabase migration list --linked` comes first and says what else would go
-- with it.
--
-- NO PERMISSION CHANGE, which is why the approval was a short one.
-- `CREATE OR REPLACE` keeps the grants
-- `20260918100000_program_writes_are_one_statement.sql` already made, and the
-- signature is unchanged, so nobody gains or loses the right to call this.
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
-- `inWorkoutOrder` (src/db/healthRepo.ts) sorted on set_number, then
-- warm-up-ness, then `completed_at`. With the tiebreaker gone the order fell
-- back to a uuid, and the receipt's "What you did" reordered from
-- `Squat, Overhead Press, Deadlift` to `Overhead Press, Squat, Deadlift`. It
-- is not recoverable: the instants are gone.
--
-- UPDATED 2026-09-27, LATER THE SAME DAY, and the case is now stronger rather
-- than weaker. That comparator was itself wrong — `set_number` first meant a
-- workout of five squats then five benches listed round-robin even when its
-- timestamps were intact — and it now sorts by `completed_at` FIRST, with
-- rows that have none LAST.
--
-- So the two tiers are visibly different. A workout you have not corrected
-- reads in the order you did it. Correct it once and every row loses its
-- timestamp, drops to the bottom tier, and the workout goes back to reading
-- by slot — permanently, because the instants are gone. Before today that
-- difference was invisible; now it is the difference between the screen
-- telling the truth and not.
--
-- `prescribed_index` going null turns every corrected program set into one the
-- app reads as "added on the day".
--
-- IT IS HALF THE FIX, AND THIS HEADER USED TO CLAIM OTHERWISE. The paragraph
-- here read "the repo already sends both fields (`CorrectedSet.completedAt` /
-- `.prescribedIndex`, added 2026-09-27)". It did not. The type declared both,
-- and `reviseWorkout`'s row mapping in `src/db/workoutRepo.ts` dropped them one
-- line later — so this migration applied ALONE would have changed nothing on
-- any screen while looking exactly like the fix: the function keeping two
-- columns the payload never sent. The claim was checked against the code on
-- 2026-09-28 and was false when it was written.
--
-- The TypeScript half landed first, in `5d57ea0a`, guarded by
-- `tests/unit/db/correctionKeepsItsOrder.test.ts` — which asserts the PAYLOAD,
-- because no SQL test can see that end. This is the other half. The order they
-- land in does not matter and neither works alone: the extra keys are inert
-- until this function selects them, and this function selects nulls until the
-- payload carries them.
--
-- `jsonb_populate_recordset(null::workout_sets, …)` already parses both into
-- `s`; only the INSERT's column list dropped them, and that list is here.
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
