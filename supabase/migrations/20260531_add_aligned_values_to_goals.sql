-- Add aligned_values column to user_goals
-- Stores which of the user's core values this goal serves
ALTER TABLE user_goals ADD COLUMN aligned_values TEXT[] DEFAULT '{}';
