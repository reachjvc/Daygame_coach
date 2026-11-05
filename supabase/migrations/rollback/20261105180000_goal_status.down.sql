-- The way back from 20261105180000_goal_status.sql.
--
-- DELETES DATA: which goals were achieved, paused or dropped, and when. Back
-- them up first. Put the app back on the code before it first, or the next
-- save sends columns the table no longer has (the change-only save ignores
-- them, so nothing fails, but the states are gone).

alter table public.life_plan_goals drop constraint if exists life_plan_goals_status_on_check;
alter table public.life_plan_goals drop constraint if exists life_plan_goals_status_check;
alter table public.life_plan_goals drop column if exists status_on;
alter table public.life_plan_goals drop column if exists status;

notify pgrst, 'reload schema';
