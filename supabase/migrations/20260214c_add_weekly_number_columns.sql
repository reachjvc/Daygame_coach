-- Add weekly tracking columns for numbers and instadates
ALTER TABLE user_tracking_stats
  ADD COLUMN IF NOT EXISTS current_week_numbers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_week_instadates integer NOT NULL DEFAULT 0;
