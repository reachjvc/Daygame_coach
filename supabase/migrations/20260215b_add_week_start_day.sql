-- Add week_start_day column to profiles
-- 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
-- Default: 0 (Sunday)
ALTER TABLE profiles ADD COLUMN week_start_day smallint NOT NULL DEFAULT 0;
