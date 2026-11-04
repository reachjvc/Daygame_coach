-- The way back from 20261104100000_apply_life_plan_changes.sql. Deletes no data.
--
-- Drops the change-only save. Put the app back on `save_life_plan` (the PUT on
-- /api/life-plan) before running this, or every save fails until it is.

drop function if exists public.apply_life_plan_changes(jsonb, integer);

notify pgrst, 'reload schema';
