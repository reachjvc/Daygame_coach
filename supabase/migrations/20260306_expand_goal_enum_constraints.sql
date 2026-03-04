-- Expand linked_metric ENUM type with health, scenario, and missing values.
-- Drop redundant CHECK constraint (ENUM type itself enforces valid values).
-- Uses ADD VALUE IF NOT EXISTS (idempotent).

-- ============================================================================
-- 1. Drop redundant CHECK (ENUM already constrains values)
-- ============================================================================
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS chk_linked_metric;

-- ============================================================================
-- 2. Extend the linked_metric ENUM type with new values
-- ============================================================================
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'high_quality_approaches_cumulative';
-- Scenarios
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'scenario_sessions_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'scenario_types_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'scenario_high_scores_cumulative';
-- Health: core
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'body_weight_current';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'sleep_hours_avg_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'gym_sessions_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'gym_sessions_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'nutrition_quality_avg_weekly';
-- Health: training detail
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'cardio_sessions_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'training_hours_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'consecutive_training_weeks';
-- Health: strength PRs
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'bench_press_1rm';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'squat_1rm';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'deadlift_1rm';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'overhead_press_1rm';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'pullups_max_reps';
-- Health: body comp
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'progress_photos_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'weight_lost_from_peak';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'weight_gained_from_lowest';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'body_measurements_count';
-- Health: nutrition
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'protein_days_hit_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'calorie_days_hit_weekly';
-- Health: flexibility/mobility
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'mobility_sessions_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'yoga_sessions_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'flexibility_hours_cumulative';
-- Health: running/endurance
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'running_sessions_weekly';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'running_distance_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'longest_run_km';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'consecutive_cardio_weeks';

-- ============================================================================
-- 3. display_category: add 'scenarios' value
-- ============================================================================
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS chk_display_category;
ALTER TABLE user_goals
  ADD CONSTRAINT chk_display_category
    CHECK (display_category IS NULL OR display_category IN (
      'field_work', 'results', 'dirty_dog', 'texting', 'dates', 'relationship', 'scenarios',
      'mindfulness', 'resilience', 'learning', 'reflection', 'discipline',
      'strength', 'training', 'nutrition', 'body_comp', 'flexibility', 'endurance',
      'income', 'saving', 'investing', 'career_growth', 'entrepreneurship',
      'porn_freedom', 'digital_discipline', 'substance_control', 'self_control'
    ));
