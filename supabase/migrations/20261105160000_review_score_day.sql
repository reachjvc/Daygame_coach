-- ============================================================================
-- THE DAY EACH REVIEW SCORE WAS GIVEN (Plans/life-plan-rebuild.md, the wheel).
--
-- Since 2026-11-05 Your 10s shows each area's score from the latest review,
-- and rating an area there writes into this week's review. "Latest" needs to
-- know when a score was given: a month scored on its second day says less
-- about today than a week scored after it ended. A review's `written_on` is
-- the day it was FIRST written in, so it cannot say that for a score added
-- later in the week.
--
-- One nullable column. A score without one (the copied first review, and any
-- score saved before this) counts as given on the earlier of its review's
-- last day and the day the review was first written.
--
-- Adds only. The change-only save (`apply_life_plan_changes`) reads a table's
-- columns when it runs, so it reaches this one with no change of its own.
-- ============================================================================

ALTER TABLE life_plan_review_scores ADD COLUMN IF NOT EXISTS scored_on DATE;

ALTER TABLE life_plan_review_scores DROP CONSTRAINT IF EXISTS life_plan_review_scores_scored_on_check;
ALTER TABLE life_plan_review_scores ADD CONSTRAINT life_plan_review_scores_scored_on_check
  CHECK (scored_on IS NULL OR scored_on BETWEEN DATE '1900-01-01' AND DATE '2200-12-31');

NOTIFY pgrst, 'reload schema';
