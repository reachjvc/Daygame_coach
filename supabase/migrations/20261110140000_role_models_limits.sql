-- LIMITS THE ROUTES ALREADY KEEP, NOW KEPT BY THE DATABASE (Plans/role-models.md,
-- Phase 7 and 12 security review, 2026-11-10).
--
-- Row security already keeps every row to its owner. These close two ways a
-- signed-in person could fill the database by writing to the tables directly,
-- round the routes: very long value words, and marks for any date. Adds checks
-- and one trigger; changes no data (both tables were empty when written).
-- Undo: rollback/20261110140000_role_models_limits.down.sql.

-- Each value taken is a word of 1 to 40 characters, and none is null.
create or replace function public.role_model_words_ok(words text[])
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(bool_and(w is not null and length(w) between 1 and 40), false)
    from unnest(words) as w
$$;
alter table public.user_role_models drop constraint if exists user_role_models_words_ok;
alter table public.user_role_models add constraint user_role_models_words_ok check (public.role_model_words_ok(taken_values));

-- A mark is for a day near today (a week back, a day ahead for time zones),
-- checked when written, not forever after, so old marks stay valid.
create or replace function public.user_role_model_week_marks_near_today()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.day < current_date - 8 or new.day > current_date + 1 then
    raise exception 'mark_out_of_range' using errcode = 'P0001', hint = 'A mark is for a day of this week, up to today.';
  end if;
  return new;
end;
$$;
drop trigger if exists user_role_model_week_marks_near_today on public.user_role_model_week_marks;
create trigger user_role_model_week_marks_near_today
  before insert or update on public.user_role_model_week_marks
  for each row execute function public.user_role_model_week_marks_near_today();
