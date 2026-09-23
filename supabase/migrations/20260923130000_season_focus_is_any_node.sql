-- ============================================================================
-- THE SEASON FOCUS CAN BE ANY PART OF THE PLAN, AND DELETING IT NO LONGER
-- BREAKS THE SAVE.
--
-- Two defects in one constraint, both found on 2026-09-23 by reading the mapper
-- and then proving each against a real Postgres.
--
-- 1. IT POINTED AT AN AREA, AND THE FOCUS IS USUALLY A GOAL.
--    `NsPlan.seasonFocusId` says so in its own type comment: "Usually a goal,
--    occasionally an area with nothing written under it yet, so it holds either
--    kind of id." The column could only hold an area, so `lifePlanMapper`
--    resolved it through the area map and quietly produced NULL for every goal.
--    The one field the Focus step exists to set was dropped by the save, and
--    the plan came back on the next device with no one thing for the season.
--    Nothing errored, because NULL is a legal value for "not picked yet".
--
-- 2. `ON DELETE SET NULL` ON A TWO-COLUMN KEY NULLS BOTH COLUMNS.
--    The constraint is on `(season_focus_id, user_id)`, and Postgres with no
--    column list sets EVERY referencing column to NULL — including `user_id`,
--    which is NOT NULL on `life_plans`. So deleting the area somebody had
--    chosen as their focus did not clear the focus: it aborted the whole save.
--    And `save_life_plan` deletes gone nodes (line 77) BEFORE it updates
--    `life_plans` (line 248), so the delete is what the cascade sees.
--
--    Proved, not assumed, against the live database in a rolled-back
--    transaction over temp tables of the same shape:
--
--      UPDATE ONLY "probe_child" SET "ref_id" = NULL, "user_id" = NULL
--      ERROR: null value in column "user_id" violates not-null constraint
--
--    Postgres 17 here, so the column-list form `SET NULL (season_focus_id)`
--    is available and says exactly what is meant: clear the pointer, leave the
--    owner alone.
--
-- NOTHING IS MIGRATED. One `life_plans` row exists and its `season_focus_id` is
-- NULL, so there is no value to re-point. Re-run the count before assuming that
-- is still true.
-- ============================================================================

ALTER TABLE life_plans DROP CONSTRAINT IF EXISTS life_plans_season_focus_fk;

DO $$ BEGIN
  ALTER TABLE life_plans
    ADD CONSTRAINT life_plans_season_focus_fk
    FOREIGN KEY (season_focus_id, user_id)
    REFERENCES life_plan_nodes (id, user_id)
    ON DELETE SET NULL (season_focus_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  RAISE NOTICE 'season focus: any node, and clearing it no longer nulls the owner.';
END $$;
