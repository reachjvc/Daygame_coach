-- ============================================================================
-- THE NORTH STAR KEEPS ITS HISTORY AND HOLDS ITS OWN ANSWERS
-- (Plans/life-plan-rebuild.md, Phase 2; Q2 and Q9 of Plans/life-plan-tables.md).
--
-- 1. HISTORY. A plan had exactly one north star row, so writing a new one
--    destroyed the old. Now each north star has the day it started and the day
--    it ended; earlier ones stay as rows. "One per plan" becomes "one CURRENT
--    per plan" (ended_on IS NULL). DEFERRABLE, because starting a new one ends
--    the old and adds the new in one save, and the two rows may land in either
--    order inside it.
--
-- 2. ITS ANSWERS. Purpose, who you are, your code of conduct, who you are
--    becoming, your affirmations and your commitment were rows in
--    `life_plan_answers`, found by a question id. They are the north star's own
--    facts, so they become its columns. COPIED here; the answer rows stay until
--    Phase 7, and the app keeps writing both until then.
--
-- Adds and copies only. Nothing is deleted.
-- ============================================================================

ALTER TABLE life_plan_north_stars
  ADD COLUMN IF NOT EXISTS started_on DATE NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS ended_on DATE,
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT '' CHECK (char_length(purpose) <= 100000),
  ADD COLUMN IF NOT EXISTS identity TEXT NOT NULL DEFAULT '' CHECK (char_length(identity) <= 100000),
  ADD COLUMN IF NOT EXISTS conduct TEXT NOT NULL DEFAULT '' CHECK (char_length(conduct) <= 100000),
  ADD COLUMN IF NOT EXISTS become TEXT NOT NULL DEFAULT '' CHECK (char_length(become) <= 100000),
  ADD COLUMN IF NOT EXISTS affirmations TEXT NOT NULL DEFAULT '' CHECK (char_length(affirmations) <= 100000),
  ADD COLUMN IF NOT EXISTS commitment TEXT NOT NULL DEFAULT '' CHECK (char_length(commitment) <= 100000),
  ADD COLUMN IF NOT EXISTS committed_on DATE;

ALTER TABLE life_plan_north_stars
  DROP CONSTRAINT IF EXISTS life_plan_north_stars_dates,
  ADD CONSTRAINT life_plan_north_stars_dates CHECK (ended_on IS NULL OR ended_on >= started_on);

ALTER TABLE life_plan_north_stars DROP CONSTRAINT IF EXISTS life_plan_north_stars_one_per_plan;
ALTER TABLE life_plan_north_stars DROP CONSTRAINT IF EXISTS life_plan_north_stars_one_current;
ALTER TABLE life_plan_north_stars
  ADD CONSTRAINT life_plan_north_stars_one_current
  EXCLUDE USING btree (plan_id WITH =) WHERE (ended_on IS NULL)
  DEFERRABLE INITIALLY DEFERRED;

-- The existing north star started, at the latest, when its plan row was made.
UPDATE life_plan_north_stars s
   SET started_on = p.created_at::date
  FROM life_plans p
 WHERE p.id = s.plan_id;

-- Its answers, copied from the answer rows. The question ids are the ones in
-- STAR_PROMPTS (src/goals/data/northStar.ts) and COMMIT_KEY / COMMIT_DATE_KEY
-- (src/goals/data/northStarStart.ts).
UPDATE life_plan_north_stars s
   SET purpose      = coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = s.plan_id AND a.kind = 'answer' AND a.prompt_id = 'star_why'), ''),
       identity     = coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = s.plan_id AND a.kind = 'answer' AND a.prompt_id = 'identity_total'), ''),
       conduct      = coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = s.plan_id AND a.kind = 'answer' AND a.prompt_id = 'conduct'), ''),
       become       = coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = s.plan_id AND a.kind = 'answer' AND a.prompt_id = 'become'), ''),
       affirmations = coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = s.plan_id AND a.kind = 'answer' AND a.prompt_id = 'affirmations'), ''),
       commitment   = coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = s.plan_id AND a.kind = 'answer' AND a.prompt_id = 'start:commit'), ''),
       committed_on = (SELECT CASE WHEN a.body ~ '^\d{4}-\d{2}-\d{2}$' THEN a.body::date END
                         FROM life_plan_answers a
                        WHERE a.plan_id = s.plan_id AND a.kind = 'answer' AND a.prompt_id = 'start:commit-date')
 WHERE s.ended_on IS NULL;

NOTIFY pgrst, 'reload schema';
