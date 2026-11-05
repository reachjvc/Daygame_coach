-- ============================================================================
-- A GOAL CAN BE ACHIEVED, PAUSED OR DROPPED (Plans/life-plan-goal-status.md).
--
-- Stefan: "I go over the goals that I achieved. I go over the goals that I
-- didn't achieve" and "so I'm taking a break from that goal" (zuEb-1Ll2h8).
-- The owner's item 2 (a goal can be a condition you reach) and item 32
-- (celebrating yourself after). A goal's only way out was to be deleted, which
-- took its counts with it.
--
-- Two columns on the goal: what state it is in, and the day it got there.
-- Every goal starts active, with no day.
--
-- Adds only. The change-only save (`apply_life_plan_changes`) writes whichever
-- real columns a row carries, so it reaches these without being replaced.
-- ============================================================================

ALTER TABLE life_plan_goals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE life_plan_goals ADD COLUMN IF NOT EXISTS status_on DATE;

ALTER TABLE life_plan_goals DROP CONSTRAINT IF EXISTS life_plan_goals_status_check;
ALTER TABLE life_plan_goals ADD CONSTRAINT life_plan_goals_status_check
  CHECK (status IN ('active', 'achieved', 'paused', 'dropped'));

ALTER TABLE life_plan_goals DROP CONSTRAINT IF EXISTS life_plan_goals_status_on_check;
ALTER TABLE life_plan_goals ADD CONSTRAINT life_plan_goals_status_on_check
  CHECK (status_on IS NULL OR status_on BETWEEN DATE '1900-01-01' AND DATE '2200-12-31');

NOTIFY pgrst, 'reload schema';
