-- Migration: Create user_goals table for goal tracking widget
-- Date: 2026-02-07

-- Tracking type enum
CREATE TYPE goal_tracking_type AS ENUM (
  'counter',      -- Increment towards target (e.g., 10 approaches)
  'percentage',   -- 0-100% completion
  'streak',       -- Consecutive periods completed
  'boolean'       -- Done or not done
);

-- Period enum
CREATE TYPE goal_period AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'custom'
);

-- Main goals table
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal definition
  title VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,  -- Allows custom categories
  tracking_type goal_tracking_type NOT NULL DEFAULT 'counter',
  period goal_period NOT NULL DEFAULT 'weekly',

  -- Target values
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,

  -- Period tracking (for manual reset)
  period_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  custom_end_date DATE,  -- Only used when period = 'custom'

  -- Streak tracking
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_active ON user_goals(user_id, is_active, is_archived);
CREATE INDEX idx_user_goals_category ON user_goals(user_id, category);

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own goals
CREATE POLICY "user_goals_select_own" ON user_goals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_goals_insert_own" ON user_goals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_goals_update_own" ON user_goals
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_goals_delete_own" ON user_goals
  FOR DELETE USING (user_id = auth.uid());

-- Updated_at trigger (reuse existing function if available, or create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_goals_updated_at_trigger
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
