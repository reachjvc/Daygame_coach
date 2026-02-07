-- Add linked_metric column to user_goals for auto-sync with tracking data
-- This allows goals like "10 approaches/week" to auto-update from session data

-- Create enum type for linked metrics
CREATE TYPE linked_metric AS ENUM (
  'approaches_weekly',
  'sessions_weekly',
  'numbers_weekly',
  'instadates_weekly'
);

-- Add the column to user_goals
ALTER TABLE user_goals ADD COLUMN linked_metric linked_metric;

-- Add comment explaining the column
COMMENT ON COLUMN user_goals.linked_metric IS 'If set, goal current_value auto-syncs with this tracking metric';
