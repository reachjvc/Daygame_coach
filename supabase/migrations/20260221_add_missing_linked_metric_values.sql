-- Sync all user_goals enum/check constraints with TypeScript types.
-- Uses IF NOT EXISTS / DROP IF EXISTS so it's safe to re-run.

-- ============================================
-- linked_metric enum
-- ============================================
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'approaches_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'sessions_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'numbers_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'instadates_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'field_reports_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'approaches_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'sessions_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'numbers_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'instadates_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'field_reports_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'approach_quality_avg_weekly';

-- ============================================
-- goal_period enum (period column)
-- ============================================
ALTER TYPE goal_period ADD VALUE IF NOT EXISTS 'daily';
ALTER TYPE goal_period ADD VALUE IF NOT EXISTS 'weekly';
ALTER TYPE goal_period ADD VALUE IF NOT EXISTS 'monthly';
ALTER TYPE goal_period ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE goal_period ADD VALUE IF NOT EXISTS 'yearly';
ALTER TYPE goal_period ADD VALUE IF NOT EXISTS 'custom';

-- ============================================
-- display_category check constraint
-- ============================================
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_display_category_check;
ALTER TABLE user_goals ADD CONSTRAINT user_goals_display_category_check CHECK (
  display_category IS NULL OR display_category IN (
    'field_work', 'results', 'dirty_dog', 'texting', 'dates', 'relationship',
    'mindfulness', 'resilience', 'learning', 'reflection', 'discipline',
    'social_activity', 'friendships', 'hosting', 'social_skills', 'network_expansion', 'mentorship',
    'strength', 'training', 'nutrition', 'body_comp', 'flexibility', 'endurance',
    'income', 'saving', 'investing', 'career_growth', 'entrepreneurship',
    'porn_freedom', 'digital_discipline', 'substance_control', 'self_control',
    'hobbies_skills', 'cooking_domestic', 'adventure_travel', 'style_grooming'
  )
);

-- ============================================
-- goal_type check constraint (recurring, milestone, habit_ramp)
-- ============================================
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_goal_type_check;
ALTER TABLE user_goals ADD CONSTRAINT user_goals_goal_type_check CHECK (
  goal_type IN ('recurring', 'milestone', 'habit_ramp')
);

-- ============================================
-- goal_nature check constraint (input, outcome, or null)
-- ============================================
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_goal_nature_check;
ALTER TABLE user_goals ADD CONSTRAINT user_goals_goal_nature_check CHECK (
  goal_nature IS NULL OR goal_nature IN ('input', 'outcome')
);

-- ============================================
-- tracking_type check constraint
-- ============================================
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_tracking_type_check;
ALTER TABLE user_goals ADD CONSTRAINT user_goals_tracking_type_check CHECK (
  tracking_type IN ('counter', 'percentage', 'streak', 'boolean')
);

-- ============================================
-- life_area — drop any constraint (user-extensible)
-- ============================================
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_life_area_check;
