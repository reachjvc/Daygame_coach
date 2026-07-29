-- Per-set detail fields for the workout logger:
--   is_warmup      — marks a warm-up set; excluded from PR detection and volume analytics
--   notes          — free-text note on a single set
--   exercise_notes — note for the whole exercise, denormalized onto each of its set rows
--                    (workout_sets is flat; the UI groups by exercise and reads the first row's value)
-- No RLS changes: new columns inherit workout_sets' existing own-row policies
-- (scoped via log_id → workout_logs.user_id, see 20260305_create_health_tracking_tables.sql).
ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  ADD COLUMN IF NOT EXISTS exercise_notes TEXT CHECK (exercise_notes IS NULL OR char_length(exercise_notes) <= 500);
