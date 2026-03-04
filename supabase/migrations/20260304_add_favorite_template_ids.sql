-- Add favorite_template_ids column to user_tracking_stats
-- Uses TEXT[] (not UUID[]) because system template IDs are strings like "system-quick-log"
ALTER TABLE user_tracking_stats
  ADD COLUMN IF NOT EXISTS favorite_template_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
