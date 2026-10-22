-- ============================================================================
-- THE WAY BACK from 20261022100000_program_format_columns.sql.
--
-- Run AFTER the way back from 20261022110000, by hand
-- (`supabase db query --linked -f`), then remove the migration's row from
-- supabase_migrations.schema_migrations.
--
-- WHAT IT DELETES, said first: the new columns and the two new tables, with
-- whatever they hold by then — programs people built (`user_programs`), every
-- running program's own copy of its program and its versions, and which slot
-- and set group each set answered. Back them up first:
--   select * from user_programs; select * from program_versions;
--   select id, spec, spec_version, started_on, maxes from program_enrollments where spec is not null;
--   select id, slot_id, set_group_id from workout_sets where slot_id is not null;
-- `program_drafts` was never touched, so the saved weeks it held are still there.
--
-- RPE goes back to whole numbers ONLY if no half step was ever stored: a 8.5
-- would otherwise become a 9 nobody logged, so this refuses instead.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM workout_sets WHERE rpe IS NOT NULL AND rpe <> trunc(rpe))
     OR EXISTS (SELECT 1 FROM workout_logs WHERE rpe IS NOT NULL AND rpe <> trunc(rpe)) THEN
    RAISE EXCEPTION 'Half-step RPEs are stored; going back to whole numbers would change them. Export them first.';
  END IF;
  IF EXISTS (SELECT 1 FROM workout_sets WHERE set_kind IN ('top', 'restpause')) THEN
    RAISE EXCEPTION 'Sets of kind top or restpause are stored; the old kinds cannot hold them.';
  END IF;
END $$;

DROP TABLE IF EXISTS user_programs;
DROP FUNCTION IF EXISTS user_programs_touch_updated_at();
DROP TABLE IF EXISTS program_versions;

ALTER TABLE program_enrollments DROP CONSTRAINT IF EXISTS program_enrollments_spec_shape;
ALTER TABLE program_enrollments DROP CONSTRAINT IF EXISTS program_enrollments_spec_version;
ALTER TABLE program_enrollments DROP CONSTRAINT IF EXISTS program_enrollments_maxes_shape;
ALTER TABLE program_enrollments DROP COLUMN IF EXISTS spec;
ALTER TABLE program_enrollments DROP COLUMN IF EXISTS spec_version;
ALTER TABLE program_enrollments DROP COLUMN IF EXISTS started_on;
ALTER TABLE program_enrollments DROP COLUMN IF EXISTS maxes;

ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_kind;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_kind
  CHECK (set_kind IN ('warmup', 'working', 'amrap', 'backoff', 'drop'));
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_slot_id_length;
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_set_group_id_length;
ALTER TABLE workout_sets DROP COLUMN IF EXISTS slot_id;
ALTER TABLE workout_sets DROP COLUMN IF EXISTS set_group_id;

ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_rpe_range;
ALTER TABLE workout_sets ALTER COLUMN rpe TYPE SMALLINT USING rpe::smallint;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_rpe_range CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));
ALTER TABLE workout_logs DROP CONSTRAINT IF EXISTS workout_logs_rpe_range;
ALTER TABLE workout_logs ALTER COLUMN rpe TYPE SMALLINT USING rpe::smallint;
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_rpe_range CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));
