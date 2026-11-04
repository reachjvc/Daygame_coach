-- The way back from 20261104190000_day_numbers.sql.
--
-- DELETES DATA: every number written into a Today box, and (after Q4) every
-- day's count on a goal. Back them up first. Put the app back on the code
-- before Phase 6 first, or a page will keep offering a kind the table refuses.

drop table if exists public.life_plan_day_numbers;
update public.life_plan_fields set kind = 'write' where kind = 'number';
alter table public.life_plan_fields drop constraint if exists life_plan_fields_kind_check;
alter table public.life_plan_fields add constraint life_plan_fields_kind_check
  check (kind in ('write', 'read', 'go'));

notify pgrst, 'reload schema';
