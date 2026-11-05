-- ============================================================================
-- A STEP ON THE WAY TO A GOAL HAS A DAY IT IS DUE, AND A DAY IT WAS DONE
-- (Plans/life-plan-dated-steps.md).
--
-- The owner's item 27: "en todo med 20 ting og sige at den skulle være færdig
-- om 20 dage, og det skulle systemet så kunne lave". Stefan, every two weeks:
-- "are you on track, are you making progress, are you behind" (GXhPOncX8CA).
-- A checkpoint had a title and a tick, no day: the page spread dates from
-- today on every visit, so nobody could ever be behind, and nothing said when
-- a step was done.
--
-- Two nullable columns. Every step starts with neither: dates are given when
-- the owner asks the page to spread them, and a done day when a step is ticked.
--
-- Adds only. The change-only save (`apply_life_plan_changes`) writes whichever
-- real columns a row carries, so it reaches these without being replaced.
-- ============================================================================

ALTER TABLE life_plan_goal_checkpoints ADD COLUMN IF NOT EXISTS due_on DATE;
ALTER TABLE life_plan_goal_checkpoints ADD COLUMN IF NOT EXISTS done_on DATE;

ALTER TABLE life_plan_goal_checkpoints DROP CONSTRAINT IF EXISTS life_plan_goal_checkpoints_days_check;
ALTER TABLE life_plan_goal_checkpoints ADD CONSTRAINT life_plan_goal_checkpoints_days_check CHECK (
  (due_on IS NULL OR due_on BETWEEN DATE '1900-01-01' AND DATE '2200-12-31') AND
  (done_on IS NULL OR done_on BETWEEN DATE '1900-01-01' AND DATE '2200-12-31'));

NOTIFY pgrst, 'reload schema';
