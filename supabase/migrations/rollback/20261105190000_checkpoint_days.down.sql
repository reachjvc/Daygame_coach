-- The way back from 20261105190000_checkpoint_days.sql.
--
-- DELETES DATA: every step's due day and done day (the ticks themselves stay).
-- Back them up first, and put the app back on the code before it first.

alter table public.life_plan_goal_checkpoints drop constraint if exists life_plan_goal_checkpoints_days_check;
alter table public.life_plan_goal_checkpoints drop column if exists done_on;
alter table public.life_plan_goal_checkpoints drop column if exists due_on;

notify pgrst, 'reload schema';
