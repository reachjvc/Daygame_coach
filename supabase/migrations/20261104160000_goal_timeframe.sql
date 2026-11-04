-- ============================================================================
-- A TIMEFRAME ON EACH GOAL (Plans/life-plan-rebuild.md, Phase 4 step 1; Q6 of
-- Plans/life-plan-tables.md).
--
-- Stefan cuts goals by horizon: 20, 10, 5, 3 and 1 years, then 90 days and a
-- month. One column on the goal, not new tables: a goal's horizon is a fact
-- about that goal. Null until somebody picks one, which is every goal today.
--
-- Adds only. The change-only save (`apply_life_plan_changes`) writes whichever
-- real columns a row carries, so it reaches this one without being replaced.
-- ============================================================================

ALTER TABLE life_plan_goals ADD COLUMN IF NOT EXISTS timeframe TEXT;

ALTER TABLE life_plan_goals DROP CONSTRAINT IF EXISTS life_plan_goals_timeframe_check;
ALTER TABLE life_plan_goals ADD CONSTRAINT life_plan_goals_timeframe_check
  CHECK (timeframe IS NULL OR timeframe IN ('1m', '90d', '1y', '3y', '5y', '10y', '20y'));
