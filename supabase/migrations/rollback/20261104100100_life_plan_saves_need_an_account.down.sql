-- The way back from 20261104100100_life_plan_saves_need_an_account.sql. Deletes no data.

grant execute on function public.apply_life_plan_changes(jsonb, integer) to anon;
grant execute on function public.save_life_plan(jsonb, integer) to anon;

notify pgrst, 'reload schema';
