-- The way back from 20261104160000_goal_timeframe.sql.
--
-- DELETES DATA: every timeframe anybody picked. Back them up first. Put the app
-- back on the code before Phase 4 first, or its next save sends a column that
-- is gone (the change-only save ignores it; nothing else writes it).

alter table public.life_plan_goals drop constraint if exists life_plan_goals_timeframe_check;
alter table public.life_plan_goals drop column if exists timeframe;
