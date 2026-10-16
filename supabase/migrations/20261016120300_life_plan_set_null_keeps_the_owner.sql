-- ============================================================================
-- REMOVING AN AREA (OR A GOAL, OR A NODE) FROM A LIFE PLAN NO LONGER BREAKS
-- THE SAVE.
--
-- The defect 20260923130000_season_focus_is_any_node.sql fixed for one
-- constraint, in five more. Found 2026-10-13 by
-- tests/integration/db/userDataCascades.integration.test.ts.
--
-- Each key is on `(pointer, user_id)` with a bare `ON DELETE SET NULL`, and
-- with no column list Postgres nulls EVERY referencing column, `user_id`
-- included, which is NOT NULL. So deleting an area that has goals filed under
-- it aborts with `null value in column "user_id"`, and `save_life_plan` deletes
-- removed nodes before it upserts goals: a plan save that removes such an area
-- fails as a whole.
--
-- The intent stays (the goal, routine, experience or field outlives what it was
-- filed under); `SET NULL (<pointer>)` clears only the pointer.
--
-- Re-adding a key checks every row against it; they all pass, since the key is
-- the same as before except for what a delete does.
-- ============================================================================

ALTER TABLE life_plan_goals DROP CONSTRAINT IF EXISTS life_plan_goals_area_fk;
ALTER TABLE life_plan_goals
  ADD CONSTRAINT life_plan_goals_area_fk
  FOREIGN KEY (area_id, user_id) REFERENCES life_plan_areas (id, user_id)
  ON DELETE SET NULL (area_id);

ALTER TABLE life_plan_routines DROP CONSTRAINT IF EXISTS life_plan_routines_area_fk;
ALTER TABLE life_plan_routines
  ADD CONSTRAINT life_plan_routines_area_fk
  FOREIGN KEY (area_id, user_id) REFERENCES life_plan_areas (id, user_id)
  ON DELETE SET NULL (area_id);

ALTER TABLE life_plan_experiences DROP CONSTRAINT IF EXISTS life_plan_experiences_area_fk;
ALTER TABLE life_plan_experiences
  ADD CONSTRAINT life_plan_experiences_area_fk
  FOREIGN KEY (area_id, user_id) REFERENCES life_plan_areas (id, user_id)
  ON DELETE SET NULL (area_id);

ALTER TABLE life_plan_experiences DROP CONSTRAINT IF EXISTS life_plan_experiences_goal_fk;
ALTER TABLE life_plan_experiences
  ADD CONSTRAINT life_plan_experiences_goal_fk
  FOREIGN KEY (goal_id, user_id) REFERENCES life_plan_goals (id, user_id)
  ON DELETE SET NULL (goal_id);

ALTER TABLE life_plan_fields DROP CONSTRAINT IF EXISTS life_plan_fields_target_fk;
ALTER TABLE life_plan_fields
  ADD CONSTRAINT life_plan_fields_target_fk
  FOREIGN KEY (target_id, user_id) REFERENCES life_plan_nodes (id, user_id)
  ON DELETE SET NULL (target_id);
