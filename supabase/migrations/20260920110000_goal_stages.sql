-- ============================================================================
-- A GOAL CAN BE A SEQUENCE OF NAMED STAGES.
--
-- The owner's concept list, items 2 and 22: a goal you reach by passing named
-- steps rather than by hitting a number or a date. His plan has three —
-- "Body Milestones" (first pull-up, visible abs, run a 5k, photoshoot ready),
-- "Opening Skill" and "Abundance Stages" — four named checkpoints each.
--
-- WHAT THE PRODUCT DID WITH THEM: nothing at all. `goalToInsert` emitted no
-- checkpoint field, so twelve named steps became three yes/no boxes. Worse
-- than the descending ladders, which at least kept their numbers in the
-- description as prose: the stage rows' descriptions in the database are
-- EMPTY. The names existed only in the browser.
--
-- WHY A COLUMN AND NOT CHILD GOALS. `parent_goal_id` exists and would have
-- worked, and it is the wrong shape: a stage is part of one goal, not a goal.
-- Twelve extra rows would appear in every list, every count and every "which
-- goals have no why" query, and "visible abs" is not something you push,
-- rename or archive on its own.
--
-- HOW IT COUNTS. Stages are ordered and reached in order — that is what makes
-- them stages rather than a checklist — so a staged goal is an ordinary climb
-- from 0 to however many there are, and everything built for climbs works
-- unchanged: progress is stages reached out of stages total, `rungReached`
-- lights each one, and the quarter/half/three-quarter badges fire along the
-- way. The names live here; the count lives in `current_value`, where the rest
-- of the machinery already looks for it. One fact, one place.
--
-- Safe by construction: additive, nullable, no policy change. A goal with no
-- stages is NULL and reads exactly as it did.
-- ============================================================================

ALTER TABLE user_goals
  ADD COLUMN IF NOT EXISTS stages TEXT[];

COMMENT ON COLUMN user_goals.stages IS
  'Ordered names of the steps this goal is reached by ("first pull-up", "visible abs", ...). NULL for a goal that is not staged. The number reached is current_value and the number of stages is target_value, so progress, rungs and badges all come from the ordinary climb machinery in src/db/goalProgress.ts.';
