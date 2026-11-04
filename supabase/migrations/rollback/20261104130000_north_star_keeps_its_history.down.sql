-- The way back from 20261104130000_north_star_keeps_its_history.sql.
--
-- DELETES DATA: every EARLIER north star row (ended_on IS NOT NULL) and its
-- node, because "one per plan" cannot come back while they exist. Back them up
-- first. The answers copied into the new columns are also kept in
-- life_plan_answers until Phase 7, so dropping the columns loses none of them.
-- Put the app back on the code before Phase 2 first.

delete from public.life_plan_nodes n
 using public.life_plan_north_stars s
 where s.id = n.id and s.ended_on is not null;

alter table public.life_plan_north_stars drop constraint if exists life_plan_north_stars_one_current;
alter table public.life_plan_north_stars drop constraint if exists life_plan_north_stars_dates;
alter table public.life_plan_north_stars add constraint life_plan_north_stars_one_per_plan unique (plan_id);
alter table public.life_plan_north_stars
  drop column if exists started_on,
  drop column if exists ended_on,
  drop column if exists purpose,
  drop column if exists identity,
  drop column if exists conduct,
  drop column if exists become,
  drop column if exists affirmations,
  drop column if exists commitment,
  drop column if exists committed_on;

notify pgrst, 'reload schema';
