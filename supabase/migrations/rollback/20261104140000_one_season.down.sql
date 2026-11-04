-- The way back from 20261104140000_one_season.sql.
--
-- DELETES DATA: every season row and its areas and goals, which since this
-- migration may hold seasons nobody wrote anywhere else. Back them up first.
-- The copies made from the old homes are still in those homes until Phase 7.
-- Run 20261104140100's rollback first.

delete from public.life_plan_nodes where kind = 'season';
drop table if exists public.life_plan_season_goals;
drop table if exists public.life_plan_season_areas;
drop table if exists public.life_plan_seasons;
alter table public.life_plan_nodes drop constraint if exists life_plan_nodes_kind_check;
alter table public.life_plan_nodes add constraint life_plan_nodes_kind_check check (kind in (
  'north_star','area','goal','checkpoint','obstacle','belief','habit',
  'routine','routine_step','split_day','experience','field','sub_step'));

notify pgrst, 'reload schema';
