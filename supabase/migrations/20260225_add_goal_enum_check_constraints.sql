-- Add CHECK constraints for goal enum columns in user_goals table.
-- Ensures DB-level enforcement matches code-level enums in src/db/goalEnums.ts.
--
-- Columns already constrained: goal_phase
-- Columns added here: goal_type, tracking_type, period, linked_metric, goal_nature, display_category

ALTER TABLE user_goals
  ADD CONSTRAINT chk_goal_type
    CHECK (goal_type IN ('recurring', 'milestone', 'habit_ramp'));

ALTER TABLE user_goals
  ADD CONSTRAINT chk_tracking_type
    CHECK (tracking_type IN ('counter', 'percentage', 'streak', 'boolean'));

ALTER TABLE user_goals
  ADD CONSTRAINT chk_period
    CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'));

ALTER TABLE user_goals
  ADD CONSTRAINT chk_linked_metric
    CHECK (linked_metric IS NULL OR linked_metric IN (
      'approaches_weekly', 'sessions_weekly', 'numbers_weekly', 'instadates_weekly',
      'field_reports_weekly', 'approaches_cumulative', 'sessions_cumulative',
      'numbers_cumulative', 'instadates_cumulative', 'field_reports_cumulative',
      'approach_quality_avg_weekly'
    ));

ALTER TABLE user_goals
  ADD CONSTRAINT chk_goal_nature
    CHECK (goal_nature IS NULL OR goal_nature IN ('input', 'outcome'));

ALTER TABLE user_goals
  ADD CONSTRAINT chk_display_category
    CHECK (display_category IS NULL OR display_category IN (
      'field_work', 'results', 'dirty_dog', 'texting', 'dates', 'relationship',
      'mindfulness', 'resilience', 'learning', 'reflection', 'discipline',
      'strength', 'training', 'nutrition', 'body_comp', 'flexibility', 'endurance',
      'income', 'saving', 'investing', 'career_growth', 'entrepreneurship',
      'porn_freedom', 'digital_discipline', 'substance_control', 'self_control'
    ));
