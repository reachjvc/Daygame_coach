-- Add goal graph fields to user_goals table
-- Supports: goal nature (input/outcome), display categories, graph levels, and template references

-- Goal nature: input (green, user does something) vs outcome (red, result of doing something)
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS goal_nature text CHECK (goal_nature IN ('input', 'outcome'));

-- Display category for visual grouping in the goals hub
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS display_category text CHECK (display_category IN ('field_work', 'results', 'dirty_dog'));

-- Goal graph level: 0=life dream, 1=major life goal, 2=achievement, 3=skill/metric
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS goal_level smallint CHECK (goal_level BETWEEN 0 AND 3);

-- Template ID: references the static goal graph catalog (e.g., "l3_approach_volume")
-- Used to reconnect user goals to template defaults and achievement weight config
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS template_id text;

-- Update goal_type check constraint to include 'habit_ramp'
-- First drop the old constraint if it exists, then add the new one
DO $$
BEGIN
  -- Try to drop the existing check constraint on goal_type
  -- Constraint name may vary, so we find it dynamically
  EXECUTE (
    SELECT 'ALTER TABLE user_goals DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'user_goals'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%goal_type%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  -- No constraint to drop, continue
  NULL;
END $$;

ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_goal_type_check;
ALTER TABLE user_goals ADD CONSTRAINT user_goals_goal_type_check
  CHECK (goal_type IN ('recurring', 'milestone', 'habit_ramp'));
