-- A program cannot be switched off while a workout is open on it.
--
-- WHY
-- ---
-- "End program", and starting a different program of the same kind (which
-- pauses the old one to make room), both just flipped `is_active` off. If you
-- were in the middle of a workout on that program, the workout then finished
-- onto a plan nobody is shown any more: its weights moved, invisibly, for
-- something you had just ended — and the new program sat at week 1 as though
-- you had never trained.
--
-- The app checks for this before it writes. But a check followed by a write has
-- a gap of a few milliseconds where a Start can cross an End, and the check
-- does not exist at all for a script, the SQL editor, or anything using the
-- service-role key. `.claude/rules/database.md` says it plainly: if a rule must
-- hold for everyone it is a constraint or a trigger, because a policy is not
-- enforcement.
--
-- WHAT IT DOES NOT DO. It only refuses turning a program OFF. Turning one back
-- on, renaming it, editing its schedule and moving its weights are all
-- untouched, and no row is deleted by this migration. Nobody's permissions
-- change: this is a rule about what may be written, not about who may write.
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION refuse_to_pause_a_busy_program()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    -- "Open" is started-and-not-ended, and nothing looser: a workout typed in
    -- after the fact has no start time and is not something you are in.
    IF EXISTS (
      SELECT 1 FROM workout_logs
      WHERE enrollment_id = NEW.id
        AND started_at IS NOT NULL
        AND ended_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Finish or throw away the open workout first.' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS program_busy_while_workout_open ON program_enrollments;
CREATE TRIGGER program_busy_while_workout_open
  BEFORE UPDATE OF is_active ON program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION refuse_to_pause_a_busy_program();

COMMENT ON FUNCTION refuse_to_pause_a_busy_program IS
  'Refuses to switch a program off while a workout is open on it. The app checks this too, but a check followed by a write has a gap, and a script has no check at all.';
