-- Migration: Inner Game Progress Tracking
-- Created: 2025-01-22
-- Purpose: Add tables for tracking user progress through the inner game journey

-- Table: inner_game_progress
-- Tracks user's progress across all steps of the inner game journey
CREATE TABLE IF NOT EXISTS inner_game_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current position in the journey
  current_step INTEGER NOT NULL DEFAULT 0,  -- 0=welcome, 1=values, 2=hurdles, 3=deathbed, 4=cutting, 5=complete
  current_substep INTEGER DEFAULT 0,        -- For step 1: which category (0-9)

  -- Step completion flags
  welcome_dismissed BOOLEAN DEFAULT FALSE,
  step1_completed BOOLEAN DEFAULT FALSE,    -- Values selection complete
  step2_completed BOOLEAN DEFAULT FALSE,    -- Hurdles question complete
  step3_completed BOOLEAN DEFAULT FALSE,    -- Deathbed question complete
  cutting_completed BOOLEAN DEFAULT FALSE,  -- Prioritization complete

  -- User responses for reflection questions
  hurdles_response TEXT,                    -- User's answer to step 2
  hurdles_inferred_values JSONB,            -- LLM-inferred values from step 2: [{ id, reason }]
  deathbed_response TEXT,                   -- User's answer to step 3
  deathbed_inferred_values JSONB,           -- LLM-inferred values from step 3: [{ id, reason }]

  -- Final results
  final_core_values JSONB,                  -- Final prioritized 7 values: [{ id, rank }]
  aspirational_values JSONB,                -- Values marked as aspirational: [{ id }]

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one progress record per user
  UNIQUE(user_id)
);

-- Table: value_comparisons
-- Stores pairwise comparisons during the cutting phase for analytics and consistency
CREATE TABLE IF NOT EXISTS value_comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The two values being compared
  value_a_id TEXT NOT NULL,
  value_b_id TEXT NOT NULL,

  -- User's choice
  chosen_value_id TEXT NOT NULL,

  -- Type of comparison
  comparison_type TEXT NOT NULL,  -- 'pairwise', 'aspirational_vs_current'

  -- Metadata
  round_number INTEGER DEFAULT 1,  -- Which round of cutting this comparison was in

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inner_game_progress_user_id ON inner_game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_value_comparisons_user_id ON value_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_value_comparisons_type ON value_comparisons(comparison_type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_inner_game_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inner_game_progress_updated_at ON inner_game_progress;
CREATE TRIGGER inner_game_progress_updated_at
  BEFORE UPDATE ON inner_game_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_inner_game_progress_updated_at();

-- Enable RLS
ALTER TABLE inner_game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own progress"
  ON inner_game_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON inner_game_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON inner_game_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own comparisons"
  ON value_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comparisons"
  ON value_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);
