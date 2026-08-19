-- Workout Programs — user-edited schedules.
--
-- A program you picked can now be modified: rename/reorder/add/remove training
-- days, and swap/add/remove/re-spec the exercises inside them. The edited
-- schedule is stored WHOLE (copy-on-write), not as a diff against the catalog:
-- NULL means "follow the catalog program", and any non-null value is the
-- user's own version, which the progression engine runs instead. See the
-- rationale at the top of src/programs/customize.ts.
--
-- No new table and NO NEW POLICY: this is one more column on program_enrollments,
-- which already carries own-row SELECT/INSERT/UPDATE/DELETE policies from
-- 20260618_create_program_tables.sql. The column holds the user's own training
-- plan — same personal, user-owned data as exercise_state beside it, no
-- cross-user or earned stake.
--
-- Idempotent: safe to re-run.

ALTER TABLE program_enrollments
  ADD COLUMN IF NOT EXISTS custom_schedule JSONB;

COMMENT ON COLUMN program_enrollments.custom_schedule IS
  'The user''s edited ProgramSchedule, or NULL to follow the catalog program. Copy-on-write: set whole on first edit.';
